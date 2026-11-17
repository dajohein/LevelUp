/**
 * Remote Storage Service
 *
 * Integrates with Vercel serverless functions for remote data storage
 * Maintains language isolation and works with the existing tiered storage system
 */

import type { StorageOptions, StorageResult, AsyncStorageProvider } from './interfaces';
import { logger } from '../logger';
import { compressionService } from './compression';
import { environmentConfig } from '../../config/environment';

interface RemoteStorageConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  retries: number;
  enableCompression: boolean;
  enableOptimisticUpdates: boolean;
  debugMode: boolean;
}

const SESSION_STORAGE_KEY = 'levelup_remote_session';

/**
 * The stored remote session can no longer be used: the server refused its token (expired beyond
 * the refresh period, a leftover from an earlier API, or the account is gone). Local progress is
 * untouched. The session is NOT replaced automatically, because replacing a linked account's
 * session would orphan its remote data; the user starts over with `resetSession()`.
 */
export class RemoteSessionError extends Error {
  constructor(message = 'The saved sync session is no longer valid; local progress was preserved') {
    super(message);
    this.name = 'RemoteSessionError';
  }
}

/** A non-2xx API response. 4xx means the request itself was refused, so it is never retried. */
class RemoteHttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'RemoteHttpError';
  }
}

interface RemoteUserSession {
  userId: string;
  sessionToken: string;
  isGuest: boolean;
  linkedDevices?: number;
}

const DEFAULT_REMOTE_CONFIG: RemoteStorageConfig = {
  baseUrl: environmentConfig.apiBaseUrl,
  timeout: 10000,
  retries: 3,
  enableCompression: true,
  enableOptimisticUpdates: true,
  debugMode: environmentConfig.debugMode,
};

export class RemoteStorageService implements AsyncStorageProvider {
  private config: RemoteStorageConfig;
  private userSession: RemoteUserSession | null = null;
  private isOnline = navigator.onLine;
  private currentLanguage = 'en'; // Default language

  constructor(config: Partial<RemoteStorageConfig> = {}) {
    this.config = { ...DEFAULT_REMOTE_CONFIG, ...config };

    // Monitor online status
    window.addEventListener('online', () => {
      this.isOnline = true;
      if (this.config.debugMode) {
        logger.info('📡 Remote storage: Back online');
      }
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      if (this.config.debugMode) {
        logger.warn('📡 Remote storage: Offline mode');
      }
    });

    if (this.config.debugMode) {
      logger.info('🌐 Remote Storage Service initialized', this.config);
    }
  }

  /**
   * Set the current language for language-scoped operations
   */
  setCurrentLanguage(languageCode: string): void {
    this.currentLanguage = languageCode;
  }

  /**
   * Get the current language
   */
  getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * Initialize user session (create or authenticate)
   */
  async initializeUser(existingSession?: {
    userId: string;
    sessionToken: string;
  }): Promise<RemoteUserSession> {
    if (existingSession) {
      if (!existingSession.userId || !existingSession.sessionToken) {
        throw new Error('Stored remote session is invalid; local progress was preserved');
      }

      let result;
      try {
        result = await this.apiCall('/api/users', {
          action: 'authenticate',
          sessionToken: existingSession.sessionToken,
        });
      } catch (error) {
        // The server answered and refused the token: the session is lost, not the network
        if (error instanceof RemoteHttpError && [400, 401, 404].includes(error.status)) {
          throw new RemoteSessionError();
        }
        throw error;
      }

      if (!result.success || !result.data?.userId) {
        throw new RemoteSessionError();
      }

      // The server issues a fresh token on every authenticate (an expired one within the refresh
      // period is exchanged for a new one); keep it, or the next visit would start expired again
      const sessionToken: string =
        typeof result.data.sessionToken === 'string'
          ? result.data.sessionToken
          : existingSession.sessionToken;
      this.userSession = {
        userId: result.data.userId,
        sessionToken,
        isGuest: false,
      };
      localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({ userId: result.data.userId, sessionToken, isGuest: false })
      );
      return this.userSession;
    }

