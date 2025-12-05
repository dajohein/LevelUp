// PWA Registration and Service Worker Management
export const registerPWA = async (): Promise<ServiceWorkerRegistration | null> => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('ServiceWorker registration successful:', registration.scope);

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              dispatchEvent(new CustomEvent('sw-update-available'));
            }
          });
        }
      });

      // Listen for controller change (when new SW takes control)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

      return registration;
    } catch (error) {
      console.error('ServiceWorker registration failed:', error);
      return null;
    }
  }
  return null;
};

// Update Service Worker
export const updateServiceWorker = async (): Promise<void> => {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      registration.update();
    }
  }
};

// Skip waiting for new Service Worker
export const skipWaitingForUpdate = async (): Promise<void> => {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }
};

// Unregister Service Worker (for debugging)
export const unregisterPWA = async (): Promise<boolean> => {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      return registration.unregister();
    }
  }
  return false;
};

// PWA Installation Detection
export const isPWAInstalled = (): boolean => {
  // Check if running in standalone mode (iOS)
  if ((window.navigator as any).standalone === true) {
    return true;
  }

  // Check if running in standalone mode (Android)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  // Check if running in minimal-ui mode
  if (window.matchMedia('(display-mode: minimal-ui)').matches) {
    return true;
  }

  return false;
};

// PWA Installation Prompt
export const showInstallPrompt = async (deferredPrompt: any): Promise<boolean> => {
  if (!deferredPrompt) {
    console.warn('Install prompt not available');
    return false;
  }

  try {
    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    console.log(`User response to install prompt: ${outcome}`);

    // Clear the deferred prompt
    deferredPrompt = null;

    return outcome === 'accepted';
  } catch (error) {
    console.error('Error showing install prompt:', error);
    return false;
  }
};

// Cache Management
export const clearAppCache = async (): Promise<void> => {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
    console.log('All caches cleared');
  }
};

export const getCacheSize = async (): Promise<number> => {
  if ('caches' in window && 'storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return estimate.usage || 0;
  }
  return 0;
};

// Notification Permissions
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission;
  }
  return 'denied';
};

export const showNotification = async (
  title: string,
  options: NotificationOptions = {}
): Promise<void> => {
  if ('serviceWorker' in navigator && 'Notification' in window) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && Notification.permission === 'granted') {
      await registration.showNotification(title, {
        badge: '/icons/icon-96x96.png',
        icon: '/icons/icon-192x192.png',
        ...options,
      } as any);
    }
  }
};

// Background Sync
export const registerBackgroundSync = async (tag: string): Promise<void> => {
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    const registration = await navigator.serviceWorker.ready;
    await (registration as any).sync.register(tag);
  }
};

// Share API
export const shareContent = async (data: {
  title?: string;
  text?: string;
  url?: string;
}): Promise<boolean> => {
  if ('share' in navigator) {
    try {
      await (navigator as any).share(data);
      return true;
    } catch (error) {
      console.log('Error sharing:', error);
      return false;
    }
  }
  return false;
};

// App Badges (for supported browsers)
export const setBadge = async (count?: number): Promise<void> => {
  if ('setAppBadge' in navigator) {
    try {
      await (navigator as any).setAppBadge(count);
    } catch (error) {
      console.log('Error setting badge:', error);
    }
  }
};

export const clearBadge = async (): Promise<void> => {
  if ('clearAppBadge' in navigator) {
    try {
      await (navigator as any).clearAppBadge();
    } catch (error) {
      console.log('Error clearing badge:', error);
    }
  }
};

// PWA Utils
export const getPWADisplayMode = (): string => {
  if ((window.navigator as any).standalone === true) {
    return 'standalone';
  }
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return 'standalone';
  }
  if (window.matchMedia('(display-mode: minimal-ui)').matches) {
    return 'minimal-ui';
  }
  if (window.matchMedia('(display-mode: fullscreen)').matches) {
    return 'fullscreen';
  }
  return 'browser';
};

export const isRunningAsPWA = (): boolean => {
  const displayMode = getPWADisplayMode();
  return (
    displayMode === 'standalone' || displayMode === 'fullscreen' || displayMode === 'minimal-ui'
  );
};

// A11y helpers for PWA
export const announceToScreenReader = (message: string): void => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';
  announcement.style.width = '1px';
  announcement.style.height = '1px';
  announcement.style.overflow = 'hidden';

  document.body.appendChild(announcement);
  announcement.textContent = message;

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};
