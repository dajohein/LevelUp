import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getRandomWord } from '../services/wordService';
import { calculateMasteryGain } from '../services/masteryService';
import { wordProgressStorage, gameStateStorage } from '../services/storageService';
import { validateAnswer, getCapitalizationFeedback } from '../services/answerValidation';
import type { GameState } from './types';

// Load persisted game state
const loadPersistedState = (): Partial<GameState> => {
  try {
    const savedState = gameStateStorage.load();
    return {
      language: savedState.language || null,
      score: savedState.score || 0,
      streak: savedState.streak || 0,
      correctAnswers: savedState.correctAnswers || 0,
      totalAttempts: savedState.totalAttempts || 0,
      quizMode: savedState.quizMode || 'multiple-choice',
      wordProgress: savedState.wordProgress || {},
    };
  } catch (error) {
    console.error('Failed to load persisted game state:', error);
    return {};
  }
};

const persistedState = loadPersistedState();

// Helper function to save game state to localStorage
const saveGameState = (state: GameState): void => {
  try {
    gameStateStorage.save({
      language: state.language || undefined,
      score: state.score,
      streak: state.streak,
      correctAnswers: state.correctAnswers,
      totalAttempts: state.totalAttempts,
      quizMode: state.quizMode,
      wordProgress: state.wordProgress,
    });

    // Also save word progress separately for the current language
    if (state.language) {
      wordProgressStorage.save(state.language, state.wordProgress);
    }
  } catch (error) {
    console.error('Failed to save game state:', error);
  }
};

const initialState: GameState = {
  currentWord: null,
  currentOptions: [],
  quizMode: persistedState.quizMode || 'multiple-choice',
  score: persistedState.score || 0,
  isCorrect: null,
  lives: 3,
  language: persistedState.language || null,
  streak: persistedState.streak || 0,
  bestStreak: 0,
  totalAttempts: persistedState.totalAttempts || 0,
  correctAnswers: persistedState.correctAnswers || 0,
  wordProgress: persistedState.wordProgress || {},
  lastAnswer: undefined,
  capitalizationFeedback: undefined,
};

export const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    nextWord: state => {
      if (state.language) {
        const { word, options, quizMode } = getRandomWord(state.language, state.wordProgress, state.lastWordId);
        state.currentWord = word;
        state.currentOptions = options;
        state.quizMode = quizMode; // Set quiz mode based on the selected word
        state.isCorrect = null;
        state.lastAnswer = undefined; // Clear previous answer
        state.capitalizationFeedback = undefined; // Clear capitalization feedback
        state.lastWordId = word?.id; // Track this word for next selection
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

      // Store capitalization feedback for German
      if (state.language === 'de' && validation.isCorrect && !validation.capitalizationCorrect) {
        const feedback = getCapitalizationFeedback(validation, state.language);
        state.capitalizationFeedback = feedback || undefined;
      } else {
        state.capitalizationFeedback = undefined;
      }

      // Update word progress
      const wordId = state.currentWord.id;
      const currentProgress = state.wordProgress[wordId] || {
        wordId,
        xp: 0,
        lastPracticed: new Date().toISOString(),
        timesCorrect: 0,
        timesIncorrect: 0,
      };

      // Calculate new mastery
      const newMastery = calculateMasteryGain(
        currentProgress.xp,
        validation.isCorrect,
        state.quizMode
      );

      // Update word progress
      state.wordProgress[wordId] = {
        ...currentProgress,
        xp: newMastery,
        lastPracticed: new Date().toISOString(),
        timesCorrect: currentProgress.timesCorrect + (validation.isCorrect ? 1 : 0),
        timesIncorrect: currentProgress.timesIncorrect + (validation.isCorrect ? 0 : 1),
      };

      if (validation.isCorrect) {
        // Update score based on streak, quiz mode, and capitalization penalty
        const modeMultiplier = state.quizMode === 'open-answer' ? 2 : 1;
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

      // Load word progress for this language
      const savedWordProgress = wordProgressStorage.load(languageCode);
      state.wordProgress = { ...state.wordProgress, ...savedWordProgress };

      // Initialize first word
      const { word, options } = getRandomWord(languageCode, state.wordProgress);
      state.currentWord = word;
      state.currentOptions = options;

      // Save updated state
      saveGameState(state);
    },
    resetGame: state => {
      // Reset game state while preserving word progress
      const preservedProgress = state.wordProgress;
      const preservedLanguage = state.language;

      Object.assign(state, initialState, {
        wordProgress: preservedProgress,
        language: preservedLanguage,
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
  },
});

export const { nextWord, checkAnswer, setLanguage, resetGame } = gameSlice.actions;

export default gameSlice.reducer;