    // Create new user session
    try {
      const result = await this.apiCall('/api/users', {
        action: 'create',
        userData: {
          username: `guest_${Date.now()}`,
          preferences: {},
        },
      });

      if (result.success) {
        this.userSession = {
          userId: result.data.userId,
          sessionToken: result.data.sessionToken,
          isGuest: true,
        };

        // Store session in localStorage for persistence
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(this.userSession));

        return this.userSession;
      }
    } catch (error) {
      logger.error('Failed to create user session:', error);
    }

    throw new Error('Failed to initialize user session');
  }

  /**
   * Forget the stored remote session so the next remote call starts a new guest session. Only the
   * session is removed: local progress is never touched. Call it on explicit user request, after a
   * RemoteSessionError.
   */
  async resetSession(): Promise<void> {
    this.userSession = null;
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  /**
   * Get current user session or create one
   */
  async getUserSession(): Promise<RemoteUserSession> {
    if (this.userSession) {
      return this.userSession;
    }

    // Try to restore from localStorage
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (stored !== null) {
      let session: unknown;
      try {
        session = JSON.parse(stored);
      } catch (error) {
        logger.error(
          'Stored remote session could not be parsed; local progress was preserved:',
          error
        );
        throw new Error(
          'Stored remote session could not be restored; local progress was preserved'
        );
      }

      if (
        typeof session !== 'object' ||
        session === null ||
        !('userId' in session) ||
        typeof session.userId !== 'string' ||
        !('sessionToken' in session) ||
        typeof session.sessionToken !== 'string'
      ) {
        throw new Error('Stored remote session is invalid; local progress was preserved');
      }

      return await this.initializeUser({
        userId: session.userId,
        sessionToken: session.sessionToken,
      });
    }

    // Create new session
    return await this.initializeUser();
  }

  /**
   * Make API call with error handling and retries
   */
  private async apiCall(endpoint: string, data: any, attempt = 1): Promise<any> {
    if (!this.isOnline) {
      throw new Error('Offline - remote storage unavailable');
    }

    const url = `${this.config.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(
          `API call failed - Status: ${response.status}, URL: ${url}, Response: ${errorText}`
        );
        throw new RemoteHttpError(
          response.status,
          `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      // A refused request (4xx) will be refused again; retrying only makes the screen hang
      const refused = error instanceof RemoteHttpError && error.status >= 400 && error.status < 500;
      if (!refused && attempt < this.config.retries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.apiCall(endpoint, data, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Get data from remote storage with language isolation
   */
  async get<T>(key: string, options: StorageOptions = {}): Promise<StorageResult<T>> {
    const startTime = performance.now();
    const languageCode = this.currentLanguage;

    try {
      const session = await this.getUserSession();

      const result = await this.apiCall('/api/storage', {
        action: 'get',
        userId: session.userId,
        sessionToken: session.sessionToken,
        languageCode,
        key,
        options: {
          compress: this.config.enableCompression && options.compress !== false,
        },
      });

      const retrievalTime = performance.now() - startTime;

      if (result.success) {
        return {
          success: true,
          data: result.data,
          metadata: {
            ...result.metadata,
            retrievalTime,
            tier: 'remote',
            sessionType: session.isGuest ? 'guest' : 'user',
          },
        };
      } else {
        return {
          success: false,
          error: result.error || 'Remote storage error',
          metadata: {
            retrievalTime,
            tier: 'remote',
          },
        };
      }
    } catch (error) {
      const retrievalTime = performance.now() - startTime;
      logger.error('Remote storage get error:', error);

      return {
        success: false,
        error: `Remote storage unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          retrievalTime,
          tier: 'remote',
          offline: !this.isOnline,
        },
      };
    }
  }

  /**
   * Set data in remote storage with language isolation
   */
  async set<T>(key: string, data: T, options: StorageOptions = {}): Promise<StorageResult<void>> {
    const startTime = performance.now();
    const languageCode = this.currentLanguage;

    try {
      const session = await this.getUserSession();

      // Apply compression if enabled
      let processedData = data;
      if (this.config.enableCompression && options.compress !== false) {
        const dataStr = JSON.stringify(data);
        if (dataStr.length > 1024) {
          // Only compress larger data
          processedData = (await compressionService.compress(data)) as T;
        }
      }

      const result = await this.apiCall('/api/storage', {
        action: 'set',
        userId: session.userId,
        sessionToken: session.sessionToken,
        languageCode,
        key,
        data: processedData,
        options: {
          compress: this.config.enableCompression && options.compress !== false,
          ttl: options.ttl,
        },
      });

      const retrievalTime = performance.now() - startTime;

      if (result.success) {
        return {
          success: true,
          metadata: {
            ...result.metadata,
            retrievalTime,
            tier: 'remote',
            sessionType: session.isGuest ? 'guest' : 'user',
          },
        };
      } else {
        return {
          success: false,
          error: result.error || 'Remote storage error',
          metadata: {
            retrievalTime,
            tier: 'remote',
          },
        };
      }
    } catch (error) {
      const retrievalTime = performance.now() - startTime;
      logger.error('Remote storage set error:', error);

      return {
        success: false,
        error: `Remote storage unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          retrievalTime,
          tier: 'remote',
          offline: !this.isOnline,
        },
      };
    }
  }

  /**
   * Delete data from remote storage with language isolation
   */
  async delete(key: string, _options?: StorageOptions): Promise<StorageResult<void>> {
    const startTime = performance.now();
    const languageCode = this.currentLanguage;

    try {
      const session = await this.getUserSession();

      const result = await this.apiCall('/api/storage', {
        action: 'delete',
        userId: session.userId,
        sessionToken: session.sessionToken,
        languageCode,
        key,
      });

      const retrievalTime = performance.now() - startTime;

      if (result.success) {
        return {
          success: true,
          metadata: {
            ...result.metadata,
            retrievalTime,
            tier: 'remote',
            sessionType: session.isGuest ? 'guest' : 'user',
          },
        };
      } else {
        return {
          success: false,
          error: result.error || 'Remote storage error',
          metadata: {
            retrievalTime,
            tier: 'remote',
          },
        };
      }
    } catch (error) {
      const retrievalTime = performance.now() - startTime;
      logger.error('Remote storage delete error:', error);

      return {
        success: false,
        error: `Remote storage unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          retrievalTime,
          tier: 'remote',
          offline: !this.isOnline,
        },
      };
    }
  }

  /**
   * Check if a key exists in remote storage
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.get(key);
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Get multiple keys at once (batch operation)
   */
  async getBatch<T>(
    keys: string[],
    options: StorageOptions = {}
  ): Promise<StorageResult<Record<string, T>>> {
    const results: Record<string, T> = {};
    let hasErrors = false;

    for (const key of keys) {
      const result = await this.get<T>(key, options);
      if (result.success && result.data !== undefined) {
        results[key] = result.data;
      } else {
        hasErrors = true;
      }
    }

    return {
      success: !hasErrors || Object.keys(results).length > 0,
      data: results,
      metadata: {
        tier: 'remote',
        batchSize: keys.length,
        successful: Object.keys(results).length,
      },
    };
  }

  /**
   * Set multiple keys at once (batch operation)
   */
  async setBatch<T>(
    data: Record<string, T>,
    options: StorageOptions = {}
  ): Promise<StorageResult<void>> {
    let successCount = 0;
    let hasErrors = false;

    for (const [key, value] of Object.entries(data)) {
      const result = await this.set(key, value, options);
      if (result.success) {
        successCount++;
      } else {
        hasErrors = true;
      }
    }

    return {
      success: !hasErrors || successCount > 0,
      metadata: {
        tier: 'remote',
        batchSize: Object.keys(data).length,
        successful: successCount,
      },
    };
  }

  /**
   * Clear storage (optionally by pattern)
   */
  async clear(pattern?: string): Promise<StorageResult<void>> {
    // For now, we'll implement this as getting all keys and deleting them
    // A more efficient implementation would add a clear endpoint to the API
    try {
      const keys = await this.getKeys(pattern);
      if (keys.success && keys.data) {
        for (const key of keys.data) {
          await this.delete(key);
        }
      }

      return {
        success: true,
        metadata: {
          tier: 'remote',
          cleared: keys.data?.length || 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Clear operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          tier: 'remote',
        },
      };
    }
  }

  /**
   * Get storage size (not accurately implementable without API support)
   */
  async getSize(): Promise<StorageResult<number>> {
    return {
      success: false,
      error: 'Size calculation not supported in remote storage',
      metadata: {
        tier: 'remote',
      },
    };
  }

  /**
   * Get all keys (optionally by pattern)
   */
  async getKeys(pattern?: string): Promise<StorageResult<string[]>> {
    const startTime = performance.now();
    const languageCode = this.currentLanguage;

    try {
      const session = await this.getUserSession();

      const result = await this.apiCall('/api/storage', {
        action: 'list',
        userId: session.userId,
        sessionToken: session.sessionToken,
        languageCode,
      });

      const retrievalTime = performance.now() - startTime;

      if (result.success) {
        let keys = result.data;

        // Apply pattern filter if provided
        if (pattern) {
          const regex = new RegExp(pattern);
          keys = keys.filter((key: string) => regex.test(key));
        }

        return {
          success: true,
          data: keys,
          metadata: {
            ...result.metadata,
            retrievalTime,
            tier: 'remote',
            sessionType: session.isGuest ? 'guest' : 'user',
            filtered: !!pattern,
          },
        };
      } else {
        return {
          success: false,
          error: result.error || 'Remote storage error',
          metadata: {
            retrievalTime,
            tier: 'remote',
          },
        };
      }
    } catch (error) {
      const retrievalTime = performance.now() - startTime;
      logger.error('Remote storage getKeys error:', error);

      return {
        success: false,
        error: `Remote storage unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          retrievalTime,
          tier: 'remote',
          offline: !this.isOnline,
        },
      };
    }
  }

  /**
   * Health check for remote storage
   */
  async healthCheck(): Promise<StorageResult<{ status: 'healthy' | 'degraded' | 'unhealthy' }>> {
    try {
      const available = await this.isAvailable();
      return {
        success: true,
        data: {
          status: available ? 'healthy' : 'unhealthy',
        },
        metadata: {
          tier: 'remote',
          online: this.isOnline,
          sessionActive: !!this.userSession,
        },
      };
    } catch (error) {
      return {
        success: true,
        data: { status: 'unhealthy' },
        metadata: {
          tier: 'remote',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Generate account code for device linking
   */
  async generateAccountCode(): Promise<{ code: string; expires: number }> {
    try {
      const session = await this.getUserSession();

      // Debug logging
      logger.info('Generating account code for session:', {
        userId: session.userId,
        hasSessionToken: !!session.sessionToken,
        apiUrl: `${this.config.baseUrl}/api/users`,
      });

      const requestData = {
        action: 'generateCode',
        sessionToken: session.sessionToken,
      };

      const result = await this.apiCall('/api/users', requestData);

      if (result.success) {
        // The server decides how long a code lives and says so; do not assume a duration
        const seconds = Number(result.data.expiresIn);
        const expires =
          Date.now() + (Number.isFinite(seconds) && seconds > 0 ? seconds : 3600) * 1000;
        return {
          code: result.data.accountCode,
          expires,
        };
      }

      throw new Error(result.error || 'Failed to generate account code');
    } catch (error) {
      logger.error('Failed to generate account code:', error);
      throw error;
    }
  }

  /**
   * Link current device to existing account using code
   */
  async linkDeviceWithCode(
    accountCode: string
  ): Promise<{ success: boolean; linkedDevices: number }> {
    try {
      const result = await this.apiCall('/api/users', {
        action: 'linkDevice',
        accountCode: accountCode.toUpperCase(),
      });

      if (result.success) {
        // Update current session with linked account
        this.userSession = {
          userId: result.data.userId,
          sessionToken: result.data.sessionToken,
          isGuest: false, // No longer a guest account
          linkedDevices: result.data.linkedDevices,
        };

        // Update localStorage with new session
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(this.userSession));

        logger.info('🔗 Device successfully linked to account', {
          userId: this.userSession.userId,
          linkedDevices: result.data.linkedDevices,
        });

        return {
          success: true,
          linkedDevices: result.data.linkedDevices,
        };
      }

      throw new Error(result.error || 'Failed to link device');
    } catch (error) {
      logger.error('Failed to link device with code:', error);
      throw error;
    }
  }

  /**
   * Get current user session with linked devices
   */
  async getCurrentSession(): Promise<RemoteUserSession | null> {
    try {
      return await this.getUserSession();
    } catch (error) {
      logger.error('Failed to get current session:', error);
      return null;
    }
  }

  /**
   * Get progress data for a specific device (placeholder)
   */
  async getDeviceProgress(deviceId: string): Promise<Record<string, Record<string, any>>> {
    try {
      // This would be implemented when we have multi-device progress storage
      logger.info(`Getting progress for device ${deviceId} (not yet implemented)`);
      return {};
    } catch (error) {
      logger.error('Failed to get device progress:', error);
      return {};
    }
  }

  /**
   * Check if current session is linked to other devices
   */
  async getLinkedDevicesCount(): Promise<number> {
    try {
      const session = await this.getUserSession();
      return session.linkedDevices || 1; // At least current device
    } catch {
      return 0;
    }
  }

  /**
   * Check if remote storage is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.isOnline) return false;

    try {
      await this.getUserSession();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get storage analytics
   */
  async getAnalytics(): Promise<any> {
    try {
      const session = await this.getUserSession();
      return {
        available: this.isOnline,
        userId: session.userId,
        sessionType: session.isGuest ? 'guest' : 'user',
        lastSync: Date.now(),
      };
    } catch {
      return {
        available: false,
        error: 'Session unavailable',
      };
    }
  }
}

// Export singleton instance
export const remoteStorage = new RemoteStorageService();
