/**
 * User Learning Profile Storage
 * 
 * USER-SPECIFIC learning profiles (not language-specific)
 * Integrates with tiered storage system: Memory → localStorage → IndexedDB → Remote
 * Follows LevelUp architecture guidelines for language isolation while maintaining user-specific profiles
 */

import { tieredStorage } from './tieredStorage';
import { logger } from '../logger';
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
}

// Export singleton instance
export const userLearningProfileStorage = new UserLearningProfileStorage();