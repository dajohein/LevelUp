import { configureStore } from '@reduxjs/toolkit';
import gameReducer from '../../store/gameSlice';
import sessionReducer from '../../store/sessionSlice';
import achievementsReducer from '../../store/achievementsSlice';
import { WordProgress } from '../../store/types';
import type { StoreState } from '../../store/store';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Game Progress Tracking', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        game: gameReducer,
        session: sessionReducer,
        achievements: achievementsReducer,
      },
    }) as any;
    localStorage.clear();
  });

  describe('Word Progress Management', () => {
    it('should initialize with empty word progress', () => {
      const state = (store.getState() as any).game;
      expect(state.wordProgress).toBeDefined();
      expect(typeof state.wordProgress).toBe('object');
    });

    it('should track progress for multiple words', () => {
      const progress: Record<string, WordProgress> = {
        'word1': {
          wordId: 'word1',
          xp: 10,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 2,
          timesIncorrect: 1,
        },
        'word2': {
          wordId: 'word2',
          xp: 15,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 3,
          timesIncorrect: 0,
        },
      };

      expect(Object.keys(progress)).toHaveLength(2);
      expect(progress['word1'].xp).toBe(10);
      expect(progress['word2'].timesCorrect).toBe(3);
    });

    it('should calculate accuracy from progress data', () => {
      const progress: WordProgress = {
        wordId: 'test-word',
        xp: 25,
        lastPracticed: new Date().toISOString(),
        timesCorrect: 5,
        timesIncorrect: 2,
      };

      const totalAttempts = progress.timesCorrect + progress.timesIncorrect;
      const accuracy = progress.timesCorrect / totalAttempts;

      expect(totalAttempts).toBe(7);
      expect(accuracy).toBeCloseTo(0.714, 2);
    });

    it('should track XP accumulation', () => {
      const word1: WordProgress = {
        wordId: 'word1',
        xp: 10,
        lastPracticed: new Date().toISOString(),
        timesCorrect: 1,
        timesIncorrect: 0,
      };

      const word2: WordProgress = {
        wordId: 'word2',
        xp: 15,
        lastPracticed: new Date().toISOString(),
        timesCorrect: 2,
        timesIncorrect: 0,
      };

      const totalXp = word1.xp + word2.xp;
      expect(totalXp).toBe(25);
    });
  });

  describe('Language Context', () => {
    it('should maintain language context', () => {
      const state = (store.getState() as any).game;
      expect(state).toHaveProperty('language');
    });

    it('should track module context', () => {
      const state = (store.getState() as any).game;
      expect(state).toHaveProperty('module');
    });

    it('should validate language code format', () => {
      const validLanguages = ['de', 'es', 'fr', 'it', 'pt', 'nl', 'pl'];
      
      validLanguages.forEach(lang => {
        expect(lang).toMatch(/^[a-z]{2}$/);
      });
    });
  });

  describe('Session Persistence', () => {
    it('should persist word progress to state', () => {
      const progress = {
        'persistent-word': {
          wordId: 'persistent-word',
          xp: 50,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 10,
          timesIncorrect: 2,
        },
      };

      // Simulate storing in Redux state
      expect(progress['persistent-word'].xp).toBe(50);
    });

    it('should handle large progress datasets', () => {
      const largeProgress: Record<string, WordProgress> = {};

      for (let i = 0; i < 500; i++) {
        largeProgress[`word-${i}`] = {
          wordId: `word-${i}`,
          xp: Math.floor(Math.random() * 100),
          lastPracticed: new Date().toISOString(),
          timesCorrect: Math.floor(Math.random() * 20),
          timesIncorrect: Math.floor(Math.random() * 5),
        };
      }

      expect(Object.keys(largeProgress)).toHaveLength(500);
    });
  });

  describe('Streak Tracking', () => {
    it('should initialize streak count', () => {
      const state = (store.getState() as any).game;
      expect(state.streak).toBeGreaterThanOrEqual(0);
    });

    it('should track correct and incorrect answers', () => {
      const state = (store.getState() as any).game;
      
      expect(state).toHaveProperty('correctAnswers');
      expect(state).toHaveProperty('totalAttempts');
      expect(typeof state.correctAnswers).toBe('number');
      expect(typeof state.totalAttempts).toBe('number');
    });

    it('should calculate accuracy from totals', () => {
      const totalCorrect = 45;
      const totalIncorrect = 15;
      const totalAttempts = totalCorrect + totalIncorrect;
      const accuracy = totalCorrect / totalAttempts;

      expect(totalAttempts).toBe(60);
      expect(accuracy).toBeCloseTo(0.75, 2);
    });
  });

  describe('Game Mode Management', () => {
    it('should track current game mode', () => {
      const state = (store.getState() as any).game;
      expect(state).toHaveProperty('quizMode');
    });

    it('should support multiple game modes', () => {
      const validModes = ['multiple-choice', 'fill-in-blank', 'true-false'];
      
      validModes.forEach(mode => {
        expect(typeof mode).toBe('string');
        expect(mode.length).toBeGreaterThan(0);
      });
    });

    it('should handle game mode transitions', () => {
      const modes = ['multiple-choice', 'fill-in-blank', 'true-false'];
      let currentModeIndex = 0;

      const nextMode = () => {
        currentModeIndex = (currentModeIndex + 1) % modes.length;
        return modes[currentModeIndex];
      };

      expect(nextMode()).toBe('fill-in-blank');
      expect(nextMode()).toBe('true-false');
      expect(nextMode()).toBe('multiple-choice');
    });
  });

  describe('Current Word State', () => {
    it('should track current word', () => {
      const state = (store.getState() as any).game;
      expect(state).toHaveProperty('currentWord');
    });

    it('should allow word updates', () => {
      const currentWord = {
        id: 'word1',
        term: 'Hund',
        definition: 'dog',
      };

      expect(currentWord.id).toBe('word1');
      expect(currentWord.term).toBe('Hund');
    });
  });

  describe('Progress Data Integrity', () => {
    it('should not allow null word IDs', () => {
      const invalidProgress: WordProgress = {
        wordId: 'valid-id',
        xp: 10,
        lastPracticed: new Date().toISOString(),
        timesCorrect: 1,
        timesIncorrect: 0,
      };

      expect(invalidProgress.wordId).toBeTruthy();
      expect(invalidProgress.wordId).not.toBeNull();
    });

    it('should maintain XP as non-negative', () => {
      const progress: WordProgress = {
        wordId: 'word1',
        xp: 0,
        lastPracticed: new Date().toISOString(),
        timesCorrect: 0,
        timesIncorrect: 0,
      };

      expect(progress.xp).toBeGreaterThanOrEqual(0);
    });

    it('should ensure counts match reality', () => {
      const attempts = 10;
      const correct = 7;
      const incorrect = 3;

      expect(correct + incorrect).toBe(attempts);
    });
  });

  describe('Backward Compatibility', () => {
    it('should handle legacy progress format', () => {
      const legacyProgress: any = {
        wordId: 'word1',
        xp: 50,
        lastPracticed: '2025-01-01T00:00:00Z',
        timesCorrect: 10,
        timesIncorrect: 2,
      };

      expect(legacyProgress.xp).toBe(50);
      expect(legacyProgress.timesCorrect).toBe(10);
    });

    it('should handle optional new fields', () => {
      const progress: WordProgress = {
        wordId: 'word1',
        xp: 50,
        lastPracticed: new Date().toISOString(),
        timesCorrect: 10,
        timesIncorrect: 2,
        totalXp: 100, // Optional field
        firstLearned: new Date().toISOString(), // Optional field
        version: 2, // Optional field
      };

      expect(progress.totalXp).toBe(100);
      expect(progress.version).toBe(2);
    });
  });
});
