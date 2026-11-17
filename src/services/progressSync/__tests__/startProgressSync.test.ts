import { configureStore } from '@reduxjs/toolkit';
import gameReducer, { setLanguage, updateWordProgress } from '../../../store/gameSlice';
import sessionReducer from '../../../store/sessionSlice';
import achievementsReducer from '../../../store/achievementsSlice';
import { persistenceMiddleware, persistenceUtils } from '../../../store/persistenceMiddleware';
import type { RootState } from '../../../store/store';
import type { WordProgress } from '../../../store/types';
import { remoteStorage } from '../../storage/remoteStorage';
import { environmentConfig } from '../../../config/environment';
import {
  pauseProgressSync,
  startProgressSync,
  syncActiveLanguageProgress,
} from '../startProgressSync';
import { buildProgressBlob } from '../mergeProgress';
import { PROGRESS_KEY, UPLOAD_DEBOUNCE_MS } from '../progressSync';

jest.mock('../../storage/remoteStorage', () => ({
  remoteStorage: {
    hasSession: jest.fn(),
    getValue: jest.fn(),
    putValue: jest.fn(),
  },
}));
jest.mock('../../../config/environment', () => ({
  environmentConfig: { enableRemoteStorage: true },
}));
jest.mock('../../logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../storage/enhancedStorage', () => ({
  enhancedStorage: {
    saveAchievements: jest.fn().mockResolvedValue({ success: true }),
    saveGameState: jest.fn().mockResolvedValue({ success: true }),
    saveSessionState: jest.fn().mockResolvedValue({ success: true }),
    saveWordProgress: jest.fn().mockResolvedValue({ success: true }),
  },
}));

const remote = remoteStorage as unknown as {
  hasSession: jest.Mock;
  getValue: jest.Mock;
  putValue: jest.Mock;
};
const config = environmentConfig as { enableRemoteStorage: boolean };

const entry = (wordId: string, overrides: Partial<WordProgress> = {}): WordProgress => ({
  wordId,
  xp: 10,
  lastPracticed: '2025-01-01T00:00:00.000Z',
  timesCorrect: 1,
  timesIncorrect: 0,
  ...overrides,
});

const createStore = () =>
  configureStore({
    reducer: { game: gameReducer, session: sessionReducer, achievements: achievementsReducer },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(persistenceMiddleware),
  });

const settle = () => jest.advanceTimersByTimeAsync(0);

const setVisibility = (state: 'hidden' | 'visible') =>
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });

let testClock = Date.now();

