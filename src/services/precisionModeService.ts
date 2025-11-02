/**
 * Precision Mode Challenge Service - AI Enhanced
 * 
 * Implements zero-mistake learning with AI assistance for error prevention
 * and cognitive load management in high-stakes scenarios.
 */

import { Word } from './wordService';
import { WordProgress } from '../store/types';
import { 
  challengeAIIntegrator, 
  ChallengeAIContext
} from './challengeAIIntegrator';
import { logger } from './logger';
import { userLearningProfileStorage } from './storage/userLearningProfile';
import { selectWordForChallenge } from './wordSelectionManager';
import { selectQuizMode } from './quizModeSelectionUtils';
import { PrecisionModeSessionData } from '../types/challengeTypes';
import { 
  calculateErrorRisk, 
  adjustStrategyForRisk, 
  generateHints,
  generateSupport
} from './challengeServiceUtils';

interface PrecisionModeState {
  languageCode: string;
  moduleId?: string;
  targetWords: number;
  currentWordIndex: number;
  errorCount: number;
  sessionFailed: boolean;
  startTime: number;
  wordTimings: Array<{ wordId: string; timeSpent: number; correct: boolean }>;
  aiEnhancementsEnabled: boolean;
  usedWordIds: Set<string>;
  sessionId: string; // For centralized word selection
  errorPatterns: Array<{ wordNumber: number; errorType: string; timestamp: Date }>;
  recoveryStrategies: string[];
  currentStrategy: {
    pacing: number; // seconds per word
    quizMode: string;
    cognitiveLoadLevel: 'minimal' | 'low' | 'moderate' | 'high';
  };
}

interface PrecisionModeResult {
  word: Word;
  options: string[];
  quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';
  aiEnhanced: boolean;
  confidenceBoost?: string[];
  errorPreventionHints?: string[];
  optimalPacing: number; // recommended time to spend
  reasoning?: string[];
}

class PrecisionModeService {
  private state: PrecisionModeState | null = null;

  /**
   * Initialize Precision Mode challenge
   */
  async initializePrecisionMode(
    languageCode: string, 
    _wordProgress?: { [key: string]: WordProgress }, // Unused - centralized word selection handles this
    targetWords: number = 15,
    _allWords?: Word[], // Unused - centralized word selection handles this
    moduleId?: string // Module ID for module-specific practice
  ): Promise<void> {
    // Generate unique session ID for this precision mode session
    const sessionId = `precision-mode-${Date.now()}`;

    // Prevent re-initialization if already active with same session
    if (this.state && !this.state.sessionFailed && this.state.languageCode === languageCode) {
      logger.warn('Precision Mode already initialized for same language - skipping re-initialization', {
        currentSessionId: this.state.sessionId,
        newSessionId: sessionId,
        currentLanguage: this.state.languageCode
      });
      return;
    }

    logger.debug('Initializing new Precision Mode session', {
      sessionId,
      languageCode,
      targetWords,
      previousState: this.state ? 'existed' : 'none'
    });

    this.state = {
      languageCode,
      moduleId,
      targetWords,
      currentWordIndex: 0,
      errorCount: 0,
      sessionFailed: false,
      startTime: Date.now(),
      wordTimings: [],
      usedWordIds: new Set(),
      sessionId,
      aiEnhancementsEnabled: challengeAIIntegrator.isAIAvailable(),
      errorPatterns: [],
      recoveryStrategies: [],
      currentStrategy: {
        pacing: 8.0, // Start with 8 seconds per word
        quizMode: 'multiple-choice', // Start with easier mode
        cognitiveLoadLevel: 'low'
      }
    };

    logger.debug(`🎯 Precision Mode initialized with session ID: ${sessionId}, target: ${targetWords} words`);
  }

