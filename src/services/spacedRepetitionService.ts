/**
 * Spaced Repetition Learning Engine
 *
 * Implements evidence-based learning strategies:
 * - Small word groups (5-7 words) for optimal cognitive load
 * - Interleaved practice to prevent boredom and improve retention
 * - Spaced repetition based on forgetting curves
 * - Adaptive difficulty progression
 * - Mixed quiz modes within sessions for variety
 */

import { WordProgress } from '../store/types';
import { Word } from './wordService';
import { calculateMasteryDecay } from './masteryService';
import { logger } from './logger';

// Learning constants based on cognitive science research
export const LEARNING_CONSTANTS = {
  // Optimal group size for working memory (Miller's Rule: 7±2)
  MIN_GROUP_SIZE: 5,
  MAX_GROUP_SIZE: 7,
  IDEAL_GROUP_SIZE: 6,

  // Spaced repetition intervals (in hours)
  INITIAL_INTERVAL: 0.5, // 30 minutes for immediate reinforcement
  LEARNING_INTERVALS: [1, 4, 24, 72, 168, 720], // 1h, 4h, 1d, 3d, 1w, 1m

  // Mastery thresholds for different learning phases
  INTRODUCTION_THRESHOLD: 20, // New word introduction phase
  LEARNING_THRESHOLD: 50, // Active learning phase
  CONSOLIDATION_THRESHOLD: 80, // Memory consolidation phase
  MASTERY_THRESHOLD: 95, // Long-term retention phase

  // Quiz mode distribution weights for variety
  QUIZ_MODE_WEIGHTS: {
    'multiple-choice': 0.25, // 25% - recognition
    'letter-scramble': 0.35, // 35% - construction
    'open-answer': 0.25, // 25% - recall
    'fill-in-the-blank': 0.15, // 15% - context-rich recall
  },

  // Review frequency based on mastery
  REVIEW_MULTIPLIERS: {
    struggling: 0.5, // More frequent reviews
    learning: 1.0, // Normal frequency
    learned: 2.0, // Less frequent reviews
    mastered: 4.0, // Minimal reviews
  },
} as const;

// Learning phase classification
export type LearningPhase = 'introduction' | 'learning' | 'consolidation' | 'mastery';

export interface WordGroup {
  id: string;
  words: Word[];
  phase: LearningPhase;
  createdAt: string;
  lastPracticed?: string;
  sessionCount: number;
  averageMastery: number;
}

export interface LearningSession {
  groupId: string;
  words: Array<{
    word: Word;
    quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';
    difficulty: number;
  }>;
  reviewWords: Array<{
    word: Word;
    quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';
    lastSeen: string;
  }>;
  sessionType: 'introduction' | 'practice' | 'review' | 'mixed';
}

/**
 * Determines the learning phase of a word based on its mastery level
 */
export const getWordLearningPhase = (mastery: number): LearningPhase => {
  if (mastery < LEARNING_CONSTANTS.INTRODUCTION_THRESHOLD) return 'introduction';
  if (mastery < LEARNING_CONSTANTS.LEARNING_THRESHOLD) return 'learning';
  if (mastery < LEARNING_CONSTANTS.CONSOLIDATION_THRESHOLD) return 'consolidation';
  return 'mastery';
};

/**
 * Calculates the next review time for a word based on its mastery and learning phase
 */
export const calculateNextReviewTime = (
  currentMastery: number,
  correctStreak: number,
  lastPracticed: string
): Date => {
  const phase = getWordLearningPhase(currentMastery);
  const lastPracticedDate = new Date(lastPracticed);

  // Base interval selection based on correct streak and mastery
  let intervalIndex = Math.min(correctStreak, LEARNING_CONSTANTS.LEARNING_INTERVALS.length - 1);
  let baseInterval = LEARNING_CONSTANTS.LEARNING_INTERVALS[intervalIndex];

  // Apply multiplier based on learning phase
  const multiplier =
    LEARNING_CONSTANTS.REVIEW_MULTIPLIERS[
      phase === 'introduction'
        ? 'struggling'
        : phase === 'learning'
        ? 'learning'
        : phase === 'consolidation'
        ? 'learned'
        : 'mastered'
    ];

  const adjustedInterval = baseInterval * multiplier;

  // Convert hours to milliseconds and add to last practiced time
  const intervalMs = adjustedInterval * 60 * 60 * 1000;
  return new Date(lastPracticedDate.getTime() + intervalMs);
};

