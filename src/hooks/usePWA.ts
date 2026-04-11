import { useState, useEffect } from 'react';
import { logger } from '../services/logger';

/** Background Sync API — not in standard TypeScript lib. */
interface SyncManager {
  register(tag: string): Promise<void>;
}

/** Extends ServiceWorkerRegistration with the Background Sync API. */
interface SyncServiceWorkerRegistration extends ServiceWorkerRegistration {
  readonly sync: SyncManager;
}
interface BeforeInstallPromptEvent extends Event {
  prompt(): void;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** navigator.connection (Network Information API — not in standard TS lib). */
interface NetworkInformation {
  effectiveType: string;
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
}

/** navigator.standalone is Safari/iOS only. */
interface NavigatorIOS extends Navigator {
  standalone?: boolean;
}

// PWA installation and service worker management
export const usePWA = () => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        setSwRegistration(registration);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          }
        });

        logger.debug('Service Worker registered successfully');
      } catch (error) {
        logger.error('Service Worker registration failed', { error });
      }
    }
  };

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInApp = (window.navigator as NavigatorIOS).standalone === true;
      setIsInstalled(isStandalone || isInApp);
    };

    checkInstalled();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Register service worker
    registerServiceWorker();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        logger.debug('PWA installed');
      }

      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  const updateApp = async () => {
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  return {
    isInstallable,
    isInstalled,
    installApp,
    updateAvailable,
    updateApp,
    swRegistration,
  };
};

// Network status hook
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Get connection type if available
    if ('connection' in navigator) {
      const connection = (navigator as Navigator & { connection: NetworkInformation }).connection;
      setConnectionType(connection.effectiveType || 'unknown');

      const handleConnectionChange = () => {
        setConnectionType(connection.effectiveType || 'unknown');
      };

      connection.addEventListener('change', handleConnectionChange);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection.removeEventListener('change', handleConnectionChange);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, connectionType };
};

// Push Notifications Hook
export const usePushNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [vapidKeyAvailable, setVapidKeyAvailable] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Check if VAPID key is configured (you would set this in environment variables)
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    setVapidKeyAvailable(!!vapidKey);
  }, []);

  const requestPermission = async (): Promise<NotificationPermission> => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    }
    return 'denied';
  };

  const subscribeToPush = async (registration: ServiceWorkerRegistration): Promise<void> => {
    if (!('PushManager' in window) || !registration) return;

    // Get VAPID key from environment variables
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

    if (!vapidKey) {
      logger.warn('VAPID key not configured for push notifications');
      // Still allow local notifications without push subscription
      return;
    }

    try {
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });
      setSubscription(sub);
      logger.debug('Push subscription successful');
    } catch (error) {
      logger.error('Push subscription failed', { error });
      // Gracefully handle the error - PWA still works without push notifications
    }
  };

  return { permission, requestPermission, subscribeToPush, subscription, vapidKeyAvailable };
};

// Background sync hook
export const useBackgroundSync = () => {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  const registerSync = async (tag: string) => {
    if (
      'serviceWorker' in navigator &&
      'sync' in (window.ServiceWorkerRegistration?.prototype ?? {})
    ) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as SyncServiceWorkerRegistration).sync.register(tag);
        setSyncStatus('syncing');
        logger.debug(`Background sync registered: ${tag}`);
      } catch (error) {
        logger.error('Background sync registration failed', { error, tag });
        setSyncStatus('error');
      }
    }
  };

  const syncProgress = () => registerSync('progress-sync');
  const syncSessions = () => registerSync('session-sync');

  return {
    syncStatus,
    syncProgress,
    syncSessions,
  };
};
