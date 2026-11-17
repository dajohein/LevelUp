import type { WordProgress } from '../types';

type WordMap = { [wordId: string]: WordProgress };

const entry = (wordId: string, overrides: Partial<WordProgress> = {}): WordProgress => ({
  wordId,
  xp: 10,
  lastPracticed: '2025-01-01T00:00:00.000Z',
  timesCorrect: 1,
  timesIncorrect: 0,
  ...overrides,
});

const STORAGE_KEY = 'levelup_word_progress';
const stored = (): Record<string, WordMap> => JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

describe('game/mergeRemoteProgress (reducer + real persistence middleware)', () => {
  type Utils = typeof import('../persistenceMiddleware').persistenceUtils;
  let persistenceUtils: Utils | undefined;

  const createStore = async (seed: Record<string, WordMap>) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    jest.doMock('../../services/storage/enhancedStorage', () => ({
      enhancedStorage: {
        saveAchievements: jest.fn().mockResolvedValue({ success: true }),
        saveGameState: jest.fn().mockResolvedValue({ success: true }),
        saveSessionState: jest.fn().mockResolvedValue({ success: true }),
        saveWordProgress: jest.fn().mockResolvedValue({ success: true }),
      },
    }));
    const [{ configureStore }, game, session, achievements, middleware] = await Promise.all([
      import('@reduxjs/toolkit'),
      import('../gameSlice'),
      import('../sessionSlice'),
      import('../achievementsSlice'),
      import('../persistenceMiddleware'),
    ]);
    persistenceUtils = middleware.persistenceUtils;
    const { enhancedStorage } = await import('../../services/storage/enhancedStorage');
    const saveWordProgress = enhancedStorage.saveWordProgress as unknown as jest.Mock;
    const store = configureStore({
      reducer: { game: game.default, session: session.default, achievements: achievements.default },
      middleware: getDefaultMiddleware =>
        getDefaultMiddleware().concat(middleware.persistenceMiddleware),
    });
    store.dispatch(game.setLanguage('de'));
    return {
      store,
      mergeRemoteProgress: game.mergeRemoteProgress,
      setLanguage: game.setLanguage,
      checkAnswer: game.checkAnswer,
      saveWordProgress,
    };
  };

  beforeEach(() => {
    jest.resetModules();
    localStorage.clear();
    jest.useFakeTimers();
    persistenceUtils = undefined;
  });

  afterEach(async () => {
    await persistenceUtils?.cleanup();
    jest.useRealTimers();
  });

  it('merges into the active language: later local answer stays, remote-only words are added', async () => {
    const localNew = entry('a', { xp: 90, lastPracticed: '2025-03-01T00:00:00.000Z' });
    const { store, mergeRemoteProgress } = await createStore({
      de: { a: localNew, onlyLocal: entry('onlyLocal') },
    });

    store.dispatch(
      mergeRemoteProgress({
        languageCode: 'de',
        words: {
          a: entry('a', { xp: 5, lastPracticed: '2025-02-01T00:00:00.000Z' }),
          onlyRemote: entry('onlyRemote', { xp: 33 }),
        },
      })
    );

    const progress = store.getState().game.wordProgress;
    expect(progress.a.xp).toBe(90);
    expect(progress.a.lastPracticed).toBe(localNew.lastPracticed);
    expect(progress.onlyRemote.xp).toBe(33);
    expect(progress.onlyLocal).toBeDefined();
    expect(Object.keys(progress).sort()).toEqual(['a', 'onlyLocal', 'onlyRemote']);
  });

  it('takes a remote word that was practised later than the local one', async () => {
    const { store, mergeRemoteProgress } = await createStore({
      de: { a: entry('a', { xp: 1, lastPracticed: '2025-01-01T00:00:00.000Z' }) },
    });
    store.dispatch(
      mergeRemoteProgress({
        languageCode: 'de',
        words: { a: entry('a', { xp: 70, lastPracticed: '2025-02-01T00:00:00.000Z' }) },
      })
    );
    expect(store.getState().game.wordProgress.a.xp).toBe(70);
  });

  it('is ignored when the payload language is not the active language', async () => {
    const { store, mergeRemoteProgress } = await createStore({
      de: { a: entry('a') },
      es: { e: entry('e') },
    });
    const before = JSON.parse(JSON.stringify(store.getState().game));
    const storedBefore = localStorage.getItem(STORAGE_KEY);

    store.dispatch(
      mergeRemoteProgress({ languageCode: 'es', words: { other: entry('other', { xp: 99 }) } })
    );

    expect(store.getState().game.wordProgress).toEqual(before.wordProgress);
    expect(store.getState().game.language).toBe('de');
    expect(localStorage.getItem(STORAGE_KEY)).toBe(storedBefore);
  });

  it('writes the merged map to storage at once, for that language only', async () => {
    const esProgress = { e: entry('e', { xp: 7 }) };
    const { store, mergeRemoteProgress } = await createStore({
      de: { a: entry('a') },
      es: esProgress,
    });

    store.dispatch(
      mergeRemoteProgress({ languageCode: 'de', words: { fresh: entry('fresh', { xp: 44 }) } })
    );
    // No timers advanced, no forceSave: the write must already be there
    const saved = stored();
    expect(Object.keys(saved.de).sort()).toEqual(['a', 'fresh']);
    expect(saved.de.fresh.xp).toBe(44);
    expect(saved.es).toEqual(esProgress);
  });

  it('reloads the MERGED map after switching language away and back', async () => {
    const { store, mergeRemoteProgress, setLanguage } = await createStore({
      de: { a: entry('a') },
      es: { e: entry('e') },
    });
    store.dispatch(
      mergeRemoteProgress({ languageCode: 'de', words: { fresh: entry('fresh', { xp: 44 }) } })
    );

    store.dispatch(setLanguage('es'));
    expect(Object.keys(store.getState().game.wordProgress)).toEqual(['e']);
    store.dispatch(setLanguage('de'));

    const progress = store.getState().game.wordProgress;
    expect(Object.keys(progress).sort()).toEqual(['a', 'fresh']);
    expect(progress.fresh.xp).toBe(44);
  });

  it('does not pollute Object.prototype through a __proto__ key', async () => {
    const { store, mergeRemoteProgress } = await createStore({ de: { a: entry('a') } });
    const words = JSON.parse(
      '{"__proto__": {"wordId": "x", "polluted": true}, "ok": {"wordId": "ok", "xp": 1, "lastPracticed": "2025-01-01T00:00:00.000Z", "timesCorrect": 1, "timesIncorrect": 0}}'
    ) as WordMap;

    store.dispatch(mergeRemoteProgress({ languageCode: 'de', words }));

    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted')).toBe(false);
    const progress = store.getState().game.wordProgress;
    expect(Object.prototype.hasOwnProperty.call(progress, '__proto__')).toBe(false);
    expect(Object.getPrototypeOf(progress)).toBe(Object.prototype);
    expect(progress.ok).toBeDefined();
    expect(Object.prototype.hasOwnProperty.call(stored().de, '__proto__')).toBe(false);
  });

  describe('background queue (stale snapshots)', () => {
    const word = (id: string, term: string) => ({
      id,
      term,
      definition: 'x',
      direction: 'definition-to-term' as const,
    });
    const savesFor = (saver: jest.Mock, languageCode: string) =>
      saver.mock.calls.filter(call => call[0] === languageCode).map(call => call[1] as WordMap);

    it('a merge replaces an older queued snapshot, so the flush writes the merged map', async () => {
      const { store, mergeRemoteProgress, setLanguage, checkAnswer, saveWordProgress } =
        await createStore({ de: { a: entry('a') }, es: { eslocal: entry('eslocal') } });
      store.dispatch(setLanguage('es'));
      await persistenceUtils?.forceSave();

      // A learner answer leaves a snapshot (without the remote word) in the queue
      store.dispatch(
        checkAnswer({
          answer: 'perro',
          word: word('es:perro', 'perro'),
          quizMode: 'open-answer',
          languageCode: 'es',
        } as never)
      );
      expect(persistenceUtils?.getStatus().pendingChanges).toBe(1);
      saveWordProgress.mockClear();

      store.dispatch(
        mergeRemoteProgress({ languageCode: 'es', words: { remoteOnly: entry('remoteOnly') } })
      );
      await persistenceUtils?.forceSave();

      const saves = savesFor(saveWordProgress, 'es');
      expect(saves).toHaveLength(1);
      expect(Object.keys(saves[0]).sort()).toEqual(['es:perro', 'eslocal', 'remoteOnly']);
      expect(Object.keys(stored().es).sort()).toEqual(['es:perro', 'eslocal', 'remoteOnly']);
      expect(Object.keys(stored().de)).toEqual(['a']);
    });

    it('supersedeQueuedWordProgress replaces the queued snapshot of that language only', async () => {
      const { store, checkAnswer, saveWordProgress } = await createStore({
        de: { a: entry('a') },
      });
      await persistenceUtils?.forceSave();
      store.dispatch(
        checkAnswer({
          answer: 'hund',
          word: word('de:hund', 'Hund'),
          quizMode: 'open-answer',
          languageCode: 'de',
        } as never)
      );
      expect(persistenceUtils?.getStatus().pendingChanges).toBe(1);
      saveWordProgress.mockClear();

      const newer = { a: entry('a'), fresh: entry('fresh', { xp: 44 }) };
      persistenceUtils?.supersedeQueuedWordProgress('de', newer);
      expect(persistenceUtils?.getStatus().pendingChanges).toBe(1);
      await persistenceUtils?.forceSave();

      const saves = savesFor(saveWordProgress, 'de');
      expect(saves).toEqual([newer]);
      expect(saveWordProgress).toHaveBeenCalledTimes(1);
    });

    it('supersedeQueuedWordProgress does nothing, and does not throw, when no autosave exists', async () => {
      const { persistenceUtils: utils } = await import('../persistenceMiddleware');
      persistenceUtils = utils;
      expect(() => utils.supersedeQueuedWordProgress('de', { a: entry('a') })).not.toThrow();
      expect(utils.getStatus().pendingChanges).toBe(0);
      expect(utils.getStatus().enabled).toBe(false);
    });
  });
});
