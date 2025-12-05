/**
 * Challenge Types - Centralized type definitions for challenge sessions
 *
 * These types are shared across storage, services, and examples to ensure
 * consistency and prevent type drift between different layers.
 */

/**
 * Boss battle session data structure
 * Used by: bossBattleService, userLearningProfile storage, examples
 */
export interface BossBattleSessionData {
  wordsCompleted: number;
  completed: boolean;
  wasAIEnhanced: boolean;
  finalBossReached: boolean;
  finalBossDefeated: boolean;
  phasePerformance: {
    [phase: string]: {
      accuracy: number;
      avgTime: number;
      adaptations: number;
    };
  };
  quizMode: string;
  cognitiveLoad: 'low' | 'moderate' | 'high' | 'overload';
}

/**
 * Streak challenge session data structure
 * Used by: streakChallengeService, userLearningProfile storage, examples
 */
export interface StreakChallengeSessionData {
  streak: number;
  wordsCompleted: number;
  accuracy: number;
  wasAIEnhanced: boolean;
  tier: number;
  quizMode: string;
  cognitiveLoad: 'low' | 'moderate' | 'high' | 'overload';
  adaptationsUsed: string[];
}

/**
 * AI intervention tracking data structure
 * Used by: challengeAIIntegrator, userLearningProfile storage, examples
 */
export interface AIInterventionData {
  type: 'quiz-mode-easier' | 'quiz-mode-harder' | 'cognitive-load-support' | 'momentum-boost';
  successful: boolean;
  beforeAccuracy: number;
  afterAccuracy: number;
  beforeTime: number;
  afterTime: number;
  wasAISession: boolean;
}

/**
 * Quick dash session data structure
 * Used by: quickDashService, userLearningProfile storage
 */
export interface QuickDashSessionData {
  completed: boolean;
  score: number;
  timePerWord: number;
  totalTime: number;
  accuracy: number;
  wasAIEnhanced: boolean;
  pressurePoints: Array<{ timeRemaining: number; accuracy: number }>;
  timeOptimizations: string[];
}

/**
 * Deep dive session data structure
 * Used by: deepDiveService, userLearningProfile storage
 */
export interface DeepDiveSessionData {
  completed: boolean;
  wordsLearned: number;
  retentionRate: number;
  contextualLearningScore: number;
  repetitionCount: number;
  contextVariations: number;
  wasAIEnhanced: boolean;
  firstAttemptAccuracy: number;
  improvementAfterContext: number;
  contextualHintUsage: number;
}

/**
 * Precision mode session data structure
 * Used by: precisionModeService, userLearningProfile storage
 */
export interface PrecisionModeSessionData {
  completed: boolean;
  failurePoint: number; // word number where failure occurred (0 if completed)
  accuracy: number;
  averageTimePerWord: number;
  wasAIEnhanced: boolean;
  errorTypes: string[];
  quizModeUsed: string;
  cognitiveLoadStrategy: string;
  mistakeDetails?: { wordNumber: number; errorType: string; timestamp: Date };
}

/**
 * Fill-in-the-blank session data structure
 * Used by: fillInTheBlankService, userLearningProfile storage
 */
export interface FillInTheBlankSessionData {
  completed: boolean;
  contextualAccuracy: number;
  contextUtilization: number;
  sentenceComplexity: 'simple' | 'moderate' | 'complex';
  wasAIEnhanced: boolean;
  contextualClueUsage: number;
  grammarRecognition: number;
  semanticAccuracy: number;
  syntacticAccuracy: number;
  pragmaticAccuracy: number;
}

/**
 * Cognitive load levels used across challenge types
 */
export type CognitiveLoad = 'low' | 'moderate' | 'high' | 'overload';

/**
 * Quiz modes available across different challenge types
 */
export type QuizMode = 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';

/**
 * AI intervention types for learning support
 */
export type AIInterventionType =
  | 'quiz-mode-easier'
  | 'quiz-mode-harder'
  | 'cognitive-load-support'
  | 'momentum-boost';
