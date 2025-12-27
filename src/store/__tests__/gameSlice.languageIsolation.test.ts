import { configureStore } from '@reduxjs/toolkit';
import type { WordProgress } from '../../store/types';

// Helper to set localStorage word progress for multiple languages
const setWordProgressStorage = (data: Record<string, Record<string, WordProgress>>) => {
  localStorage.setItem('levelup_word_progress', JSON.stringify(data));
};

// Build minimal WordProgress entries
const makeProgress = (ids: string[]): Record<string, WordProgress> => {
  const now = new Date().toISOString();
  return ids.reduce((acc, id) => {
    acc[id] = {
      wordId: id,
      xp: 10,
      lastPracticed: now,
      timesCorrect: 1,
      timesIncorrect: 0,
      version: 2,
      totalXp: 10,
      firstLearned: now,
      directions: {
        'term-to-definition': { timesCorrect: 1, timesIncorrect: 0, xp: 5, lastPracticed: now, consecutiveCorrect: 1, longestStreak: 1 },
        'definition-to-term': { timesCorrect: 0, timesIncorrect: 0, xp: 5, lastPracticed: now, consecutiveCorrect: 0, longestStreak: 0 },
      },
      learningPhase: 'practice',
      tags: [],
    };
    return acc;
  }, {} as Record<string, WordProgress>);
};

describe('gameSlice language isolation', () => {
  beforeEach(() => {
    jest.resetModules();
    localStorage.clear();
  });

  it('initializes with only current language progress from storage', async () => {
    const deProgress = makeProgress(['de-1', 'de-2']);
    const esProgress = makeProgress(['es-1']);
    setWordProgressStorage({ de: deProgress, es: esProgress });

    // Mock gameStateStorage.load to set current language
    jest.doMock('../../services/storageService', () => {
      const actual = jest.requireActual('../../services/storageService');
      return {
        ...actual,
        gameStateStorage: {
          ...actual.gameStateStorage,
          load: () => ({ language: 'de' }),
        },
      };
    });

    const gameReducerModule = await import('../gameSlice');
    const gameReducer = gameReducerModule.default;

    const store = configureStore({ reducer: { game: gameReducer } });
    const state = store.getState().game as any;

    // Word progress should contain only DE entries
    expect(Object.keys(state.wordProgress)).toEqual(Object.keys(deProgress));
    expect(Object.keys(state.wordProgress)).not.toEqual(expect.arrayContaining(Object.keys(esProgress)));
    expect(state.language).toBe('de');
  });

  it('switching language replaces wordProgress with target language only', async () => {
    const deProgress = makeProgress(['de-1']);
    const esProgress = makeProgress(['es-1', 'es-2']);
    setWordProgressStorage({ de: deProgress, es: esProgress });

    // Start with ES language in persisted state
    jest.doMock('../../services/storageService', () => {
      const actual = jest.requireActual('../../services/storageService');
      return {
        ...actual,
        gameStateStorage: {
          ...actual.gameStateStorage,
          load: () => ({ language: 'es' }),
        },
      };
    });

    const { default: gameReducer, setLanguage } = await import('../gameSlice');
    const store = configureStore({ reducer: { game: gameReducer } });

    // Initially loaded as ES
    let state = store.getState().game as any;
    expect(Object.keys(state.wordProgress)).toEqual(Object.keys(esProgress));

    // Switch to DE
    store.dispatch(setLanguage('de'));
    state = store.getState().game as any;

    expect(Object.keys(state.wordProgress)).toEqual(Object.keys(deProgress));
    expect(Object.keys(state.wordProgress)).not.toEqual(expect.arrayContaining(Object.keys(esProgress)));
    expect(state.language).toBe('de');
  });

  it('does not merge cross-language progress when updating wordProgress', async () => {
    const deProgress = makeProgress(['de-1']);
    const esProgress = makeProgress(['es-1']);
    setWordProgressStorage({ de: deProgress, es: esProgress });

    // Persisted language is DE
    jest.doMock('../../services/storageService', () => {
      const actual = jest.requireActual('../../services/storageService');
      return {
        ...actual,
        gameStateStorage: {
          ...actual.gameStateStorage,
          load: () => ({ language: 'de' }),
        },
      };
    });

    const { default: gameReducer, updateWordProgress } = await import('../gameSlice');
    const store = configureStore({ reducer: { game: gameReducer } });

    // Update with a full object should replace, not merge other language
    store.dispatch(updateWordProgress(deProgress));
    let state = store.getState().game as any;
    expect(Object.keys(state.wordProgress)).toEqual(['de-1']);

    // Ensure ES data never appears in DE state
    expect(Object.keys(state.wordProgress)).not.toContain('es-1');
  });
});
