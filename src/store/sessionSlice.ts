import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { sessionStateStorage } from '../services/storageService';
import { logger } from '../services/logger';

export interface SessionType {
  id: string;
  name: string;
  description: string;
  emoji: string;
  targetWords: number;
  timeLimit?: number; // in minutes
  allowedMistakes?: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  requiredScore: number;
  scoreMultiplier: number;
  specialRules?: string[];
}

export interface SessionProgress {
  wordsCompleted: number;
  correctAnswers: number;
  incorrectAnswers: number;
  currentStreak: number;
  longestStreak: number;
  timeElapsed: number; // in seconds
  hintsUsed: number;
  score: number;
  bonusPoints: number;
  sessionFailed?: boolean;
  // For Deep Dive spaced repetition
  incorrectWordIds?: string[];
  reviewWordIds?: string[];
}

export interface SessionState {
  currentLanguage: string;
  currentSession: SessionType | null;
  progress: SessionProgress;
  isSessionActive: boolean;
  sessionStartTime: number;
  // Track completed sessions per language
  completedSessionsByLanguage: { [languageCode: string]: string[] };
  // Track weekly challenge per language
  weeklyChallengeBylanguage: {
    [languageCode: string]: {
      isActive: boolean;
      targetScore: number;
      currentScore: number;
      rank: number;
    };
  };
}

const defaultProgress: SessionProgress = {
  wordsCompleted: 0,
  correctAnswers: 0,
  incorrectAnswers: 0,
  currentStreak: 0,
  longestStreak: 0,
  timeElapsed: 0,
  hintsUsed: 0,
  score: 0,
  bonusPoints: 0,
  sessionFailed: false,
  incorrectWordIds: [],
  reviewWordIds: [],
};

export const sessionTypes: SessionType[] = [
  {
    id: 'quick-dash',
    name: 'Quick Dash',
    description: 'Fast-paced learning sprint. Speed + accuracy = high scores!',
    emoji: '⚡',
    targetWords: 8,
    timeLimit: 5,
    difficulty: 'beginner',
    requiredScore: 600,
    scoreMultiplier: 1.5,
    specialRules: ['Speed bonus up to 50 points per word', 'Streak multiplier x2 after 3 correct'],
  },
  {
    id: 'deep-dive',
    name: 'Deep Dive',
    description: 'Thorough learning with context and repetition. Master every word!',
    emoji: '🧠',
    targetWords: 20,
    timeLimit: 15,
    difficulty: 'intermediate',
    requiredScore: 1400,
    scoreMultiplier: 1.2,
    specialRules: [
      'Context bonus +30 points',
      'Perfect recall +100 bonus',
      'Spaced repetition cycling',
    ],
  },
  {
    id: 'streak-challenge',
    name: 'Streak Challenge',
    description: 'How far can you go without mistakes? High risk, high reward!',
    emoji: '🔥',
    targetWords: -1, // unlimited until first mistake
    allowedMistakes: 1, // End on first mistake - that's what makes it a streak!
    difficulty: 'advanced',
    requiredScore: 1000,
    scoreMultiplier: 2.0,
    specialRules: [
      'Exponential scoring: 2^streak',
      'No time pressure',
      'One mistake ends the streak!',
    ],
  },
  {
    id: 'precision-mode',
    name: 'Precision Mode',
    description: 'Zero mistakes allowed. Think carefully, answer perfectly!',
    emoji: '🎯',
    targetWords: 15,
    allowedMistakes: 0,
    difficulty: 'expert',
    requiredScore: 1500,
    scoreMultiplier: 3.0,
    specialRules: [
      'One mistake = session over',
      'Perfect accuracy bonus +500',
      'Extra time to think',
    ],
  },
  {
    id: 'fill-in-the-blank',
    name: 'Fill in the Blank',
    description: 'Complete sentences by filling in the missing words. Context-rich learning!',
    emoji: '📝',
    targetWords: 15,
    timeLimit: 12,
    difficulty: 'intermediate',
    requiredScore: 1200,
    scoreMultiplier: 1.7,
    specialRules: [
      'Context sentences for better understanding',
      'Complete word accuracy required',
      'Language comprehension bonus +25',
    ],
  },
  {
    id: 'boss-battle',
    name: 'Boss Battle',
    description: 'Weekly ultimate challenge. Face the hardest words and climb the leaderboard!',
    emoji: '⚔️',
    targetWords: 25,
    timeLimit: 20,
    allowedMistakes: 5,
    difficulty: 'expert',
    requiredScore: 2500,
    scoreMultiplier: 4.0,
    specialRules: [
      'Mixed difficulty levels',
      'Community leaderboard',
      'Weekly rewards',
      'Boss word finale',
    ],
  },
];

