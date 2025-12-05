/**
 * Development Cache Manager
 *
 * Manages cache busting and cache clearing for development mode
 * Provides utilities to clear all caches and prevent stale data issues
 */

import { smartCache } from '../services/storage/cache';
import { learningCacheService } from '../services/cacheService';
import { enhancedStorage } from '../services/storage/enhancedStorage';
import { clearAppCache } from '../services/pwaService';
import { logger } from '../services/logger';

export interface CacheBustingConfig {
  enabled: boolean;
  autoCleanOnStart: boolean;
  clearServiceWorkerCache: boolean;
  clearApplicationCache: boolean;
  clearStorageCache: boolean;
  addTimestampToRequests: boolean;
  logCacheOperations: boolean;
}

const DEFAULT_CACHE_BUSTING_CONFIG: CacheBustingConfig = {
  enabled: process.env.NODE_ENV === 'development',
  autoCleanOnStart: true,
  clearServiceWorkerCache: true,
  clearApplicationCache: true,
  clearStorageCache: true,
  addTimestampToRequests: true,
  logCacheOperations: true,
};

class DevelopmentCacheManager {
  private config: CacheBustingConfig;
  private bustingTimestamp: number;
  private originalFetch?: typeof fetch;

  constructor(config: Partial<CacheBustingConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_BUSTING_CONFIG, ...config };
    this.bustingTimestamp = Date.now();

