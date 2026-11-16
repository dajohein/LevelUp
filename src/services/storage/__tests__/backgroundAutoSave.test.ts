import BackgroundAutoSave from '../backgroundAutoSave';
import type { enhancedStorage } from '../enhancedStorage';
import type { StorageResult } from '../interfaces';
import type { WordProgress } from '../../../store/types';

type SaveProvider = Pick<
  typeof enhancedStorage,
  'saveWordProgress' | 'saveGameState' | 'saveSessionState' | 'saveAchievements'
>;

const progress = (xp: number): Record<string, WordProgress> => ({
  word: {
    wordId: 'word',
    xp,
    timesCorrect: 1,
    timesIncorrect: 0,
    lastPracticed: '2026-11-08T08:00:00.000Z',
  },
});

function deferred() {
  let resolve!: (result: StorageResult<void>) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<StorageResult<void>>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('BackgroundAutoSave', () => {
  let storage: jest.Mocked<SaveProvider>;
  let logger: { debug: jest.Mock; error: jest.Mock };
  let autoSave: BackgroundAutoSave;

  beforeEach(() => {
    jest.useFakeTimers();
    storage = {
      saveWordProgress: jest.fn().mockResolvedValue({ success: true }),
      saveGameState: jest.fn().mockResolvedValue({ success: true }),
      saveSessionState: jest.fn().mockResolvedValue({ success: true }),
      saveAchievements: jest.fn().mockResolvedValue({ success: true }),
    };
    logger = { debug: jest.fn(), error: jest.fn() };
    autoSave = new BackgroundAutoSave(storage, logger, {
      interval: 1000,
      idleThreshold: 100,
    });
  });

  afterEach(() => {
    autoSave.stop();
    Reflect.deleteProperty(window, '__SAVE_ANALYTICS__');
    jest.useRealTimers();
  });

  it.each(['gameState', 'sessionState', 'achievements'] as const)(
    'retains unsuccessful %s snapshots just like word progress',
    async type => {
      storage.saveGameState.mockResolvedValueOnce({ success: false, error: 'Offline' });
      storage.saveSessionState.mockResolvedValueOnce({ success: false, error: 'Offline' });
      storage.saveAchievements.mockResolvedValueOnce({ success: false, error: 'Offline' });
      autoSave.queueChange(type, { revision: 1 });
      await expect(autoSave.forceSave()).rejects.toThrow(type);
      expect(autoSave.getStatus().pendingChanges).toBe(1);
      await autoSave.forceSave();
      expect(autoSave.getStatus()).toMatchObject({ pendingChanges: 0, lastError: null });
    }
  );

  it.each(['rejection', 'unsuccessful result', 'synchronous throw'])(
    'retains and reports a failed write (%s), then retries it',
    async failure => {
      if (failure === 'rejection') {
        storage.saveWordProgress.mockRejectedValueOnce(new Error('Quota exceeded'));
      } else if (failure === 'synchronous throw') {
        storage.saveWordProgress.mockImplementationOnce(() => {
          throw new Error('Quota exceeded');
        });
      } else {
        storage.saveWordProgress.mockResolvedValueOnce({
          success: false,
          error: 'Quota exceeded',
        });
      }
      autoSave.queueChange('wordProgress', progress(10), 'de');

      await expect(autoSave.forceSave()).rejects.toThrow('wordProgress:de');

      expect(autoSave.getStatus()).toMatchObject({
        pendingChanges: 1,
        isProcessing: false,
        lastError: expect.stringContaining('Quota exceeded'),
      });
      expect(logger.error).toHaveBeenCalled();
      expect(logger.debug.mock.calls.some(([message]) => message.includes('save completed'))).toBe(
        false
      );

      await autoSave.forceSave();

      expect(storage.saveWordProgress).toHaveBeenLastCalledWith('de', progress(10));
      expect(autoSave.getStatus()).toMatchObject({ pendingChanges: 0, lastError: null });
    }
  );

  it('retries only failed keys and keeps languages isolated', async () => {
    storage.saveWordProgress.mockImplementation(async languageCode => ({
      success: languageCode !== 'de',
      error: languageCode === 'de' ? 'Quota exceeded' : undefined,
    }));
    autoSave.queueChange('wordProgress', progress(10), 'de');
    autoSave.queueChange('wordProgress', progress(20), 'es');
    autoSave.queueChange('gameState', { language: 'es' });
    autoSave.queueChange('sessionState', { id: 'session' });
    autoSave.queueChange('achievements', { unlocked: [] });

    await expect(autoSave.forceSave()).rejects.toThrow('wordProgress:de');
    expect(autoSave.getStatus().pendingChanges).toBe(1);
    storage.saveWordProgress.mockResolvedValue({ success: true });

    await autoSave.forceSave();

    expect(storage.saveWordProgress.mock.calls).toEqual([
      ['de', progress(10)],
      ['es', progress(20)],
      ['de', progress(10)],
    ]);
    expect(storage.saveGameState).toHaveBeenCalledTimes(1);
    expect(storage.saveSessionState).toHaveBeenCalledTimes(1);
    expect(storage.saveAchievements).toHaveBeenCalledTimes(1);
  });

  it('never replaces newer edits with an older failed snapshot', async () => {
    const write = deferred();
    storage.saveWordProgress.mockReturnValueOnce(write.promise);
    autoSave.queueChange('wordProgress', progress(10), 'de');
    const flush = autoSave.forceSave();
    const failure = expect(flush).rejects.toThrow('wordProgress:de');
    autoSave.queueChange('wordProgress', progress(30), 'de');
    autoSave.queueChange('wordProgress', progress(40), 'es');
    write.reject(new Error('Offline'));
    await failure;

    expect(autoSave.getStatus().pendingChanges).toBe(2);
    await autoSave.forceSave();

    expect(storage.saveWordProgress.mock.calls).toEqual([
      ['de', progress(10)],
      ['de', progress(30)],
      ['es', progress(40)],
    ]);
  });

  it('awaits an in-flight write for every concurrent forceSave caller', async () => {
    const write = deferred();
    storage.saveWordProgress.mockReturnValueOnce(write.promise);
    autoSave.queueChange('wordProgress', progress(10), 'de');
    const first = autoSave.forceSave();
    const finished = jest.fn();
    const second = autoSave.forceSave().then(finished);
    await jest.advanceTimersByTimeAsync(0);

    expect(finished).not.toHaveBeenCalled();
    expect(autoSave.getStatus().isProcessing).toBe(true);
    write.resolve({ success: true });
    await Promise.all([first, second]);
    expect(finished).toHaveBeenCalledTimes(1);
    expect(autoSave.getStatus().isProcessing).toBe(false);
  });

  it('drains newer edits queued during a successful write before resolving concurrent flushes', async () => {
    const firstWrite = deferred();
    const secondWrite = deferred();
    storage.saveWordProgress
      .mockReturnValueOnce(firstWrite.promise)
      .mockReturnValueOnce(secondWrite.promise);
    autoSave.queueChange('wordProgress', progress(10), 'de');
    const firstFinished = jest.fn();
    const first = autoSave.forceSave().then(firstFinished);
    autoSave.queueChange('wordProgress', progress(20), 'de');
    autoSave.queueChange('wordProgress', progress(30), 'es');
    const secondFinished = jest.fn();
    const second = autoSave.forceSave().then(secondFinished);

    firstWrite.resolve({ success: true });
    await jest.advanceTimersByTimeAsync(0);
    expect(storage.saveWordProgress).toHaveBeenCalledTimes(3);
    expect(firstFinished).not.toHaveBeenCalled();
    expect(secondFinished).not.toHaveBeenCalled();
    secondWrite.resolve({ success: true });
    await Promise.all([first, second]);

    expect(storage.saveWordProgress.mock.calls).toEqual([
      ['de', progress(10)],
      ['de', progress(20)],
      ['es', progress(30)],
    ]);
    expect(autoSave.getStatus().pendingChanges).toBe(0);
  });

  it('reports an in-flight failure to concurrent flush callers without looping retries', async () => {
    const write = deferred();
    storage.saveWordProgress.mockReturnValueOnce(write.promise);
    autoSave.queueChange('wordProgress', progress(10), 'de');
    const first = expect(autoSave.forceSave()).rejects.toThrow('Offline');
    const second = expect(autoSave.forceSave()).rejects.toThrow('Offline');
    write.resolve({ success: false, error: 'Offline' });
    await Promise.all([first, second]);

    expect(storage.saveWordProgress).toHaveBeenCalledTimes(1);
    expect(autoSave.getStatus().pendingChanges).toBe(1);
  });

  it('cleanup waits for in-flight work and drains queued edits after stopping timers', async () => {
    const write = deferred();
    storage.saveWordProgress.mockReturnValueOnce(write.promise);
    autoSave.queueChange('wordProgress', progress(10), 'de');
    await jest.advanceTimersByTimeAsync(100);
    expect(autoSave.getStatus()).toMatchObject({ isProcessing: true, pendingChanges: 0 });
    autoSave.queueChange('wordProgress', progress(20), 'de');
    const finished = jest.fn();
    const cleanup = autoSave.cleanup().then(finished);
    autoSave.queueChange('wordProgress', progress(30), 'de');
    await Promise.resolve();
    expect(finished).not.toHaveBeenCalled();
    write.resolve({ success: true });
    await cleanup;

    expect(storage.saveWordProgress).toHaveBeenLastCalledWith('de', progress(30));
    expect(jest.getTimerCount()).toBe(0);
  });

  it('cleanup reports failure even when the pending queue was empty during an active write', async () => {
    const write = deferred();
    storage.saveWordProgress.mockReturnValueOnce(write.promise);
    autoSave.queueChange('wordProgress', progress(10), 'de');
    await jest.advanceTimersByTimeAsync(100);
    const cleanup = expect(autoSave.cleanup()).rejects.toThrow('Offline');
    write.reject(new Error('Offline'));
    await cleanup;
    expect(autoSave.getStatus().pendingChanges).toBe(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('logs idle failures and retries on the interval without blocking queueChange', async () => {
    storage.saveWordProgress.mockResolvedValueOnce({ success: false, error: 'Offline' });
    expect(autoSave.queueChange('wordProgress', progress(10), 'de')).toBeUndefined();
    await jest.advanceTimersByTimeAsync(100);
    expect(autoSave.getStatus()).toMatchObject({
      pendingChanges: 1,
      isProcessing: false,
      lastError: expect.stringContaining('Offline'),
    });
    expect(logger.error).toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(900);
    expect(storage.saveWordProgress).toHaveBeenCalledTimes(2);
    expect(autoSave.getStatus()).toMatchObject({ pendingChanges: 0, lastError: null });
  });

  it('reports unscoped word progress instead of silently dropping it', async () => {
    autoSave.queueChange('wordProgress', progress(10));
    await expect(autoSave.forceSave()).rejects.toThrow('Language code required');
    expect(storage.saveWordProgress).not.toHaveBeenCalled();
    expect(autoSave.getStatus().pendingChanges).toBe(1);
  });

  it('records analytics only for fully successful batches', async () => {
    const recordBackgroundSave = jest.fn();
    Object.defineProperty(window, '__SAVE_ANALYTICS__', {
      configurable: true,
      value: { recordBackgroundSave },
    });
    storage.saveWordProgress.mockResolvedValueOnce({ success: false, error: 'Offline' });
    autoSave.queueChange('wordProgress', progress(10), 'de');
    autoSave.queueChange('gameState', { language: 'de' });
    await expect(autoSave.forceSave()).rejects.toThrow('Offline');
    expect(recordBackgroundSave).not.toHaveBeenCalled();
    await autoSave.forceSave();
    expect(recordBackgroundSave).toHaveBeenCalledWith({
      trigger: 'manual',
      changeCount: 1,
      duration: expect.any(Number),
      timestamp: expect.any(Number),
    });
  });

  it('shares a max-pending background write with explicit flushes', async () => {
    autoSave.updateConfig({ maxPendingActions: 1 });
    const write = deferred();
    storage.saveWordProgress.mockReturnValueOnce(write.promise);
    autoSave.queueChange('wordProgress', progress(10), 'de');
    const finished = jest.fn();
    const flush = autoSave.forceSave().then(finished);
    await jest.advanceTimersByTimeAsync(0);
    expect(storage.saveWordProgress).toHaveBeenCalledTimes(1);
    expect(finished).not.toHaveBeenCalled();
    write.resolve({ success: true });
    await flush;
    expect(finished).toHaveBeenCalledTimes(1);
  });
});
