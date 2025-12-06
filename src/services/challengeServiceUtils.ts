/**
 * Challenge Service Utilities - Shared Functions
 *
 * Centralized utilities for common challenge service operations to eliminate
 * code duplication and ensure consistent behavior across all challenge modes.
 *
 * Features:
 * - Difficulty calculation based on word mastery
 * - Time allocation strategies for different challenge types
 * - Confidence boosting and error prevention messaging
 * - Strategy adjustment for different risk levels
 */

import { Word } from './wordService';
import { WordProgress } from '../store/types';
import { calculateMasteryDecay } from './masteryService';

// ============================================================================
// DIFFICULTY CALCULATION
// ============================================================================

/**
 * Calculate difficulty level based on word properties and mastery
 */
export function calculateWordDifficulty(word: Word, progress?: WordProgress): number {
  let difficulty = word.level || 3; // Default to medium

  if (progress) {
    const mastery = calculateMasteryDecay(progress.lastPracticed, progress.xp || 0);

    // Adjust based on mastery - using consistent thresholds
    if (mastery > 75) {
      difficulty = Math.max(1, difficulty - 1);
    } else if (mastery < 35) {
      difficulty = Math.min(5, difficulty + 1);
    }
  }

  return difficulty;
}

/**
 * Calculate error risk based on session progress and context
 */
export function calculateErrorRisk(
  currentProgress: number,
  errorCount: number,
  sessionType: 'precision' | 'streak' | 'speed' | 'depth' = 'precision'
): number {
  if (currentProgress === 0) return 0.1; // Low initial risk

  // Base risk factors
  const fatigueRisk = Math.min(0.3, currentProgress * 0.02); // 2% per word completed
  const pressureRisk = errorCount > 0 ? 0.5 : 0; // Any error creates pressure
  const progressRisk = currentProgress > 10 ? 0.2 : 0; // Higher risk in later stages

  // Session-type specific adjustments
  let sessionMultiplier = 1.0;
  switch (sessionType) {
    case 'precision':
      sessionMultiplier = 1.0; // Default behavior
      break;
    case 'speed':
      sessionMultiplier = 1.2; // Higher risk in speed modes
      break;
    case 'streak':
      sessionMultiplier = 0.8; // Lower risk in streak modes (more forgiving)
      break;
    case 'depth':
      sessionMultiplier = 0.9; // Slightly lower risk for deep learning
      break;
  }

  return Math.min(0.8, (fatigueRisk + pressureRisk + progressRisk) * sessionMultiplier);
}

// ============================================================================
// TIME ALLOCATION STRATEGIES
// ============================================================================

export type ChallengeTimeProfile = {
  baseTime: number;
  minTime: number;
  maxTime: number;
  complexityMultiplier: number;
  wordLengthBonus: number;
  difficultyBonus: number;
};

/**
 * Get time profile for different challenge types
 */
export function getChallengeTimeProfile(challengeType: string): ChallengeTimeProfile {
  switch (challengeType) {
    case 'precision-mode':
      return {
        baseTime: 8,
        minTime: 5,
        maxTime: 15,
        complexityMultiplier: 1.0,
        wordLengthBonus: 1,
        difficultyBonus: 2,
      };

    case 'quick-dash':
      return {
        baseTime: 25,
        minTime: 10,
        maxTime: 45,
        complexityMultiplier: 1.1,
        wordLengthBonus: 2,
        difficultyBonus: 3,
      };

    case 'deep-dive':
      return {
        baseTime: 45,
        minTime: 30,
        maxTime: 120,
        complexityMultiplier: 1.5,
        wordLengthBonus: 5,
        difficultyBonus: 10,
      };

    case 'fill-in-blank':
      return {
        baseTime: 30,
        minTime: 20,
        maxTime: 90,
        complexityMultiplier: 1.3,
        wordLengthBonus: 3,
        difficultyBonus: 5,
      };

    case 'streak-challenge':
      return {
        baseTime: 20,
        minTime: 8,
        maxTime: 40,
        complexityMultiplier: 1.2,
        wordLengthBonus: 2,
        difficultyBonus: 4,
      };

    default:
      return {
        baseTime: 30,
        minTime: 15,
        maxTime: 60,
        complexityMultiplier: 1.2,
        wordLengthBonus: 3,
        difficultyBonus: 5,
      };
  }
}

