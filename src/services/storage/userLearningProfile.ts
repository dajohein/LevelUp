/**
 * User Learning Profile Storage
 * 
 * USER-SPECIFIC learning profiles (not language-specific)
 * Integrates with tiered storage system: Memory → localStorage → IndexedDB → Remote
 * Follows LevelUp architecture guidelines for language isolation while maintaining user-specific profiles
 */

import { tieredStorage } from './tieredStorage';
import { logger } from '../logger';
import { 
  BossBattleSessionData, 
  StreakChallengeSessionData, 
  AIInterventionData, 
  QuickDashSessionData,
  DeepDiveSessionData,
  PrecisionModeSessionData,
  FillInTheBlankSessionData
} from '../../types/challengeTypes';
import type {
  LearningPersonality,
  LearningMomentum,
  CognitiveLoad,
  MotivationProfile,
  LearningCoachInsight
} from '../ai/learningCoach';

export interface UserLearningProfile {
  userId: string;
  
  // Core user learning characteristics (language-agnostic)
  personality: LearningPersonality;
  momentum: LearningMomentum;
  cognitiveLoad: CognitiveLoad;
  motivation: MotivationProfile;
  
  // Language-specific learning data
  languageProfiles: {
    [languageCode: string]: {
      proficiencyLevel: number;
      strengthAreas: string[];
      improvementAreas: string[];
      insights: LearningCoachInsight[];
      lastAssessment: Date;
    };
  };
  
  // Global learning patterns (cross-language)
  globalPatterns: {
    optimalTimeOfDay: string[];
    peakPerformanceDuration: number;
    preferredSessionLength: number;
    learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading-writing' | 'multimodal';
  };

  // AI Challenge Performance Data
  challengeData: {
    // Streak Challenge Analytics
    streakChallenges: {
      totalSessions: number;
      bestStreak: number;
      averageStreak: number;
      totalWordsCompleted: number;
      aiEnhancedSessions: number;
      baselineSessions: number;
      cognitiveLoadPatterns: Array<{
        streak: number;
        cognitiveLoad: string; // 'low' | 'moderate' | 'high' | 'overload'
        adaptationsUsed: string[];
        timestamp: Date;
      }>;
      preferredQuizModes: {
        [mode: string]: { count: number; accuracy: number };
      };
      tierPerformance: {
        [tier: string]: {
          wordsAttempted: number;
          accuracy: number;
          avgTimePerWord: number;
        };
      };
    };

    // Boss Battle Analytics  
    bossBattles: {
      totalSessions: number;
      completedSessions: number;
      averageWordsCompleted: number;
      bestPerformance: number; // highest difficulty reached
      aiEnhancedSessions: number;
      baselineSessions: number;
      phasePerformance: {
        'early-boss': { accuracy: number; avgTime: number; adaptations: number };
        'mid-boss': { accuracy: number; avgTime: number; adaptations: number };
        'late-boss': { accuracy: number; avgTime: number; adaptations: number };
        'final-boss': { accuracy: number; avgTime: number; adaptations: number };
      };
      finalBossEncounters: {
        attempts: number;
        victories: number;
        averageQuizMode: string;
        cognitiveLoadOnFinal: string[];
      };
    };

    // Quick Dash Analytics
    quickDash: {
      totalSessions: number;
      completedSessions: number;
      averageScore: number;
      bestScore: number;
      averageTimePerWord: number;
      speedImprovementRate: number; // words/minute improvement over time
      aiEnhancedSessions: number;
      baselineSessions: number;
      timePerformance: {
        avgCompletionTime: number;
        fastestCompletion: number;
        timeOptimizationPatterns: string[]; // patterns that lead to faster completion
      };
      pressureResponse: {
        accuracyUnderPressure: number; // accuracy when time is running low
        lastMinutePerformance: number; // performance in final 60 seconds
        pressureAdaptations: string[]; // AI adaptations that help under time pressure
      };
    };

    // Deep Dive Analytics
    deepDive: {
      totalSessions: number;
      completedSessions: number;
      averageRetentionRate: number; // how well words are retained after session
      contextualLearningScore: number; // effectiveness of context-based learning
      repetitionOptimization: {
        optimalRepetitionCount: number;
        spacingPreferences: string[]; // preferred intervals for spaced repetition
        contextVariationEffectiveness: number; // how much context variation helps
      };
      aiEnhancedSessions: number;
      baselineSessions: number;
      comprehensionMetrics: {
        averageFirstAttemptAccuracy: number;
        improvementAfterContext: number;
        contextualHintEffectiveness: number;
      };
    };

    // Precision Mode Analytics
    precisionMode: {
      totalSessions: number;
      perfectSessions: number; // sessions completed with 0 mistakes
      averageFailurePoint: number; // on average, which word number causes failure
      zeroPressureAccuracy: number; // accuracy when no time pressure
      aiEnhancedSessions: number;
      baselineSessions: number;
      errorPatterns: {
        commonMistakeTypes: string[];
        mistakeProgression: Array<{ wordNumber: number; errorType: string; timestamp: Date }>;
        recoveryStrategies: string[]; // AI strategies that help avoid mistakes
      };
      perfectSessionStrategies: {
        optimalPacing: number; // seconds per word for perfect sessions
        effectiveQuizModes: string[];
        cognitiveLoadManagement: string[];
      };
    };

    // Fill in the Blank Analytics
    fillInTheBlank: {
      totalSessions: number;
      completedSessions: number;
      contextualAccuracy: number; // accuracy when context is provided
      averageContextUtilization: number; // how well user uses context clues
      aiEnhancedSessions: number;
      baselineSessions: number;
      contextLearning: {
        sentenceComplexityPreference: 'simple' | 'moderate' | 'complex';
        contextualClueEffectiveness: number;
        grammarPatternRecognition: number;
      };
      comprehensionInsights: {
        semanticAccuracy: number; // understanding meaning vs just memorizing
        syntacticAccuracy: number; // grammar and structure understanding
        pragmaticAccuracy: number; // contextual usage understanding
      };
    };

    // Cross-Mode Analytics
    crossModeAnalytics: {
      modePreferences: Array<{ mode: string; preferenceScore: number; reasonCodes: string[] }>;
      performanceConsistency: number; // how consistent performance is across modes
      learningTransfer: {
        // How well learning in one mode transfers to others
        streakToBoss: number;
        quickDashToPrecision: number;
        deepDiveToFillBlank: number;
        generalTransferRate: number;
      };
      optimalModeSequencing: string[]; // order of modes that maximizes learning
      modeSpecificStrengths: { [mode: string]: string[] };
      challengeEscalationPath: string[]; // recommended progression through difficulty
    };

    // AI Enhancement Effectiveness
    aiPerformance: {
      totalInterventions: number;
      successfulInterventions: number; // led to improved performance
      interventionTypes: {
        'quiz-mode-easier': { count: number; successRate: number };
        'quiz-mode-harder': { count: number; successRate: number };
        'cognitive-load-support': { count: number; successRate: number };
        'momentum-boost': { count: number; successRate: number };
        'time-pressure-relief': { count: number; successRate: number };
        'context-enhancement': { count: number; successRate: number };
        'precision-guidance': { count: number; successRate: number };
      };
      accuracyImprovements: {
        withAI: { sessions: number; avgAccuracy: number; avgTime: number };
        baseline: { sessions: number; avgAccuracy: number; avgTime: number };
      };
      learningVelocity: {
        // How quickly user learns new words with AI vs without
        withAI: number; // words/minute
        baseline: number; // words/minute
      };
      modeSpecificEffectiveness: {
        [mode: string]: { improvementRate: number; interventionCount: number };
      };
    };

    // Learning Insights from Challenges
    challengeInsights: {
      optimalChallengeLevel: number; // 0-100 preferred difficulty
      cognitiveLoadTolerance: number; // 0-1 how much cognitive load user can handle
      adaptationPreferences: string[]; // which AI adaptations user responds to best
      motivationalFactors: string[]; // what keeps user engaged in challenges
      strugglingIndicators: string[]; // patterns that predict when user will struggle
      flowStatePatterns: string[]; // conditions that lead to optimal performance
      lastAnalysisDate: Date;
    };
  };
  