describe('startProgressSync wiring', () => {
  let store: ReturnType<typeof createStore>;
  let cleanup: (() => void) | undefined;
  let answerCount = 0;

  // A learner answer: replaces one word in state.game.wordProgress (updateWordProgress, the
  // single-word form; it changes wordProgress without needing a loaded course word)
  const answer = () => {
    answerCount += 1;
    store.dispatch(
      updateWordProgress({
        wordId: 'w1',
        progress: entry('w1', { xp: answerCount, timesCorrect: answerCount }),
      })
    );
  };

  const start = () => {
    cleanup = startProgressSync(store as unknown as Parameters<typeof startProgressSync>[0]);
  };

  beforeEach(() => {
    jest.useFakeTimers();
    // wordProgressStorage skips an identical save made within 100ms of the last one for the same
    // language; give every test its own distant clock so one test cannot swallow the next one's save
    testClock += 60_000;
    jest.setSystemTime(testClock);
    localStorage.clear();
    localStorage.setItem(
      'levelup_word_progress',
      JSON.stringify({ de: { local: entry('local') }, es: { eslocal: entry('eslocal') } })
    );
    config.enableRemoteStorage = true;
    remote.hasSession.mockReset().mockReturnValue(true);
    remote.getValue.mockReset().mockResolvedValue(undefined);
    remote.putValue.mockReset().mockResolvedValue(undefined);
    setVisibility('visible');
    answerCount = 0;
    store = createStore();
    store.dispatch(setLanguage('de'));
  });

  afterEach(async () => {
    cleanup?.();
    cleanup = undefined;
    await persistenceUtils.cleanup();
    jest.useRealTimers();
  });

  it('does nothing when remote sync is disabled', async () => {
    config.enableRemoteStorage = false;
    start();
    await syncActiveLanguageProgress();
    answer();
    store.dispatch(setLanguage('es'));
    window.dispatchEvent(new Event('online'));
    window.dispatchEvent(new Event('pagehide'));
    setVisibility('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    await jest.advanceTimersByTimeAsync(UPLOAD_DEBOUNCE_MS * 3);
    expect(remote.getValue).not.toHaveBeenCalled();
    expect(remote.putValue).not.toHaveBeenCalled();
    expect(remote.hasSession).not.toHaveBeenCalled();
  });

  it('syncs the active language only, with the progress key, when a session exists', async () => {
    start();
    await syncActiveLanguageProgress();
    expect(remote.getValue).toHaveBeenCalledTimes(1);
    expect(remote.getValue).toHaveBeenCalledWith('de', PROGRESS_KEY);
    expect(PROGRESS_KEY).toBe('progress_v1');
    expect(remote.getValue.mock.calls.some(call => call[0] === 'es')).toBe(false);
  });

  it('does not read the server without a session', async () => {
    remote.hasSession.mockReturnValue(false);
    start();
    await syncActiveLanguageProgress();
    expect(remote.getValue).not.toHaveBeenCalled();
    expect(remote.putValue).not.toHaveBeenCalled();
  });

  it('syncs the NEW language after a language switch', async () => {
    start();
    store.dispatch(setLanguage('es'));
    await settle();
    expect(remote.getValue).toHaveBeenCalledTimes(1);
    expect(remote.getValue).toHaveBeenCalledWith('es', PROGRESS_KEY);
  });

  it('uploads once, after the debounce, however many answers fall inside the window', async () => {
    start();
    answer();
    await jest.advanceTimersByTimeAsync(UPLOAD_DEBOUNCE_MS - 1000);
    answer();
    await jest.advanceTimersByTimeAsync(UPLOAD_DEBOUNCE_MS - 1000);
    answer();
    expect(remote.getValue).not.toHaveBeenCalled();
    expect(remote.putValue).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(UPLOAD_DEBOUNCE_MS - 1);
    expect(remote.putValue).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(remote.getValue).toHaveBeenCalledTimes(1);
    expect(remote.getValue).toHaveBeenCalledWith('de', PROGRESS_KEY);
    expect(remote.putValue).toHaveBeenCalledTimes(1);
    expect(remote.putValue.mock.calls[0][0]).toBe('de');
    expect(remote.putValue.mock.calls[0][1]).toBe(PROGRESS_KEY);

    await jest.advanceTimersByTimeAsync(UPLOAD_DEBOUNCE_MS * 4);
    expect(remote.putValue).toHaveBeenCalledTimes(1);
  });

  it('does not schedule an upload for the merge itself (applyingRemote)', async () => {
    const { blob } = buildProgressBlob({ remoteWord: entry('remoteWord') }, 'other-device');
    remote.getValue.mockResolvedValue(blob);
    start();

    await syncActiveLanguageProgress();
    // The remote word really was merged into the store
    expect(store.getState().game.wordProgress.remoteWord).toBeDefined();
    expect(store.getState().game.wordProgress.local).toBeDefined();
    // Local has a word the server lacks: this run uploads once to converge
    expect(remote.putValue).toHaveBeenCalledTimes(1);
    expect(remote.getValue).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(UPLOAD_DEBOUNCE_MS * 4);
    expect(remote.getValue).toHaveBeenCalledTimes(1);
    expect(remote.putValue).toHaveBeenCalledTimes(1);
  });

  it('flushes a pending change at once when the page becomes hidden', async () => {
    start();
    answer();
    expect(remote.getValue).not.toHaveBeenCalled();
    setVisibility('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    await settle();
    expect(remote.getValue).toHaveBeenCalledWith('de', PROGRESS_KEY);
    expect(remote.putValue).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(UPLOAD_DEBOUNCE_MS * 2);
    expect(remote.putValue).toHaveBeenCalledTimes(1);
  });

  it('does not flush when visibility changes to visible', async () => {
    start();
    answer();
    setVisibility('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    await settle();
    expect(remote.getValue).not.toHaveBeenCalled();
  });

  it('flushes a pending change at once on pagehide', async () => {
    start();
    answer();
    window.dispatchEvent(new Event('pagehide'));
    await settle();
    expect(remote.getValue).toHaveBeenCalledWith('de', PROGRESS_KEY);
    expect(remote.putValue).toHaveBeenCalledTimes(1);
  });

  it('syncs the active language when the browser comes back online', async () => {
    start();
    window.dispatchEvent(new Event('online'));
    await settle();
    expect(remote.getValue).toHaveBeenCalledTimes(1);
    expect(remote.getValue).toHaveBeenCalledWith('de', PROGRESS_KEY);
  });

  describe('pauseProgressSync', () => {
    it('with no sync running, resolves to a function that does nothing', async () => {
      const resume = await pauseProgressSync();
      expect(typeof resume).toBe('function');
      expect(resume()).toBeUndefined();
      expect(remote.getValue).not.toHaveBeenCalled();
      expect(remote.putValue).not.toHaveBeenCalled();
    });

    it('while paused, a language switch and an answer start no sync and schedule no upload', async () => {
      start();
      await pauseProgressSync();

      store.dispatch(setLanguage('es'));
      answer();
      window.dispatchEvent(new Event('online'));
      await settle();
      await jest.advanceTimersByTimeAsync(UPLOAD_DEBOUNCE_MS * 3);

      expect(remote.getValue).not.toHaveBeenCalled();
      expect(remote.putValue).not.toHaveBeenCalled();
    });

    it('drops an upload that was already scheduled', async () => {
      start();
      answer();
      await pauseProgressSync();
      await jest.advanceTimersByTimeAsync(UPLOAD_DEBOUNCE_MS * 3);
      expect(remote.getValue).not.toHaveBeenCalled();
      expect(remote.putValue).not.toHaveBeenCalled();
    });

    it('syncs again after the returned function is called', async () => {
      start();
      const resume = await pauseProgressSync();
      store.dispatch(setLanguage('es'));
      await settle();
      expect(remote.getValue).not.toHaveBeenCalled();

      resume();
      store.dispatch(setLanguage('de'));
      await settle();
      expect(remote.getValue).toHaveBeenCalledTimes(1);
      expect(remote.getValue).toHaveBeenCalledWith('de', PROGRESS_KEY);

      remote.putValue.mockClear();
      answer();
      await jest.advanceTimersByTimeAsync(UPLOAD_DEBOUNCE_MS);
      expect(remote.putValue).toHaveBeenCalledTimes(1);
    });
  });

  it('cleanup removes the listeners and the store subscription', async () => {
    start();
    answer();
    cleanup?.();
    cleanup = undefined;

    await jest.advanceTimersByTimeAsync(UPLOAD_DEBOUNCE_MS * 2); // the pending timer is cancelled
    answer();
    store.dispatch(setLanguage('es'));
    window.dispatchEvent(new Event('online'));
    window.dispatchEvent(new Event('pagehide'));
    setVisibility('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    await syncActiveLanguageProgress();
    await jest.advanceTimersByTimeAsync(UPLOAD_DEBOUNCE_MS * 2);

    expect(remote.getValue).not.toHaveBeenCalled();
    expect(remote.putValue).not.toHaveBeenCalled();
  });
});

// Keep the RootState import meaningful: the real store is structurally the app's store
const _typeCheck = (s: ReturnType<typeof createStore>): RootState['game'] => s.getState().game;
void _typeCheck;
