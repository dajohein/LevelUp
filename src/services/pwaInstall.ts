import { logger } from './logger';

/**
 * PWA installation state, shared by every component.
 *
 * `beforeinstallprompt` fires once, early, and usually before the screen that wants it has mounted. It
 * is therefore captured here, at module load, rather than inside a per-component hook (a hook mounted
 * later, such as the one in Settings, would never see it).
 */

/** The (non-standard, Chromium) install prompt event. */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void> | void;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface InstallState {
  /** A captured browser install prompt is waiting to be shown. */
  installable: boolean;
  /** The app is running as an installed app (or was just installed). */
  installed: boolean;
}

export type InstallResult = 'accepted' | 'dismissed' | 'unavailable' | 'error';

export interface InstallGuidance {
  platform: 'ios' | 'safari-mac' | 'generic';
  text: string;
}

interface NavigatorIOS extends Navigator {
  standalone?: boolean;
}

type Listener = () => void;

const detectInstalled = (): boolean => {
  if (typeof window === 'undefined') return false;
  const standalone =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  return standalone || (window.navigator as NavigatorIOS).standalone === true;
};

/** Pure: which manual instructions apply to this browser (used where no install prompt exists). */
export const getInstallGuidance = (userAgent: string, maxTouchPoints = 0): InstallGuidance => {
  // iPadOS 13+ reports itself as a Mac; touch support tells them apart
  const isIOS =
    /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
  if (isIOS) {
    return {
      platform: 'ios',
      text: 'To install on iPhone or iPad, tap the Share button, then choose “Add to Home Screen”.',
    };
  }
  const isSafari =
    /Safari\//.test(userAgent) && !/Chrome\/|Chromium\/|Edg\/|OPR\/|Firefox\//.test(userAgent);
  if (/Macintosh/.test(userAgent) && isSafari) {
    return {
      platform: 'safari-mac',
      text: 'To install in Safari, choose File, then “Add to Dock”.',
    };
  }
  return {
    platform: 'generic',
    text: 'This browser did not offer an install prompt. If it supports installing apps, look for “Install app” or “Add to Home screen” in the browser menu. Chrome, Edge and Safari support installing.',
  };
};

class PWAInstallManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private installed = detectInstalled();
  private snapshot: InstallState = { installable: false, installed: this.installed };
  private readonly listeners = new Set<Listener>();

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('beforeinstallprompt', this.handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', this.handleAppInstalled);
  }

  private handleBeforeInstallPrompt = (event: Event) => {
    // Stop the browser's own mini-infobar; we offer installation from our UI instead
    event.preventDefault();
    this.deferredPrompt = event as BeforeInstallPromptEvent;
    this.publish();
  };

  private handleAppInstalled = () => {
    this.installed = true;
    this.deferredPrompt = null;
    this.publish();
  };

  private publish() {
    this.snapshot = {
      installable: this.deferredPrompt !== null && !this.installed,
      installed: this.installed,
    };
    this.listeners.forEach(listener => listener());
  }

  /** Stable between changes (required by useSyncExternalStore). */
  getState = (): InstallState => this.snapshot;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Re-reads display-mode (it can change while the page is open, e.g. after installing). */
  refreshInstalled() {
    const installed = detectInstalled();
    if (installed !== this.installed) {
      this.installed = installed;
      this.publish();
    }
  }

  /** Shows the browser's install prompt. Never reloads the page. */
  async promptInstall(): Promise<InstallResult> {
    const deferred = this.deferredPrompt;
    if (!deferred) return 'unavailable';

    // A captured event can be used once, whatever the outcome
    this.deferredPrompt = null;
    this.publish();

    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === 'accepted') {
        logger.debug('PWA install accepted');
        return 'accepted';
      }
      logger.debug('PWA install dismissed');
      return 'dismissed';
    } catch (error) {
      logger.error('PWA install prompt failed', { error });
      return 'error';
    }
  }
}

export const pwaInstallManager = new PWAInstallManager();
