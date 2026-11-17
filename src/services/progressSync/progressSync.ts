import type { WordProgress } from '../../store/types';
import {
  MAX_BLOB_BYTES,
  buildProgressBlob,
  mergeWordProgress,
  parseProgressBlob,
  sameWords,
} from './mergeProgress';

/** Server key (inside the language's bucket) that holds one language's progress. */
export const PROGRESS_KEY = 'progress_v1';

/** Quiet period after the last answer before progress is uploaded. */
export const UPLOAD_DEBOUNCE_MS = 5000;

type WordMap = { [wordId: string]: WordProgress };

export type SyncStatus =
  | 'skipped' // sync is off, no session, offline, or an empty language: nothing was attempted
  | 'unchanged' // local and remote already agree
  | 'merged' // remote words were folded into local progress
  | 'uploaded' // local progress was written to the server
  | 'failed'; // something went wrong; local progress was not changed by this run

export interface SyncResult {
  status: SyncStatus;
  /** Words taken from the server (new, or a later practice time than the local copy). */
  takenFromRemote: number;
  uploaded: boolean;
}

/** Everything the service touches, so it can be tested without a browser or a server. */
export interface ProgressSyncDeps {
  isEnabled(): boolean;
  hasSession(): boolean;
  isOnline(): boolean;
  /**
   * Try to establish the account session (the app may have started offline). Resolves true when one
   * exists afterwards; never rejects. Optional: without it a missing session skips the run.
   */
  ensureSession?(): Promise<boolean>;
  /** undefined when the language has nothing stored on the server; throws on any failure. */
  getRemote(languageCode: string): Promise<unknown>;
  putRemote(languageCode: string, blob: unknown): Promise<void>;
  /** Local progress of ONE language (the source of truth). */
  loadLocal(languageCode: string): WordMap;
  saveLocal(languageCode: string, words: WordMap): void;
  isActiveLanguage(languageCode: string): boolean;
  /** Fold words into the active language's in-memory progress (and persist them at once). */
  applyToActive(languageCode: string, words: WordMap): void;
  deviceId(): string;
  warn(message: string, context?: Record<string, unknown>): void;
  now?(): number;
}

const SKIPPED: SyncResult = { status: 'skipped', takenFromRemote: 0, uploaded: false };
const FAILED: SyncResult = { status: 'failed', takenFromRemote: 0, uploaded: false };

const errorName = (error: unknown): string => (error instanceof Error ? error.name : 'Error');

/**
 * Local-first progress sync. localStorage stays the source of truth; this reads one blob per
 * language from the server, merges it into local progress word by word (never deleting a local
 * word), and writes the merged result back only when it differs from what the server holds.
 *
 * Safety rules (each is covered by a test):
 * - nothing is uploaded unless the server blob was read successfully AND entirely understood (an
 *   unreadable or newer-schema blob, or one with entries this version cannot read, is left alone,
 *   never overwritten) and the merged map is not empty
 * - a failed read never changes local progress (a merge already saved locally is kept if the
 *   upload then fails: it only adds words)
 * - nothing is uploaded unless the merge reached local storage, so a failed local save cannot
 *   turn into a server blob that lacks the remote words
 * - a paused service (a reset is running) neither applies nor uploads anything
 * - the upload is built from the language's own local data, never from whatever is active after an
 *   `await`, so languages cannot mix
 * - equal content means no upload, so a merge cannot trigger a chain of uploads
 */