  /**
   * Get next word with AI-enhanced error prevention
   */
  async getNextPrecisionWord(
    currentProgress: number,
    wordProgress: { [key: string]: WordProgress }
  ): Promise<PrecisionModeResult> {
    if (!this.state) {
      logger.error('Precision Mode not initialized');
      throw new Error('Precision Mode must be initialized first');
    }

    if (this.state.sessionFailed) {
      throw new Error('Precision Mode session has failed due to error');
    }

    const { aiEnhancementsEnabled, targetWords, errorCount } = this.state;

    // Calculate error risk and adjust strategy
    const errorRisk = calculateErrorRisk(currentProgress, errorCount, 'precision');
    const newStrategy = adjustStrategyForRisk(errorRisk, 'precision', this.state.currentStrategy);
    this.state.currentStrategy = newStrategy;

    // Determine difficulty based on precision requirements and error risk
    let difficulty: 'easy' | 'medium' | 'hard';
    
    // Precision mode prioritizes safety over challenge
    if (errorRisk > 0.5 || errorCount > 0) {
      difficulty = 'easy'; // Play it safe after errors
    } else if (currentProgress < 3) {
      difficulty = 'easy'; // Start easy for confidence
    } else if (currentProgress > targetWords * 0.8) {
      difficulty = 'medium'; // Moderate challenge near the end
    } else {
      difficulty = 'easy'; // Generally stay safe in precision mode
    }

    logger.debug(`🎯 Precision Mode word ${currentProgress + 1}/${targetWords}, difficulty: ${difficulty}, errorRisk: ${errorRisk}`);

    // Use centralized word selection
    const selectionResult = selectWordForChallenge(
      this.state.languageCode,
      wordProgress,
      this.state.sessionId,
      difficulty,
      this.state.moduleId // Pass module ID for module-specific selection
    );

    if (!selectionResult) {
      logger.error('No words available for Precision Mode at this difficulty');
      throw new Error('No words available for Precision Mode');
    }

    const selectedWord = selectionResult.word;
    let quizMode: PrecisionModeResult['quizMode'];
    let aiEnhanced = false;
    let confidenceBoost: string[] = [];
    let errorPreventionHints: string[] = [];
    let reasoning: string[] = [];

    // Generate baseline quiz mode using simplified selection (normal context for precision)
    quizMode = selectQuizMode({
      word: selectedWord,
      wordProgress,
      context: 'normal', // Precision mode uses normal context, AI will handle optimization
      allowOpenAnswer: true
    });

    // AI-enhanced word selection for error prevention
    if (aiEnhancementsEnabled && errorRisk > 0.2) {
      const aiContext: ChallengeAIContext = {
        sessionType: 'precision-mode',
        currentProgress: {
          wordsCompleted: currentProgress,
          targetWords: targetWords,
          consecutiveCorrect: 0,
          consecutiveIncorrect: 0,
          recentAccuracy: currentProgress > 0 ? 1.0 - (errorCount / currentProgress) : 1.0,
          sessionDuration: (Date.now() - this.state.startTime) / 1000,
          accuracy: currentProgress > 0 ? 1.0 - (errorCount / currentProgress) : 1.0,
          timeElapsed: (Date.now() - this.state.startTime) / 1000
        },
        userState: {
          recentPerformance: []
        },
        challengeContext: {
          currentDifficulty: 50,
          errorRisk: errorRisk,
          perfectAccuracyRequired: true,
          currentErrorCount: errorCount,
          isEarlyPhase: currentProgress < 3,
          isFinalPhase: currentProgress > targetWords * 0.8 // Final 20%
        }
      };

      try {
        const aiResult = await challengeAIIntegrator.enhanceWordSelection(
          selectedWord,
          quizMode,
          aiContext,
          wordProgress
        );

        if (aiResult.interventionNeeded) {
          // AI can recommend a different word, but we'll use the centrally selected one
          // and just adjust the quiz mode and hints
          if (aiResult.aiRecommendedMode && ['multiple-choice', 'letter-scramble', 'open-answer', 'fill-in-the-blank'].includes(aiResult.aiRecommendedMode as any)) {
            quizMode = aiResult.aiRecommendedMode as PrecisionModeResult['quizMode'];
          }
          aiEnhanced = true;
          errorPreventionHints = generateHints({
            word: selectedWord,
            quizMode,
            context: 'precision',
            errorRisk
          });
          confidenceBoost = generateSupport({
            context: 'precision',
            errorRisk
          });
          reasoning = aiResult.reasoning || [];
          
          // Record recovery strategy
          this.state.recoveryStrategies.push(`error-prevention-${errorRisk > 0.5 ? 'high' : 'moderate'}`);
        }
      } catch (error) {
        logger.warn('AI enhancement failed for Precision Mode, using baseline approach', { error });
      }
    }

    // Track word usage
    this.state.usedWordIds.add(selectedWord.id);
    
    // NOTE: Options are now generated by the adapter for proper module scoping
    // const options = this.generateOptions(selectedWord, quizMode); // REMOVED

    logger.debug(`🎯 Precision Mode word selected: ${selectedWord.term} (${quizMode}, AI: ${aiEnhanced}, Risk: ${errorRisk.toFixed(2)})`);

    return {
      word: selectedWord,
      options: [], // Empty - will be populated by adapter with module-scoped options
      quizMode,
      aiEnhanced,
      confidenceBoost: confidenceBoost.length > 0 ? confidenceBoost : undefined,
      errorPreventionHints: errorPreventionHints.length > 0 ? errorPreventionHints : undefined,
      optimalPacing: this.state.currentStrategy.pacing,
      reasoning: reasoning.length > 0 ? reasoning : undefined
    };
  }

