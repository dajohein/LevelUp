/**
 * Storage System Initialization
 * 
 * Configures and initializes the complete storage system with server-side support
 */

import { enhancedStorage } from './enhancedStorage';
import { remoteStorage } from './remoteStorage';
import { environmentConfig } from '../../config/environment';
import { logger } from '../logger';

interface StorageInitOptions {
  enableRemoteStorage?: boolean;
  userId?: string;
  sessionToken?: string;
}

class StorageInitializer {
  private initialized = false;
  private remoteEnabled = false;

  /**
   * Initialize the complete storage system
   */
  async initialize(options: StorageInitOptions = {}): Promise<void> {
    if (this.initialized) {
      logger.debug('Storage system already initialized');
      return;
    }

    try {
      logger.info('🚀 Initializing LevelUp storage system...');

      // Enable remote storage if configured
      if (options.enableRemoteStorage !== false && environmentConfig.enableRemoteStorage) {
        await this.initializeRemoteStorage(options.userId, options.sessionToken);
      }

      // Run health checks
      await this.runInitialHealthChecks();

      this.initialized = true;
      logger.info('✅ Storage system initialized successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize storage system:', error);
      
      // Fall back to local-only storage
      await this.initializeLocalFallback();
    }
  }

  /**
   * Initialize remote storage with user session
   */
  private async initializeRemoteStorage(userId?: string, sessionToken?: string): Promise<void> {
    try {
      // Initialize user session
      let session;
      if (userId && sessionToken) {
        session = await remoteStorage.initializeUser({ userId, sessionToken });
      } else {
        session = await remoteStorage.initializeUser();
      }

      logger.info(`📡 Remote storage initialized (${session.isGuest ? 'guest' : 'user'} session)`);
      this.remoteEnabled = true;

      // Test connectivity
      const healthResult = await remoteStorage.healthCheck();
      if (!healthResult.success || healthResult.data?.status === 'unhealthy') {
        throw new Error('Remote storage health check failed');
      }

    } catch (error) {
      logger.warn('Remote storage initialization failed:', error);
      
      if (environmentConfig.enableLocalFallback) {
        logger.info('📱 Falling back to local storage only');
        this.remoteEnabled = false;
      } else {
        throw error;
      }
    }
  }

  /**
   * Initialize local-only fallback
   */
  private async initializeLocalFallback(): Promise<void> {
    logger.warn('🔄 Initializing local storage fallback...');
    
    this.initialized = true;
    this.remoteEnabled = false;
    logger.info('✅ Local storage fallback initialized');
  }

  /**
   * Run initial health checks on storage systems
   */
  private async runInitialHealthChecks(): Promise<void> {
    logger.debug('🔍 Running storage health checks...');

    try {
      // Test enhanced storage
      const analyticsResult = await enhancedStorage.getStorageAnalytics();
      if (analyticsResult.success) {
        logger.debug('Enhanced storage: healthy');
      }

      // Test remote storage if enabled
      if (this.remoteEnabled) {
        const health = await remoteStorage.healthCheck();
        logger.debug(`Remote storage: ${health.data?.status || 'unknown'}`);
      }
    } catch (error) {
      logger.warn('Health check warnings:', error);
    }
  }

  /**
   * Get storage system status
   */
  async getStatus(): Promise<{
    initialized: boolean;
    remoteEnabled: boolean;
    analytics?: any;
  }> {
    let analytics;
    try {
      const analyticsResult = await enhancedStorage.getStorageAnalytics();
      analytics = analyticsResult.success ? analyticsResult.data : null;
    } catch (error) {
      logger.warn('Failed to get storage analytics:', error);
    }

    return {
      initialized: this.initialized,
      remoteEnabled: this.remoteEnabled,
      analytics
    };
  }

  /**
   * Re-initialize remote storage (useful for authentication changes)
   */
  async reinitializeRemote(userId: string, sessionToken: string): Promise<void> {
    if (!environmentConfig.enableRemoteStorage) {
      logger.warn('Remote storage is disabled in environment config');
      return;
    }

    try {
      await this.initializeRemoteStorage(userId, sessionToken);
    } catch (error) {
      logger.error('Failed to reinitialize remote storage:', error);
      throw error;
    }
  }

  /**
   * Gracefully shutdown storage system
   */
  async shutdown(): Promise<void> {
    logger.info('🔄 Shutting down storage system...');
    
    this.initialized = false;
    this.remoteEnabled = false;
    
    logger.info('✅ Storage system shutdown complete');
  }
}

// Export singleton instance
export const storageInitializer = new StorageInitializer();

// Convenience function for easy initialization
export async function initializeStorage(options: StorageInitOptions = {}): Promise<void> {
  return storageInitializer.initialize(options);
}

// Export the status getter
export async function getStorageStatus() {
  return storageInitializer.getStatus();
}