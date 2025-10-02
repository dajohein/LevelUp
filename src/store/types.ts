import { Word } from '../services/wordService';

export type QuizMode = 'multiple-choice' | 'letter-scramble' | 'open-answer';

export interface WordProgress {
  wordId: string;
  xp: number;
  lastPracticed: string; // ISO date string
  timesCorrect: number;
  timesIncorrect: number;
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
  wordProgress: { [key: string]: WordProgress }; // Track progress per word
  capitalizationFeedback?: string; // Feedback for language-specific capitalization errors
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
