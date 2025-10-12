import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getRandomWord, getRandomWordFromModule } from '../services/wordService';
import { calculateMasteryGain } from '../services/masteryService';
import { gameStateStorage } from '../services/storageService';
import { DataMigrationService } from '../services/dataMigrationService';
import { logger } from '../services/logger';
import { validateAnswer, getCapitalizationFeedback } from '../services/answerValidation';
import type { GameState } from './types';

// Load persisted game state
const loadPersistedState = (): Partial<GameState> => {
  try {
    const savedState = gameStateStorage.load();

    // CRITICAL FIX: Don't load mixed wordProgress into global state
    // Instead, load only the current language's progress
    const currentLanguage = savedState.language;
    let languageSpecificProgress = {};

    if (currentLanguage) {
      // Load only the current language's progress with automatic migration
      languageSpecificProgress = DataMigrationService.safeLoadWordProgress(currentLanguage);
      // Removed debug logging to prevent console spam
    }

    return {
      language: savedState.language || null,
      score: savedState.score || 0,
      streak: savedState.streak || 0,
      correctAnswers: savedState.correctAnswers || 0,
      totalAttempts: savedState.totalAttempts || 0,
      quizMode: savedState.quizMode || 'multiple-choice',
      wordProgress: languageSpecificProgress,
    };
  } catch (error) {
    logger.error('Failed to load persisted game state:', error);
    return {};
  }
};

const persistedState = loadPersistedState();

// Helper function to save game state to localStorage
const saveGameState = (state: GameState): void => {
  try {
    // CRITICAL FIX: Don't save mixed wordProgress to gameStateStorage
    gameStateStorage.save({
      language: state.language || undefined,
      score: state.score,
      streak: state.streak,
      correctAnswers: state.correctAnswers,
      totalAttempts: state.totalAttempts,
      quizMode: state.quizMode,
      // Don't save wordProgress here to prevent mixing
      wordProgress: {},
    });

    // NOTE: Word progress is now only saved by persistenceMiddleware to prevent duplicates
    // Removed duplicate wordProgressStorage.save() call to fix performance issue
  } catch (error) {
    logger.error('Failed to save game state:', error);
  }
};

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
  wordProgress: {},
  ...persistedState,
};

