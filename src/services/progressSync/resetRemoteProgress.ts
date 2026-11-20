import type { WordProgress } from '../../store/types';
import { environmentConfig } from '../../config/environment';
import { remoteStorage } from '../storage/remoteStorage';
import { MAX_BLOB_BYTES, buildProgressBlob } from './mergeProgress';
import { PROGRESS_KEY } from './progressSync';

/** True when progress sync is configured (the flag is on): resets must then also reach the server. */
export const isProgressSyncActive = (): boolean => environmentConfig.enableRemoteStorage;

const requireSession = (): void => {
  if (!remoteStorage.hasSession()) {
    // Without an account session the synced copy cannot be removed, and it would simply come
    // back at the next sync: refuse rather than reset on this device only
    throw new Error('progress-sync: no account session, so the synced copy cannot be updated');
  }
};

/**
 * Remove the server's copy of the given languages' progress. Used when the learner resets progress
 * on this device: without it the next sync would simply restore what was just reset. Does nothing
 * when sync is not configured. Throws if the server cannot confirm (or there is no account
 * session), so the caller can stop and leave local progress alone: a reset that quietly comes back
 * is worse than a reset that did not happen. Other linked devices keep their own copy; it returns
 * here when they next sync. Languages are removed one by one, so a failure part way leaves the
 * earlier ones removed.
 *
 * Callers MUST first `await pauseProgressSync()` (startProgressSync.ts) and keep sync paused until
 * the page reloads: otherwise a run that is already in flight can recreate the server copy or merge
 * the old progress back. Resume only if the reset is abandoned.
 */
export async function resetRemoteProgress(languageCodes: string[]): Promise<void> {
  if (!isProgressSyncActive()) return;
  requireSession();
  for (const languageCode of languageCodes) {
    await remoteStorage.deleteValue(languageCode, PROGRESS_KEY);
  }
}

/**
 * Make the server's copy of one language equal to `words` (a partial reset, such as one module).
 * An empty map removes the copy. Throws when the server cannot confirm, like resetRemoteProgress.
 */
export async function replaceRemoteProgress(
  languageCode: string,
  words: { [wordId: string]: WordProgress }
): Promise<void> {
  if (!isProgressSyncActive()) return;
  requireSession();
  if (Object.keys(words).length === 0) {
    await remoteStorage.deleteValue(languageCode, PROGRESS_KEY);
    return;
  }
  const { blob, bytes } = buildProgressBlob(words, 'reset');
  if (bytes > MAX_BLOB_BYTES) {
    throw new Error('progress-sync: progress is too large to upload');
  }
  await remoteStorage.putValue(languageCode, PROGRESS_KEY, blob);
}
