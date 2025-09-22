import { Word } from '../services/wordService';

export type QuizMode = 'multiple-choice' | 'open-answer';

export interface WordProgress {
  wordId: string;
  xp: number;
  lastPracticed: string; // ISO date string
  timesCorrect: number;
  timesIncorrect: number;
}

export interface GameState {
  currentWord: Word | null;
  currentOptions: string[]; // Multiple choice options - required
  quizMode: QuizMode;
  score: number;
  isCorrect: boolean | null;
  lives: number;
  language: string | null;
  streak: number;
  bestStreak: number;
  totalAttempts: number;
  correctAnswers: number;
  lastAnswer?: string;
  wordProgress: { [key: string]: WordProgress }; // Track progress per word
  capitalizationFeedback?: string; // Feedback for German capitalization errors
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
  unlockedAt?: Date;
}

export interface AchievementsState {
  achievements: Achievement[];
  unlockedAchievements: string[];
  latestUnlock?: Achievement;
}
