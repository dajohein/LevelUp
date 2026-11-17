import { nextReviewStreak } from '../services/reviewStreak';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  selectWordForRegularSession,
  selectWordForMixedPractice,
} from '../services/wordSelectionManager';
import {
  calculateMasteryDecay,
  calculateMasteryGain,
  getMasteryQuizMode,
} from '../services/masteryService';
import { gameStateStorage } from '../services/storageService';
import { DataMigrationService } from '../services/dataMigrationService';
import { logger } from '../services/logger';
import {
  getAnswerScoreMultiplier,
  getCapitalizationFeedback,
  getCloseMatchFeedback,
} from '../services/answerValidation';
import { getQuizAnswerDirection, validateQuizAnswer } from '../services/quizAnswerValidation';
import { selectQuizMode } from '../services/quizModeSelectionUtils';
import type { Word } from '../services/wordService';
import type { GameState } from './types';

interface AnswerSubmission {
  answer: string;
  word?: Word;
  quizMode?: string;
  languageCode?: string;
  /** Hints used for this answer; an assisted answer earns no mastery. */
  hintsUsed?: number;
  /** A re-queued retry after a miss: practice only, earns no mastery. */
  isRetry?: boolean;
}

type CheckAnswerPayload = string | AnswerSubmission;

// Load persisted game state
const loadPersistedState = (): Partial<GameState> => {
  try {
    const savedState = gameStateStorage.load();

    // CRITICAL FIX: Don't load mixed wordProgress into global state
    // Instead, load only the current language's progress
    const currentLanguage = savedState.language;
    let languageSpecificProgress: GameState['wordProgress'] = {};

    if (currentLanguage) {
      // Only migrate language-scoped progress; legacy snapshots may contain mixed languages.
      languageSpecificProgress = DataMigrationService.safeLoadWordProgress(currentLanguage);
    }

    return {
      language: savedState.language || null,
      module: savedState.module || null,
      score: savedState.score || 0,
      streak: savedState.streak || 0,
      correctAnswers: savedState.correctAnswers || 0,
      totalAttempts: savedState.totalAttempts || 0,
      quizMode: savedState.quizMode || 'multiple-choice',
      bestStreak: savedState.bestStreak || 0,
      wordProgress: languageSpecificProgress,
    };
  } catch (error) {
    logger.error('Failed to load persisted game state:', error);
    return {};
  }
};

const persistedState = loadPersistedState();

/**
 * Game state persistence is handled by the persistence middleware.
 * This ensures centralized, coordinated saves with proper debouncing.
 *
 * Architecture: Redux State → Persistence Middleware → Storage Orchestrator → Storage Services
 */

const initialState: GameState = {
  currentWord: null,
  currentOptions: [],
  quizMode: 'multiple-choice',
  score: 0,
  isCorrect: null,
  lives: 3,
  language: null,
  module: null,
  streak: 0,
  bestStreak: 0,
  totalAttempts: 0,
  correctAnswers: 0,
  recentlyUsedWords: [],
  wordProgress: {},
  ...persistedState,
};