/**
 * Calculate time allocation for a word in a specific challenge type
 */
export function calculateTimeAllocation(
  word: Word,
  challengeType: string,
  difficulty?: number,
  quizMode?: string
): number {
  const profile = getChallengeTimeProfile(challengeType);
  let timeAllocation = profile.baseTime;

  // Quiz mode adjustments
  if (quizMode) {
    switch (quizMode) {
      case 'multiple-choice':
        timeAllocation *= 1.0; // Base time
        break;
      case 'letter-scramble':
        timeAllocation *= 1.2;
        break;
      case 'open-answer':
        timeAllocation *= 1.4;
        break;
      case 'fill-in-the-blank':
        timeAllocation *= 1.3;
        break;
      case 'synonym-antonym':
        timeAllocation *= 1.6;
        break;
      case 'usage-example':
        timeAllocation *= 1.5;
        break;
      case 'contextual-analysis':
        timeAllocation *= 1.8;
        break;
    }
  }

  // Word complexity adjustments
  if (word.term && word.term.length > 8) {
    timeAllocation += profile.wordLengthBonus;
  }

  if (difficulty && difficulty >= 4) {
    timeAllocation += profile.difficultyBonus;
  } else if (word.level && word.level >= 4) {
    timeAllocation += profile.difficultyBonus;
  }

  // Complexity multiplier
  timeAllocation *= profile.complexityMultiplier;

  return Math.max(profile.minTime, Math.min(profile.maxTime, Math.round(timeAllocation)));
}

/**
 * Calculate adaptive time allocation based on remaining time and words
 */
export function calculateAdaptiveTimeAllocation(
  timeRemaining: number,
  wordsRemaining: number,
  challengeType: string
): number {
  if (wordsRemaining <= 0) return timeRemaining;

  const profile = getChallengeTimeProfile(challengeType);
  const baseTime = timeRemaining / wordsRemaining;

  return Math.max(profile.minTime, Math.min(profile.maxTime, baseTime));
}

// ============================================================================
// STRATEGY ADJUSTMENT
// ============================================================================

export interface ChallengeStrategy {
  pacing: number; // seconds per word
  quizMode: string;
  cognitiveLoadLevel: 'minimal' | 'low' | 'moderate' | 'high';
  difficultyAdjustment: 'easier' | 'same' | 'harder';
}

/**
 * Adjust strategy based on error risk and session type
 */
export function adjustStrategyForRisk(
  errorRisk: number,
  sessionType: 'precision' | 'streak' | 'speed' | 'depth',
  currentStrategy: Partial<ChallengeStrategy> = {}
): ChallengeStrategy {
  // Get time profile for baseline pacing
  const timeProfile = getChallengeTimeProfile(`${sessionType}-mode`);

  const strategy: ChallengeStrategy = {
    pacing: currentStrategy.pacing || timeProfile.baseTime,
    quizMode: currentStrategy.quizMode || 'multiple-choice',
    cognitiveLoadLevel: currentStrategy.cognitiveLoadLevel || 'moderate',
    difficultyAdjustment: currentStrategy.difficultyAdjustment || 'same',
  };

  // High risk adjustments
  if (errorRisk > 0.5) {
    strategy.pacing = Math.max(strategy.pacing, timeProfile.baseTime * 1.5);
    strategy.cognitiveLoadLevel = 'minimal';
    strategy.quizMode = 'multiple-choice'; // Easiest mode
    strategy.difficultyAdjustment = 'easier';
  }
  // Moderate risk adjustments
  else if (errorRisk > 0.3) {
    strategy.pacing = Math.max(strategy.pacing, timeProfile.baseTime * 1.25);
    strategy.cognitiveLoadLevel = 'low';
    strategy.difficultyAdjustment = 'easier';
  }
  // Low risk - normal or increased challenge
  else if (errorRisk < 0.2) {
    strategy.cognitiveLoadLevel = 'moderate';
    if (sessionType !== 'precision') {
      strategy.difficultyAdjustment = 'same'; // Allow normal difficulty
    }
  }

  return strategy;
}

// ============================================================================
// SIMPLIFIED HINT AND SUPPORT GENERATION
// ============================================================================

