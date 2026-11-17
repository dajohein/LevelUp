/**
 * PWA Update Manager
 *
 * Handles service worker updates and cache versioning
 * Notifies users when new versions are available
 */

import { logger } from './logger';
import { reloadPage } from './pageReload';

export interface UpdateInfo {
  version: string;
  cacheIdentifier: string;
  available: boolean;
}

/** How long to wait for the new worker to take control before reloading anyway. */
const CONTROLLER_CHANGE_TIMEOUT_MS = 4000;

class PWAUpdateManager {
  private updateCallbacks: ((info: UpdateInfo) => void)[] = [];
  private currentVersion: string | null = null;
  // An update that was found before anyone was listening (the banner mounts after startup)
  private pendingUpdate: UpdateInfo | null = null;
  // Set once the user accepted the update: guards against applying twice
  private applying = false;
  // The fallback reload, cancelled as soon as control changes (or the page is already going away)
  private fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private reloaded = false;

  constructor() {
    this.initializeServiceWorker();
    this.listenForUpdates();
  }

  /**
   * Initialize service worker and check for updates
   */
  private initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            updateViaCache: 'none', // Always check for updates
          });

          console.log('🔧 ServiceWorker registered:', registration.scope);

          // A new version may already be waiting (found on an earlier visit, or while the page
          // was loading): tell the UI without needing a fresh `updatefound`
          if (registration.waiting && navigator.serviceWorker.controller) {
            this.notifyUpdateAvailable();
          }

          // A worker may already be installing (its `updatefound` fired before we got here,
          // because other code registers the same worker too): watch it as well
          if (registration.installing) this.watchInstalling(registration.installing);

          registration.addEventListener('updatefound', () => {
            console.log('🔄 New service worker found, preparing update...');
            if (registration.installing) this.watchInstalling(registration.installing);
          });

          // Check for updates periodically (every 5 minutes)
          setInterval(
            () => {
              console.log('🔍 Checking for updates...');
              registration.update();
            },
            5 * 60 * 1000
          );

          // Initial update check
          registration.update();
        } catch (error) {
          logger.error('ServiceWorker registration failed', { error });
        }
      });
    } else {
      logger.warn('Service workers not supported');
    }
  }

  /**
   * Listen for messages from service worker
   */
  private listenForUpdates() {
    if ('serviceWorker' in navigator) {
      // A page that started out controlled by an earlier worker is running the OLD release. If a
      // worker takes control without this page having asked (the user accepted the update in
      // another tab), this page now has an old bundle under a new worker whose caches no longer
      // hold the old release's files: offer the reload, never do it unasked. A first install
      // (no earlier controller) is not an update.
      const startedControlled = navigator.serviceWorker.controller !== null;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (startedControlled && !this.applying) this.notifyUpdateAvailable();
      });

      navigator.serviceWorker.addEventListener('message', event => {
        // The worker no longer announces "update available" (it cannot know the update is
        // wanted); a waiting worker is detected from the registration instead.
        if (event.data && event.data.type === 'SW_UPDATED_APPLIED') {
          console.log('✅ Update successfully applied:', event.data);
          if (event.data.version) this.currentVersion = event.data.version;
        }
      });
    }
  }

  /**
   * Notify that an update is available
   */
  private notifyUpdateAvailable() {
    const updateInfo: UpdateInfo = {
      version: this.currentVersion || 'unknown',
      cacheIdentifier: 'updated',
      available: true,
    };

    this.pendingUpdate = updateInfo;
    this.triggerUpdateCallbacks(updateInfo);
  }

  /**
   * Subscribe to update notifications. A subscriber that arrives after the update was found is
   * told at once (the banner mounts after startup, so it would otherwise miss it). Returns the
   * function that ends the subscription: call it on unmount, or callbacks pile up.
   */
  onUpdateAvailable(callback: (info: UpdateInfo) => void): () => void {
    this.updateCallbacks.push(callback);
    if (this.pendingUpdate) {
      try {
        callback(this.pendingUpdate);
      } catch (error) {
        logger.error('Update callback error', { error });
      }
    }
    return () => {
      this.updateCallbacks = this.updateCallbacks.filter(existing => existing !== callback);
    };
  }

  /** Announce the update when this installing worker finishes installing under a controlled page. */
  private watchInstalling(worker: ServiceWorker) {
    const announceIfReady = () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        logger.debug('✅ New version ready! Notifying user...');
        this.notifyUpdateAvailable();
      }
    };
    worker.addEventListener('statechange', announceIfReady);
    announceIfReady(); // it may have finished installing before we attached
  }

  /**
   * Apply the available update. Call this only after the user asked for it: it reloads the page.
   * The reload happens once however many times this is called.
   */
  async applyUpdate(): Promise<boolean> {
    // Take the guard before the first await: overlapping calls must not each post SKIP_WAITING
    if (this.applying) return true;
    this.applying = true;
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();

        if (registration && registration.waiting) {
          logger.debug('🔄 Applying update...');

          // Reload as soon as the new worker has taken control
          navigator.serviceWorker.addEventListener(
            'controllerchange',
            () => {
              logger.debug('✅ New service worker is now controlling the page');
              this.reloadOnce();
            },
            { once: true }
          );
          // Tell the waiting worker to become active
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });

          // If control never changes (a browser quirk), do not leave the user on a dead button
          this.fallbackTimer = setTimeout(() => this.reloadOnce(), CONTROLLER_CHANGE_TIMEOUT_MS);
          return true;
        }

        logger.debug('🔄 No waiting service worker, reloading the page...');
        this.reloadOnce();
        return true;
      }

      this.applying = false;
      return false;
    } catch (error) {
      this.applying = false;
      logger.error('Failed to apply update', { error });
      return false;
    }
  }

  /** Reload at most once, and drop the pending fallback so it cannot reload a second time. */
  private reloadOnce() {
    if (this.fallbackTimer !== null) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    if (this.reloaded) return;
    this.reloaded = true;
    reloadPage();
  }

  /**
   * Force check for updates
   */
  async checkForUpdates(): Promise<boolean> {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          console.log('🔍 Manually checking for updates...');
          await registration.update();
          return true;
        }
      }
      return false;
    } catch (error) {
      logger.error('Failed to check for updates', { error });
      return false;
    }
  }

  /**
   * Get current version info
   */
  getCurrentVersion(): string | null {
    return this.currentVersion;
  }

  /**
   * Check for pending update in localStorage
   */
  getPendingUpdate(): UpdateInfo | null {
    try {
      const pending = localStorage.getItem('pending-update');
      if (pending) {
        return JSON.parse(pending);
      }
    } catch (error) {
      logger.warn('Failed to parse pending update', { error });
    }
    return null;
  }

  /**
   * Clear pending update from localStorage
   */
  clearPendingUpdate(): void {
    localStorage.removeItem('pending-update');
  }

  /**
   * Apply pending update from localStorage
   */
  async applyPendingUpdate(): Promise<boolean> {
    const pendingUpdate = this.getPendingUpdate();
    if (pendingUpdate) {
      this.clearPendingUpdate();
      return this.applyUpdate();
    }
    return false;
  }

  /**
   * Clear all caches (emergency reset)
   */
  async clearAllCaches(): Promise<boolean> {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        console.log('🗑️ Clearing all caches:', cacheNames);

        await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));

        console.log('✅ All caches cleared');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to clear caches', { error });
      return false;
    }
  }

  /**
   * Trigger all update callbacks
   */
  private triggerUpdateCallbacks(updateInfo: UpdateInfo) {
    this.updateCallbacks.forEach(callback => {
      try {
        callback(updateInfo);
      } catch (error) {
        logger.error('Update callback error', { error });
      }
    });
  }
}

// Export singleton instance
export const pwaUpdateManager = new PWAUpdateManager();
