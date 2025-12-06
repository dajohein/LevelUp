/**
 * Simplified Adaptive Learning Engine
 *
 * Re-enabled version with simplified AI interfaces for gradual restoration
 * This service connects simple AI insights with the learning engine to:
 * - Dynamically adjust difficulty based on basic cognitive load detection
 * - Switch to multiple-choice when user is struggling
 * - Optimize quiz mode selection based on performance patterns
 */

import { simpleAILearningCoach, LearningCoachInsight } from './simpleAIInterfaces';
import { selectQuizMode as originalSelectQuizMode } from './spacedRepetitionService';
import { Word } from './wordService';
import { WordProgress } from '../store/types';
import { AnalyticsEvent, AnalyticsEventType, LearningRecommendation } from './analytics/interfaces';
import { enhancedStorage } from './storage/enhancedStorage';
import { logger } from './logger';

// Enhanced interfaces for advanced AI learning
export interface AdaptiveLearningDecision {
  quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';
  difficultyAdjustment: number; // -2 to +2 relative adjustment
  reasoning: string[];
  confidence: number; // 0-1
  intervention?: {
    type: 'support' | 'challenge' | 'break' | 'mode_switch';
    message: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface LearningEngineConfig {
  enableAIControl: boolean;
  interventionThreshold: number; // 0-1, when to trigger interventions
  difficultyAdjustmentRate: number; // Maximum change per adjustment
  adaptationSensitivity: number; // 0-1, how quickly to adapt
}

// Adaptive learning configuration
interface AdaptiveLearningConfig {
  cognitiveLoadThresholds: {
    low: number;
    moderate: number;
    high: number;
  };
  interventionTriggers: {
    strugglingErrorRate: number;
    excellentAccuracyRate: number;
    slowResponseTime: number;
  };
  difficultyAdjustment: {
    minWords: number;
    maxWords: number;
    stepSize: number;
  };
}

const DEFAULT_CONFIG: AdaptiveLearningConfig = {
  cognitiveLoadThresholds: {
    low: 0.3,
    moderate: 0.6,
    high: 0.8,
  },
  interventionTriggers: {
    strugglingErrorRate: 0.4,
    excellentAccuracyRate: 0.9,
    slowResponseTime: 4000,
  },
  difficultyAdjustment: {
    minWords: 3,
    maxWords: 10,
    stepSize: 1,
  },
};

// Enhanced quiz mode selection with AI insights
export async function selectQuizModeWithAI(
  word: Word,
  progress: WordProgress,
  _languageCode: string, // Using underscore to indicate intentionally unused
  sessionContext?: {
    recentPerformance: any[];
    currentStreak: number;
    sessionDuration: number;
  }
): Promise<'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank'> {
  try {
    // Get AI insights if session context available
    if (sessionContext) {
      const cognitiveLoad = await simpleAILearningCoach.detectCognitiveLoad(
        sessionContext.recentPerformance
      );
      const momentum = await simpleAILearningCoach.analyzeLearningMomentum(
        sessionContext.recentPerformance
      );

      logger.debug('AI-enhanced quiz mode selection', {
        wordId: word.id,
        cognitiveLoad: cognitiveLoad.level,
        momentum: momentum.trend,
        sessionContext,
      });

      // AI-driven mode selection
      if (cognitiveLoad.level === 'overload' || cognitiveLoad.level === 'high') {
        logger.info('AI recommendation: Multiple choice (high cognitive load)', {
          cognitiveLoad: cognitiveLoad.level,
          indicators: cognitiveLoad.indicators,
        });
        return 'multiple-choice';
      }

      if (cognitiveLoad.level === 'low' && momentum.trend === 'increasing') {
        logger.info('AI recommendation: Fill-in-blank (low load, good momentum)', {
          cognitiveLoad: cognitiveLoad.level,
          momentum: momentum.trend,
        });
        return 'fill-in-the-blank';
      }
    }

    // Fallback to original spaced repetition logic
    const mastery =
      (progress.timesCorrect / Math.max(1, progress.timesCorrect + progress.timesIncorrect)) * 100;
    return originalSelectQuizMode(mastery, 'practice', word);
  } catch (error) {
    logger.error('Error in AI-enhanced quiz mode selection, falling back to default', {
      error,
      wordId: word.id,
    });
    const mastery =
      (progress.timesCorrect / Math.max(1, progress.timesCorrect + progress.timesIncorrect)) * 100;
    return originalSelectQuizMode(mastery, 'practice', word);
  }
}

// Adaptive difficulty adjustment
export async function adjustSessionDifficulty(
  currentWords: Word[],
  recentPerformance: any[],
  languageCode: string,
  config: AdaptiveLearningConfig = DEFAULT_CONFIG
): Promise<{
  recommendedWordCount: number;
  difficultyAdjustment: 'increase' | 'decrease' | 'maintain';
  reasoning: string[];
  aiInsight?: LearningCoachInsight;
}> {
  try {
    // Analyze current performance
    const errorRate = recentPerformance.filter(p => !p.correct).length / recentPerformance.length;
    const avgResponseTime =
      recentPerformance.reduce((sum, p) => sum + (p.responseTime || 1000), 0) /
      recentPerformance.length;

    // Get AI insights
    const cognitiveLoad = await simpleAILearningCoach.detectCognitiveLoad(recentPerformance);
    const aiInsight = await simpleAILearningCoach.generateInsight({
      recentResponses: recentPerformance,
      currentWords,
      languageCode,
    });

    let difficultyAdjustment: 'increase' | 'decrease' | 'maintain' = 'maintain';
    let recommendedWordCount = currentWords.length;
    const reasoning: string[] = [];

    // AI-driven difficulty adjustment
    if (cognitiveLoad.level === 'overload') {
      difficultyAdjustment = 'decrease';
      recommendedWordCount = Math.max(
        config.difficultyAdjustment.minWords,
        currentWords.length - config.difficultyAdjustment.stepSize
      );
      reasoning.push('AI detected cognitive overload', 'Reducing word count to maintain momentum');
    } else if (
      cognitiveLoad.level === 'low' &&
      errorRate < config.interventionTriggers.excellentAccuracyRate
    ) {
      difficultyAdjustment = 'increase';
      recommendedWordCount = Math.min(
        config.difficultyAdjustment.maxWords,
        currentWords.length + config.difficultyAdjustment.stepSize
      );
      reasoning.push(
        'AI detected low cognitive load',
        'High performance indicates readiness for more challenge'
      );
    } else {
      reasoning.push(
        'AI analysis suggests maintaining current difficulty',
        `Cognitive load: ${cognitiveLoad.level}`
      );
    }

    // Log AI-driven decision
    logger.info('AI-driven difficulty adjustment', {
      languageCode,
      currentWordCount: currentWords.length,
      recommendedWordCount,
      difficultyAdjustment,
      cognitiveLoad: cognitiveLoad.level,
      errorRate,
      avgResponseTime,
      reasoning,
    });

    // Store analytics event
    const analyticsEvent: AnalyticsEvent = {
      id: `adaptive-${Date.now()}`,
      type: AnalyticsEventType.SETTINGS_CHANGE,
      timestamp: Date.now(),
      sessionId: `session-${Date.now()}`,
      data: {
        feature: 'adaptive_difficulty',
        from: currentWords.length,
        to: recommendedWordCount,
        adjustment: difficultyAdjustment,
        cognitiveLoad: cognitiveLoad.level,
        aiInsight: aiInsight.type,
        reasoning,
      },
    };

    await enhancedStorage.saveAnalyticsEvents([analyticsEvent]);

    return {
      recommendedWordCount,
      difficultyAdjustment,
      reasoning,
      aiInsight,
    };
  } catch (error) {
    logger.error('Error in adaptive difficulty adjustment', { error, languageCode });

    return {
      recommendedWordCount: currentWords.length,
      difficultyAdjustment: 'maintain',
      reasoning: ['AI control disabled, using default spaced repetition logic'],
    };
  }
}

// Real-time learning optimization
export async function optimizeLearningSession(sessionData: {
  words: Word[];
  performance: any[];
  duration: number;
  languageCode: string;
  userId?: string;
}): Promise<LearningRecommendation[]> {
  const recommendations: LearningRecommendation[] = [];

  try {
    // Get comprehensive AI analysis
    const cognitiveLoad = await simpleAILearningCoach.detectCognitiveLoad(sessionData.performance);
    const momentum = await simpleAILearningCoach.analyzeLearningMomentum(sessionData.performance);
    const motivation = await simpleAILearningCoach.assessMotivation({
      currentStreak: sessionData.performance.filter(p => p.correct).length,
      sessionDuration: sessionData.duration,
    });

    // Generate AI-driven recommendations
    if (cognitiveLoad.level === 'overload') {
      recommendations.push({
        type: 'break_suggestion',
        priority: 'high',
        action: 'Take a 2-3 minute break to improve retention',
        value: { breakDuration: 3, reason: 'cognitive_overload' },
        reasoning: cognitiveLoad.indicators,
        confidence: cognitiveLoad.confidence,
        expectedImprovement: 0.8,
      });
    }

    if (momentum.trend === 'decreasing' && motivation.level < 0.4) {
      recommendations.push({
        type: 'review_words',
        priority: 'medium',
        action: 'Focus on words you know well to rebuild confidence',
        value: { reviewMode: true, difficulty: 'easy' },
        reasoning: ['Decreasing momentum detected', 'Low motivation level'],
        confidence: 0.8,
        expectedImprovement: 0.6,
      });
    }

    if (cognitiveLoad.level === 'low' && momentum.trend === 'increasing') {
      recommendations.push({
        type: 'difficulty_adjustment',
        priority: 'low',
        action: 'Add more words or try harder modes',
        value: { wordCount: sessionData.words.length + 2, difficulty: 'harder' },
        reasoning: ['Low cognitive load', 'Increasing momentum'],
        confidence: 0.9,
        expectedImprovement: 0.7,
      });
    }

    logger.info('Generated AI learning recommendations', {
      languageCode: sessionData.languageCode,
      recommendationCount: recommendations.length,
      cognitiveLoad: cognitiveLoad.level,
      momentum: momentum.trend,
      motivation: motivation.level,
    });
  } catch (error) {
    logger.error('Error generating learning recommendations', { error, sessionData });
  }

  return recommendations;
}

/**
 * Enhanced method that returns full AdaptiveLearningDecision instead of just quiz mode
 */
export async function selectOptimalQuizMode(
  context: any,
  word: Word,
  mastery: number,
  _sessionType: string // Underscore prefix to mark as intentionally unused
): Promise<AdaptiveLearningDecision> {
  // Get basic quiz mode selection
  const progress: WordProgress = {
    wordId: word.id,
    xp: Math.round(mastery * 10),
    lastPracticed: new Date().toISOString(),
    timesCorrect: 0,
    timesIncorrect: 0,
  };

  const quizMode = await selectQuizModeWithAI(word, progress, 'de');

  // Analyze context for difficulty adjustment
  let difficultyAdjustment = 0;
  const reasoning: string[] = [];
  let confidence = 0.8;

  if (context?.recentPerformance) {
    const recentErrors = context.recentPerformance.filter((p: any) => !p.isCorrect).length;
    const errorRate = recentErrors / Math.max(1, context.recentPerformance.length);

    if (errorRate > 0.6) {
      difficultyAdjustment = -1;
      reasoning.push('High error rate detected, reducing difficulty');
      confidence = 0.9;
    } else if (errorRate < 0.2 && mastery > 0.8) {
      difficultyAdjustment = 1;
      reasoning.push('Low error rate and high mastery, increasing difficulty');
      confidence = 0.85;
    }
  }

  // Add intervention logic
  let intervention: AdaptiveLearningDecision['intervention'];
  if (context?.consecutiveErrors > 4) {
    intervention = {
      type: 'support',
      message: 'You might benefit from reviewing easier content or taking a short break',
      priority: 'high',
    };
    reasoning.push('Consecutive errors detected, suggesting intervention');
  }

  reasoning.push(`Selected ${quizMode} based on word difficulty and user performance`);

  return {
    quizMode,
    difficultyAdjustment,
    reasoning,
    confidence,
    intervention,
  };
}

/**
 * Check if user needs intervention based on performance patterns
 */
export async function shouldIntervene(context: any): Promise<{
  shouldIntervene: boolean;
  intervention?: {
    type: 'support' | 'challenge' | 'break' | 'mode_switch';
    message: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
  };
}> {
  // Check for intervention triggers
  const consecutiveErrors = context?.performanceMetrics?.consecutiveErrors || 0;
  const accuracy = context?.performanceMetrics?.accuracy || 1;
  const sessionDuration = context?.sessionDuration || 0;

  // Support intervention for struggling users
  if (consecutiveErrors >= 4 || accuracy < 0.4) {
    return {
      shouldIntervene: true,
      intervention: {
        type: 'support',
        message: 'Consider reviewing easier content or taking a break to consolidate learning',
        priority: 'high',
      },
    };
  }

  // Break intervention for long sessions
  if (sessionDuration > 45 * 60 * 1000) {
    // 45 minutes
    return {
      shouldIntervene: true,
      intervention: {
        type: 'break',
        message: "Great progress! Taking a break can help consolidate what you've learned",
        priority: 'medium',
      },
    };
  }

  // Challenge intervention for high performers
  if (consecutiveErrors === 0 && accuracy > 0.9) {
    return {
      shouldIntervene: true,
      intervention: {
        type: 'challenge',
        message: "You're doing excellent! Ready for more challenging content?",
        priority: 'low',
      },
    };
  }

  return { shouldIntervene: false };
}

/**
 * Get personalized recommendations based on performance data
 */
export async function getPersonalizedRecommendations(
  context: any
): Promise<LearningRecommendation[]> {
  const recommendations: LearningRecommendation[] = [];

  const accuracy = context?.performanceMetrics?.accuracy || 0;
  const responseTime = context?.performanceMetrics?.responseTime || 0;
  const consecutiveErrors = context?.performanceMetrics?.consecutiveErrors || 0;

  // Performance-based recommendations
  if (accuracy < 0.6) {
    recommendations.push({
      type: 'difficulty_adjustment',
      action: 'Consider reviewing fundamentals or practicing with easier words',
      priority: 'high',
      value: { suggestedDifficulty: 'easier' },
      reasoning: ['Low accuracy indicates need for easier content'],
      confidence: 0.8,
      expectedImprovement: 0.3,
    });
  }

  if (responseTime > 5000) {
    // > 5 seconds
    recommendations.push({
      type: 'speed_training',
      action: 'Practice quick recognition with flashcard mode',
      priority: 'medium',
      value: { suggestedMode: 'multiple-choice' },
      reasoning: ['Slow response time indicates need for speed training'],
      confidence: 0.7,
      expectedImprovement: 0.2,
    });
  }

  if (consecutiveErrors === 0 && accuracy > 0.85) {
    recommendations.push({
      type: 'challenge_increase',
      action: 'Try more challenging vocabulary or advanced quiz modes',
      priority: 'low',
      value: { suggestedMode: 'open-answer' },
      reasoning: ['High accuracy indicates readiness for increased challenge'],
      confidence: 0.9,
      expectedImprovement: 0.1,
    });
  }

  // Learning pattern recommendations
  if (context?.sessionWords?.length > 10) {
    recommendations.push({
      type: 'session_management',
      action: 'Consider shorter, more frequent sessions for better retention',
      priority: 'medium',
      value: { suggestedSessionLength: 10 },
      reasoning: ['Long sessions may lead to fatigue and reduced retention'],
      confidence: 0.6,
      expectedImprovement: 0.2,
    });
  }

  return recommendations;
}

// Export main adaptive learning interface
export const adaptiveLearningEngine = {
  selectQuizModeWithAI,
  selectOptimalQuizMode,
  shouldIntervene,
  getPersonalizedRecommendations,
  adjustSessionDifficulty,
  optimizeLearningSession,

  // Configuration
  getConfig: () => DEFAULT_CONFIG,
  updateConfig: (newConfig: Partial<AdaptiveLearningConfig>) => ({
    ...DEFAULT_CONFIG,
    ...newConfig,
  }),
};