/**
 * Checks if a word has context data suitable for fill-in-the-blank mode
 */
const hasContextData = (word: Word): boolean => {
  return !!(word.context?.sentence && word.context?.translation);
};

/**
 * Determines the appropriate quiz mode based on mastery level and learning phase
 * 
 * Progressive Difficulty System:
 * - 0-30%: Multiple choice only (recognition)
 * - 30-60%: Letter scramble + multiple choice (construction)  
 * - 60-85%: Open answer + letter scramble (recall)
 * - 85-90%: Open answer focus (mastery consolidation)
 * - 90%+: Fill-in-the-blank introduced (ultimate context challenge)
 * 
 * Fill-in-the-blank is reserved for very high mastery words (90%+) to ensure
 * users have demonstrated consistent performance before facing context challenges.
 */
export const selectQuizMode = (
  mastery: number,
  sessionContext: 'introduction' | 'practice' | 'review',
  word?: Word
): 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank' => {
  const phase = getWordLearningPhase(mastery);

  // For introduction phase, always start with multiple choice
  if (phase === 'introduction' || sessionContext === 'introduction') {
    return 'multiple-choice';
  }

  // Check if word has context for fill-in-the-blank mode
  const canUseFillInBlank = word ? hasContextData(word) : false;

  // For review sessions, prefer more challenging modes but reserve fill-in-the-blank for very high mastery
  if (sessionContext === 'review' && mastery > LEARNING_CONSTANTS.LEARNING_THRESHOLD) {
    if (canUseFillInBlank && mastery >= 85) {
      // Only use fill-in-the-blank for review if mastery is very high (85%+)
      const rand = Math.random();
      if (rand < 0.35) return 'open-answer';
      if (rand < 0.55) return 'fill-in-the-blank'; // Reduced from 65% to 55%
      return 'letter-scramble';
    } else {
      return Math.random() < 0.7 ? 'open-answer' : 'letter-scramble';
    }
  }

  // Normal mode selection based on mastery
  if (mastery < 30) return 'multiple-choice';
  if (mastery < 60) {
    const rand = Math.random();
    if (rand < 0.6) return 'letter-scramble';
    return 'multiple-choice';
  }
  if (mastery < 85) {
    // Removed fill-in-the-blank from this tier - too early for context challenges
    const rand = Math.random();
    if (rand < 0.3) return 'letter-scramble';
    if (rand < 0.6) return 'open-answer';
    return 'letter-scramble';
  }

  // For high mastery words (85%+), introduce fill-in-the-blank as the ultimate challenge
  // But only after user has shown consistent performance
  if (canUseFillInBlank && mastery >= 90) {
    // Require very high mastery (90%+) for fill-in-the-blank to ensure readiness
    const rand = Math.random();
    if (rand < 0.25) return 'fill-in-the-blank'; // Reduced from 30% to 25%
    if (rand < 0.6) return 'open-answer';
    return 'letter-scramble';
  } else {
    return Math.random() < 0.7 ? 'open-answer' : 'letter-scramble';
  }
};

/**
 * Creates optimally sized word groups for learning sessions
 */
