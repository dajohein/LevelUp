/**
 * AI Challenge Integration Interface
 * 
 * Provides intelligent enhancements for challenge modes while preserving
 * their unique characteristics and fallback capability
 */

import { adaptiveLearningEngine, AdaptiveLearningDecision } from './adaptiveLearningEngine';
import { simpleAILearningCoach, CognitiveLoad, LearningMomentum } from './simpleAIInterfaces';
import { Word } from './wordService';
import { WordProgress } from '../store/types';
import { logger } from './logger';

export interface ChallengeAIContext {
  sessionType: 'streak-challenge' | 'boss-battle';
  currentProgress: {
    wordsCompleted: number;
    targetWords: number;
    currentStreak?: number;
    consecutiveCorrect: number;
    consecutiveIncorrect: number;
    recentAccuracy: number;
    sessionDuration: number;
  };
  userState: {
    recentPerformance: Array<{
      isCorrect: boolean;
      timeSpent: number;
      quizMode: string;
      difficulty?: number;
    }>;
    cognitiveLoad?: CognitiveLoad;
    momentum?: LearningMomentum;
  };
  challengeContext: {
    currentDifficulty: number; // 0-100 scale
    tierLevel?: number; // For streak challenges
    phaseProgress?: number; // For boss battles (0-1)
    isEarlyPhase: boolean;
    isFinalPhase: boolean;
  };
}

export interface AIEnhancedWordSelection {
  selectedWord: Word;
  originalQuizMode: string;
  aiRecommendedMode?: string;
  difficultyAdjustment: number; // -2 to +2
  reasoning: string[];
  interventionNeeded: boolean;
  fallbackUsed: boolean;
}

export interface ChallengeAIEnhancements {
  shouldUseAI: boolean;
  cognitiveLoadThreshold: number;
  adaptationSensitivity: number;
  interventionSettings: {
    enableModeSwitch: boolean;
    enableDifficultyAdjust: boolean;
    enableSupportiveMessages: boolean;
  };
}

class ChallengeAIIntegrator {
  private isAIEnabled: boolean = true;
  private performanceBuffer: Map<string, any[]> = new Map();

  constructor() {
    // Initialize with default settings
    logger.debug('🤖 ChallengeAIIntegrator initialized');
  }

  /**
   * Analyze current challenge session and provide AI insights
   */
  async analyzeChallenge(context: ChallengeAIContext): Promise<{
    cognitiveLoad: CognitiveLoad;
    momentum: LearningMomentum;
    recommendation: AdaptiveLearningDecision;
    shouldIntervene: boolean;
  }> {
    try {
      if (!this.isAIEnabled) {
        return this.getFallbackAnalysis(context);
      }

      // Analyze cognitive load from recent performance
      const cognitiveLoad = await simpleAILearningCoach.detectCognitiveLoad(
        context.userState.recentPerformance
      );

      // Analyze learning momentum
      const momentum = await simpleAILearningCoach.analyzeLearningMomentum(
        context.userState.recentPerformance
      );

      // Get AI decision for quiz mode and difficulty
      const recommendation = await adaptiveLearningEngine.selectOptimalQuizMode(
        {
          recentPerformance: context.userState.recentPerformance,
          currentStreak: context.currentProgress.consecutiveCorrect,
          sessionDuration: context.currentProgress.sessionDuration,
          challengeType: context.sessionType
        },
        {} as Word, // Placeholder - will be filled by calling service
        context.challengeContext.currentDifficulty / 100, // Convert to 0-1 scale
        context.sessionType
      );

      // Determine if intervention is needed
      const shouldIntervene = this.shouldIntervene(cognitiveLoad, momentum, context);

      logger.debug(`🧠 AI Analysis for ${context.sessionType}:`, {
        cognitiveLoad: cognitiveLoad.level,
        momentum: momentum.trend,
        intervention: shouldIntervene
      });

      return {
        cognitiveLoad,
        momentum,
        recommendation,
        shouldIntervene
      };

    } catch (error) {
      logger.error('❌ AI analysis failed, using fallback:', error);
      return this.getFallbackAnalysis(context);
    }
  }

