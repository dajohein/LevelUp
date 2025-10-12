/**
 * AI-Driven Adaptive Learning Engine
 * 
 * This service connects the AI Learning Coach with the learning engine to:
 * - Dynamically adjust difficulty based on cognitive load detection
 * - Switch to multiple-choice when user is struggling (challenge intervention)
 * - Increase difficulty when AI detects readiness for more challenge
 * - Optimize quiz mode selection based on real-time performance patterns
 */

import { 
  AILearningCoach, 
  LearningMomentum, 
  CognitiveLoad, 
  MotivationProfile,
  LearningPersonality,
  LearningCoachInsight 
} from './ai/learningCoach';
import { selectQuizMode as originalSelectQuizMode } from './spacedRepetitionService';
import { Word } from './wordService';
import { WordProgress } from '../store/types';
import { 
  AnalyticsEvent, 
  AnalyticsEventType, 
  LearningRecommendation,
  RealTimeMetrics 
} from './analytics/interfaces';
import { enhancedStorage } from './storage/enhancedStorage';
import { logger } from './logger';

export interface AILearningContext {
  userId: string;
  languageCode: string;
  sessionId: string;
  sessionEvents: AnalyticsEvent[];
  currentPerformance: {
    accuracy: number;
    responseTime: number;
    consecutiveErrors: number;
    consecutiveSuccess: number;
  };
}

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
  challengeThreshold: number; // Accuracy threshold to increase difficulty
  supportThreshold: number; // Accuracy threshold to provide support
}

export class AIAdaptiveLearningEngine {
  private aiCoach: AILearningCoach;
  private config: LearningEngineConfig;
  private sessionCache = new Map<string, {
    momentum: LearningMomentum;
    cognitiveLoad: CognitiveLoad;
    motivation: MotivationProfile;
    personality: LearningPersonality;
    lastUpdate: number;
  }>();

  constructor(
    aiCoach: AILearningCoach,
    config: Partial<LearningEngineConfig> = {}
  ) {
    this.aiCoach = aiCoach;
    this.config = {
      enableAIControl: true,
      interventionThreshold: 0.7,
      difficultyAdjustmentRate: 0.2,
      adaptationSensitivity: 0.8,
      challengeThreshold: 0.85, // 85%+ accuracy triggers challenge
      supportThreshold: 0.6, // <60% accuracy triggers support
      ...config
    };
  }

  /**
   * AI-enhanced quiz mode selection
   * Overrides default spaced repetition logic when AI detects need for intervention
   */
  async selectOptimalQuizMode(
    context: AILearningContext,
    word: Word,
    currentMastery: number,
    sessionContext: 'introduction' | 'practice' | 'review'
  ): Promise<AdaptiveLearningDecision> {
    if (!this.config.enableAIControl) {
      // Fallback to original logic
      const quizMode = originalSelectQuizMode(currentMastery, sessionContext, word);
      return {
        quizMode,
        difficultyAdjustment: 0,
        reasoning: ['AI control disabled, using default spaced repetition logic'],
        confidence: 1.0
      };
    }

    try {
      // Get or update AI analysis
      const aiAnalysis = await this.getAIAnalysis(context);
      
      // Determine if intervention is needed
      const decision = await this.makeAdaptiveLearningDecision(
        aiAnalysis,
        word,
        currentMastery,
        sessionContext,
        context.currentPerformance
      );

      logger.debug('AI adaptive learning decision', {
        userId: context.userId,
        wordId: word.id,
        decision,
        cognitiveLoad: aiAnalysis.cognitiveLoad.level,
        momentum: aiAnalysis.momentum.direction
      });

      return decision;

    } catch (error) {
      logger.error('AI adaptive learning failed, falling back to default', error);
      
      // Safe fallback
      const quizMode = originalSelectQuizMode(currentMastery, sessionContext, word);
      return {
        quizMode,
        difficultyAdjustment: 0,
        reasoning: ['AI system error, using fallback logic'],
        confidence: 0.5
      };
    }
  }