  // Metadata
  metadata: {
    createdAt: Date;
    lastUpdated: Date;
    profileVersion: number;
    totalSessionsAnalyzed: number;
    confidenceScore: number; // 0-1, confidence in profile accuracy
  };
}

export class UserLearningProfileStorage {
  private storageKey = 'user-learning-profile';

  /**
   * Save user learning profile
   * Uses tiered storage for proper backend integration
   */
  async saveProfile(userId: string, profile: UserLearningProfile): Promise<void> {
    try {
      const key = `${this.storageKey}-${userId}`;
      logger.debug('Saving learning profile', { userId, key, profileData: profile });
      
      const result = await tieredStorage.set(key, profile);
      
      if (!result.success) {
        logger.error('Tiered storage failed to save profile', { userId, key, error: result.error });
        throw new Error(`Failed to save learning profile: ${result.error}`);
      }
      
      logger.info('User learning profile saved successfully', { userId, key });
    } catch (error) {
      logger.error('Error saving user learning profile', { userId, error });
      throw error;
    }
  }

  /**
   * Load user learning profile
   */
  async loadProfile(userId: string): Promise<UserLearningProfile | null> {
    try {
      const key = `${this.storageKey}-${userId}`;
      logger.debug('Loading learning profile', { userId, key });
      
      const result = await tieredStorage.get<UserLearningProfile>(key);
      
      if (!result.success) {
        logger.warn('No learning profile found for user', { userId, key, error: result.error });
        return null;
      }
      
      logger.debug('Learning profile loaded successfully', { userId, key, hasData: !!result.data });
      return result.data as UserLearningProfile;
    } catch (error) {
      logger.error('Error loading user learning profile', { userId, error });
      return null;
    }
  }

  /**
   * Update language-specific data within user profile
   */
  async updateLanguageProfile(
    userId: string, 
    languageCode: string, 
    languageData: {
      proficiencyLevel?: number;
      strengthAreas?: string[];
      improvementAreas?: string[];
      insights?: LearningCoachInsight[];
    }
  ): Promise<void> {
    try {
      const profile = await this.loadProfile(userId);
      if (!profile) {
        logger.warn('Cannot update language profile - user profile not found', { userId, languageCode });
        return;
      }

      // Initialize language profile if it doesn't exist
      if (!profile.languageProfiles[languageCode]) {
        profile.languageProfiles[languageCode] = {
          proficiencyLevel: 0,
          strengthAreas: [],
          improvementAreas: [],
          insights: [],
          lastAssessment: new Date()
        };
      }

      // Update language-specific data
      const langProfile = profile.languageProfiles[languageCode];
      if (languageData.proficiencyLevel !== undefined) {
        langProfile.proficiencyLevel = languageData.proficiencyLevel;
      }
      if (languageData.strengthAreas) {
        langProfile.strengthAreas = languageData.strengthAreas;
      }
      if (languageData.improvementAreas) {
        langProfile.improvementAreas = languageData.improvementAreas;
      }
      if (languageData.insights) {
        langProfile.insights = languageData.insights;
      }
      langProfile.lastAssessment = new Date();

      // Update metadata
      profile.metadata.lastUpdated = new Date();
      profile.metadata.profileVersion += 1;

      await this.saveProfile(userId, profile);
      
      logger.info('Language profile updated successfully', { userId, languageCode });
    } catch (error) {
      logger.error('Error updating language profile', { userId, languageCode, error });
      throw error;
    }
  }

