/**
 * PWA Update Manager
 * 
 * Handles service worker updates and cache versioning
 * Notifies users when new versions are available
 */

export interface UpdateInfo {
  version: string;
  cacheIdentifier: string;
  available: boolean;
}

class PWAUpdateManager {
  private updateCallbacks: ((info: UpdateInfo) => void)[] = [];
  private currentVersion: string | null = null;

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
            updateViaCache: 'none' // Always check for updates
          });

          console.log('🔧 ServiceWorker registered:', registration.scope);

          // Check for updates immediately
          registration.addEventListener('updatefound', () => {
            console.log('🔄 New service worker found, preparing update...');
            
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('✅ New version ready! Notifying user...');
                  this.notifyUpdateAvailable();
                }
              });
            }
          });

          // Check for updates periodically (every 5 minutes)
          setInterval(() => {
            console.log('🔍 Checking for updates...');
            registration.update();
          }, 5 * 60 * 1000);

          // Initial update check
          registration.update();

        } catch (error) {
          console.error('❌ ServiceWorker registration failed:', error);
        }
      });
    } else {
      console.warn('⚠️ Service workers not supported');
    }
  }

  /**
   * Listen for messages from service worker
   */
  private listenForUpdates() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_UPDATED') {
          console.log('📢 Received update notification:', event.data);
          
          const updateInfo: UpdateInfo = {
            version: event.data.version,
            cacheIdentifier: event.data.cacheIdentifier,
            available: true
          };

          this.currentVersion = event.data.version;
          this.triggerUpdateCallbacks(updateInfo);
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
      available: true
    };

    this.triggerUpdateCallbacks(updateInfo);
  }

  /**
   * Subscribe to update notifications
   */
  onUpdateAvailable(callback: (info: UpdateInfo) => void) {
    this.updateCallbacks.push(callback);
  }

  /**
   * Apply the available update
   */
  async applyUpdate(): Promise<boolean> {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        
        if (registration && registration.waiting) {
          console.log('🔄 Applying update...');
          
          // Tell the waiting service worker to become active
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          
          // Wait for the new service worker to take control
          await new Promise<void>((resolve) => {
            navigator.serviceWorker.addEventListener('controllerchange', () => {
              console.log('✅ New service worker is now controlling the page');
              resolve();
            }, { once: true });
          });

          // Reload the page to get the fresh content
          console.log('🔄 Reloading page with new version...');
          window.location.reload();
          
          return true;
        } else {
          console.log('🔄 No waiting service worker, forcing page reload...');
          window.location.reload();
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('❌ Failed to apply update:', error);
      return false;
    }
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
      console.error('❌ Failed to check for updates:', error);
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
   * Clear all caches (emergency reset)
   */
  async clearAllCaches(): Promise<boolean> {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        console.log('🗑️ Clearing all caches:', cacheNames);
        
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        
        console.log('✅ All caches cleared');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to clear caches:', error);
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
        console.error('❌ Update callback error:', error);
      }
    });
  }
}

// Export singleton instance
export const pwaUpdateManager = new PWAUpdateManager();