  /**
   * Real-time difficulty adjustment based on performance patterns
   */
  async adjustDifficultyDynamically(
    context: AILearningContext,
    baseLevel: number
  ): Promise<{
    adjustedLevel: number;
    reasoning: string[];
    shouldIntervene: boolean;
    intervention?: any;
  }> {
    const aiAnalysis = await this.getAIAnalysis(context);
    const { cognitiveLoad, momentum, motivation } = aiAnalysis;

    let adjustment = 0;
    const reasoning: string[] = [];
    let shouldIntervene = false;
    let intervention;

    // Cognitive load based adjustments
    if (cognitiveLoad.level === 'overloaded') {
      adjustment = -1;
      reasoning.push('Cognitive overload detected - reducing difficulty');
      shouldIntervene = true;
      intervention = {
        type: 'support',
        message: 'Taking a moment to review easier content',
        priority: 'high'
      };
    } else if (cognitiveLoad.level === 'low' && momentum.direction === 'improving') {
      adjustment = +0.5;
      reasoning.push('Low cognitive load with improving momentum - slight difficulty increase');
    }

    // Performance pattern adjustments
    if (context.currentPerformance.accuracy > this.config.challengeThreshold) {
      adjustment += 0.3;
      reasoning.push(`High accuracy (${(context.currentPerformance.accuracy * 100).toFixed(1)}%) - increasing challenge`);
    } else if (context.currentPerformance.accuracy < this.config.supportThreshold) {
      adjustment -= 0.4;
      reasoning.push(`Low accuracy (${(context.currentPerformance.accuracy * 100).toFixed(1)}%) - providing support`);
      
      if (context.currentPerformance.consecutiveErrors >= 3) {
        shouldIntervene = true;
        intervention = {
          type: 'mode_switch',
          message: 'Switching to multiple choice to build confidence',
          priority: 'medium'
        };
      }
    }

    // Motivation based adjustments
    if (motivation.currentState === 'frustrated') {
      adjustment -= 0.2;
      reasoning.push('Frustration detected - reducing pressure');
    } else if (motivation.currentState === 'motivated' && motivation.challengeSeekingBehavior > 0.7) {
      adjustment += 0.2;
      reasoning.push('High motivation and challenge-seeking - increasing difficulty');
    }

    // Clamp adjustment to configured limits
    adjustment = Math.max(-this.config.difficultyAdjustmentRate, 
                         Math.min(this.config.difficultyAdjustmentRate, adjustment));

    const adjustedLevel = Math.max(0, Math.min(5, baseLevel + adjustment));

    return {
      adjustedLevel,
      reasoning,
      shouldIntervene,
      intervention
    };
  }

  /**
   * Determine if quiz mode should be overridden for learning support
   */
  private async makeAdaptiveLearningDecision(
    aiAnalysis: {
      momentum: LearningMomentum;
      cognitiveLoad: CognitiveLoad;
      motivation: MotivationProfile;
      personality: LearningPersonality;
    },
    word: Word,
    currentMastery: number,
    sessionContext: 'introduction' | 'practice' | 'review',
    performance: AILearningContext['currentPerformance']
  ): Promise<AdaptiveLearningDecision> {
    const { cognitiveLoad, momentum, motivation, personality } = aiAnalysis;
    
    // Get default quiz mode as baseline
    const defaultMode = originalSelectQuizMode(currentMastery, sessionContext, word);
    let selectedMode = defaultMode;
    let difficultyAdjustment = 0;
    const reasoning: string[] = [];
    let intervention;

    // CHALLENGE INTERVENTION: Switch to multiple choice when struggling
    if (performance.consecutiveErrors >= 3 || performance.accuracy < 0.5) {
      selectedMode = 'multiple-choice';
      reasoning.push(`Consecutive errors (${performance.consecutiveErrors}) detected - switching to multiple choice for confidence building`);
      intervention = {
        type: 'support' as const,
        message: 'Let\'s build confidence with recognition-based questions',
        priority: 'high' as const
      };
    }
    
    // COGNITIVE OVERLOAD: Simplify when overwhelmed
    else if (cognitiveLoad.level === 'overloaded') {
      if (defaultMode === 'fill-in-the-blank' || defaultMode === 'open-answer') {
        selectedMode = 'multiple-choice';
        reasoning.push('Cognitive overload detected - simplifying to multiple choice');
      }
      difficultyAdjustment = -1;
      intervention = {
        type: 'support' as const,
        message: 'Taking it easier to reduce cognitive load',
        priority: 'medium' as const
      };
    }
    
    // CHALLENGE BOOST: Increase difficulty when performing well
    else if (performance.accuracy > 0.85 && momentum.direction === 'improving') {
      if (defaultMode === 'multiple-choice' && currentMastery > 60) {
        selectedMode = 'open-answer';
        reasoning.push('High performance with improving momentum - advancing to open answer');
      } else if (defaultMode === 'letter-scramble' && currentMastery > 80) {
        selectedMode = 'open-answer';
        reasoning.push('Excellence detected - challenging with recall-based questions');
      }
      difficultyAdjustment = 0.5;
      intervention = {
        type: 'challenge' as const,
        message: 'You\'re doing great! Ready for more challenge?',
        priority: 'low' as const
      };
    }
    
    // MOTIVATION BOOST: Adapt to personality
    else if (motivation.currentState === 'frustrated' && personality.challengePreference === 'gradual') {
      if (defaultMode === 'open-answer' || defaultMode === 'fill-in-the-blank') {
        selectedMode = 'letter-scramble';
        reasoning.push('Frustration with gradual preference - using interactive mode');
      }
    }
    
    // ENGAGEMENT OPTIMIZATION: Match learning style
    else if (personality.learningStyle === 'visual' && defaultMode === 'open-answer') {
      selectedMode = 'multiple-choice';
      reasoning.push('Visual learner preference - using recognition-based mode');
    }

    // Calculate confidence based on multiple factors
    const confidence = this.calculateDecisionConfidence(
      aiAnalysis,
      performance,
      selectedMode !== defaultMode
    );

    return {
      quizMode: selectedMode,
      difficultyAdjustment,
      reasoning,
      confidence,
      intervention
    };
  }