  /**
   * Create initial user learning profile
   */
  async createInitialProfile(userId: string): Promise<UserLearningProfile> {
    const initialProfile: UserLearningProfile = {
      userId,
      personality: {
        learningStyle: 'multimodal',
        processingSpeed: 'moderate',
        errorTolerance: 'moderate',
        challengePreference: 'moderate',
        feedbackPreference: 'immediate',
        sessionLengthPreference: 'medium'
      },
      momentum: {
        velocity: 0,
        acceleration: 0,
        direction: 'improving',
        confidence: 0.5,
        sustainabilityScore: 0.7
      },
      cognitiveLoad: {
        level: 'optimal',
        overallLoad: 0.5,
        attentionFatigue: 0.2,
        indicators: [],
        responseTimeVariance: 0.1,
        errorPatterns: [],
        recommendedAction: 'continue'
      },
      motivation: {
        currentLevel: 0.7,
        trend: 0.1,
        intrinsicMotivation: 0.7,
        extrinsicMotivation: 0.5,
        challengeSeekingBehavior: 0.6,
        persistenceLevel: 0.7,
        currentState: 'motivated',
        triggers: ['progress', 'achievement'],
        motivationType: 'achievement'
      },
      languageProfiles: {},
      globalPatterns: {
        optimalTimeOfDay: ['morning', 'evening'],
        peakPerformanceDuration: 20, // minutes
        preferredSessionLength: 15, // minutes
        learningStyle: 'multimodal'
      },
      challengeData: {
        streakChallenges: {
          totalSessions: 0,
          bestStreak: 0,
          averageStreak: 0,
          totalWordsCompleted: 0,
          aiEnhancedSessions: 0,
          baselineSessions: 0,
          cognitiveLoadPatterns: [],
          preferredQuizModes: {},
          tierPerformance: {}
        },
        bossBattles: {
          totalSessions: 0,
          completedSessions: 0,
          averageWordsCompleted: 0,
          bestPerformance: 0,
          aiEnhancedSessions: 0,
          baselineSessions: 0,
          phasePerformance: {
            'early-boss': { accuracy: 0, avgTime: 0, adaptations: 0 },
            'mid-boss': { accuracy: 0, avgTime: 0, adaptations: 0 },
            'late-boss': { accuracy: 0, avgTime: 0, adaptations: 0 },
            'final-boss': { accuracy: 0, avgTime: 0, adaptations: 0 }
          },
          finalBossEncounters: {
            attempts: 0,
            victories: 0,
            averageQuizMode: '',
            cognitiveLoadOnFinal: []
          }
        },
        quickDash: {
          totalSessions: 0,
          completedSessions: 0,
          averageScore: 0,
          bestScore: 0,
          averageTimePerWord: 0,
          speedImprovementRate: 0,
          aiEnhancedSessions: 0,
          baselineSessions: 0,
          timePerformance: {
            avgCompletionTime: 0,
            fastestCompletion: 0,
            timeOptimizationPatterns: []
          },
          pressureResponse: {
            accuracyUnderPressure: 0,
            lastMinutePerformance: 0,
            pressureAdaptations: []
          }
        },
        deepDive: {
          totalSessions: 0,
          completedSessions: 0,
          averageRetentionRate: 0,
          contextualLearningScore: 0,
          repetitionOptimization: {
            optimalRepetitionCount: 3,
            spacingPreferences: [],
            contextVariationEffectiveness: 0
          },
          aiEnhancedSessions: 0,
          baselineSessions: 0,
          comprehensionMetrics: {
            averageFirstAttemptAccuracy: 0,
            improvementAfterContext: 0,
            contextualHintEffectiveness: 0
          }
        },
        precisionMode: {
          totalSessions: 0,
          perfectSessions: 0,
          averageFailurePoint: 0,
          zeroPressureAccuracy: 0,
          aiEnhancedSessions: 0,
          baselineSessions: 0,
          errorPatterns: {
            commonMistakeTypes: [],
            mistakeProgression: [],
            recoveryStrategies: []
          },
          perfectSessionStrategies: {
            optimalPacing: 8.0, // 8 seconds per word initially
            effectiveQuizModes: [],
            cognitiveLoadManagement: []
          }
        },
        fillInTheBlank: {
          totalSessions: 0,
          completedSessions: 0,
          contextualAccuracy: 0,
          averageContextUtilization: 0,
          aiEnhancedSessions: 0,
          baselineSessions: 0,
          contextLearning: {
            sentenceComplexityPreference: 'moderate',
            contextualClueEffectiveness: 0,
            grammarPatternRecognition: 0
          },
          comprehensionInsights: {
            semanticAccuracy: 0,
            syntacticAccuracy: 0,
            pragmaticAccuracy: 0
          }
        },
        crossModeAnalytics: {
          modePreferences: [],
          performanceConsistency: 0,
          learningTransfer: {
            streakToBoss: 0,
            quickDashToPrecision: 0,
            deepDiveToFillBlank: 0,
            generalTransferRate: 0
          },
          optimalModeSequencing: [],
          modeSpecificStrengths: {},
          challengeEscalationPath: []
        },
        aiPerformance: {
          totalInterventions: 0,
          successfulInterventions: 0,
          interventionTypes: {
            'quiz-mode-easier': { count: 0, successRate: 0 },
            'quiz-mode-harder': { count: 0, successRate: 0 },
            'cognitive-load-support': { count: 0, successRate: 0 },
            'momentum-boost': { count: 0, successRate: 0 },
            'time-pressure-relief': { count: 0, successRate: 0 },
            'context-enhancement': { count: 0, successRate: 0 },
            'precision-guidance': { count: 0, successRate: 0 }
          },
          accuracyImprovements: {
            withAI: { sessions: 0, avgAccuracy: 0, avgTime: 0 },
            baseline: { sessions: 0, avgAccuracy: 0, avgTime: 0 }
          },
          learningVelocity: {
            withAI: 0,
            baseline: 0
          },
          modeSpecificEffectiveness: {}
        },
        challengeInsights: {
          optimalChallengeLevel: 50, // Start at moderate difficulty
          cognitiveLoadTolerance: 0.7, // Default moderate tolerance
          adaptationPreferences: [],
          motivationalFactors: [],
          strugglingIndicators: [],
          flowStatePatterns: [],
          lastAnalysisDate: new Date()
        }
      },
      metadata: {
        createdAt: new Date(),
        lastUpdated: new Date(),
        profileVersion: 1,
        totalSessionsAnalyzed: 0,
        confidenceScore: 0.3 // Low confidence initially
      }
    };

    await this.saveProfile(userId, initialProfile);
    logger.info('Initial user learning profile created', { userId });
    
    return initialProfile;
  }

  /**
   * Refresh user learning profile - regenerates profile analysis from current data
   * This keeps existing history but refreshes insights based on recent activity
   */
  async refreshProfile(userId: string): Promise<UserLearningProfile | null> {
    try {
      const profile = await this.loadProfile(userId);
      if (!profile) {
        logger.warn('Cannot refresh profile - user profile not found', { userId });
        return null;
      }

      // Refresh global patterns and insights while preserving historical data
      const refreshedProfile: UserLearningProfile = {
        ...profile,
        // Reset confidence-based metrics that should be recalculated
        momentum: {
          ...profile.momentum,
          velocity: 0,
          acceleration: 0,
          confidence: 0.5 // Reset confidence to let it rebuild
        },
        cognitiveLoad: {
          ...profile.cognitiveLoad,
          level: 'optimal',
          overallLoad: 0.5,
          attentionFatigue: 0.2,
          indicators: [], // Clear indicators to be rebuilt
          responseTimeVariance: 0.1,
          errorPatterns: [], // Clear error patterns to be rebuilt
          recommendedAction: 'continue'
        },
        motivation: {
          ...profile.motivation,
          currentLevel: 0.7, // Reset to moderate baseline
          trend: 0,
          currentState: 'motivated'
        },
        // Keep language profiles but refresh last assessment dates
        languageProfiles: Object.fromEntries(
          Object.entries(profile.languageProfiles).map(([lang, langProfile]) => [
            lang,
            {
              ...langProfile,
              lastAssessment: new Date() // Mark as needing fresh assessment
            }
          ])
        ),
        metadata: {
          ...profile.metadata,
          lastUpdated: new Date(),
          profileVersion: profile.metadata.profileVersion + 1,
          confidenceScore: 0.5 // Moderate confidence after refresh
        }
      };

      await this.saveProfile(userId, refreshedProfile);
      logger.info('User learning profile refreshed successfully', { userId });
      
      return refreshedProfile;
    } catch (error) {
      logger.error('Error refreshing user learning profile', { userId, error });
      throw error;
    }
  }