export const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    nextWord: state => {
      if (state.language) {
        // Get words based on whether we have a specific module or not
        const { word, options, quizMode } = state.module
          ? getRandomWordFromModule(
              state.language,
              state.module,
              state.wordProgress,
              state.lastWordId
            )
          : getRandomWord(state.language, state.wordProgress, state.lastWordId);

        state.currentWord = word;
        state.currentOptions = options;
        state.quizMode = quizMode;
        state.isCorrect = null;
        state.lastAnswer = undefined;
        state.capitalizationFeedback = undefined;
        state.lastWordId = word?.id;
      }
    },
    checkAnswer: (state, action: PayloadAction<string>) => {
      if (!state.currentWord) return;

      // Determine correct answer based on direction
      const direction = state.currentWord.direction || 'definition-to-term';
      const correctAnswer =
        direction === 'definition-to-term' ? state.currentWord.term : state.currentWord.definition;

      // Validate answer with language-specific rules
      const validation = validateAnswer(action.payload, correctAnswer, state.language || 'en');

      state.isCorrect = validation.isCorrect;
      state.lastAnswer = action.payload;
      state.totalAttempts += 1;

      // Store capitalization feedback for languages that require it
      if (state.language === 'de' && validation.isCorrect && !validation.capitalizationCorrect) {
        const feedback = getCapitalizationFeedback(validation, state.language);
        state.capitalizationFeedback = feedback || undefined;
      } else {
        state.capitalizationFeedback = undefined;
      }

            // Update word progress with enhanced directional tracking
      const wordId = state.currentWord.id;
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
          }
        },
        learningPhase: 'introduction',
        tags: []
      };

      // Calculate new mastery
      const newMastery = calculateMasteryGain(
        currentProgress.xp,
        validation.isCorrect,
        state.quizMode
      );

      // Update overall progress (maintaining backward compatibility)
      const updatedProgress = {
        ...currentProgress,
        xp: newMastery,
        lastPracticed: new Date().toISOString(),
        timesCorrect: currentProgress.timesCorrect + (validation.isCorrect ? 1 : 0),
        timesIncorrect: currentProgress.timesIncorrect + (validation.isCorrect ? 0 : 1),
        totalXp: newMastery,
        version: 2,
      };

      // Update directional progress if using enhanced format
      if (updatedProgress.directions) {
        const directionData = updatedProgress.directions[direction];
        if (directionData) {
          // Calculate directional mastery gain
          const directionalMastery = calculateMasteryGain(
            directionData.xp,
            validation.isCorrect,
            state.quizMode
          );

          // Update directional stats
          updatedProgress.directions[direction] = {
            ...directionData,
            xp: directionalMastery,
            lastPracticed: new Date().toISOString(),
            timesCorrect: directionData.timesCorrect + (validation.isCorrect ? 1 : 0),
            timesIncorrect: directionData.timesIncorrect + (validation.isCorrect ? 0 : 1),
            consecutiveCorrect: validation.isCorrect ? (directionData.consecutiveCorrect || 0) + 1 : 0,
            longestStreak: validation.isCorrect 
              ? Math.max((directionData.longestStreak || 0), (directionData.consecutiveCorrect || 0) + 1)
              : (directionData.longestStreak || 0)
          };
        }

        // Update learning phase based on overall progress
        if (updatedProgress.xp >= 80) {
          updatedProgress.learningPhase = 'maintenance';
        } else if (updatedProgress.xp >= 50) {
          updatedProgress.learningPhase = 'mastery';
        } else if (updatedProgress.xp > 0) {
          updatedProgress.learningPhase = 'practice';
        }
      }

      state.wordProgress[wordId] = updatedProgress;

      if (validation.isCorrect) {
        // Update score based on streak, quiz mode, and capitalization penalty
        const modeMultiplier =
          state.quizMode === 'open-answer' ? 2 : 
          state.quizMode === 'letter-scramble' ? 1.5 : 
          state.quizMode === 'fill-in-the-blank' ? 1.7 : 1;
        const baseScore = 10 * modeMultiplier * (1 + Math.floor(state.streak / 5));
        const finalScore = Math.round(baseScore * validation.capitalizationPenalty);

        state.score += finalScore;
        state.streak += 1;
        state.correctAnswers += 1;
        state.bestStreak = Math.max(state.streak, state.bestStreak);
      } else {
        state.lives -= 1;
        state.streak = 0;
      }

      // Save state after word progress update
      saveGameState(state);
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      const languageCode = action.payload;
      if (!languageCode) return; // Validate input

      state.language = languageCode;
      state.lives = 3;
      state.score = 0;
      state.streak = 0;
      state.isCorrect = null;
      state.lastAnswer = undefined;

      // Load word progress for this language only (no merging) with automatic migration
      const savedWordProgress = DataMigrationService.safeLoadWordProgress(languageCode);
      state.wordProgress = savedWordProgress;

      // Initialize first word
      const { word, options } = getRandomWord(languageCode, state.wordProgress);
      state.currentWord = word;
      state.currentOptions = options;

      // Save updated state
      saveGameState(state);
    },
    setCurrentModule: (state, action: PayloadAction<string | null>) => {
      state.module = action.payload;
      // Save updated state
      saveGameState(state);
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
      });

      // Get new word if language is set
      if (preservedLanguage) {
        const { word, options } = getRandomWord(preservedLanguage, preservedProgress);
        state.currentWord = word;
        state.currentOptions = options;
      }

      // Save reset state
      saveGameState(state);
    },
    updateWordProgress: (state, action: PayloadAction<Record<string, any>>) => {
      // Handle both single word updates and full progress objects
      if (action.payload.wordId && action.payload.progress) {
        // Single word update: merge into existing progress
        state.wordProgress = {
          ...state.wordProgress,
          [action.payload.wordId]: action.payload.progress
        };
        if (process.env.NODE_ENV === 'development') {
          logger.debug(`Redux word progress updated: ${action.payload.wordId} -> total entries: ${Object.keys(state.wordProgress).length}`);
        }
      } else {
        // Full progress object: replace entirely
        state.wordProgress = action.payload;
        if (process.env.NODE_ENV === 'development') {
          logger.debug(`Redux word progress replaced with ${Object.keys(action.payload).length} entries`);
        }
      }
      // Don't call saveGameState here - let persistence middleware handle it
    },
  },
});

export const { nextWord, checkAnswer, setLanguage, setCurrentModule, resetGame, updateWordProgress } =
  gameSlice.actions;

export default gameSlice.reducer;