  /**
   * Get or compute AI analysis with caching
   */
  private async getAIAnalysis(context: AILearningContext) {
    const cacheKey = `${context.userId}_${context.sessionId}`;
    const cached = this.sessionCache.get(cacheKey);
    
    // Use cache if recent (< 30 seconds)
    if (cached && Date.now() - cached.lastUpdate < 30000) {
      return cached;
    }

    // Compute fresh analysis
    const insights = await this.aiCoach.analyzeLearningBehavior(
      context.userId,
      context.languageCode,
      context.sessionEvents
    );

    // Extract behavioral components (simplified for demo)
    const momentum: LearningMomentum = {
      velocity: context.currentPerformance.accuracy * 10,
      acceleration: 0,
      direction: context.currentPerformance.consecutiveSuccess > 2 ? 'improving' : 
                 context.currentPerformance.consecutiveErrors > 2 ? 'declining' : 'plateauing',
      confidence: 0.7,
      sustainabilityScore: Math.min(1, context.currentPerformance.accuracy * 1.2)
    };

    const cognitiveLoad: CognitiveLoad = {
      level: context.currentPerformance.responseTime > 15000 ? 'high' :
             context.currentPerformance.responseTime > 30000 ? 'overloaded' :
             context.currentPerformance.responseTime < 3000 ? 'low' : 'optimal',
      overallLoad: Math.min(1, context.currentPerformance.responseTime / 20000),
      attentionFatigue: context.sessionEvents.length > 50 ? 0.8 : 0.3,
      indicators: [],
      responseTimeVariance: 0.2,
      errorPatterns: [],
      recommendedAction: context.currentPerformance.accuracy > 0.8 ? 'challenge' :
                        context.currentPerformance.accuracy < 0.5 ? 'simplify' : 'continue'
    };

    const motivation: MotivationProfile = {
      currentLevel: Math.min(1, context.currentPerformance.accuracy * 1.5),
      trend: context.currentPerformance.consecutiveSuccess > context.currentPerformance.consecutiveErrors ? 0.3 : -0.2,
      intrinsicMotivation: 0.7,
      extrinsicMotivation: 0.6,
      challengeSeekingBehavior: context.currentPerformance.accuracy > 0.7 ? 0.8 : 0.4,
      persistenceLevel: 0.7,
      currentState: context.currentPerformance.consecutiveErrors > 3 ? 'frustrated' :
                   context.currentPerformance.accuracy > 0.8 ? 'motivated' : 'neutral',
      triggers: ['achievement', 'progress'],
      motivationType: 'mastery'
    };

    const personality: LearningPersonality = {
      learningStyle: 'multimodal',
      processingSpeed: context.currentPerformance.responseTime < 5000 ? 'fast' : 
                      context.currentPerformance.responseTime > 15000 ? 'deliberate' : 'moderate',
      errorTolerance: context.currentPerformance.consecutiveErrors > 2 ? 'low' : 'moderate',
      challengePreference: context.currentPerformance.accuracy > 0.8 ? 'steep' : 'gradual',
      feedbackPreference: 'immediate',
      sessionLengthPreference: 'medium'
    };

    const analysis = { momentum, cognitiveLoad, motivation, personality, lastUpdate: Date.now() };
    this.sessionCache.set(cacheKey, analysis);
    return analysis;
  }

