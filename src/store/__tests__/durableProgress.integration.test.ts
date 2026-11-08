describe('durable game and session progress integration', () => {
  let persistenceUtils: { cleanup: () => Promise<void> } | undefined;

  const createStore = async (withPersistence: boolean) => {
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
    return configureStore({
      reducer: {
        game: game.default,
        session: session.default,
        achievements: achievements.default,
      },
      middleware: getDefaultMiddleware =>
        withPersistence
          ? getDefaultMiddleware().concat(middleware.persistenceMiddleware)
          : getDefaultMiddleware(),
    });
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

  it('hydrates durable game snapshots and language-scoped word progress into a fresh store', async () => {
    const store = await createStore(true);
    const { setLanguage, setCurrentWord, checkAnswer } = await import('../gameSlice');
    const {
      addCorrectAnswer,
      completeSession,
      setLanguage: setSessionLanguage,
      setWeeklyChallenge,
      startSession,
    } = await import('../sessionSlice');

    store.dispatch(setLanguage('de'));
    store.dispatch(
      setCurrentWord({
        word: { id: 'de-house', term: 'Haus', definition: 'house' },
        options: ['Haus', 'Baum'],
      })
    );
    store.dispatch(checkAnswer('Haus'));

    store.dispatch(setSessionLanguage('de'));
    store.dispatch(
      setWeeklyChallenge({ languageCode: 'de', isActive: true, targetScore: 3000, rank: 2 })
    );
    store.dispatch(startSession('quick-dash'));
    for (let answer = 0; answer < 4; answer += 1) {
      store.dispatch(
        addCorrectAnswer({
          timeBonus: 0,
          streakBonus: 0,
          contextBonus: 0,
          perfectRecallBonus: 0,
        })
      );
    }
    store.dispatch(completeSession());

    const savedGame = JSON.parse(localStorage.getItem('levelup_game_state') || '{}');
    const savedSession = JSON.parse(localStorage.getItem('levelup_session_state') || '{}');
    const savedProgress = JSON.parse(localStorage.getItem('levelup_word_progress') || '{}');

    expect((localStorage.getItem('levelup_game_state') || '').length).toBeLessThan(10 * 1024);
    expect(savedGame).toMatchObject({ language: 'de', correctAnswers: 1, totalAttempts: 1 });
    expect(savedProgress.de['de-house']).toMatchObject({ wordId: 'de-house', timesCorrect: 1 });
    expect(savedSession.completedSessionsByLanguage.de).toContain('quick-dash');
    expect(savedSession.sessionProgress).toMatchObject({ correctAnswers: 4, score: 600 });
    expect(savedSession.weeklyChallengeBylanguage.de).toMatchObject({
      isActive: true,
      targetScore: 3000,
      rank: 2,
    });

    await persistenceUtils?.cleanup();
    persistenceUtils = undefined;
    jest.resetModules();

    const reloadedStore = await createStore(false);
    const reloadedGame = reloadedStore.getState().game;
    const reloadedSession = reloadedStore.getState().session;

    expect(reloadedGame).toMatchObject({
      language: 'de',
      correctAnswers: 1,
      totalAttempts: 1,
      wordProgress: { 'de-house': expect.objectContaining({ timesCorrect: 1 }) },
    });
    expect(reloadedSession.completedSessionsByLanguage.de).toContain('quick-dash');
    expect(reloadedSession.progress).toMatchObject({ correctAnswers: 4, score: 600 });
    expect(reloadedSession.weeklyChallengeBylanguage.de).toMatchObject({
      isActive: true,
      targetScore: 3000,
      rank: 2,
    });
    expect(reloadedSession.isSessionActive).toBe(false);
    expect(reloadedSession.currentSession).toBeNull();
  });

  it('preserves pending answers across language switches and rapid switches back', async () => {
    const store = await createStore(true);
    const { setLanguage, setCurrentWord, checkAnswer } = await import('../gameSlice');

    store.dispatch(setLanguage('de'));
    store.dispatch(
      setCurrentWord({
        word: { id: 'de-house', term: 'Haus', definition: 'house' },
        options: ['Haus', 'Baum'],
      })
    );
    store.dispatch(checkAnswer('Haus'));

    store.dispatch(setLanguage('es'));
    expect(store.getState().game.language).toBe('es');
    expect(store.getState().game.wordProgress['de-house']).toBeUndefined();
    expect(
      JSON.parse(localStorage.getItem('levelup_word_progress') || '{}').de['de-house']
    ).toMatchObject({ wordId: 'de-house', timesCorrect: 1 });

    store.dispatch(setLanguage('de'));
    expect(store.getState().game.wordProgress['de-house']).toMatchObject({
      wordId: 'de-house',
      timesCorrect: 1,
    });

    jest.advanceTimersByTime(50);
    expect(store.getState().game.language).toBe('de');
    expect(store.getState().game.wordProgress['de-house']).toBeDefined();
    expect(store.getState().game.wordProgress['es-house']).toBeUndefined();
  });

  it('hydrates language-scoped progress snapshots larger than 10 KiB', async () => {
    const store = await createStore(true);
    const { setLanguage, setCurrentWord, checkAnswer } = await import('../gameSlice');

    store.dispatch(setLanguage('de'));
    for (let index = 0; index < 100; index += 1) {
      const term = `Haus ${index}`;
      store.dispatch(
        setCurrentWord({
          word: { id: `de-house-${index}`, term, definition: `house ${index}` },
          options: [term],
        })
      );
      store.dispatch(checkAnswer(term));
    }

    const persistedProgress = localStorage.getItem('levelup_word_progress') || '';
    expect(persistedProgress.length).toBeGreaterThan(10 * 1024);

    await persistenceUtils?.cleanup();
    persistenceUtils = undefined;
    jest.resetModules();

    const reloadedStore = await createStore(false);
    const progress = reloadedStore.getState().game.wordProgress;

    expect(Object.keys(progress)).toHaveLength(100);
    expect(progress['de-house-0']).toBeDefined();
    expect(progress['es-house-0']).toBeUndefined();
  });

  it('migrates legacy game and session snapshots without resuming an active session', async () => {
    localStorage.setItem(
      'game_state',
      JSON.stringify({
        language: 'es',
        module: 'legacy-module',
        score: 45,
        streak: 3,
        bestStreak: 5,
        correctAnswers: 6,
        totalAttempts: 8,
        quizMode: 'open-answer',
      })
    );
    localStorage.setItem(
      'session_state',
      JSON.stringify({
        currentLanguage: 'es',
        progress: { wordsCompleted: 3, score: 125 },
        currentSession: { id: 'quick-dash' },
        isSessionActive: true,
        completedSessionsByLanguage: { es: ['quick-dash'] },
        weeklyChallengeBylanguage: {
          es: { isActive: true, targetScore: 2000, currentScore: 1500, rank: 1 },
        },
      })
    );

    const { default: gameReducer } = await import('../gameSlice');
    const { default: sessionReducer } = await import('../sessionSlice');
    const game = gameReducer(undefined, { type: '@@INIT' });
    const state = sessionReducer(undefined, { type: '@@INIT' });

    expect(game).toMatchObject({
      language: 'es',
      module: 'legacy-module',
      score: 45,
      streak: 3,
      bestStreak: 5,
      correctAnswers: 6,
      totalAttempts: 8,
      quizMode: 'open-answer',
    });
    expect(state.currentLanguage).toBe('es');
    expect(state.progress).toMatchObject({ wordsCompleted: 3, score: 125 });
    expect(state.completedSessionsByLanguage.es).toEqual(['quick-dash']);
    expect(state.weeklyChallengeBylanguage.es).toMatchObject({
      isActive: true,
      targetScore: 2000,
      currentScore: 1500,
      rank: 1,
    });
    expect(state.isSessionActive).toBe(false);
    expect(state.currentSession).toBeNull();
    expect(localStorage.getItem('levelup_game_state')).not.toBeNull();
    expect(localStorage.getItem('levelup_session_state')).not.toBeNull();
  });

  it('does not import unscoped legacy snapshot progress across languages', async () => {
    const esProgress = {
      'es-word': {
        wordId: 'es-word',
        xp: 20,
        totalXp: 20,
        firstLearned: '2025-01-01T00:00:00.000Z',
        lastPracticed: '2025-01-02T00:00:00.000Z',
        timesCorrect: 2,
        timesIncorrect: 0,
        version: 2,
      },
    };
    localStorage.setItem(
      'game_state',
      JSON.stringify({
        language: 'de',
        wordProgress: {
          'de-word': { wordId: 'de-word', xp: 40 },
          'es-word': { wordId: 'es-word', xp: 20 },
        },
      })
    );
    localStorage.setItem('levelup_word_progress', JSON.stringify({ es: esProgress }));

    const { default: gameReducer } = await import('../gameSlice');
    const game = gameReducer(undefined, { type: '@@INIT' });

    expect(game.language).toBe('de');
    expect(game.wordProgress).toEqual({});
    expect(game.wordProgress['es-word']).toBeUndefined();
    expect(
      JSON.parse(localStorage.getItem('levelup_word_progress') || '{}').es['es-word']
    ).toMatchObject({
      xp: 20,
      timesCorrect: 2,
    });
  });
});