export const createWordGroups = (
  words: Word[],
  wordProgress: { [key: string]: WordProgress }
): WordGroup[] => {
  // Calculate current mastery for all words
  const wordsWithMastery = words.map(word => {
    const progress = wordProgress[word.id];
    const currentMastery = progress
      ? calculateMasteryDecay(progress.lastPracticed, progress.xp || 0)
      : 0;

    return {
      ...word,
      currentMastery,
      phase: getWordLearningPhase(currentMastery),
    };
  });

  // Group words by learning phase
  const wordsByPhase = wordsWithMastery.reduce((acc, word) => {
    if (!acc[word.phase]) acc[word.phase] = [];
    acc[word.phase].push(word);
    return acc;
  }, {} as Record<LearningPhase, typeof wordsWithMastery>);

  const groups: WordGroup[] = [];

  // Create groups for each phase
  Object.entries(wordsByPhase).forEach(([phase, phaseWords]) => {
    if (phaseWords.length === 0) return;

    // Sort words by mastery (lowest first for more attention)
    phaseWords.sort((a, b) => a.currentMastery - b.currentMastery);

    // Create groups of optimal size
    for (let i = 0; i < phaseWords.length; i += LEARNING_CONSTANTS.IDEAL_GROUP_SIZE) {
      const groupWords = phaseWords.slice(i, i + LEARNING_CONSTANTS.IDEAL_GROUP_SIZE);

      if (groupWords.length >= LEARNING_CONSTANTS.MIN_GROUP_SIZE) {
        const averageMastery =
          groupWords.reduce((sum, w) => sum + w.currentMastery, 0) / groupWords.length;

        groups.push({
          id: `${phase}-${groups.length}-${Date.now()}`,
          words: groupWords,
          phase: phase as LearningPhase,
          createdAt: new Date().toISOString(),
          sessionCount: 0,
          averageMastery,
        });
      } else if (groups.length > 0) {
        // Merge small remainder into the last group if possible
        const lastGroup = groups[groups.length - 1];
        if (lastGroup.words.length + groupWords.length <= LEARNING_CONSTANTS.MAX_GROUP_SIZE) {
          lastGroup.words.push(...groupWords);
          lastGroup.averageMastery =
            lastGroup.words.reduce((sum, w) => {
              const wordWithMastery = w as (typeof wordsWithMastery)[0];
              return sum + wordWithMastery.currentMastery;
            }, 0) / lastGroup.words.length;
        }
      }
    }
  });

  logger.debug(
    `📚 Created ${groups.length} word groups:`,
    groups.map(g => `${g.phase}: ${g.words.length} words (avg: ${Math.round(g.averageMastery)}%)`)
  );

  return groups;
};

/**
 * Selects words that need review based on spaced repetition algorithm
 */
export const selectWordsForReview = (
  words: Word[],
  wordProgress: { [key: string]: WordProgress },
  maxReviewWords: number = 10
): Word[] => {
  const now = new Date();

  const reviewCandidates = words
    .map(word => {
      const progress = wordProgress[word.id];
      if (!progress || !progress.lastPracticed) return null;

      const currentMastery = calculateMasteryDecay(progress.lastPracticed, progress.xp || 0);
      const correctStreak = Math.max(0, progress.timesCorrect - progress.timesIncorrect);
      const nextReviewTime = calculateNextReviewTime(
        currentMastery,
        correctStreak,
        progress.lastPracticed
      );

      return {
        word,
        currentMastery,
        nextReviewTime,
        priority: nextReviewTime.getTime() - now.getTime(), // Negative = overdue
      };
    })
    .filter(Boolean)
    .filter(candidate => candidate!.priority <= 0) // Only overdue words
    .sort((a, b) => a!.priority - b!.priority) // Most overdue first
    .slice(0, maxReviewWords)
    .map(candidate => candidate!.word);

  if (reviewCandidates.length > 0) {
    logger.debug(`🔄 Selected ${reviewCandidates.length} words for review`);
  }

  return reviewCandidates;
};

/**
 * Creates a mixed learning session with variety in quiz modes and word selection
 */
export const createLearningSession = (
  targetGroup: WordGroup,
  reviewWords: Word[],
  wordProgress: { [key: string]: WordProgress }
): LearningSession => {
  const sessionWords = targetGroup.words.map(word => {
    const progress = wordProgress[word.id];
    const currentMastery = progress
      ? calculateMasteryDecay(progress.lastPracticed, progress.xp || 0)
      : 0;

    const quizMode = selectQuizMode(
      currentMastery,
      targetGroup.phase === 'introduction' ? 'introduction' : 'practice',
      word
    );

    return {
      word,
      quizMode,
      difficulty: Math.max(1, Math.floor(currentMastery / 20)), // 1-5 scale
    };
  });

  const sessionReviewWords = reviewWords.map(word => {
    const progress = wordProgress[word.id];
    const currentMastery = progress
      ? calculateMasteryDecay(progress.lastPracticed, progress.xp || 0)
      : 0;

    return {
      word,
      quizMode: selectQuizMode(currentMastery, 'review', word),
      lastSeen: progress?.lastPracticed || new Date().toISOString(),
    };
  });

  // Determine session type
  let sessionType: LearningSession['sessionType'];
  if (targetGroup.phase === 'introduction') {
    sessionType = 'introduction';
  } else if (reviewWords.length > 0 && sessionWords.length === 0) {
    sessionType = 'review';
  } else if (reviewWords.length > 0 && sessionWords.length > 0) {
    sessionType = 'mixed';
  } else {
    sessionType = 'practice';
  }

  logger.debug(`🎯 Created ${sessionType} session:`, {
    groupWords: sessionWords.length,
    reviewWords: sessionReviewWords.length,
    phase: targetGroup.phase,
  });

  return {
    groupId: targetGroup.id,
    words: sessionWords,
    reviewWords: sessionReviewWords,
    sessionType,
  };
};