  /**
   * Calculate confidence in AI decision
   */
  private calculateDecisionConfidence(
    aiAnalysis: any,
    performance: AILearningContext['currentPerformance'],
    isOverride: boolean
  ): number {
    let confidence = 0.7; // Base confidence

    // Higher confidence for clear patterns
    if (performance.consecutiveErrors >= 3) confidence += 0.2;
    if (performance.accuracy > 0.9) confidence += 0.15;
    if (performance.accuracy < 0.4) confidence += 0.25;

    // Lower confidence for overrides without strong signals
    if (isOverride && performance.accuracy > 0.6 && performance.accuracy < 0.8) {
      confidence -= 0.2;
    }

    // Cognitive load clarity
    if (aiAnalysis.cognitiveLoad.level === 'overloaded' || aiAnalysis.cognitiveLoad.level === 'low') {
      confidence += 0.1;
    }

    return Math.max(0.3, Math.min(1.0, confidence));
  }

  /**
   * Should the AI intervene in the current learning session?
   */
  async shouldIntervene(
    context: AILearningContext
  ): Promise<{
    shouldIntervene: boolean;
    intervention?: any;
    priority: 'low' | 'medium' | 'high' | 'critical';
  }> {
    const aiAnalysis = await this.getAIAnalysis(context);
    const { cognitiveLoad, motivation } = aiAnalysis;

    // Critical interventions
    if (cognitiveLoad.level === 'overloaded' || motivation.currentState === 'frustrated') {
      return {
        shouldIntervene: true,
        intervention: {
          type: 'break',
          message: 'Time for a short break to recharge',
          action: 'suggest_break'
        },
        priority: 'critical'
      };
    }

    // High priority interventions
    if (context.currentPerformance.consecutiveErrors >= 4) {
      return {
        shouldIntervene: true,
        intervention: {
          type: 'support',
          message: 'Let\'s review some easier content',
          action: 'reduce_difficulty'
        },
        priority: 'high'
      };
    }

    // Medium priority suggestions
    if (context.currentPerformance.accuracy > 0.9 && context.sessionEvents.length > 20) {
      return {
        shouldIntervene: true,
        intervention: {
          type: 'challenge',
          message: 'You\'re mastering this! Ready for harder questions?',
          action: 'increase_difficulty'
        },
        priority: 'medium'
      };
    }

    return { shouldIntervene: false, priority: 'low' };
  }

  /**
   * Get personalized learning recommendations
   */
  async getPersonalizedRecommendations(
    context: AILearningContext
  ): Promise<LearningRecommendation[]> {
    const aiAnalysis = await this.getAIAnalysis(context);
    const recommendations: LearningRecommendation[] = [];

    // Performance-based recommendations
    if (context.currentPerformance.accuracy < 0.6) {
      recommendations.push({
        type: 'difficulty_adjustment',
        priority: 'high',
        action: 'reduce_difficulty',
        value: -1,
        reasoning: ['Accuracy below 60% - reducing cognitive load'],
        confidence: 0.8,
        expectedImprovement: 0.2
      });
    }

    if (aiAnalysis.cognitiveLoad.level === 'low' && context.currentPerformance.accuracy > 0.8) {
      recommendations.push({
        type: 'difficulty_adjustment',
        priority: 'medium',
        action: 'increase_difficulty',
        value: 1,
        reasoning: ['Low cognitive load with high accuracy - ready for more challenge'],
        confidence: 0.75,
        expectedImprovement: 0.15
      });
    }

    return recommendations;
  }

  /**
   * Clear session cache for testing or cleanup
   */
  clearCache(): void {
    this.sessionCache.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<LearningEngineConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}