/**
 * Generate helpful hints based on quiz mode and context
 * Replaces 6 overly complex hint functions with one simple, context-aware approach
 */
export function generateHints(options: {
  word: Word;
  quizMode: string;
  context?: 'precision' | 'speed' | 'boss-battle' | 'normal';
  errorRisk?: number;
}): string[] {
  const { word, quizMode, context = 'normal', errorRisk = 0 } = options;
  const hints: string[] = [];

  // Quiz mode specific hints (core functionality)
  switch (quizMode) {
    case 'multiple-choice':
      hints.push('Read all options carefully before choosing');
      hints.push("Eliminate options that don't make sense");
      break;
    case 'letter-scramble':
      hints.push('Look for familiar letter patterns');
      hints.push('Try saying the scrambled letters out loud');
      break;
    case 'open-answer':
      hints.push('Double-check your spelling before submitting');
      if (word.term.length > 7) {
        hints.push('Break down longer words into familiar parts');
      }
      break;
    case 'fill-in-the-blank':
      hints.push('Read the sentence aloud to hear what sounds right');
      hints.push('Consider the grammatical structure of the sentence');
      break;
  }

  // Context-specific modifiers
  if (context === 'precision' && errorRisk > 0.3) {
    hints.push('Take your time - accuracy is crucial');
  } else if (context === 'speed') {
    hints.push('Trust your instincts and respond quickly');
  } else if (context === 'boss-battle') {
    hints.push('Stay focused - this is a challenging word');
  }

  // Always include a general learning hint
  hints.push('Take a moment to recall the context you learned this word in');

  return hints;
}

/**
 * Generate motivational support messages
 * Replaces complex support functions with simple, encouraging approach
 */
export function generateSupport(options: {
  context?: 'precision' | 'speed' | 'boss-battle' | 'streak' | 'normal';
  errorRisk?: number;
  challengePhase?: 'early' | 'middle' | 'late';
}): string[] {
  const { context = 'normal', errorRisk = 0, challengePhase } = options;
  const support: string[] = [];

  // Base encouragement
  support.push("You're doing great - keep going!");

  // Context-specific encouragement
  switch (context) {
    case 'precision':
      support.push('Precision builds mastery - every detail matters');
      if (errorRisk > 0.5) {
        support.push("Stay calm and confident - you've got this");
      }
      break;
    case 'speed':
      support.push('Quick thinking develops fluency');
      break;
    case 'boss-battle':
      support.push("Challenge yourself - you're stronger than you think");
      break;
    case 'streak':
      support.push('Building momentum with each correct answer');
      break;
    default:
      support.push('Learning is a journey - enjoy the process');
  }

  // Challenge phase encouragement
  if (challengePhase === 'late') {
    support.push("Strong finish - you're almost there");
  }

  return support;
}

// ============================================================================
// COMPLEXITY CALCULATIONS
// ============================================================================

/**
 * Get complexity multiplier for different complexity levels
 */
export function getComplexityMultiplier(complexity: 'simple' | 'moderate' | 'complex'): number {
  switch (complexity) {
    case 'simple':
      return 1.0;
    case 'moderate':
      return 1.3;
    case 'complex':
      return 1.6;
    default:
      return 1.0;
  }
}

/**
 * Determine word complexity based on various factors
 */
export function determineWordComplexity(
  word: Word,
  progress?: WordProgress
): 'simple' | 'moderate' | 'complex' {
  let complexityScore = 0;

  // Word length factor
  if (word.term.length > 10) {
    complexityScore += 2;
  } else if (word.term.length > 7) {
    complexityScore += 1;
  }

  // Difficulty level factor
  if (word.level && word.level >= 4) {
    complexityScore += 2;
  } else if (word.level && word.level >= 3) {
    complexityScore += 1;
  }

  // Mastery factor (low mastery = higher complexity for user)
  if (progress) {
    const mastery = calculateMasteryDecay(progress.lastPracticed, progress.xp || 0);
    if (mastery < 30) {
      complexityScore += 2;
    } else if (mastery < 60) {
      complexityScore += 1;
    }
  }

  // Return complexity level
  if (complexityScore >= 4) {
    return 'complex';
  } else if (complexityScore >= 2) {
    return 'moderate';
  } else {
    return 'simple';
  }
}