  /**
   * Reset user learning profile - completely clears and recreates the profile
   * This is a destructive operation that removes all learning history
   */
  async resetProfile(userId: string): Promise<UserLearningProfile> {
    try {
      logger.info('Resetting user learning profile (destructive operation)', { userId });
      
      // Create a completely fresh profile
      const newProfile = await this.createInitialProfile(userId);
      
      logger.info('User learning profile reset successfully', { userId });
      return newProfile;
    } catch (error) {
      logger.error('Error resetting user learning profile', { userId, error });
      throw error;
    }
  }

  /**
   * Delete user learning profile
   */
  async deleteProfile(userId: string): Promise<void> {
    try {
      const key = `${this.storageKey}-${userId}`;
      const result = await tieredStorage.delete(key);
      
      if (!result.success) {
        throw new Error(`Failed to delete learning profile: ${result.error}`);
      }
      
      logger.info('User learning profile deleted successfully', { userId });
    } catch (error) {
      logger.error('Error deleting user learning profile', { userId, error });
      throw error;
    }
  }
  
  /**
   * Update streak challenge performance data
   */
  async updateStreakChallengeData(
    userId: string, 
    sessionData: StreakChallengeSessionData
  ): Promise<void> {
    const profile = await this.loadProfile(userId);
    if (!profile) {
      logger.warn('Cannot update streak challenge data - user profile not found', { userId });
      return;
    }
    
    const streakData = profile.challengeData.streakChallenges;
    
    // Update session counts
    streakData.totalSessions++;
    streakData.totalWordsCompleted += sessionData.wordsCompleted;
    
    if (sessionData.wasAIEnhanced) {
      streakData.aiEnhancedSessions++;
    } else {
      streakData.baselineSessions++;
    }
    
    // Update streak records
    if (sessionData.streak > streakData.bestStreak) {
      streakData.bestStreak = sessionData.streak;
    }
    
    // Update average streak (rolling average)
    streakData.averageStreak = 
      (streakData.averageStreak * (streakData.totalSessions - 1) + sessionData.streak) / 
      streakData.totalSessions;
    
    // Track cognitive load patterns
    streakData.cognitiveLoadPatterns.push({
      streak: sessionData.streak,
      cognitiveLoad: sessionData.cognitiveLoad,
      adaptationsUsed: sessionData.adaptationsUsed,
      timestamp: new Date()
    });
    
    // Limit cognitive load history to last 50 sessions
    if (streakData.cognitiveLoadPatterns.length > 50) {
      streakData.cognitiveLoadPatterns = streakData.cognitiveLoadPatterns.slice(-50);
    }
    
    // Update preferred quiz modes
    if (!streakData.preferredQuizModes[sessionData.quizMode]) {
      streakData.preferredQuizModes[sessionData.quizMode] = { count: 0, accuracy: 0 };
    }
    const modeData = streakData.preferredQuizModes[sessionData.quizMode];
    modeData.accuracy = (modeData.accuracy * modeData.count + sessionData.accuracy) / (modeData.count + 1);
    modeData.count++;
    
    // Update tier performance (match existing interface)
    const tierKey = sessionData.tier.toString();
    if (!streakData.tierPerformance[tierKey]) {
      streakData.tierPerformance[tierKey] = { wordsAttempted: 0, accuracy: 0, avgTimePerWord: 0 };
    }
    const tierData = streakData.tierPerformance[tierKey];
    tierData.wordsAttempted += sessionData.wordsCompleted;
    tierData.accuracy = (tierData.accuracy * (tierData.wordsAttempted - sessionData.wordsCompleted) + 
      (sessionData.accuracy * sessionData.wordsCompleted)) / tierData.wordsAttempted;
    
    await this.saveProfile(userId, profile);
  }

  /**
   * Update boss battle performance data
   */
  async updateBossBattleData(
    userId: string,
    sessionData: BossBattleSessionData
  ): Promise<void> {
    const profile = await this.loadProfile(userId);
    if (!profile) {
      logger.warn('Cannot update boss battle data - user profile not found', { userId });
      return;
    }
    
    const bossData = profile.challengeData.bossBattles;
    
    // Update session counts
    bossData.totalSessions++;
    if (sessionData.completed) {
      bossData.completedSessions++;
    }
    
    if (sessionData.wasAIEnhanced) {
      bossData.aiEnhancedSessions++;
    } else {
      bossData.baselineSessions++;
    }
    
    // Update performance metrics
    bossData.averageWordsCompleted = 
      (bossData.averageWordsCompleted * (bossData.totalSessions - 1) + sessionData.wordsCompleted) / 
      bossData.totalSessions;
    
    if (sessionData.wordsCompleted > bossData.bestPerformance) {
      bossData.bestPerformance = sessionData.wordsCompleted;
    }
    
    // Update phase performance
    Object.entries(sessionData.phasePerformance).forEach(([phase, data]) => {
      const phaseKey = phase as 'early-boss' | 'mid-boss' | 'late-boss' | 'final-boss';
      if (bossData.phasePerformance[phaseKey]) {
        const phaseData = bossData.phasePerformance[phaseKey];
        const sessions = bossData.totalSessions;
        phaseData.accuracy = (phaseData.accuracy * (sessions - 1) + data.accuracy) / sessions;
        phaseData.avgTime = (phaseData.avgTime * (sessions - 1) + data.avgTime) / sessions;
        phaseData.adaptations += data.adaptations;
      }
    });
    
    // Update final boss data
    if (sessionData.finalBossReached) {
      bossData.finalBossEncounters.attempts++;
      if (sessionData.finalBossDefeated) {
        bossData.finalBossEncounters.victories++;
      }
      
      // Update average quiz mode for final boss
      const encounters = bossData.finalBossEncounters;
      if (encounters.attempts === 1) {
        encounters.averageQuizMode = sessionData.quizMode;
      } else {
        // Simple mode tracking - could be enhanced with weighted average
        encounters.averageQuizMode = sessionData.quizMode;
      }
      
      // Track cognitive load on final boss
      encounters.cognitiveLoadOnFinal.push(sessionData.cognitiveLoad);
      if (encounters.cognitiveLoadOnFinal.length > 20) {
        encounters.cognitiveLoadOnFinal = encounters.cognitiveLoadOnFinal.slice(-20);
      }
    }
    
    await this.saveProfile(userId, profile);
  }

