import { Word } from '../services/wordService';

// Re-export Word for convenience
export type { Word };

export type QuizMode = 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';

// Enhanced directional progress tracking
export interface DirectionalProgress {
  timesCorrect: number;
  timesIncorrect: number;
  xp: number;
  lastPracticed: string;
  averageResponseTime?: number;
  consecutiveCorrect?: number;
  longestStreak?: number;
  difficultyLevel?: 'easy' | 'medium' | 'hard';
}

// Legacy interface for backward compatibility
export interface LegacyWordProgress {
  wordId: string;
  xp: number;
  lastPracticed: string;
  timesCorrect: number;
  timesIncorrect: number;
}

// Enhanced WordProgress with backward compatibility
/** Optional context for an answer submission. */
export interface SubmitOptions {
  /** Hints used; an assisted answer is still correct but earns no mastery. */
  hintsUsed?: number;
  /** A re-queued retry after a miss: practice only, earns no mastery. */
  isRetry?: boolean;
}

export interface WordProgress {
  wordId: string;

  // LEGACY FIELDS - PRESERVED FOR BACKWARD COMPATIBILITY
  xp: number; // Original XP value
  lastPracticed: string; // ISO date string
  timesCorrect: number; // Original correct count
  timesIncorrect: number; // Original incorrect count

  // REVIEW SCHEDULING - OPTIONAL (absent on progress saved before streaks were tracked)
  consecutiveCorrect?: number; // Reviews answered correctly in a row; a lapse resets it to 0
  streakUpdatedAt?: string; // ISO date of the last streak increase (see reviewStreak.ts)

  // NEW FIELDS - OPTIONAL AND DEFAULTED
  totalXp?: number; // Aggregate XP across directions
  firstLearned?: string; // When word was first encountered
  version?: number; // Migration version (1=legacy, 2=enhanced)

  // ENHANCED TRACKING - OPTIONAL
  directions?: {
    'term-to-definition'?: DirectionalProgress;
    'definition-to-term'?: DirectionalProgress;
  };

  // METADATA - OPTIONAL
  learningPhase?: 'introduction' | 'practice' | 'mastery' | 'maintenance';
  tags?: string[];
  customNotes?: string;
}

export interface Module {
  id: string;
  name: string;
  description: string;
  icon: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  words: Word[];
}

export interface LanguageInfo {
  name: string;
  from: string;
  flag: string;
  modules: {
    id: string;
    name: string;
    description: string;
    icon: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
  }[];
}

export interface ModuleProgress {
  moduleId: string;
  completedWords: number;
  totalWords: number;
  averageMastery: number;
  lastPracticed?: string;
}

export interface ModuleProgress {
  moduleId: string;
  languageCode: string;
  completionPercentage: number;
  wordsLearned: number;
  totalWords: number;
  lastAccessed: string; // ISO date string
  averageMastery: number;
}

export interface GameState {
  currentWord: Word | null;
  currentOptions: string[]; // Multiple choice options - required
  quizMode: QuizMode;
  score: number;
  isCorrect: boolean | null;
  lives: number;
  language: string | null;
  module: string | null; // Current module ID
  streak: number;
  bestStreak: number;
  totalAttempts: number;
  correctAnswers: number;
  lastAnswer?: string;
  lastWordId?: string; // Track last word to prevent immediate repetition
  recentlyUsedWords?: string[]; // Track recently used words to prevent repetition
  wordProgress: { [key: string]: WordProgress }; // Track progress per word
  spellingFeedback?: string; // Feedback for capitalization errors or accepted spelling variants
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: {
    type: 'score' | 'streak' | 'correctAnswers' | 'wordLevel';
    threshold: number;
  };
  unlockedAt?: string; // ISO date string
}

export interface AchievementsState {
  achievements: Achievement[];
  unlockedAchievements: string[];
  latestUnlock?: Achievement;
}