    if (this.config.enabled) {
      this.initializeCacheBusting();
    }
  }

  /**
   * Initialize cache busting for development
   */
  private initializeCacheBusting(): void {
    if (this.config.logCacheOperations) {
      logger.info('🧹 Development cache busting enabled');
    }

    // Intercept fetch requests to add cache busting
    if (this.config.addTimestampToRequests) {
      this.setupFetchInterception();
    }

    // Auto-clean on start if enabled
    if (this.config.autoCleanOnStart) {
      this.clearAllCaches().catch(error => {
        logger.warn('Failed to auto-clear caches on startup:', error);
      });
    }

    // Set up keyboard shortcuts
    this.setupKeyboardShortcuts();
  }

  /**
   * Clear all application caches
   */
  async clearAllCaches(): Promise<void> {
    const operations: Promise<void>[] = [];

    if (this.config.clearServiceWorkerCache) {
      operations.push(this.clearServiceWorkerCaches());
    }

    if (this.config.clearApplicationCache) {
      operations.push(this.clearApplicationCaches());
    }

    if (this.config.clearStorageCache) {
      operations.push(this.clearStorageCaches());
    }

    try {
      await Promise.all(operations);

      if (this.config.logCacheOperations) {
        logger.info('🧹 App caches cleared successfully (user data preserved)');
      }

      // Update busting timestamp
      this.bustingTimestamp = Date.now();

      // Notify user
      this.showCacheClearedNotification();
    } catch (error) {
      logger.error('Failed to clear some caches:', error);
      throw error;
    }
  }

  /**
   * Clear service worker caches
   */
  private async clearServiceWorkerCaches(): Promise<void> {
    try {
      await clearAppCache();

      // Also clear service worker registration if needed
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(registration => registration.unregister()));
      }

      if (this.config.logCacheOperations) {
        logger.debug('🧹 Service Worker caches cleared');
      }
    } catch (error) {
      logger.warn('Failed to clear Service Worker caches:', error);
    }
  }

  /**
   * Clear application-level caches
   */
  private async clearApplicationCaches(): Promise<void> {
    try {
      // Clear smart cache
      smartCache.destroy();

      // Clear learning cache
      learningCacheService.clearCache();

      if (this.config.logCacheOperations) {
        logger.debug('🧹 Application caches cleared');
      }
    } catch (error) {
      logger.warn('Failed to clear application caches:', error);
    }
  }

  /**
   * Clear storage caches (application-level, not user data)
   */
  private async clearStorageCaches(): Promise<void> {
    try {
      // Clear only application-level caches, not user data
      // This clears internal cache systems but preserves user progress
      await enhancedStorage.invalidateLanguageCache('*');

      if (this.config.logCacheOperations) {
        logger.debug('🧹 Application storage caches cleared (user data preserved)');
      }
    } catch (error) {
      logger.warn('Failed to clear storage caches:', error);
    }
  }

  /**
   * Setup fetch interception for cache busting
   */
  private setupFetchInterception(): void {
    if (this.originalFetch) return; // Already set up

    this.originalFetch = window.fetch.bind(window); // ✅ FIX: Bind to window context

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = this.addCacheBustingToUrl(input);
      return this.originalFetch!(url, init);
    };

    if (this.config.logCacheOperations) {
      logger.debug('🧹 Fetch interception enabled for cache busting');
    }
  }

  /**
   * Add cache busting parameter to URL
   */
  private addCacheBustingToUrl(input: RequestInfo | URL): RequestInfo | URL {
    try {
      const url = new URL(input.toString(), window.location.origin);

      // Only add cache busting to same-origin requests
      if (url.origin === window.location.origin) {
        url.searchParams.set('_cacheBust', this.bustingTimestamp.toString());
        return url.toString();
      }
    } catch (error) {
      // If URL parsing fails, return original input
      logger.debug('Failed to parse URL for cache busting:', error);
    }

    return input;
  }

  /**
   * Setup keyboard shortcuts for cache management
   */
  private setupKeyboardShortcuts(): void {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      // Ctrl+Shift+R: Force clear all caches and reload
      if (event.ctrlKey && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        this.clearAllCaches().then(() => {
          window.location.reload();
        });
      }

      // Ctrl+Shift+C: Clear caches without reload
      if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        event.preventDefault();
        this.clearAllCaches();
      }
    };

    window.addEventListener('keydown', handleKeyboardShortcut);

    if (this.config.logCacheOperations) {
      logger.debug('🧹 Cache busting keyboard shortcuts enabled:');
      logger.debug('  - Ctrl+Shift+R: Clear app caches and reload');
      logger.debug('  - Ctrl+Shift+C: Clear app caches only');
      logger.debug('  - User data and progress are always preserved');
    }
  }

  /**
   * Show cache cleared notification
   */
  private showCacheClearedNotification(): void {
    // Simple console notification for now
    console.log('%c🧹 App Caches Cleared', 'color: #00ff00; font-weight: bold; font-size: 14px;');
    console.log('%c📊 User data and progress preserved', 'color: #0088ff; font-size: 12px;');

    // Optional: Show toast notification if UI library available
    try {
      // This would integrate with your notification system
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast('App caches cleared (user data preserved)', 'success');
      }
    } catch (error) {
      // Ignore notification errors
    }
  }

  /**
   * Get cache statistics for debugging
   */
  async getCacheStats(): Promise<{
    smartCache: any;
    learningCache: any;
    storageCache: any;
    serviceWorkerCaches: string[];
  }> {
    const stats = {
      smartCache: await smartCache.getStats(),
      learningCache: learningCacheService.getCacheStats(),
      storageCache: await enhancedStorage.getStorageStats(),
      serviceWorkerCaches: [] as string[],
    };

    // Get service worker cache names
    if ('caches' in window) {
      try {
        stats.serviceWorkerCaches = await caches.keys();
      } catch (error) {
        logger.warn('Failed to get service worker cache names:', error);
      }
    }

    return stats;
  }

  /**
   * Restore original fetch if needed
   */
  destroy(): void {
    if (this.originalFetch) {
      window.fetch = this.originalFetch;
      this.originalFetch = undefined;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<CacheBustingConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (this.config.enabled && !this.originalFetch && this.config.addTimestampToRequests) {
      this.setupFetchInterception();
    } else if (!this.config.enabled && this.originalFetch) {
      this.destroy();
    }
  }
}

// Export singleton instance
export const developmentCacheManager = new DevelopmentCacheManager();

// Export class for custom instances
export { DevelopmentCacheManager };

// Helper function for easy cache clearing
export const clearDevCaches = () => developmentCacheManager.clearAllCaches();

// Helper function to get cache stats
export const getDevCacheStats = () => developmentCacheManager.getCacheStats();