  /**
   * Update AI performance metrics
   */
  async updateAIPerformanceData(
    userId: string,
    interventionData: AIInterventionData
  ): Promise<void> {
    const profile = await this.loadProfile(userId);
    if (!profile) {
      logger.warn('Cannot update AI performance data - user profile not found', { userId });
      return;
    }
    
    const aiData = profile.challengeData.aiPerformance;
    
    // Update intervention counts
    aiData.totalInterventions++;
    if (interventionData.successful) {
      aiData.successfulInterventions++;
    }
    
    // Update intervention type data
    const typeData = aiData.interventionTypes[interventionData.type];
    typeData.count++;
    typeData.successRate = (typeData.successRate * (typeData.count - 1) + (interventionData.successful ? 1 : 0)) / typeData.count;
    
    // Update accuracy comparisons
    const accuracyData = interventionData.wasAISession ? aiData.accuracyImprovements.withAI : aiData.accuracyImprovements.baseline;
    accuracyData.sessions++;
    accuracyData.avgAccuracy = (accuracyData.avgAccuracy * (accuracyData.sessions - 1) + interventionData.afterAccuracy) / accuracyData.sessions;
    accuracyData.avgTime = (accuracyData.avgTime * (accuracyData.sessions - 1) + interventionData.afterTime) / accuracyData.sessions;
    
    // Calculate learning velocity (improvement per session)
    if (aiData.accuracyImprovements.withAI.sessions > 0 && aiData.accuracyImprovements.baseline.sessions > 0) {
      aiData.learningVelocity.withAI = aiData.accuracyImprovements.withAI.avgAccuracy / aiData.accuracyImprovements.withAI.sessions;
      aiData.learningVelocity.baseline = aiData.accuracyImprovements.baseline.avgAccuracy / aiData.accuracyImprovements.baseline.sessions;
    }
    
    await this.saveProfile(userId, profile);
  }

  /**
   * Update Quick Dash performance data
   */
  async updateQuickDashData(
    userId: string,
    sessionData: QuickDashSessionData
  ): Promise<void> {
    const profile = await this.loadProfile(userId);
    if (!profile) {
      logger.warn('Cannot update Quick Dash data - user profile not found', { userId });
      return;
    }
    
    const quickDashData = profile.challengeData.quickDash;
    
    // Update session counts
    quickDashData.totalSessions++;
    if (sessionData.completed) {
      quickDashData.completedSessions++;
    }
    
    if (sessionData.wasAIEnhanced) {
      quickDashData.aiEnhancedSessions++;
    } else {
      quickDashData.baselineSessions++;
    }
    
    // Update performance metrics
    quickDashData.averageScore = 
      (quickDashData.averageScore * (quickDashData.totalSessions - 1) + sessionData.score) / 
      quickDashData.totalSessions;
    
    if (sessionData.score > quickDashData.bestScore) {
      quickDashData.bestScore = sessionData.score;
    }
    
    quickDashData.averageTimePerWord = 
      (quickDashData.averageTimePerWord * (quickDashData.totalSessions - 1) + sessionData.timePerWord) / 
      quickDashData.totalSessions;
    
    // Update time performance
    quickDashData.timePerformance.avgCompletionTime = 
      (quickDashData.timePerformance.avgCompletionTime * (quickDashData.completedSessions - 1) + sessionData.totalTime) / 
      quickDashData.completedSessions;
    
    if (sessionData.completed && (quickDashData.timePerformance.fastestCompletion === 0 || sessionData.totalTime < quickDashData.timePerformance.fastestCompletion)) {
      quickDashData.timePerformance.fastestCompletion = sessionData.totalTime;
    }
    
    // Track time optimization patterns
    sessionData.timeOptimizations.forEach(pattern => {
      if (!quickDashData.timePerformance.timeOptimizationPatterns.includes(pattern)) {
        quickDashData.timePerformance.timeOptimizationPatterns.push(pattern);
      }
    });
    
    // Update pressure response metrics
    if (sessionData.pressurePoints.length > 0) {
      const pressureAccuracy = sessionData.pressurePoints
        .filter(p => p.timeRemaining < 60)
        .reduce((sum, p) => sum + p.accuracy, 0) / 
        sessionData.pressurePoints.filter(p => p.timeRemaining < 60).length;
      
      quickDashData.pressureResponse.accuracyUnderPressure = 
        (quickDashData.pressureResponse.accuracyUnderPressure * (quickDashData.totalSessions - 1) + (pressureAccuracy || sessionData.accuracy)) / 
        quickDashData.totalSessions;
      
      const lastMinutePoints = sessionData.pressurePoints.filter(p => p.timeRemaining < 60);
      if (lastMinutePoints.length > 0) {
        const lastMinutePerf = lastMinutePoints.reduce((sum, p) => sum + p.accuracy, 0) / lastMinutePoints.length;
        quickDashData.pressureResponse.lastMinutePerformance = 
          (quickDashData.pressureResponse.lastMinutePerformance * (quickDashData.totalSessions - 1) + lastMinutePerf) / 
          quickDashData.totalSessions;
      }
    }
    
    await this.saveProfile(userId, profile);
  }