  /**
   * Record word completion and check for session failure
   */
  recordWordCompletion(wordId: string, correct: boolean, timeSpent: number, errorType?: string): boolean {
    if (!this.state) return false;

    this.state.wordTimings.push({
      wordId,
      timeSpent,
      correct
    });

    if (!correct) {
      this.state.errorCount++;
      this.state.sessionFailed = true; // Precision Mode fails on first error
      
      // Record error pattern
      this.state.errorPatterns.push({
        wordNumber: this.state.currentWordIndex + 1,
        errorType: errorType || 'unknown',
        timestamp: new Date()
      });
      
      logger.warn('Precision Mode session failed due to error', {
        wordId,
        wordNumber: this.state.currentWordIndex + 1,
        errorType
      });
      
      return false; // Session failed
    }

    this.state.currentWordIndex++;
    logger.debug(`Precision Mode word completed: ${wordId}, time: ${timeSpent}s`);
    
    return true; // Session continues
  }

  /**
   * Save Precision Mode session performance
   */
  async savePrecisionModePerformance(
    userId: string,
    sessionData: {
      completed: boolean;
      accuracy: number;
      wordsCompleted: number;
      wasAIEnhanced: boolean;
      finalScore: number;
    }
  ): Promise<void> {
    if (!this.state) {
      logger.warn('Cannot save Precision Mode performance - no active session');
      return;
    }

    try {
      const avgTimePerWord = this.state.wordTimings.length > 0 ? 
        this.state.wordTimings.reduce((sum, timing) => sum + timing.timeSpent, 0) / this.state.wordTimings.length : 0;

      const failurePoint = this.state.sessionFailed ? this.state.currentWordIndex + 1 : 0;
      const errorTypes = this.state.errorPatterns.map(pattern => pattern.errorType);

      const storageData: PrecisionModeSessionData = {
        completed: sessionData.completed,
        failurePoint,
        accuracy: sessionData.accuracy,
        averageTimePerWord: avgTimePerWord,
        wasAIEnhanced: sessionData.wasAIEnhanced,
        errorTypes,
        quizModeUsed: this.state.currentStrategy.quizMode,
        cognitiveLoadStrategy: this.state.currentStrategy.cognitiveLoadLevel,
        mistakeDetails: this.state.errorPatterns.length > 0 ? this.state.errorPatterns[0] : undefined
      };

      await userLearningProfileStorage.updatePrecisionModeData(userId, storageData);
      
      logger.info('Precision Mode performance saved', {
        userId,
        completed: sessionData.completed,
        failurePoint,
        wasAIEnhanced: sessionData.wasAIEnhanced
      });
    } catch (error) {
      logger.error('Failed to save Precision Mode performance', { userId, error });
    }
  }

  /**
   * Reset Precision Mode session
   */
  reset(): void {
    this.state = null;
    logger.debug('Precision Mode session reset');
  }

  /**
   * Get current session state
   */
  getSessionState(): PrecisionModeState | null {
    return this.state;
  }

  /**
   * Check if session has failed
   */
  hasSessionFailed(): boolean {
    return this.state?.sessionFailed || false;
  }
}

// Export singleton instance
export const precisionModeService = new PrecisionModeService();