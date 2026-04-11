/**
 * Contract tests: Quiz Mode Selection in gameSlice
 *
 * These tests guard against the regression where nextWord (or setCurrentWord)
 * hard-codes 'multiple-choice' instead of calling selectQuizMode().
 *
 * Invariant: the quiz mode presented to the player MUST always be driven by
 * selectQuizMode() so that difficulty scales with mastery.
 */

import { configureStore } from '@reduxjs/toolkit';

// ─── Mock all side-effect imports that fire at module-load time ──────────────
jest.mock('../../services/storageService', () => ({
  gameStateStorage: {
    load: jest.fn(() => ({})),
    save: jest.fn(),
  },
}));
jest.mock('../../services/dataMigrationService', () => ({
  DataMigrationService: {
    safeLoadWordProgress: jest.fn(() => ({})),
  },
}));
jest.mock('../../services/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('../../services/masteryService', () => ({
  calculateMasteryGain: jest.fn(() => 0),
}));
jest.mock('../../services/answerValidation', () => ({
  validateAnswer: jest.fn(() => ({
    isCorrect: true,
    capitalizationCorrect: true,
    capitalizationPenalty: 1,
  })),
  getCapitalizationFeedback: jest.fn(() => null),
}));

// ─── Mock word-selection so every nextWord() call returns a known word ────────
jest.mock('../../services/wordSelectionManager', () => ({
  selectWordForRegularSession: jest.fn(),
  selectWordForMixedPractice: jest.fn(),
}));

// ─── Mock selectQuizMode so we can spy on it and control its output ───────────
jest.mock('../../services/quizModeSelectionUtils', () => ({
  selectQuizMode: jest.fn(),
}));

// ─── Imports after mocks are registered ──────────────────────────────────────
import gameReducer, { nextWord, setCurrentWord } from '../gameSlice';
import { selectWordForMixedPractice } from '../../services/wordSelectionManager';
import { selectQuizMode } from '../../services/quizModeSelectionUtils';

const mockSelectWordForMixedPractice = selectWordForMixedPractice as jest.Mock;
const mockSelectQuizMode = selectQuizMode as jest.Mock;

// ─── Shared test word ─────────────────────────────────────────────────────────
const TEST_WORD = {
  id: 'word-abc',
  term: 'Hund',
  definition: 'dog',
  direction: 'definition-to-term' as const,
};