  /**
   * Update Deep Dive performance data
   */
  async updateDeepDiveData(
    userId: string,
    sessionData: DeepDiveSessionData
  ): Promise<void> {
    const profile = await this.loadProfile(userId);
    if (!profile) {
      logger.warn('Cannot update Deep Dive data - user profile not found', { userId });
      return;
    }
    
    const deepDiveData = profile.challengeData.deepDive;
    
    // Update session counts
    deepDiveData.totalSessions++;
    if (sessionData.completed) {
      deepDiveData.completedSessions++;
    }
    
    if (sessionData.wasAIEnhanced) {
      deepDiveData.aiEnhancedSessions++;
    } else {
      deepDiveData.baselineSessions++;
    }
    
    // Update performance metrics
    deepDiveData.averageRetentionRate = 
      (deepDiveData.averageRetentionRate * (deepDiveData.totalSessions - 1) + sessionData.retentionRate) / 
      deepDiveData.totalSessions;
    
    deepDiveData.contextualLearningScore = 
      (deepDiveData.contextualLearningScore * (deepDiveData.totalSessions - 1) + sessionData.contextualLearningScore) / 
      deepDiveData.totalSessions;
    
    // Update repetition optimization
    if (sessionData.retentionRate > 0.8) { // Good retention indicates optimal repetition
      deepDiveData.repetitionOptimization.optimalRepetitionCount = 
        Math.round((deepDiveData.repetitionOptimization.optimalRepetitionCount + sessionData.repetitionCount) / 2);
    }
    
    deepDiveData.repetitionOptimization.contextVariationEffectiveness = 
      (deepDiveData.repetitionOptimization.contextVariationEffectiveness * (deepDiveData.totalSessions - 1) + 
       (sessionData.contextVariations / sessionData.wordsLearned)) / 
      deepDiveData.totalSessions;
    
    // Update comprehension metrics
    deepDiveData.comprehensionMetrics.averageFirstAttemptAccuracy = 
      (deepDiveData.comprehensionMetrics.averageFirstAttemptAccuracy * (deepDiveData.totalSessions - 1) + sessionData.firstAttemptAccuracy) / 
      deepDiveData.totalSessions;
    
    deepDiveData.comprehensionMetrics.improvementAfterContext = 
      (deepDiveData.comprehensionMetrics.improvementAfterContext * (deepDiveData.totalSessions - 1) + sessionData.improvementAfterContext) / 
      deepDiveData.totalSessions;
    
    deepDiveData.comprehensionMetrics.contextualHintEffectiveness = 
      (deepDiveData.comprehensionMetrics.contextualHintEffectiveness * (deepDiveData.totalSessions - 1) + sessionData.contextualHintUsage) / 
      deepDiveData.totalSessions;
    
    await this.saveProfile(userId, profile);
  }

  /**
   * Update Precision Mode performance data
   */
  async updatePrecisionModeData(
    userId: string,
    sessionData: PrecisionModeSessionData
  ): Promise<void> {
    const profile = await this.loadProfile(userId);
    if (!profile) {
      logger.warn('Cannot update Precision Mode data - user profile not found', { userId });
      return;
    }
    
    const precisionData = profile.challengeData.precisionMode;
    
    // Update session counts
    precisionData.totalSessions++;
    if (sessionData.completed) {
      precisionData.perfectSessions++;
    }
    
    if (sessionData.wasAIEnhanced) {
      precisionData.aiEnhancedSessions++;
    } else {
      precisionData.baselineSessions++;
    }
    
    // Update failure point tracking
    if (sessionData.failurePoint > 0) {
      precisionData.averageFailurePoint = 
        (precisionData.averageFailurePoint * (precisionData.totalSessions - precisionData.perfectSessions - 1) + sessionData.failurePoint) / 
        (precisionData.totalSessions - precisionData.perfectSessions);
    }
    
    // Update accuracy
    precisionData.zeroPressureAccuracy = 
      (precisionData.zeroPressureAccuracy * (precisionData.totalSessions - 1) + sessionData.accuracy) / 
      precisionData.totalSessions;
    
    // Update error patterns
    sessionData.errorTypes.forEach(errorType => {
      if (!precisionData.errorPatterns.commonMistakeTypes.includes(errorType)) {
        precisionData.errorPatterns.commonMistakeTypes.push(errorType);
      }
    });
    
    if (sessionData.mistakeDetails) {
      precisionData.errorPatterns.mistakeProgression.push(sessionData.mistakeDetails);
      // Keep only last 50 mistake records
      if (precisionData.errorPatterns.mistakeProgression.length > 50) {
        precisionData.errorPatterns.mistakeProgression = precisionData.errorPatterns.mistakeProgression.slice(-50);
      }
    }
    
    // Update perfect session strategies
    if (sessionData.completed) {
      precisionData.perfectSessionStrategies.optimalPacing = 
        (precisionData.perfectSessionStrategies.optimalPacing + sessionData.averageTimePerWord) / 2;
      
      if (!precisionData.perfectSessionStrategies.effectiveQuizModes.includes(sessionData.quizModeUsed)) {
        precisionData.perfectSessionStrategies.effectiveQuizModes.push(sessionData.quizModeUsed);
      }
      
      if (!precisionData.perfectSessionStrategies.cognitiveLoadManagement.includes(sessionData.cognitiveLoadStrategy)) {
        precisionData.perfectSessionStrategies.cognitiveLoadManagement.push(sessionData.cognitiveLoadStrategy);
      }
    }
    
    await this.saveProfile(userId, profile);
  }

  /**
   * Update Fill in the Blank performance data
   */
  async updateFillInTheBlankData(
    userId: string,
    sessionData: FillInTheBlankSessionData
  ): Promise<void> {
    const profile = await this.loadProfile(userId);
    if (!profile) {
      logger.warn('Cannot update Fill in the Blank data - user profile not found', { userId });
      return;
    }
    
    const fillBlankData = profile.challengeData.fillInTheBlank;
    
    // Update session counts
    fillBlankData.totalSessions++;
    if (sessionData.completed) {
      fillBlankData.completedSessions++;
    }
    
    if (sessionData.wasAIEnhanced) {
      fillBlankData.aiEnhancedSessions++;
    } else {
      fillBlankData.baselineSessions++;
    }
    
    // Update performance metrics
    fillBlankData.contextualAccuracy = 
      (fillBlankData.contextualAccuracy * (fillBlankData.totalSessions - 1) + sessionData.contextualAccuracy) / 
      fillBlankData.totalSessions;
    
    fillBlankData.averageContextUtilization = 
      (fillBlankData.averageContextUtilization * (fillBlankData.totalSessions - 1) + sessionData.contextUtilization) / 
      fillBlankData.totalSessions;
    
    // Update context learning preferences
    if (sessionData.contextualAccuracy > 0.8) { // High accuracy indicates good complexity level
      fillBlankData.contextLearning.sentenceComplexityPreference = sessionData.sentenceComplexity;
    }
    
    fillBlankData.contextLearning.contextualClueEffectiveness = 
      (fillBlankData.contextLearning.contextualClueEffectiveness * (fillBlankData.totalSessions - 1) + sessionData.contextualClueUsage) / 
      fillBlankData.totalSessions;
    
    fillBlankData.contextLearning.grammarPatternRecognition = 
      (fillBlankData.contextLearning.grammarPatternRecognition * (fillBlankData.totalSessions - 1) + sessionData.grammarRecognition) / 
      fillBlankData.totalSessions;
    
    // Update comprehension insights
    fillBlankData.comprehensionInsights.semanticAccuracy = 
      (fillBlankData.comprehensionInsights.semanticAccuracy * (fillBlankData.totalSessions - 1) + sessionData.semanticAccuracy) / 
      fillBlankData.totalSessions;
    
    fillBlankData.comprehensionInsights.syntacticAccuracy = 
      (fillBlankData.comprehensionInsights.syntacticAccuracy * (fillBlankData.totalSessions - 1) + sessionData.syntacticAccuracy) / 
      fillBlankData.totalSessions;
    
    fillBlankData.comprehensionInsights.pragmaticAccuracy = 
      (fillBlankData.comprehensionInsights.pragmaticAccuracy * (fillBlankData.totalSessions - 1) + sessionData.pragmaticAccuracy) / 
      fillBlankData.totalSessions;
    
    await this.saveProfile(userId, profile);
  }

