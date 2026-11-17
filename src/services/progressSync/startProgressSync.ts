import type { Store } from '@reduxjs/toolkit';
import type { RootState } from '../../store/store';
import { mergeRemoteProgress } from '../../store/gameSlice';
import { environmentConfig } from '../../config/environment';
import { logger } from '../logger';
import { remoteStorage } from '../storage/remoteStorage';
import { wordProgressStorage } from '../storageService';
import {
  PROGRESS_KEY,
  createProgressSync,
  type ProgressSync,
  type SyncResult,
} from './progressSync';

const newDeviceId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

let sync: ProgressSync | null = null;
let syncActive: () => Promise<SyncResult | undefined> = async () => undefined;

/**
 * Connect progress sync to the app: sync the active language at startup, when a device is linked
 * (see syncActiveLanguageProgress), when the network returns and when the learner switches
 * language; upload shortly after the last answer and when the page is hidden. Does nothing unless
 * remote sync is enabled and an account session exists. Returns a cleanup function.
 */
export function startProgressSync(store: Store<RootState>): () => void {
  sync?.dispose();
  const deviceId = newDeviceId();
  let applyingRemote = false;

  const instance = createProgressSync({
    isEnabled: () => environmentConfig.enableRemoteStorage,
    hasSession: () => remoteStorage.hasSession(),
    isOnline: () => typeof navigator === 'undefined' || navigator.onLine !== false,
    getRemote: languageCode => remoteStorage.getValue<unknown>(languageCode, PROGRESS_KEY),
    putRemote: (languageCode, blob) => remoteStorage.putValue(languageCode, PROGRESS_KEY, blob),
    loadLocal: languageCode => wordProgressStorage.load(languageCode),
    saveLocal: (languageCode, words) => wordProgressStorage.save(languageCode, words),
    isActiveLanguage: languageCode => store.getState().game.language === languageCode,
    applyToActive: (languageCode, words) => {
      applyingRemote = true; // a merge is not a learner answer: it must not schedule an upload
      try {
        store.dispatch(mergeRemoteProgress({ languageCode, words }));
      } finally {
        applyingRemote = false;
      }
    },
    deviceId: () => deviceId,
    warn: (message, context) => logger.warn(message, context),
  });
  sync = instance;

  const activeLanguage = (): string | undefined => store.getState().game.language || undefined;
  syncActive = async () => {
    const languageCode = activeLanguage();
    return languageCode ? instance.syncLanguage(languageCode) : undefined;
  };

  let lastLanguage: string | null | undefined = activeLanguage();
  let lastProgress = store.getState().game.wordProgress;
  const unsubscribe = store.subscribe(() => {
    const { language, wordProgress } = store.getState().game;
    if (language !== lastLanguage) {
      lastLanguage = language;
      lastProgress = wordProgress;
      if (language) void instance.syncLanguage(language);
      return;
    }
    if (wordProgress !== lastProgress) {
      lastProgress = wordProgress;
      if (!applyingRemote && language) instance.noteLocalChange(language);
    }
  });

  const onHidden = () => {
    if (document.visibilityState === 'hidden') void instance.flush();
  };
  const onPageHide = () => void instance.flush();
  const onOnline = () => void syncActive();
  document.addEventListener('visibilitychange', onHidden);
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('online', onOnline);

  return () => {
    unsubscribe();
    document.removeEventListener('visibilitychange', onHidden);
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('online', onOnline);
    instance.dispose();
    if (sync === instance) {
      sync = null;
      syncActive = async () => undefined;
    }
  };
}

/**
 * Stop progress sync and wait for any run in progress to end (before a reset, so an upload under way
 * cannot recreate what the reset deletes). Returns a function that resumes syncing.
 */
export const pauseProgressSync = async (): Promise<() => void> =>
  sync ? sync.pause() : () => undefined;

/**
 * Sync the active language now (after the session is set up, or after a device was linked).
 * Resolves with the outcome, or undefined when there is no active language.
 */
export const syncActiveLanguageProgress = (): Promise<SyncResult | undefined> => syncActive();
