/**
 * Challenge Service Manager - Truly Generic Service Management
 * 
 * Eliminates ALL code duplication by providing a unified interface
 * that maps to service adapters conforming to IChallengeService.
 */

import { /* Word, */ getWordsForLanguage } from './wordService'; // Removed unused import
import { getWordsForModule } from './moduleService'; // For module-specific word selection
import { WordProgress } from '../store/types';
import { 
  IChallengeService, 
  ChallengeConfig, 
  ChallengeContext, 
  ChallengeResult, 
  ServiceRegistry
  // StandardQuizMode // Removed unused import
} from './challengeServiceInterface';
import {
  streakChallengeAdapter,
  bossBattleAdapter,
  precisionModeAdapter,
  quickDashAdapter,
  deepDiveAdapter,
  fillInTheBlankAdapter
} from './challengeServiceAdapters';
import { logger } from './logger';

// Service health and performance tracking
export interface ServiceHealth {
  serviceName: string;
  isAvailable: boolean;
  responseTime: number;
  errorRate: number;
  lastCall: Date | null;
  successCount: number;
  errorCount: number;
}

/**
 * Unified Challenge Service Manager
 * 
 * Uses the adapter pattern to provide a single, generic interface for ALL
 * challenge services, eliminating code duplication completely.
 */
class ChallengeServiceManager {
  private serviceRegistry: ServiceRegistry;
  private serviceHealth: Map<string, ServiceHealth> = new Map();

  constructor() {
    // Register all challenge services with their adapters
    this.serviceRegistry = {
      'streak-challenge': streakChallengeAdapter,
      'boss-battle': bossBattleAdapter,
      'precision-mode': precisionModeAdapter,
      'quick-dash': quickDashAdapter,
      'deep-dive': deepDiveAdapter,
      'fill-in-the-blank': fillInTheBlankAdapter
    };

    // Initialize health tracking for all registered services
    Object.keys(this.serviceRegistry).forEach(sessionId => {
      this.serviceHealth.set(sessionId, {
        serviceName: sessionId,
        isAvailable: true,
        responseTime: 0,
        errorRate: 0,
        lastCall: null,
        successCount: 0,
        errorCount: 0
      });
    });
  }

  /**
   * Initialize a challenge service session - GENERIC FOR ALL SERVICES
   */
  async initializeSession(
    sessionId: string,
    languageCode: string,
    wordProgress: { [key: string]: WordProgress },
    options?: { targetWords?: number; timeLimit?: number; difficulty?: number },
    moduleId?: string // Optional module ID for module-specific practice
  ): Promise<void> {
    const startTime = Date.now();
    const service = this.getService(sessionId);

    try {
      // Get words based on whether module is specified
      const allWords = moduleId 
        ? getWordsForModule(languageCode, moduleId) 
        : getWordsForLanguage(languageCode);

      const config: ChallengeConfig = {
        languageCode,
        wordProgress,
        targetWords: options?.targetWords || this.getDefaultTargetWords(sessionId),
        timeLimit: options?.timeLimit || 5,
        difficulty: options?.difficulty || 3,
        allWords: allWords || []
      };

      await service.initialize(config);
      
      this.recordServiceCall(sessionId, startTime, true);
      logger.info(`✅ Challenge service initialized: ${sessionId}${moduleId ? ` (module: ${moduleId})` : ''}`);

    } catch (error) {
      this.recordServiceCall(sessionId, startTime, false);
      logger.error(`Failed to initialize ${sessionId} service`, { error, languageCode, options });
      throw error;
    }
  }

  /**
   * Get next word from any challenge service - GENERIC FOR ALL SERVICES
   */
  async getNextWord(
    sessionId: string,
    context: {
      wordsCompleted: number;
      currentStreak: number;
      timeRemaining?: number;
      targetWords: number;
      wordProgress: { [key: string]: WordProgress };
      languageCode: string;
      moduleId?: string; // Optional module ID for module-specific practice
    }
  ): Promise<ChallengeResult> {
    const startTime = Date.now();
    const service = this.getService(sessionId);

    try {
      // Get words based on whether module is specified
      const allWords = context.moduleId 
        ? getWordsForModule(context.languageCode, context.moduleId) 
        : getWordsForLanguage(context.languageCode);

      const challengeContext: ChallengeContext = {
        wordsCompleted: context.wordsCompleted,
        currentStreak: context.currentStreak,
        timeRemaining: context.timeRemaining,
        targetWords: context.targetWords,
        wordProgress: context.wordProgress,
        languageCode: context.languageCode,
        moduleId: context.moduleId,
        allWords: allWords || []
      };

      const result = await service.getNextWord(challengeContext);
      
      if (!result.word) {
        throw new Error(`${sessionId} service returned no word`);
      }

      this.recordServiceCall(sessionId, startTime, true);
      logger.debug(`🎯 Challenge service provided word: ${result.word.term} (${sessionId}, ${result.quizMode})`);
      
      return result;

    } catch (error) {
      this.recordServiceCall(sessionId, startTime, false);
      logger.error(`Failed to get next word from ${sessionId} service`, { error, context });
      throw error;
    }
  }

