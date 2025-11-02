import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { selectWordForRegularSession } from '../services/wordSelectionManager';
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
      module: savedState.module || null,
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
        
        // Get words using centralized selection
        const result = selectWordForRegularSession(
          state.language,
          state.wordProgress,
          sessionId,
          state.module || undefined
        );

        if (result) {
          state.currentWord = result.word;
          state.currentOptions = result.alternatives.slice(0, 4).map(word => word.term); // Convert Word objects to strings
          state.quizMode = 'multiple-choice'; // Default quiz mode, can be enhanced later
          state.isCorrect = null;
          state.lastAnswer = undefined;
          state.capitalizationFeedback = undefined;
          state.lastWordId = result.word.id;
          
          // Update recently used words list
          if (result.word.id) {
            const recentlyUsed = state.recentlyUsedWords || [];
            const maxRecentWords = 8; // Track last 8 words to prevent repetition
            
            // Add current word to the beginning and limit the array size
            const updatedRecent = [result.word.id, ...recentlyUsed.filter(id => id !== result.word.id)].slice(0, maxRecentWords);
            state.recentlyUsedWords = updatedRecent;
          }
        }
      }
    },

    setCurrentWord: (state, action: PayloadAction<{
      word: any;
      options: string[];
      quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';
    }>) => {
      const { word, options, quizMode } = action.payload;
      state.currentWord = word;
      state.currentOptions = options;
      state.quizMode = quizMode;
      state.isCorrect = null;
      state.lastAnswer = undefined;
      state.capitalizationFeedback = undefined;
      state.lastWordId = word?.id;
      
      // Update recently used words list
      if (word?.id) {
        const recentlyUsed = state.recentlyUsedWords || [];
        const maxRecentWords = 8; // Track last 8 words to prevent repetition
        
        // Add current word to the beginning and limit the array size
        const updatedRecent = [word.id, ...recentlyUsed.filter(id => id !== word.id)].slice(0, maxRecentWords);
        state.recentlyUsedWords = updatedRecent;
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

      // Persistence handled by middleware
      // REMOVED: Direct save call - persistence middleware will handle this
    },

    /**
     * UNIFIED ACTION: Handle complete answer submission with word progress only
     * Session updates should be handled by dispatching handleAnswerSubmission separately
     * This reduces the number of actions but keeps concerns separated
     */
    submitAnswer: (state, action: PayloadAction<{
      answer: string;
    }>) => {
      if (!state.currentWord) return;

      const { answer } = action.payload;

      // Reuse existing checkAnswer logic but keep it self-contained
      const direction = state.currentWord.direction || 'definition-to-term';
      const correctAnswer =
        direction === 'definition-to-term' ? state.currentWord.term : state.currentWord.definition;

      const validation = validateAnswer(answer, correctAnswer, state.language || 'en');

      state.isCorrect = validation.isCorrect;
      state.lastAnswer = answer;
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
        version: 2,
        totalXp: 0,
        firstLearned: new Date().toISOString(),
        directions: {
          'term-to-definition': {
            timesCorrect: 0,
            timesIncorrect: 0,
            xp: 0,
            lastPracticed: new Date().toISOString()
          },
          'definition-to-term': {
            timesCorrect: 0,
            timesIncorrect: 0,
            xp: 0,
            lastPracticed: new Date().toISOString()
          }
        }
      };

      // Calculate mastery gain using the enhanced system
      const masteryGain = calculateMasteryGain(
        currentProgress.xp,
        validation.isCorrect,
        state.quizMode
      );

      const newMastery = currentProgress.xp + masteryGain;

      // Create updated progress
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
            timesCorrect: directionData.timesCorrect + (validation.isCorrect ? 1 : 0),
            timesIncorrect: directionData.timesIncorrect + (validation.isCorrect ? 0 : 1),
            lastPracticed: new Date().toISOString(),
          };
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
      state.recentlyUsedWords = []; // Reset recently used words for new language

      // Load word progress for this language only (no merging) with automatic migration
      const savedWordProgress = DataMigrationService.safeLoadWordProgress(languageCode);
      state.wordProgress = savedWordProgress;

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
        const result = selectWordForRegularSession(preservedLanguage, preservedProgress, sessionId, preservedModule || undefined);
        
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

export const { nextWord, setCurrentWord, checkAnswer, submitAnswer, setLanguage, setCurrentModule, resetGame, updateWordProgress } =
  gameSlice.actions;

export default gameSlice.reducer;
