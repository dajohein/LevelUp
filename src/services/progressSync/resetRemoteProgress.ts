import { environmentConfig } from '../../config/environment';
import { remoteStorage } from '../storage/remoteStorage';
import { PROGRESS_KEY } from './progressSync';

/** True when progress is being synced to an account (sync enabled and a session exists). */
export const isProgressSyncActive = (): boolean =>
  environmentConfig.enableRemoteStorage && remoteStorage.hasSession();

/**
 * Remove the server's copy of the given languages' progress. Used when the learner resets progress
 * on this device: without it the next sync would simply restore what was just reset. Does nothing
 * when sync is not active. Throws if the server cannot confirm, so the caller can stop and leave
 * local progress alone (a reset that quietly comes back is worse than a reset that did not happen).
 * Other linked devices keep their own copy; it returns here when they next sync.
 */
export async function resetRemoteProgress(languageCodes: string[]): Promise<void> {
  if (!isProgressSyncActive()) return;
  for (const languageCode of languageCodes) {
    await remoteStorage.deleteValue(languageCode, PROGRESS_KEY);
  }
}