// Load persisted session state
const loadPersistedSessionState = (): Partial<SessionState> => {
  try {
    const savedState = sessionStateStorage.load();
    return {
      currentLanguage: savedState.language || '',
      currentSession: savedState.currentSession || null,
      isSessionActive: savedState.isActive || false,
      sessionStartTime: Date.now(), // Always reset timer on app start
      // Only restore these if they exist
      ...(savedState.sessionProgress && {
        progress: { ...defaultProgress, ...savedState.sessionProgress },
      }),
    };
  } catch (error) {
    logger.error('Failed to load persisted session state:', error);
    return {};
  }
};

// Helper function to save session state
const saveSessionState = (state: SessionState): void => {
  try {
    sessionStateStorage.save({
      language: state.currentLanguage,
      currentSession: state.currentSession,
      sessionProgress: state.progress,
      isActive: state.isSessionActive,
    });
  } catch (error) {
    logger.error('Failed to save session state:', error);
  }
};

const persistedSessionState = loadPersistedSessionState();

const initialState: SessionState = {
  currentLanguage: persistedSessionState.currentLanguage || '',
  currentSession: persistedSessionState.currentSession || null,
  progress: persistedSessionState.progress || defaultProgress,
  isSessionActive: persistedSessionState.isSessionActive || false,
  sessionStartTime: persistedSessionState.sessionStartTime || 0,
  completedSessionsByLanguage: {},
  weeklyChallengeBylanguage: {},
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    setLanguage: (state, action: PayloadAction<string>) => {
      state.currentLanguage = action.payload;
      // Initialize language-specific data if it doesn't exist
      if (!state.completedSessionsByLanguage[action.payload]) {
        state.completedSessionsByLanguage[action.payload] = [];
      }
      if (!state.weeklyChallengeBylanguage[action.payload]) {
        state.weeklyChallengeBylanguage[action.payload] = {
          isActive: false,
          targetScore: 2500,
          currentScore: 0,
          rank: 0,
        };
      }
    },

    startSession: (state, action: PayloadAction<string>) => {
      const sessionType = sessionTypes.find(s => s.id === action.payload);
      if (sessionType) {
        state.currentSession = sessionType;
        state.progress = { ...defaultProgress };
        state.isSessionActive = true;
        state.sessionStartTime = Date.now();

        // Save session state
        saveSessionState(state);
      }
    },

    updateProgress: (state, action: PayloadAction<Partial<SessionProgress>>) => {
      state.progress = { ...state.progress, ...action.payload };
    },

    addCorrectAnswer: (
      state,
      action: PayloadAction<{
        timeBonus?: number;
        streakBonus?: number;
        contextBonus?: number;
        perfectRecallBonus?: number;
      }>
    ) => {
      const {
        timeBonus = 0,
        streakBonus = 0,
        contextBonus = 0,
        perfectRecallBonus = 0,
      } = action.payload;
      state.progress.correctAnswers += 1;
      state.progress.currentStreak += 1;
      state.progress.longestStreak = Math.max(
        state.progress.longestStreak,
        state.progress.currentStreak
      );

      // Base scoring
      let points = 100; // Base points per correct answer

      // Apply session multiplier
      if (state.currentSession) {
        points *= state.currentSession.scoreMultiplier;
      }

      // Session-specific scoring
      if (state.currentSession?.id === 'streak-challenge') {
        // Capped exponential scoring for streak challenge (max multiplier of 8x at streak 20+)
        const streakMultiplier = Math.min(
          Math.pow(1.5, Math.min(state.progress.currentStreak, 20)),
          8
        );
        points = Math.floor(streakMultiplier * 50);
      } else if (state.currentSession?.id === 'precision-mode') {
        // Higher base points for precision mode
        points = 200 * state.currentSession.scoreMultiplier;
      } else if (state.currentSession?.id === 'deep-dive') {
        // Add context bonus for deep dive
        points += contextBonus;
      } else if (state.currentSession?.id === 'fill-in-the-blank') {
        // Add language comprehension bonus for fill-in-the-blank
        points += contextBonus || 25; // Default 25 point bonus for context-rich learning
      } else if (state.currentSession?.id === 'boss-battle') {
        // Progressive difficulty bonus
        const difficultyMultiplier = 1 + state.progress.wordsCompleted * 0.1;
        points *= difficultyMultiplier;
      }

      // Add bonuses
      points += timeBonus + streakBonus + perfectRecallBonus;

      state.progress.score += Math.round(points);
      state.progress.bonusPoints += timeBonus + streakBonus + contextBonus + perfectRecallBonus;

      // Save session progress
      saveSessionState(state);
    },

    addIncorrectAnswer: state => {
      state.progress.incorrectAnswers += 1;
      state.progress.currentStreak = 0;

      // Check if session should end due to mistakes
      if (state.currentSession?.allowedMistakes !== undefined) {
        if (state.progress.incorrectAnswers >= state.currentSession.allowedMistakes) {
          // Mark session as failed
          state.progress.sessionFailed = true;
        }
      }
    },

    incrementWordsCompleted: state => {
      state.progress.wordsCompleted += 1;
    },

    addPerfectAccuracyBonus: state => {
      if (state.currentSession?.id === 'precision-mode' && state.progress.incorrectAnswers === 0) {
        state.progress.score += 500; // Perfect accuracy bonus
        state.progress.bonusPoints += 500;
      }
    },

    addIncorrectWordForReview: (state, action: PayloadAction<string>) => {
      const wordId = action.payload;
      if (state.currentSession?.id === 'deep-dive') {
        if (!state.progress.incorrectWordIds) state.progress.incorrectWordIds = [];
        if (!state.progress.incorrectWordIds.includes(wordId)) {
          state.progress.incorrectWordIds.push(wordId);
        }
      }
    },

    markWordForReview: (state, action: PayloadAction<string>) => {
      const wordId = action.payload;
      if (state.currentSession?.id === 'deep-dive') {
        if (!state.progress.reviewWordIds) state.progress.reviewWordIds = [];
        if (!state.progress.reviewWordIds.includes(wordId)) {
          state.progress.reviewWordIds.push(wordId);
        }
      }
    },

    addTimeElapsed: (state, action: PayloadAction<number>) => {
      state.progress.timeElapsed += action.payload;
    },

    useHint: state => {
      state.progress.hintsUsed += 1;
      state.progress.score = Math.max(0, state.progress.score - 25); // Hint penalty
    },

    completeSession: state => {
      state.isSessionActive = false;
      if (state.currentSession && state.currentLanguage) {
        // Check if session was successful
        const isSuccess = state.progress.score >= state.currentSession.requiredScore;
        const completedSessions = state.completedSessionsByLanguage[state.currentLanguage] || [];

        if (isSuccess && !completedSessions.includes(state.currentSession.id)) {
          state.completedSessionsByLanguage[state.currentLanguage].push(state.currentSession.id);
        }

        // Update weekly challenge if applicable
        if (state.currentSession.id === 'boss-battle') {
          const weeklyChallenge = state.weeklyChallengeBylanguage[state.currentLanguage];
          if (weeklyChallenge) {
            weeklyChallenge.currentScore = Math.max(
              weeklyChallenge.currentScore,
              state.progress.score
            );
          }
        }
      }

      // Clear session state from localStorage when completed
      saveSessionState(state);
    },

    resetSession: state => {
      state.currentSession = null;
      state.progress = defaultProgress;
      state.isSessionActive = false;
      state.sessionStartTime = 0;
    },

    setWeeklyChallenge: (
      state,
      action: PayloadAction<{
        languageCode: string;
        isActive: boolean;
        targetScore: number;
        rank: number;
      }>
    ) => {
      const { languageCode, ...challengeData } = action.payload;
      if (state.weeklyChallengeBylanguage[languageCode]) {
        state.weeklyChallengeBylanguage[languageCode] = {
          ...state.weeklyChallengeBylanguage[languageCode],
          ...challengeData,
        };
      }
    },
  },
});

export const {
  setLanguage,
  startSession,
  updateProgress,
  addCorrectAnswer,
  addIncorrectAnswer,
  incrementWordsCompleted,
  addPerfectAccuracyBonus,
  addIncorrectWordForReview,
  markWordForReview,
  addTimeElapsed,
  useHint,
  completeSession,
  resetSession,
  setWeeklyChallenge,
} = sessionSlice.actions;

export default sessionSlice.reducer;