  /**
   * Enhance word selection with AI insights while preserving challenge logic
   */
  async enhanceWordSelection(
    originalWord: Word,
    originalQuizMode: string,
    context: ChallengeAIContext,
    wordProgress: { [key: string]: WordProgress }
  ): Promise<AIEnhancedWordSelection> {
    try {
      if (!this.isAIEnabled) {
        return this.getFallbackSelection(originalWord, originalQuizMode);
      }

      const analysis = await this.analyzeChallenge(context);
      
      // AI-driven quiz mode selection based on cognitive load
      let aiRecommendedMode = originalQuizMode;
      let difficultyAdjustment = 0;
      let interventionNeeded = false;
      const reasoning: string[] = [];

      // Apply cognitive load adjustments
      if (analysis.cognitiveLoad.level === 'high' || analysis.cognitiveLoad.level === 'overload') {
        // User is struggling - make it easier
        aiRecommendedMode = this.getEasierQuizMode(originalQuizMode);
        difficultyAdjustment = -1;
        interventionNeeded = true;
        reasoning.push(`High cognitive load detected - switching to easier ${aiRecommendedMode} mode`);
      } else if (analysis.cognitiveLoad.level === 'low' && analysis.momentum.trend === 'increasing') {
        // User is doing well - can handle more challenge
        aiRecommendedMode = this.getHarderQuizMode(originalQuizMode);
        difficultyAdjustment = 1;
        reasoning.push(`Low cognitive load + positive momentum - increasing challenge with ${aiRecommendedMode}`);
      }

      // Apply challenge-specific logic
      if (context.sessionType === 'streak-challenge') {
        aiRecommendedMode = this.adjustForStreakChallenge(
          aiRecommendedMode, 
          context.currentProgress.currentStreak || 0,
          analysis.cognitiveLoad
        );
      } else if (context.sessionType === 'boss-battle') {
        aiRecommendedMode = this.adjustForBossBattle(
          aiRecommendedMode,
          context.challengeContext.phaseProgress || 0,
          analysis.cognitiveLoad
        );
      }

      // Apply momentum-based adjustments
      if (analysis.momentum.trend === 'decreasing' && context.currentProgress.consecutiveIncorrect >= 2) {
        aiRecommendedMode = 'multiple-choice'; // Safety net
        difficultyAdjustment = Math.min(difficultyAdjustment, -1);
        interventionNeeded = true;
        reasoning.push('Declining momentum detected - providing multiple choice support');
      }

      return {
        selectedWord: originalWord,
        originalQuizMode,
        aiRecommendedMode,
        difficultyAdjustment,
        reasoning,
        interventionNeeded,
        fallbackUsed: false
      };

    } catch (error) {
      logger.error('❌ AI word selection enhancement failed:', error);
      return this.getFallbackSelection(originalWord, originalQuizMode);
    }
  }

  /**
   * Get easier quiz mode for struggling users
   */
  private getEasierQuizMode(currentMode: string): string {
    const difficultyOrder = [
      'multiple-choice',      // Easiest
      'letter-scramble',
      'open-answer',
      'fill-in-the-blank'    // Hardest
    ];
    
    const currentIndex = difficultyOrder.indexOf(currentMode);
    return currentIndex > 0 ? difficultyOrder[currentIndex - 1] : currentMode;
  }

  /**
   * Get harder quiz mode for excelling users
   */
  private getHarderQuizMode(currentMode: string): string {
    const difficultyOrder = [
      'multiple-choice',
      'letter-scramble', 
      'open-answer',
      'fill-in-the-blank'
    ];
    
    const currentIndex = difficultyOrder.indexOf(currentMode);
    return currentIndex < difficultyOrder.length - 1 ? difficultyOrder[currentIndex + 1] : currentMode;
  }