  /**
   * Update cross-mode analytics
   */
  async updateCrossModeAnalytics(userId: string): Promise<void> {
    const profile = await this.loadProfile(userId);
    if (!profile) {
      logger.warn('Cannot update cross-mode analytics - user profile not found', { userId });
      return;
    }
    
    const crossMode = profile.challengeData.crossModeAnalytics;
    const challenges = profile.challengeData;
    
    // Calculate mode preferences based on completion rates and satisfaction indicators
    const modes = ['streakChallenges', 'bossBattles', 'quickDash', 'deepDive', 'precisionMode', 'fillInTheBlank'];
    crossMode.modePreferences = modes.map(mode => {
      const modeData = challenges[mode as keyof typeof challenges];
      if (typeof modeData === 'object' && 'totalSessions' in modeData && 'completedSessions' in modeData) {
        const completionRate = modeData.totalSessions > 0 ? modeData.completedSessions / modeData.totalSessions : 0;
        const sessionCount = modeData.totalSessions;
        const preferenceScore = (completionRate * 0.7) + (Math.min(sessionCount / 10, 1) * 0.3); // Completion rate + usage frequency
        
        return {
          mode,
          preferenceScore,
          reasonCodes: completionRate > 0.8 ? ['high-completion'] : completionRate > 0.5 ? ['moderate-completion'] : ['low-completion']
        };
      }
      return { mode, preferenceScore: 0, reasonCodes: ['no-data'] };
    }).sort((a, b) => b.preferenceScore - a.preferenceScore);
    
    // Calculate performance consistency
    const completionRates = modes.map(mode => {
      const modeData = challenges[mode as keyof typeof challenges];
      if (typeof modeData === 'object' && 'totalSessions' in modeData && 'completedSessions' in modeData) {
        return modeData.totalSessions > 0 ? modeData.completedSessions / modeData.totalSessions : 0;
      }
      return 0;
    }).filter(rate => rate > 0);
    
    if (completionRates.length > 1) {
      const avgCompletion = completionRates.reduce((sum, rate) => sum + rate, 0) / completionRates.length;
      const variance = completionRates.reduce((sum, rate) => sum + Math.pow(rate - avgCompletion, 2), 0) / completionRates.length;
      crossMode.performanceConsistency = Math.max(0, 1 - Math.sqrt(variance)); // Higher consistency = lower variance
    }
    
    await this.saveProfile(userId, profile);
  }
  async updateChallengeInsights(userId: string): Promise<void> {
    const profile = await this.loadProfile(userId);
    if (!profile) {
      logger.warn('Cannot update challenge insights - user profile not found', { userId });
      return;
    }
    
    const insights = profile.challengeData.challengeInsights;
    const streakData = profile.challengeData.streakChallenges;
    const bossData = profile.challengeData.bossBattles;
    const aiData = profile.challengeData.aiPerformance;
    
    // Calculate optimal challenge level based on performance
    const totalSessions = streakData.totalSessions + bossData.totalSessions;
    if (totalSessions > 5) {
      // Higher performance = can handle higher difficulty
      const avgStreakPerformance = streakData.averageStreak / Math.max(streakData.bestStreak, 1);
      const bossCompletionRate = bossData.completedSessions / Math.max(bossData.totalSessions, 1);
      const aiSuccessRate = aiData.successfulInterventions / Math.max(aiData.totalInterventions, 1);
      
      insights.optimalChallengeLevel = Math.min(100, Math.max(20, 
        (avgStreakPerformance * 30) + (bossCompletionRate * 40) + (aiSuccessRate * 30)
      ));
    }
    
    // Calculate cognitive load tolerance (adapting for string-based system)
    const recentCognitiveLoads = streakData.cognitiveLoadPatterns.slice(-10);
    if (recentCognitiveLoads.length > 0) {
      // Convert string cognitive loads to numeric values for calculation
      const loadValues = recentCognitiveLoads.map(p => {
        switch (p.cognitiveLoad) {
          case 'low': return 0.25;
          case 'moderate': return 0.5;
          case 'high': return 0.75;
          case 'overload': return 1.0;
          default: return 0.5;
        }
      });
      const avgCognitiveLoad = loadValues.reduce((sum: number, val: number) => sum + val, 0) / loadValues.length;
      insights.cognitiveLoadTolerance = Math.min(1, Math.max(0.3, avgCognitiveLoad));
    }
    
    // Identify adaptation preferences
    insights.adaptationPreferences = [];
    Object.entries(aiData.interventionTypes).forEach(([type, data]) => {
      if (data.count > 0 && data.successRate > 0.7) {
        insights.adaptationPreferences.push(type);
      }
    });
    
    // Identify struggling indicators
    insights.strugglingIndicators = [];
    if (streakData.cognitiveLoadPatterns.length > 0) {
      const highCognitiveLoadSessions = streakData.cognitiveLoadPatterns.filter(p => 
        p.cognitiveLoad === 'high' || p.cognitiveLoad === 'overload'
      ).length;
      if (highCognitiveLoadSessions / streakData.cognitiveLoadPatterns.length > 0.3) {
        insights.strugglingIndicators.push('high-cognitive-load');
      }
    }
    
    if (bossData.totalSessions > 0 && bossData.completedSessions / bossData.totalSessions < 0.5) {
      insights.strugglingIndicators.push('low-boss-completion');
    }
    
    insights.lastAnalysisDate = new Date();
    
    await this.saveProfile(userId, profile);
  }