/**
 * Implements interleaved practice by shuffling words from different groups/phases
 */
export const interleaveSessionWords = (
  session: LearningSession
): Array<{
  word: Word;
  quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';
  type: 'group' | 'review';
  difficulty?: number;
}> => {
  const allWords = [
    ...session.words.map(w => ({ ...w, type: 'group' as const })),
    ...session.reviewWords.map(w => ({ ...w, type: 'review' as const })),
  ];

  // Add bi-directional learning support: randomly assign direction ONLY if not already present
  // This preserves intentional directions while adding bi-directional support for others
  const wordsWithDirection = allWords.map(wordData => ({
    ...wordData,
    word: {
      ...wordData.word,
      // Only assign random direction if no direction is explicitly set
      direction:
        wordData.word.direction ||
        (Math.random() < 0.5 ? 'definition-to-term' : 'term-to-definition'),
    },
  }));

  // Shuffle array using Fisher-Yates algorithm for true randomness
  for (let i = wordsWithDirection.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [wordsWithDirection[i], wordsWithDirection[j]] = [wordsWithDirection[j], wordsWithDirection[i]];
  }

  logger.debug(
    `🔀 Interleaved ${wordsWithDirection.length} words for varied practice with bi-directional support`
  );

  return wordsWithDirection;
};

/**
 * Analyzes session performance and adjusts future learning parameters
 */
export interface SessionAnalysis {
  groupId: string;
  wordsLearned: number;
  averageAccuracy: number;
  fastestModeCompletion: string;
  strugglingWords: string[];
  recommendations: string[];
}

export const analyzeSessionPerformance = (
  session: LearningSession,
  results: Array<{
    wordId: string;
    isCorrect: boolean;
    timeSpent: number;
    quizMode: string;
  }>
): SessionAnalysis => {
  const correctAnswers = results.filter(r => r.isCorrect).length;
  const accuracy = results.length > 0 ? correctAnswers / results.length : 0;

  // Find struggling words (incorrect answers)
  const strugglingWords = results.filter(r => !r.isCorrect).map(r => r.wordId);

  // Analyze quiz mode performance
  const modePerformance = results.reduce((acc, r) => {
    if (!acc[r.quizMode]) acc[r.quizMode] = { correct: 0, total: 0, totalTime: 0 };
    acc[r.quizMode].total++;
    acc[r.quizMode].totalTime += r.timeSpent;
    if (r.isCorrect) acc[r.quizMode].correct++;
    return acc;
  }, {} as Record<string, { correct: number; total: number; totalTime: number }>);

  const fastestMode =
    Object.entries(modePerformance).sort(
      (a, b) => a[1].totalTime / a[1].total - b[1].totalTime / b[1].total
    )[0]?.[0] || 'multiple-choice';

  // Generate recommendations
  const recommendations: string[] = [];

  if (accuracy < 0.7) {
    recommendations.push('Focus on easier quiz modes to build confidence');
    recommendations.push('Review word context and definitions more carefully');
  }

  if (strugglingWords.length > session.words.length * 0.3) {
    recommendations.push('Consider smaller word groups for better focus');
    recommendations.push('Schedule more frequent review sessions');
  }

  if (accuracy > 0.9) {
    recommendations.push('Ready for more challenging quiz modes');
    recommendations.push('Consider introducing new words to this group');
  }

  return {
    groupId: session.groupId,
    wordsLearned: correctAnswers,
    averageAccuracy: accuracy,
    fastestModeCompletion: fastestMode,
    strugglingWords,
    recommendations,
  };
};