  /**
   * Record word completion in any challenge service - GENERIC FOR ALL SERVICES
   */
  async recordCompletion(
    sessionId: string,
    wordId: string,
    correct: boolean,
    timeSpent: number,
    metadata?: { errorType?: string; wasAIEnhanced?: boolean }
  ): Promise<boolean> {
    const startTime = Date.now();
    const service = this.getService(sessionId);

    try {
      const result = await service.recordCompletion(wordId, correct, timeSpent, metadata);
      
      // Handle different return types from services
      let sessionContinues = true;
      if (typeof result === 'boolean') {
        sessionContinues = result;
      } else if (result && typeof result === 'object') {
        sessionContinues = result.sessionContinues;
      }

      this.recordServiceCall(sessionId, startTime, true);
      return sessionContinues;

    } catch (error) {
      this.recordServiceCall(sessionId, startTime, false);
      logger.error(`Failed to record completion in ${sessionId} service`, { error, wordId, correct, timeSpent });
      return true; // Don't fail the session on recording errors
    }
  }

  /**
   * Reset any challenge service - GENERIC FOR ALL SERVICES
   */
  resetSession(sessionId: string): void {
    try {
      const service = this.getService(sessionId);
      service.reset();
      logger.debug(`🔄 Challenge service reset: ${sessionId}`);
    } catch (error) {
      logger.error(`Failed to reset ${sessionId} service`, { error });
    }
  }

  /**
   * Check if session has failed - GENERIC FOR ALL SERVICES
   */
  hasSessionFailed(sessionId: string): boolean {
    try {
      const service = this.getService(sessionId);
      return service.hasSessionFailed?.() || false;
    } catch (error) {
      logger.error(`Failed to check session failure for ${sessionId}`, { error });
      return false;
    }
  }

  /**
   * Get health status for all services
   */
  getServicesHealth(): Map<string, ServiceHealth> {
    return new Map(this.serviceHealth);
  }

  /**
   * Get health status for specific service
   */
  getServiceHealth(sessionId: string): ServiceHealth | null {
    return this.serviceHealth.get(sessionId) || null;
  }

  /**
   * Get list of supported session types
   */
  getSupportedSessionTypes(): string[] {
    return Object.keys(this.serviceRegistry);
  }

  /**
   * Check if a session type is supported
   */
  isSessionTypeSupported(sessionId: string): boolean {
    return sessionId in this.serviceRegistry;
  }

  // Private helper methods

  private getService(sessionId: string): IChallengeService {
    const service = this.serviceRegistry[sessionId];
    if (!service) {
      throw new Error(`Unknown session type: ${sessionId}. Supported types: ${Object.keys(this.serviceRegistry).join(', ')}`);
    }
    return service;
  }

  private getDefaultTargetWords(sessionId: string): number {
    const defaults: { [key: string]: number } = {
      'streak-challenge': 10,
      'boss-battle': 25,
      'precision-mode': 15,
      'quick-dash': 8,
      'deep-dive': 20,
      'fill-in-the-blank': 15
    };
    return defaults[sessionId] || 15;
  }

  private recordServiceCall(sessionId: string, startTime: number, success: boolean): void {
    const health = this.serviceHealth.get(sessionId);
    if (!health) return;

    const responseTime = Date.now() - startTime;
    health.lastCall = new Date();
    health.responseTime = (health.responseTime + responseTime) / 2; // Running average

    if (success) {
      health.successCount++;
      health.isAvailable = true;
    } else {
      health.errorCount++;
      health.isAvailable = health.errorCount < 10; // Mark unavailable after 10 consecutive errors
    }

    // Calculate error rate
    const totalCalls = health.successCount + health.errorCount;
    health.errorRate = totalCalls > 0 ? health.errorCount / totalCalls : 0;

    this.serviceHealth.set(sessionId, health);
  }
}

// Export singleton instance
export const challengeServiceManager = new ChallengeServiceManager();