  /**
   * Get challenge performance summary
   */
  async getChallengeAnalytics(userId: string): Promise<{
    streakPerformance: any;
    bossPerformance: any;
    quickDashPerformance: any;
    deepDivePerformance: any;
    precisionModePerformance: any;
    fillInTheBlankPerformance: any;
    crossModeAnalytics: any;
    aiEffectiveness: any;
    insights: any;
  }> {
    const profile = await this.loadProfile(userId);
    if (!profile) {
      logger.warn('Cannot get challenge analytics - user profile not found', { userId });
      return {
        streakPerformance: null,
        bossPerformance: null,
        quickDashPerformance: null,
        deepDivePerformance: null,
        precisionModePerformance: null,
        fillInTheBlankPerformance: null,
        crossModeAnalytics: null,
        aiEffectiveness: null,
        insights: null
      };
    }
    
    const challengeData = profile.challengeData;
    
    return {
      streakPerformance: {
        totalSessions: challengeData.streakChallenges.totalSessions,
        bestStreak: challengeData.streakChallenges.bestStreak,
        averageStreak: challengeData.streakChallenges.averageStreak,
        aiImprovementRate: challengeData.streakChallenges.aiEnhancedSessions > 0 ? 
          ((challengeData.streakChallenges.aiEnhancedSessions / challengeData.streakChallenges.totalSessions) * 100) : 0,
        preferredModes: Object.entries(challengeData.streakChallenges.preferredQuizModes)
          .sort(([,a], [,b]) => (b as {count: number}).count - (a as {count: number}).count)
          .slice(0, 3)
      },
      bossPerformance: {
        completionRate: challengeData.bossBattles.totalSessions > 0 ? 
          (challengeData.bossBattles.completedSessions / challengeData.bossBattles.totalSessions) * 100 : 0,
        averageWordsCompleted: challengeData.bossBattles.averageWordsCompleted,
        finalBossSuccessRate: challengeData.bossBattles.finalBossEncounters.attempts > 0 ?
          (challengeData.bossBattles.finalBossEncounters.victories / challengeData.bossBattles.finalBossEncounters.attempts) * 100 : 0,
        phaseStrengths: Object.entries(challengeData.bossBattles.phasePerformance)
          .sort(([,a], [,b]) => (b as {accuracy: number}).accuracy - (a as {accuracy: number}).accuracy)
      },
      quickDashPerformance: {
        totalSessions: challengeData.quickDash.totalSessions,
        completionRate: challengeData.quickDash.totalSessions > 0 ? 
          (challengeData.quickDash.completedSessions / challengeData.quickDash.totalSessions) * 100 : 0,
        averageScore: challengeData.quickDash.averageScore,
        bestScore: challengeData.quickDash.bestScore,
        speedImprovement: challengeData.quickDash.speedImprovementRate,
        pressurePerformance: {
          accuracyUnderPressure: challengeData.quickDash.pressureResponse.accuracyUnderPressure,
          lastMinutePerformance: challengeData.quickDash.pressureResponse.lastMinutePerformance
        },
        aiImprovementRate: challengeData.quickDash.aiEnhancedSessions > 0 ? 
          ((challengeData.quickDash.aiEnhancedSessions / challengeData.quickDash.totalSessions) * 100) : 0
      },
      deepDivePerformance: {
        totalSessions: challengeData.deepDive.totalSessions,
        completionRate: challengeData.deepDive.totalSessions > 0 ? 
          (challengeData.deepDive.completedSessions / challengeData.deepDive.totalSessions) * 100 : 0,
        retentionRate: challengeData.deepDive.averageRetentionRate,
        contextualLearning: challengeData.deepDive.contextualLearningScore,
        comprehensionMetrics: challengeData.deepDive.comprehensionMetrics,
        optimalRepetitions: challengeData.deepDive.repetitionOptimization.optimalRepetitionCount,
        aiImprovementRate: challengeData.deepDive.aiEnhancedSessions > 0 ? 
          ((challengeData.deepDive.aiEnhancedSessions / challengeData.deepDive.totalSessions) * 100) : 0
      },
      precisionModePerformance: {
        totalSessions: challengeData.precisionMode.totalSessions,
        perfectSessionRate: challengeData.precisionMode.totalSessions > 0 ? 
          (challengeData.precisionMode.perfectSessions / challengeData.precisionMode.totalSessions) * 100 : 0,
        averageFailurePoint: challengeData.precisionMode.averageFailurePoint,
        accuracy: challengeData.precisionMode.zeroPressureAccuracy,
        commonErrors: challengeData.precisionMode.errorPatterns.commonMistakeTypes,
        perfectSessionStrategies: challengeData.precisionMode.perfectSessionStrategies,
        aiImprovementRate: challengeData.precisionMode.aiEnhancedSessions > 0 ? 
          ((challengeData.precisionMode.aiEnhancedSessions / challengeData.precisionMode.totalSessions) * 100) : 0
      },
      fillInTheBlankPerformance: {
        totalSessions: challengeData.fillInTheBlank.totalSessions,
        completionRate: challengeData.fillInTheBlank.totalSessions > 0 ? 
          (challengeData.fillInTheBlank.completedSessions / challengeData.fillInTheBlank.totalSessions) * 100 : 0,
        contextualAccuracy: challengeData.fillInTheBlank.contextualAccuracy,
        contextUtilization: challengeData.fillInTheBlank.averageContextUtilization,
        comprehensionBreakdown: challengeData.fillInTheBlank.comprehensionInsights,
        preferredComplexity: challengeData.fillInTheBlank.contextLearning.sentenceComplexityPreference,
        aiImprovementRate: challengeData.fillInTheBlank.aiEnhancedSessions > 0 ? 
          ((challengeData.fillInTheBlank.aiEnhancedSessions / challengeData.fillInTheBlank.totalSessions) * 100) : 0
      },
      crossModeAnalytics: {
        modePreferences: challengeData.crossModeAnalytics.modePreferences,
        performanceConsistency: challengeData.crossModeAnalytics.performanceConsistency,
        learningTransfer: challengeData.crossModeAnalytics.learningTransfer,
        recommendedProgression: challengeData.crossModeAnalytics.optimalModeSequencing
      },
      aiEffectiveness: {
        interventionSuccessRate: challengeData.aiPerformance.totalInterventions > 0 ?
          (challengeData.aiPerformance.successfulInterventions / challengeData.aiPerformance.totalInterventions) * 100 : 0,
        accuracyImprovement: challengeData.aiPerformance.accuracyImprovements.withAI.avgAccuracy - 
          challengeData.aiPerformance.accuracyImprovements.baseline.avgAccuracy,
        learningVelocityGain: challengeData.aiPerformance.learningVelocity.withAI - 
          challengeData.aiPerformance.learningVelocity.baseline,
        mostEffectiveInterventions: Object.entries(challengeData.aiPerformance.interventionTypes)
          .sort(([,a], [,b]) => (b as {successRate: number}).successRate - (a as {successRate: number}).successRate)
          .slice(0, 3),
        modeSpecificEffectiveness: challengeData.aiPerformance.modeSpecificEffectiveness
      },
      insights: challengeData.challengeInsights
    };
  }
}

// Export singleton instance
export const userLearningProfileStorage = new UserLearningProfileStorage();