  /**
   * Apply streak-specific adjustments
   */
  private adjustForStreakChallenge(mode: string, streak: number, cognitiveLoad: CognitiveLoad): string {
    // Early streak (0-5): Keep it accessible
    if (streak <= 5 && cognitiveLoad.level !== 'low') {
      return mode === 'fill-in-the-blank' ? 'open-answer' : mode;
    }
    
    // High streak (15+): Maintain challenge unless user is struggling
    if (streak >= 15 && cognitiveLoad.level === 'high') {
      return 'multiple-choice'; // Emergency support
    }
    
    return mode;
  }

  /**
   * Apply boss battle specific adjustments  
   */
  private adjustForBossBattle(mode: string, phaseProgress: number, cognitiveLoad: CognitiveLoad): string {
    // Early boss phase: Build confidence
    if (phaseProgress < 0.3 && cognitiveLoad.level !== 'low') {
      return mode === 'fill-in-the-blank' ? 'letter-scramble' : mode;
    }
    
    // Final boss phase: Maintain epic difficulty unless critical overload
    if (phaseProgress > 0.8 && cognitiveLoad.level === 'overload') {
      return 'open-answer'; // Still challenging but not impossible
    }
    
    return mode;
  }

  /**
   * Determine if intervention is needed
   */
  private shouldIntervene(
    cognitiveLoad: CognitiveLoad, 
    momentum: LearningMomentum, 
    context: ChallengeAIContext
  ): boolean {
    // High cognitive load always triggers intervention
    if (cognitiveLoad.level === 'high' || cognitiveLoad.level === 'overload') {
      return true;
    }
    
    // Multiple consecutive mistakes
    if (context.currentProgress.consecutiveIncorrect >= 3) {
      return true;
    }
    
    // Declining momentum with low accuracy
    if (momentum.trend === 'decreasing' && context.currentProgress.recentAccuracy < 0.4) {
      return true;
    }
    
    return false;
  }

  /**
   * Fallback analysis when AI is unavailable
   */
  private getFallbackAnalysis(context: ChallengeAIContext) {
    const baseCognitiveLoad: CognitiveLoad = {
      level: context.currentProgress.consecutiveIncorrect >= 2 ? 'high' : 'moderate',
      confidence: 0.6,
      indicators: ['fallback-analysis']
    };

    const baseMomentum: LearningMomentum = {
      score: Math.max(0.1, context.currentProgress.recentAccuracy),
      trend: context.currentProgress.consecutiveCorrect >= 2 ? 'increasing' : 'stable',
      lastUpdated: Date.now()
    };

    const baseRecommendation: AdaptiveLearningDecision = {
      quizMode: context.currentProgress.consecutiveIncorrect >= 2 ? 'multiple-choice' : 'letter-scramble',
      difficultyAdjustment: 0,
      reasoning: ['AI unavailable - using rule-based fallback'],
      confidence: 0.5
    };

    return {
      cognitiveLoad: baseCognitiveLoad,
      momentum: baseMomentum,
      recommendation: baseRecommendation,
      shouldIntervene: context.currentProgress.consecutiveIncorrect >= 3
    };
  }

  /**
   * Fallback word selection when AI is unavailable
   */
  private getFallbackSelection(originalWord: Word, originalQuizMode: string): AIEnhancedWordSelection {
    return {
      selectedWord: originalWord,
      originalQuizMode,
      aiRecommendedMode: originalQuizMode,
      difficultyAdjustment: 0,
      reasoning: ['AI unavailable - using original selection'],
      interventionNeeded: false,
      fallbackUsed: true
    };
  }

  /**
   * Enable/disable AI integration
   */
  setAIEnabled(enabled: boolean): void {
    this.isAIEnabled = enabled;
    logger.debug(`🤖 AI integration ${enabled ? 'enabled' : 'disabled'} for challenges`);
  }

  /**
   * Check if AI is currently enabled
   */
  isAIAvailable(): boolean {
    return this.isAIEnabled;
  }
}

// Export singleton instance
export const challengeAIIntegrator = new ChallengeAIIntegrator();