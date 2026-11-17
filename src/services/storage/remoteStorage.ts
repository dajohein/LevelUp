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
const RETRYABLE_REFUSALS = [408, 429];

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

/**
 * The request never got an answer: offline, no connection, DNS, a timeout. This says nothing about
 * the session, so it must never be mistaken for a lost one (and must not offer a reset).
 */
export class RemoteNetworkError extends Error {
  readonly cause?: unknown;
  constructor(message = 'The sync server could not be reached', cause?: unknown) {
    super(message);
    this.name = 'RemoteNetworkError';
    this.cause = cause;
  }
}

/** A non-2xx API response. A 4xx means the request itself was refused (see RETRYABLE_REFUSALS). */
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
  // Bumped by resetSession(): a restore that was in flight across a reset must not write back
  private sessionEpoch = 0;
  // One restore/create at a time: concurrent callers would each create a guest account
  private pendingSession: Promise<RemoteUserSession> | null = null;
  // Once the server refused the stored session, stop asking on every storage call until a reset
  private lostSession: RemoteSessionError | null = null;
  // One token refresh at a time: calls that expire together share it
  private pendingRefresh: Promise<RemoteUserSession> | null = null;
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
    isGuest?: boolean;
  }): Promise<RemoteUserSession> {
    const epoch = this.sessionEpoch;

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
        // Only an explicit refusal of the token (401) or of the account (404) means the session is
        // lost. A 400 is a malformed request, and a network failure says nothing about the session.
        if (error instanceof RemoteHttpError && [401, 404].includes(error.status)) {
          const lost = new RemoteSessionError();
          if (epoch === this.sessionEpoch) this.lostSession = lost;
          throw lost;
        }
        throw error;
      }

      if (!result.success || !result.data?.userId) {
        const lost = new RemoteSessionError();
        if (epoch === this.sessionEpoch) this.lostSession = lost;
        throw lost;
      }

      // The server issues a fresh token on every authenticate (an expired one within the refresh
      // period is exchanged for a new one); keep it, or the next visit would start expired again
      const session: RemoteUserSession = {
        userId: result.data.userId,
        sessionToken:
          typeof result.data.sessionToken === 'string'
            ? result.data.sessionToken
            : existingSession.sessionToken,
        isGuest: existingSession.isGuest ?? false,
      };
      return this.adoptSession(session, epoch);
    }

    // Create new user session
    let result;
    try {
      result = await this.apiCall('/api/users', {
        action: 'create',
        userData: {
          username: `guest_${Date.now()}`,
          preferences: {},
        },
      });
    } catch (error) {
      logger.error('Failed to create user session:', error);
      // Keep "no connection" distinguishable from "the server refused us"
      if (error instanceof RemoteNetworkError) throw error;
      throw new Error('Failed to initialize user session');
    }

    if (result.success) {
      return this.adoptSession(
        {
          userId: result.data.userId,
          sessionToken: result.data.sessionToken,
          isGuest: true,
        },
        epoch
      );
    }

    throw new Error('Failed to initialize user session');
  }

  /**
   * Make a restored or created session the current one and remember it. Persisting is best effort
   * (storage can be full or blocked): the server already accepted the session, so a failed write
   * must not fail the call; the session is simply re-established next visit.
   */
  private adoptSession(session: RemoteUserSession, epoch: number): RemoteUserSession {
    if (epoch !== this.sessionEpoch) {
      // resetSession() ran while this was in flight: do not bring the old session back
      throw new Error('The remote session was reset while it was being restored');
    }
    this.userSession = session;
    this.lostSession = null;
    this.persistSession(session);
    return session;
  }

  private persistSession(session: RemoteUserSession): void {
    try {
      localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          userId: session.userId,
          sessionToken: session.sessionToken,
          isGuest: session.isGuest,
        })
      );
    } catch (error) {
      logger.warn('Could not save the remote session; it will be set up again next visit:', error);
    }
  }

  /**
   * Forget the stored remote session so the next remote call starts a new guest session. Only the
   * session is removed: local progress is never touched. Call it on explicit user request, after a
   * RemoteSessionError.
   */
  async resetSession(): Promise<void> {
    this.sessionEpoch += 1; // anything still in flight must not write its result back
    this.pendingSession = null;
    this.pendingRefresh = null;
    this.userSession = null;
    this.lostSession = null;
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  /**
   * Get current user session or create one
   */
  async getUserSession(): Promise<RemoteUserSession> {
    if (this.userSession) {
      return this.userSession;
    }
    // Known to be refused already: fail at once until the user resets, instead of one doomed
    // request per storage call
    if (this.lostSession) {
      throw this.lostSession;
    }
    // Share a restore/create that is already running (two callers must not create two guests)
    if (this.pendingSession) {
      return this.pendingSession;
    }

    const pending = this.loadSession();
    this.pendingSession = pending;
    try {
      return await pending;
    } finally {
      if (this.pendingSession === pending) this.pendingSession = null;
    }
  }

  private async loadSession(): Promise<RemoteUserSession> {
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
        isGuest: 'isGuest' in session && session.isGuest === true,
      });
    }

    // Create new session
    return await this.initializeUser();
  }

  /**
   * Make a call that needs the session token. A page can stay open (or suspended) far longer than
   * a token lives, so the cached session may have expired: on a 401 the token is exchanged for a
   * fresh one through `authenticate` (the server accepts a recently expired token for exactly this)
   * and the same request is retried once, keeping the same account. If the refresh is refused the
   * session is lost (RemoteSessionError); if it cannot be tried because the network is down that is
   * a network error and the session stays usable. Returns the session the call was made with, since
   * it may have been renewed.
   */
  private async authedCall(
    endpoint: string,
    build: (session: RemoteUserSession) => Record<string, unknown>
  ) {
    let session = await this.getUserSession();
    try {
      return { result: await this.apiCall(endpoint, build(session)), session };
    } catch (error) {
      if (!(error instanceof RemoteHttpError && error.status === 401)) throw error;
      session = await this.refreshSession(session);
      // Retried once only: a 401 that survives a fresh token is reported, never looped on
      return { result: await this.apiCall(endpoint, build(session)), session };
    }
  }

  private async refreshSession(stale: RemoteUserSession): Promise<RemoteUserSession> {
    // A concurrent call may already have renewed it while this one was failing
    if (this.userSession && this.userSession.sessionToken !== stale.sessionToken) {
      return this.userSession;
    }
    if (!this.pendingRefresh) {
      const pending = this.initializeUser({
        userId: stale.userId,
        sessionToken: stale.sessionToken,
        isGuest: stale.isGuest,
      });
      this.pendingRefresh = pending;
      const done = () => {
        if (this.pendingRefresh === pending) this.pendingRefresh = null;
      };
      pending.then(done, done);
    }
    try {
      return await this.pendingRefresh;
    } catch (error) {
      // Refused: forget the cached, dead session so the lost-session state takes over (otherwise
      // every later call would reuse the stale token and fail the same way)
      if (error instanceof RemoteSessionError && this.userSession === stale) {
        this.userSession = null;
      }
      throw error;
    }
  }

  /**
   * Make API call with error handling and retries
   */
  private async apiCall(endpoint: string, data: any, attempt = 1): Promise<any> {
    if (!this.isOnline) {
      throw new RemoteNetworkError('Offline - remote storage unavailable');
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
      // A refused request (4xx) will be refused again, so retrying only makes the screen hang.
      // 408 (timeout) and 429 (rate limit) are the exceptions: they are transient.
      const refused =
        error instanceof RemoteHttpError &&
        error.status >= 400 &&
        error.status < 500 &&
        !RETRYABLE_REFUSALS.includes(error.status);
      if (!refused && attempt < this.config.retries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.apiCall(endpoint, data, attempt + 1);
      }
      if (error instanceof RemoteHttpError) throw error;
      // fetch rejected or timed out: there was no answer at all
      throw new RemoteNetworkError(
        error instanceof Error ? error.message : 'The sync server could not be reached',
        error
      );
    }
  }

  /**
   * Get data from remote storage with language isolation
   */
  async get<T>(key: string, options: StorageOptions = {}): Promise<StorageResult<T>> {
    const startTime = performance.now();
    const languageCode = this.currentLanguage;

    try {
      const { result, session } = await this.authedCall('/api/storage', current => ({
        action: 'get',
        userId: current.userId,
        sessionToken: current.sessionToken,
        languageCode,
        key,
        options: {
          compress: this.config.enableCompression && options.compress !== false,
        },
      }));

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
      // Apply compression if enabled
      let processedData = data;
      if (this.config.enableCompression && options.compress !== false) {
        const dataStr = JSON.stringify(data);
        if (dataStr.length > 1024) {
          // Only compress larger data
          processedData = (await compressionService.compress(data)) as T;
        }
      }

      const { result, session } = await this.authedCall('/api/storage', current => ({
        action: 'set',
        userId: current.userId,
        sessionToken: current.sessionToken,
        languageCode,
        key,
        data: processedData,
        options: {
          compress: this.config.enableCompression && options.compress !== false,
          ttl: options.ttl,
        },
      }));

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
      const { result, session } = await this.authedCall('/api/storage', current => ({
        action: 'delete',
        userId: current.userId,
        sessionToken: current.sessionToken,
        languageCode,
        key,
      }));

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
      const { result, session } = await this.authedCall('/api/storage', current => ({
        action: 'list',
        userId: current.userId,
        sessionToken: current.sessionToken,
        languageCode,
      }));

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
      const { result } = await this.authedCall('/api/users', current => ({
        action: 'generateCode',
        sessionToken: current.sessionToken,
      }));

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

        // A valid session replaces whatever was lost (userSession takes precedence over the
        // lost-session flag), and is remembered best-effort
        this.persistSession(this.userSession);

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