export const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    nextWord: state => {
      if (state.language) {
        // Use centralized word selection - create a unique session ID for game
        const sessionId = `game-session-${state.language}-${state.module || 'all'}`;

        // Check if we're in mixed practice mode with active modules
        let result;
        if (!state.module) {
          // No specific module means mixed practice - check for active learning modules
          result = selectWordForMixedPractice(state.language, state.wordProgress, sessionId);
        } else {
          // Regular module-specific selection
          result = selectWordForRegularSession(
            state.language,
            state.wordProgress,
            sessionId,
            state.module
          );
        }

        if (result) {
          state.currentWord = result.word;
          state.currentOptions = result.alternatives.slice(0, 4).map(word => word.term); // Convert Word objects to strings
          state.quizMode = selectQuizMode({ word: result.word, wordProgress: state.wordProgress });
          state.isCorrect = null;
          state.lastAnswer = undefined;
          state.spellingFeedback = undefined;
          state.lastWordId = result.word.id;

          // Update recently used words list
          if (result.word.id) {
            const recentlyUsed = state.recentlyUsedWords || [];
            const maxRecentWords = 8; // Track last 8 words to prevent repetition

            // Add current word to the beginning and limit the array size
            const updatedRecent = [
              result.word.id,
              ...recentlyUsed.filter(id => id !== result.word.id),
            ].slice(0, maxRecentWords);
            state.recentlyUsedWords = updatedRecent;
          }
        }
      }
    },

    setCurrentWord: (
      state,
      action: PayloadAction<{
        word: any;
        options: string[];
        // quizMode is optional: when omitted, selectQuizMode() picks the adaptive
        // mode from the word's current mastery level.  Challenge services that own
        // their own mode logic should pass an explicit value.
        quizMode?: 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';
      }>
    ) => {
      const { word, options, quizMode } = action.payload;
      state.currentWord = word;
      state.currentOptions = options;
      state.quizMode = quizMode ?? selectQuizMode({ word, wordProgress: state.wordProgress });
      state.isCorrect = null;
      state.lastAnswer = undefined;
      state.spellingFeedback = undefined;
      state.lastWordId = word?.id;

      // Update recently used words list
      if (word?.id) {
        const recentlyUsed = state.recentlyUsedWords || [];
        const maxRecentWords = 8; // Track last 8 words to prevent repetition

        // Add current word to the beginning and limit the array size
        const updatedRecent = [word.id, ...recentlyUsed.filter(id => id !== word.id)].slice(
          0,
          maxRecentWords
        );
        state.recentlyUsedWords = updatedRecent;
      }
    },
    checkAnswer: (state, action: PayloadAction<CheckAnswerPayload>) => {
      const submission =
        typeof action.payload === 'string' ? { answer: action.payload } : action.payload;
      const word = submission.word || state.currentWord;
      if (!word) return;
      const quizMode = submission.quizMode || state.quizMode;
      const languageCode = submission.languageCode || state.language || 'en';
      const direction = getQuizAnswerDirection(word, quizMode);
      const masteryMode = getMasteryQuizMode(quizMode);
      const validation = validateQuizAnswer(submission.answer, word, quizMode, languageCode);

      state.isCorrect = validation.isCorrect;
      state.lastAnswer = submission.answer;

      // Spelling feedback: capitalization (German) or an accepted spelling variant
      state.spellingFeedback =
        getCloseMatchFeedback(validation) ??
        (languageCode === 'de' && validation.isCorrect && !validation.capitalizationCorrect
          ? getCapitalizationFeedback(validation, languageCode)
          : null) ??
        undefined;

      // A re-queued retry is practice: the learner sees whether they got it, but nothing counts.
      // No mastery, schedule, score, streak, life or attempt changes, in either direction,
      // otherwise a missed word would be penalised twice and a retry would inflate the streak.
      if (submission.isRetry === true) return;

      state.totalAttempts += 1;

      // Update word progress with enhanced directional tracking
      const wordId = word.id;
      const currentProgress = state.wordProgress[wordId] || {
        wordId,
        xp: 0,
        lastPracticed: new Date().toISOString(),
        timesCorrect: 0,
        timesIncorrect: 0,
        version: 2, // Mark as enhanced format
        totalXp: 0,
        firstLearned: new Date().toISOString(),
        directions: {
          'term-to-definition': {
            timesCorrect: 0,
            timesIncorrect: 0,
            xp: 0,
            lastPracticed: new Date().toISOString(),
            consecutiveCorrect: 0,
            longestStreak: 0,
          },
          'definition-to-term': {
            timesCorrect: 0,
            timesIncorrect: 0,
            xp: 0,
            lastPracticed: new Date().toISOString(),
            consecutiveCorrect: 0,
            longestStreak: 0,
          },
        },
        learningPhase: 'introduction',
        tags: [],
      };

      // Calculate new mastery
      const assisted = (submission.hintsUsed ?? 0) > 0;
      // A correct answer with hints is not evidence of recall: it must change neither mastery nor
      // the review schedule. Keeping `lastPracticed` matters: moving it to now would restart the
      // whole review interval and could push an overdue word out by a week or more.
      const hintedCorrect = validation.isCorrect && assisted;
      const now = new Date().toISOString();
      // Decay first: everything that reads mastery (selection, scheduling, the progress screens)
      // sees the decayed value, so a gain must start from it. Applying the gain to the stored,
      // undecayed value would erase all decay with a single answer.
      const decayedMastery = calculateMasteryDecay(
        currentProgress.lastPracticed,
        currentProgress.xp
      );
      const newMastery = calculateMasteryGain(
        decayedMastery,
        validation.isCorrect,
        masteryMode,
        assisted
      );

      // Update overall progress (maintaining backward compatibility)
      const updatedProgress = {
        ...currentProgress,
        xp: hintedCorrect ? currentProgress.xp : newMastery,
        lastPracticed: hintedCorrect ? currentProgress.lastPracticed : now,
        timesCorrect: currentProgress.timesCorrect + (validation.isCorrect ? 1 : 0),
        timesIncorrect: currentProgress.timesIncorrect + (validation.isCorrect ? 0 : 1),
        totalXp: hintedCorrect ? (currentProgress.totalXp ?? currentProgress.xp) : newMastery,
        version: 2,
        ...nextReviewStreak(currentProgress, validation.isCorrect, assisted),
      };

      // Update directional progress if using enhanced format
      if (updatedProgress.directions) {
        const directionData = updatedProgress.directions[direction];
        if (directionData) {
          // Calculate directional mastery gain
          const directionalMastery = calculateMasteryGain(
            calculateMasteryDecay(directionData.lastPracticed, directionData.xp),
            validation.isCorrect,
            masteryMode,
            assisted
          );

          // Update directional stats. Same rules as the overall progress: hinted correct answers
          // change neither mastery nor schedule, and the streak uses the same gated rule.
          const streak = nextReviewStreak(directionData, validation.isCorrect, assisted);
          updatedProgress.directions[direction] = {
            ...directionData,
            xp: hintedCorrect ? directionData.xp : directionalMastery,
            lastPracticed: hintedCorrect ? directionData.lastPracticed : now,
            timesCorrect: directionData.timesCorrect + (validation.isCorrect ? 1 : 0),
            timesIncorrect: directionData.timesIncorrect + (validation.isCorrect ? 0 : 1),
            consecutiveCorrect: streak.consecutiveCorrect,
            streakUpdatedAt: streak.streakUpdatedAt,
            longestStreak: Math.max(directionData.longestStreak || 0, streak.consecutiveCorrect),
          };
        }

        // Update learning phase based on overall progress
        if (updatedProgress.xp >= 80) {
          updatedProgress.learningPhase = 'maintenance';
        } else if (updatedProgress.xp >= 50) {
          updatedProgress.learningPhase = 'mastery';
        } else if (updatedProgress.xp > 0) {
          updatedProgress.learningPhase = 'practice';
        } else {
          updatedProgress.learningPhase = 'introduction';
        }
      }

      state.wordProgress[wordId] = updatedProgress;

      if (validation.isCorrect) {
        // Update score based on streak, quiz mode, and capitalization penalty
        const modeMultiplier =
          quizMode === 'open-answer'
            ? 2
            : quizMode === 'letter-scramble'
              ? 1.5
              : quizMode === 'fill-in-the-blank'
                ? 1.7
                : 1;
        const baseScore = 10 * modeMultiplier * (1 + Math.floor(state.streak / 5));
        const finalScore = Math.round(baseScore * getAnswerScoreMultiplier(validation));

        state.score += finalScore;
        state.streak += 1;
        state.correctAnswers += 1;
        state.bestStreak = Math.max(state.streak, state.bestStreak);
      } else {
        state.lives -= 1;
        state.streak = 0;
      }

      // Persistence handled by middleware
      // REMOVED: Direct save call - persistence middleware will handle this
    },

    setLanguage: (state, action: PayloadAction<string>) => {
      const languageCode = action.payload;
      if (!languageCode) return; // Validate input
      const sameLanguage = state.language === languageCode;
      if (sameLanguage && state.currentWord) return;

      if (!sameLanguage) {
        state.language = languageCode;
        state.lives = 3;
        state.score = 0;
        state.streak = 0;
        state.isCorrect = null;
        state.lastAnswer = undefined;
        state.recentlyUsedWords = []; // Reset recently used words for new language

        // Load word progress for this language only (no merging) with automatic migration
        state.wordProgress = DataMigrationService.safeLoadWordProgress(languageCode);
      }

      // Initialize first word
      const sessionId = `game-session-${languageCode}-all`;
      const result = selectWordForRegularSession(languageCode, state.wordProgress, sessionId);

      if (result) {
        state.currentWord = result.word;
        state.currentOptions = result.alternatives.slice(0, 4).map(word => word.term);
        state.lastWordId = result.word.id;

        // Initialize recently used words with first word
        if (result.word.id) {
          state.recentlyUsedWords = [result.word.id];
        }
      }

      // Persistence handled by middleware
    },
    setCurrentModule: (state, action: PayloadAction<string | null>) => {
      state.module = action.payload;
      // Persistence handled by middleware
    },
    resetGame: state => {
      // Reset game state while preserving word progress
      const preservedProgress = state.wordProgress;
      const preservedLanguage = state.language;
      const preservedModule = state.module;

      Object.assign(state, initialState, {
        wordProgress: preservedProgress,
        language: preservedLanguage,
        module: preservedModule,
        recentlyUsedWords: [], // Reset recently used words on game reset
      });

      // Get new word if language is set
      if (preservedLanguage) {
        const sessionId = `game-session-${preservedLanguage}-${preservedModule || 'all'}`;
        const result = selectWordForRegularSession(
          preservedLanguage,
          preservedProgress,
          sessionId,
          preservedModule || undefined
        );

        if (result) {
          state.currentWord = result.word;
          state.currentOptions = result.alternatives.slice(0, 4).map(word => word.term);
          state.lastWordId = result.word.id;

          // Initialize recently used words with first word
          if (result.word.id) {
            state.recentlyUsedWords = [result.word.id];
          }
        }
      }

      // Persistence handled by middleware
    },
    updateWordProgress: (state, action: PayloadAction<Record<string, any>>) => {
      // Handle both single word updates and full progress objects
      if (action.payload.wordId && action.payload.progress) {
        // Single word update: merge into existing progress
        state.wordProgress = {
          ...state.wordProgress,
          [action.payload.wordId]: action.payload.progress,
        };
        if (process.env.NODE_ENV === 'development') {
          logger.debug(
            `Redux word progress updated: ${action.payload.wordId} -> total entries: ${Object.keys(state.wordProgress).length}`
          );
        }
      } else {
        // Full progress object: replace entirely
        state.wordProgress = action.payload;
        if (process.env.NODE_ENV === 'development') {
          logger.debug(
            `Redux word progress replaced with ${Object.keys(action.payload).length} entries`
          );
        }
      }
      // Don't call saveGameState here - let persistence middleware handle it
    },
  },
});

export const {
  nextWord,
  setCurrentWord,
  checkAnswer,
  setLanguage,
  setCurrentModule,
  resetGame,
  updateWordProgress,
} = gameSlice.actions;

export default gameSlice.reducer;
