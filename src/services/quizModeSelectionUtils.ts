/**
 * Quiz Mode Selection Utilities - Simplified
 *
 * Clean, simple quiz mode selection based on:
 * - Word mastery level (XP-based progression)
 * - Simple context modifiers for edge cases
 *
 * Replaces the previous overly complex system with a much simpler approach.
 */

import { Word } from './wordService';
import { WordProgress } from '../store/types';
import { logger } from './logger';

export type StandardQuizMode =
  | 'multiple-choice'
  | 'letter-scramble'
  | 'open-answer'
  | 'fill-in-the-blank';

/**
 * Convert word XP to mastery tier for consistent quiz mode selection
 */
export function getWordMasteryTier(xp: number): number {
  if (xp === 0) return 1; // New word - easiest modes
  if (xp <= 20) return 1; // Still learning - easy modes
  if (xp <= 50) return 2; // Getting familiar - mixed easy modes
  if (xp <= 100) return 3; // Decent progress - introduce harder modes
  if (xp <= 200) return 4; // Good mastery - challenging modes
  return 5; // High mastery - hardest modes
}

/**
 * Generate quiz mode based on mastery tier with progressive difficulty
 * This is the baseline logic used across different challenge types
 */
export function generateQuizModeForMastery(
  tier: number,
  allowOpenAnswer: boolean = true
): StandardQuizMode {
  // Tier 1 (0-20 XP): New/learning words - ONLY easy modes
  if (tier === 1) {
    return Math.random() < 0.8 ? 'multiple-choice' : 'letter-scramble';
  }

  // Tier 2 (21-50 XP): Getting familiar - mostly easy modes
  if (tier === 2) {
    return Math.random() < 0.6 ? 'multiple-choice' : 'letter-scramble';
  }

  // Tier 3 (51-100 XP): Decent progress - introduce open-answer
  if (tier === 3) {
    const rand = Math.random();
    if (rand < 0.4) return 'multiple-choice';
    if (rand < 0.7) return 'letter-scramble';
    return allowOpenAnswer ? 'open-answer' : 'letter-scramble';
  }

  // Tier 4 (101-200 XP): Good mastery - more challenging
  if (tier === 4) {
    const rand = Math.random();
    if (rand < 0.2) return 'multiple-choice';
    if (rand < 0.4) return 'letter-scramble';
    if (rand < 0.7) return allowOpenAnswer ? 'open-answer' : 'fill-in-the-blank';
    return 'fill-in-the-blank';
  }

  // Tier 5 (200+ XP): Expert level - hardest modes
  const rand = Math.random();
  if (rand < 0.1) return 'multiple-choice';
  if (rand < 0.2) return 'letter-scramble';
  if (rand < 0.5) return allowOpenAnswer ? 'open-answer' : 'fill-in-the-blank';
  return 'fill-in-the-blank';
}

/**
 * Smart quiz mode selection with simple context modifiers
 * Replaces all the overly complex specialized functions
 */
export function selectQuizMode(options: {
  word: Word;
  wordProgress: { [key: string]: WordProgress };
  context?: 'normal' | 'high-pressure' | 'boss-battle';
  allowOpenAnswer?: boolean;
}): StandardQuizMode {
  const { word, wordProgress, context = 'normal', allowOpenAnswer = true } = options;

  const progress = wordProgress[word.id];
  const wordXP = progress?.xp || 0;
  const masteryTier = getWordMasteryTier(wordXP);

  // Start with basic mastery-based selection
  let baseMode = generateQuizModeForMastery(masteryTier, allowOpenAnswer);

  // Apply simple context modifiers
  if (context === 'high-pressure' && wordXP < 50) {
    // In high-pressure situations, make things easier for low-XP words
    baseMode = 'multiple-choice';
  } else if (context === 'boss-battle' && wordXP > 100) {
    // In boss battles, make experienced words harder
    const rand = Math.random();
    if (rand < 0.3) baseMode = 'fill-in-the-blank';
    else if (rand < 0.6 && allowOpenAnswer) baseMode = 'open-answer';
    // else keep the base mode
  }

  logger.debug('Quiz mode selected', {
    wordId: word.id,
    wordXP,
    masteryTier,
    context,
    selectedMode: baseMode,
  });

  return baseMode;
}