const WORD_SELECTION_RESULT = {
  word: TEST_WORD,
  alternatives: [
    { id: 'alt-1', term: 'Katze', definition: 'cat' },
    { id: 'alt-2', term: 'Vogel', definition: 'bird' },
    { id: 'alt-3', term: 'Fisch', definition: 'fish' },
  ],
  metadata: { masteryScore: 0 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeWordProgress(xp: number) {
  const now = new Date().toISOString();
  return {
    [TEST_WORD.id]: {
      wordId: TEST_WORD.id,
      xp,
      lastPracticed: now,
      timesCorrect: 1,
      timesIncorrect: 0,
    },
  };
}

function buildStore(wordProgress: Record<string, unknown> = {}) {
  return configureStore({
    reducer: { game: gameReducer },
    preloadedState: {
      game: {
        currentWord: null,
        currentOptions: [],
        quizMode: 'multiple-choice' as const,
        score: 0,
        isCorrect: null,
        lives: 3,
        language: 'de', // must be set so nextWord() executes
        module: null,
        streak: 0,
        bestStreak: 0,
        totalAttempts: 0,
        correctAnswers: 0,
        recentlyUsedWords: [] as string[],
        wordProgress,
      },
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────

describe('gameSlice quiz-mode contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: word selection always returns the test word
    mockSelectWordForMixedPractice.mockReturnValue(WORD_SELECTION_RESULT);
  });

  // ── nextWord: mastery-tier progression ──────────────────────────────────────

  describe('nextWord — uses selectQuizMode for all mastery tiers', () => {
    it('tier 1 (new word, xp=0) → multiple-choice', () => {
      mockSelectQuizMode.mockReturnValue('multiple-choice');
      const store = buildStore(); // no wordProgress = xp 0

      store.dispatch(nextWord());

      expect(mockSelectQuizMode).toHaveBeenCalledTimes(1);
      expect(mockSelectQuizMode).toHaveBeenCalledWith(expect.objectContaining({ word: TEST_WORD }));
      expect((store.getState() as any).game.quizMode).toBe('multiple-choice');
    });

    it('tier 2 (practised word, xp=30) → letter-scramble', () => {
      mockSelectQuizMode.mockReturnValue('letter-scramble');
      const store = buildStore(makeWordProgress(30));

      store.dispatch(nextWord());

      expect(mockSelectQuizMode).toHaveBeenCalledTimes(1);
      expect(mockSelectQuizMode).toHaveBeenCalledWith(expect.objectContaining({ word: TEST_WORD }));
      expect((store.getState() as any).game.quizMode).toBe('letter-scramble');
    });

    it('tier 3 (mastered word, xp=150) → open-answer', () => {
      mockSelectQuizMode.mockReturnValue('open-answer');
      const store = buildStore(makeWordProgress(150));

      store.dispatch(nextWord());

      expect(mockSelectQuizMode).toHaveBeenCalledTimes(1);
      expect(mockSelectQuizMode).toHaveBeenCalledWith(expect.objectContaining({ word: TEST_WORD }));
      expect((store.getState() as any).game.quizMode).toBe('open-answer');
    });

    it('passes the current wordProgress to selectQuizMode', () => {
      mockSelectQuizMode.mockReturnValue('multiple-choice');
      const progress = makeWordProgress(10);
      const store = buildStore(progress);

      store.dispatch(nextWord());

      expect(mockSelectQuizMode).toHaveBeenCalledWith(
        expect.objectContaining({ wordProgress: progress })
      );
    });

    it('does nothing when no language is set', () => {
      const store = configureStore({
        reducer: { game: gameReducer },
        preloadedState: {
          game: {
            currentWord: null,
            currentOptions: [],
            quizMode: 'multiple-choice' as const,
            score: 0,
            isCorrect: null,
            lives: 3,
            language: null, // ← no language
            module: null,
            streak: 0,
            bestStreak: 0,
            totalAttempts: 0,
            correctAnswers: 0,
            recentlyUsedWords: [] as string[],
            wordProgress: {},
          },
        },
      });

      store.dispatch(nextWord());

      expect(mockSelectQuizMode).not.toHaveBeenCalled();
      expect((store.getState() as any).game.currentWord).toBeNull();
    });

    it('quizMode in state always equals what selectQuizMode returned', () => {
      // Explicitly return fill-in-the-blank to prove no hardcoding occurs
      mockSelectQuizMode.mockReturnValue('fill-in-the-blank');
      const store = buildStore(makeWordProgress(200));

      store.dispatch(nextWord());

      expect((store.getState() as any).game.quizMode).toBe('fill-in-the-blank');
    });
  });

  // ── setCurrentWord: optional quizMode ────────────────────────────────────

  describe('setCurrentWord — computes quiz mode when quizMode is omitted', () => {
    it('uses selectQuizMode when no quizMode is provided in the payload', () => {
      mockSelectQuizMode.mockReturnValue('letter-scramble');
      const progress = makeWordProgress(40);
      const store = buildStore(progress);

      store.dispatch(
        setCurrentWord({
          word: TEST_WORD,
          options: ['Hund', 'Katze', 'Vogel'],
          // quizMode deliberately omitted
        })
      );

      expect(mockSelectQuizMode).toHaveBeenCalledTimes(1);
      expect((store.getState() as any).game.quizMode).toBe('letter-scramble');
    });

    it('respects an explicitly provided quizMode without calling selectQuizMode', () => {
      const store = buildStore(makeWordProgress(200));

      store.dispatch(
        setCurrentWord({
          word: TEST_WORD,
          options: ['Hund', 'Katze'],
          quizMode: 'fill-in-the-blank', // challenge service override
        })
      );

      expect(mockSelectQuizMode).not.toHaveBeenCalled();
      expect((store.getState() as any).game.quizMode).toBe('fill-in-the-blank');
    });

    it('uses selectQuizMode with the current wordProgress when auto-computing', () => {
      mockSelectQuizMode.mockReturnValue('open-answer');
      const progress = makeWordProgress(120);
      const store = buildStore(progress);

      store.dispatch(
        setCurrentWord({
          word: TEST_WORD,
          options: [],
          // quizMode omitted
        })
      );

      expect(mockSelectQuizMode).toHaveBeenCalledWith(
        expect.objectContaining({ word: TEST_WORD, wordProgress: progress })
      );
    });
  });
});
