// Constants for mastery and spaced repetition
export const MASTERY_LEVELS = {
  BEGINNER: 0,
  FAMILIAR: 30,
  INTERMEDIATE: 60,
  ADVANCED: 80,
  MASTERED: 100,
} as const;

export const QUIZ_MODE_THRESHOLDS = {
  MULTIPLE_CHOICE: MASTERY_LEVELS.BEGINNER,
  OPEN_ANSWER: MASTERY_LEVELS.FAMILIAR,
} as const;

export const TIME_INTERVALS = {
  BEGINNER: 4, // 4 hours - shorter for new words
  FAMILIAR: 24, // 1 day
  INTERMEDIATE: 72, // 3 days
  ADVANCED: 168, // 1 week
  MASTERED: 720, // 1 month (30 days)
} as const;

// Calculate mastery decay based on time since last practice
export const calculateMasteryDecay = (
  lastPracticed: string | undefined,
  currentMastery: number
): number => {
  if (!lastPracticed) return currentMastery;

  const hoursSinceLastPractice = Math.floor(
    (Date.now() - new Date(lastPracticed).getTime()) / (1000 * 60 * 60)
  );

  // Determine decay rate based on current mastery level
  let decayRate: number;
  if (currentMastery >= MASTERY_LEVELS.ADVANCED) {
    decayRate = 0.1; // 10% per interval
  } else if (currentMastery >= MASTERY_LEVELS.INTERMEDIATE) {
    decayRate = 0.15; // 15% per interval
  } else {
    decayRate = 0.2; // 20% per interval
  }

  // Calculate time interval based on mastery level
  let timeInterval: number;
  if (currentMastery >= MASTERY_LEVELS.MASTERED) {
    timeInterval = TIME_INTERVALS.MASTERED;
  } else if (currentMastery >= MASTERY_LEVELS.ADVANCED) {
    timeInterval = TIME_INTERVALS.ADVANCED;
  } else if (currentMastery >= MASTERY_LEVELS.INTERMEDIATE) {
    timeInterval = TIME_INTERVALS.INTERMEDIATE;
  } else if (currentMastery >= MASTERY_LEVELS.FAMILIAR) {
    timeInterval = TIME_INTERVALS.FAMILIAR;
  } else {
    timeInterval = TIME_INTERVALS.BEGINNER;
  }

  // Calculate decay amount
  const intervals = Math.floor(hoursSinceLastPractice / timeInterval);
  const decayAmount = currentMastery * Math.pow(decayRate, intervals);

  return Math.max(MASTERY_LEVELS.BEGINNER, currentMastery - decayAmount);
};

// Calculate mastery gain based on current mastery and answer correctness
import { QuizMode } from '../store/types';

export const calculateMasteryGain = (
  currentMastery: number,
  isCorrect: boolean,
  quizMode: QuizMode
): number => {
  // More aggressive learning progression for systematic approach
  const baseGain = quizMode === 'open-answer' ? 15 : 10;
  const baseLoss = quizMode === 'open-answer' ? 8 : 5;

  // Learning curve: easier gains at lower levels, harder at higher levels
  let masteryFactor: number;
  if (currentMastery < 50) {
    // Struggling phase: faster gains to build confidence
    masteryFactor = 1.2;
  } else if (currentMastery < 70) {
    // Learning phase: normal gains
    masteryFactor = 1.0;
  } else if (currentMastery < 90) {
    // Learned phase: slower gains, need consistency
    masteryFactor = 0.7;
  } else {
    // Mastered phase: very slow gains, maintenance mode
    masteryFactor = 0.3;
  }

  if (isCorrect) {
    const gain = baseGain * masteryFactor;
    return Math.min(MASTERY_LEVELS.MASTERED, currentMastery + gain);
  } else {
    // Larger penalty for incorrect answers to enforce learning
    const loss = baseLoss * (2 - masteryFactor * 0.5);
    return Math.max(MASTERY_LEVELS.BEGINNER, currentMastery - loss);
  }
};

// Determine if a word should switch quiz modes based on mastery
export const shouldSwitchQuizMode = (currentMastery: number, currentMode: QuizMode): boolean => {
  // Switch to open answer when word reaches "learning" level (50%)
  if (currentMode === 'multiple-choice') {
    return currentMastery >= 50; // Earlier transition for more challenge
  } else {
    // Switch back to multiple choice if mastery drops below threshold
    return currentMastery < 40; // Some buffer to prevent oscillation
  }
};

// Check if a word is considered "learned" and should appear less frequently
export const isWordLearned = (currentMastery: number): boolean => {
  return currentMastery >= 70;
};

// Check if a word is considered "mastered" and should rarely appear
export const isWordMastered = (currentMastery: number): boolean => {
  return currentMastery >= 90;
};