export function createProgressSync(deps: ProgressSyncDeps) {
  const inFlight = new Map<string, Promise<SyncResult>>();
  const rerun = new Set<string>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  let paused = false;

  const run = async (languageCode: string): Promise<SyncResult> => {
    if (paused || !deps.isEnabled() || !deps.isOnline()) return SKIPPED;
    if (!deps.hasSession()) {
      if (!deps.ensureSession || !(await deps.ensureSession())) return SKIPPED;
      if (paused) return SKIPPED;
    }

    let remoteRaw: unknown;
    try {
      remoteRaw = await deps.getRemote(languageCode);
    } catch (error) {
      deps.warn('progress-sync: reading remote progress failed; local progress left as is', {
        languageCode,
        error: errorName(error),
      });
      return FAILED;
    }

    if (paused) return SKIPPED; // a reset began while we were reading: apply and upload nothing

    let remoteWords: WordMap = {};
    let unreadableEntries = 0;
    if (remoteRaw !== undefined) {
      const parsed = parseProgressBlob(remoteRaw);
      if (parsed === null) {
        // Corrupt, or written by a newer app version: do not touch it, do not overwrite it
        deps.warn('progress-sync: remote progress is unreadable; skipping this language', {
          languageCode,
        });
        return FAILED;
      }
      if (parsed.dropped > 0) {
        deps.warn('progress-sync: some remote entries were invalid and ignored', {
          languageCode,
          dropped: parsed.dropped,
        });
      }
      remoteWords = parsed.words;
      unreadableEntries = parsed.dropped;
    }

    // From here to the end of the merge there is no `await`: the language cannot switch under us
    let takenFromRemote = 0;
    let expected: WordMap = {};
    try {
      const local = deps.loadLocal(languageCode);
      const { merged, takenFromRemote: taken } = mergeWordProgress(
        local,
        remoteWords,
        deps.now?.()
      );
      takenFromRemote = taken;
      expected = merged;
      if (taken > 0) {
        if (deps.isActiveLanguage(languageCode)) {
          deps.applyToActive(languageCode, remoteWords);
        } else {
          deps.saveLocal(languageCode, merged);
        }
      }
    } catch (error) {
      deps.warn('progress-sync: applying remote progress failed', {
        languageCode,
        error: errorName(error),
      });
      return FAILED;
    }

    const finalWords = deps.loadLocal(languageCode);
    if (takenFromRemote > 0 && !sameWords(finalWords, expected)) {
      // Local storage did not take the merge (full or blocked): uploading now would overwrite the
      // server blob with a map that lacks the remote words
      deps.warn('progress-sync: local progress could not be saved; nothing uploaded', {
        languageCode,
      });
      return { status: 'failed', takenFromRemote, uploaded: false };
    }
    if (unreadableEntries > 0) {
      // The server blob holds entries this app version cannot read (for example written by a newer
      // version). Uploading would erase them, so only the readable part was merged locally.
      deps.warn('progress-sync: remote progress has unreadable entries; not uploading', {
        languageCode,
        unreadableEntries,
      });
      return { status: 'failed', takenFromRemote, uploaded: false };
    }
    if (Object.keys(finalWords).length === 0 || sameWords(finalWords, remoteWords)) {
      return {
        status: takenFromRemote > 0 ? 'merged' : 'unchanged',
        takenFromRemote,
        uploaded: false,
      };
    }

    const { blob, bytes } = buildProgressBlob(finalWords, deps.deviceId(), deps.now?.());
    if (bytes > MAX_BLOB_BYTES) {
      deps.warn('progress-sync: progress is too large to upload', {
        languageCode,
        bytes,
        limit: MAX_BLOB_BYTES,
      });
      return { status: 'failed', takenFromRemote, uploaded: false };
    }
    try {
      await deps.putRemote(languageCode, blob);
    } catch (error) {
      deps.warn('progress-sync: uploading progress failed; it stays on this device', {
        languageCode,
        error: errorName(error),
      });
      return { status: 'failed', takenFromRemote, uploaded: false };
    }
    return { status: 'uploaded', takenFromRemote, uploaded: true };
  };

  /** Never rejects: an unexpected error becomes a failed result and a named warning. */
  const safeRun = async (languageCode: string): Promise<SyncResult> => {
    try {
      return await run(languageCode);
    } catch (error) {
      try {
        deps.warn('progress-sync: unexpected error; local progress left as is', {
          languageCode,
          error: errorName(error),
        });
      } catch {
        // a failing logger must not turn into an unhandled rejection
      }
      return FAILED;
    }
  };

  /** One sync per language at a time; a request made meanwhile runs once more afterwards. */
  const syncLanguage = (languageCode: string): Promise<SyncResult> => {
    if (paused) return Promise.resolve(SKIPPED);
    const running = inFlight.get(languageCode);
    if (running) {
      rerun.add(languageCode);
      return running;
    }
    const promise = (async () => {
      try {
        let result = await safeRun(languageCode);
        while (rerun.delete(languageCode)) {
          result = await safeRun(languageCode);
        }
        return result;
      } finally {
        inFlight.delete(languageCode);
      }
    })();
    inFlight.set(languageCode, promise);
    return promise;
  };

  /** Call after every answer: syncs once the learner has been quiet for a while. */
  const noteLocalChange = (languageCode: string): void => {
    if (paused || !deps.isEnabled()) return;
    const pending = timers.get(languageCode);
    if (pending) clearTimeout(pending);
    timers.set(
      languageCode,
      setTimeout(() => {
        timers.delete(languageCode);
        void syncLanguage(languageCode);
      }, UPLOAD_DEBOUNCE_MS)
    );
  };

  /** Sync every language with a pending change now (the page is being hidden or closed). */
  const flush = (): Promise<SyncResult[]> => {
    const languages = [...timers.keys()];
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
    return Promise.all(languages.map(syncLanguage));
  };

  const dispose = (): void => {
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
  };

  /**
   * Stop syncing and wait for every run in progress to end. Used before a reset: an upload already
   * under way would otherwise recreate the server copy that was just deleted. Returns a function
   * that resumes syncing (call it if the reset is abandoned).
   */
  const pause = async (): Promise<() => void> => {
    paused = true;
    dispose();
    await Promise.all([...inFlight.values()].map(promise => promise.catch(() => undefined)));
    return () => {
      paused = false;
    };
  };

  return { syncLanguage, noteLocalChange, flush, dispose, pause };
}

export type ProgressSync = ReturnType<typeof createProgressSync>;
