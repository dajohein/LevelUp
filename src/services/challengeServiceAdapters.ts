/**
 * Challenge Service Adapters
 * 
 * Adapters that wrap existing challenge services to conform to the
 * standardized IChallengeService interface, enabling unified management.
 */

import { 
  IChallengeService, 
  ChallengeConfig, 
  ChallengeContext, 
  ChallengeResult, 
  CompletionResult,
  StandardQuizMode 
} from './challengeServiceInterface';
import { streakChallengeService } from './streakChallengeService';
import { bossBattleService } from './bossBattleService';
import { precisionModeService } from './precisionModeService';
import { quickDashService } from './quickDashService';
import { deepDiveService } from './deepDiveService';
import { fillInTheBlankService } from './fillInTheBlankService';
import { getWordsForLanguage } from './wordService';
import { logger } from './logger';

/**
 * Adapter for Streak Challenge Service
 */
class StreakChallengeAdapter implements IChallengeService {
  async initialize(config: ChallengeConfig): Promise<void> {
    streakChallengeService.initializeStreak(config.languageCode, config.wordProgress);
  }

  async getNextWord(context: ChallengeContext): Promise<ChallengeResult> {
    const result = await streakChallengeService.getNextStreakWord(
      context.currentStreak,
      context.wordProgress
    );

    return {
      word: result.word,
      options: result.options,
      quizMode: result.quizMode,
      aiEnhanced: result.aiEnhanced,
      metadata: {
        reasoning: result.reasoning
      }
    };
  }

  recordCompletion(wordId: string, correct: boolean, timeSpent: number): CompletionResult {
    // Streak challenge doesn't have a recordCompletion method, so we simulate it
    return { sessionContinues: true };
  }

  reset(): void {
    // Streak challenge doesn't have a reset method - no-op
  }
}

/**
 * Adapter for Boss Battle Service
 */
class BossBattleAdapter implements IChallengeService {
  async initialize(config: ChallengeConfig): Promise<void> {
    await bossBattleService.initializeBossBattle(
      config.languageCode, 
      config.wordProgress, 
      config.targetWords
    );
  }

  async getNextWord(context: ChallengeContext): Promise<ChallengeResult> {
    const result = await bossBattleService.getNextBossWord(
      context.wordsCompleted,
      context.wordProgress
    );

    return {
      word: result.word,
      options: result.options,
      quizMode: result.quizMode,
      aiEnhanced: result.aiEnhanced,
      metadata: {
        reasoning: result.reasoning,
        bossPhase: result.bossPhase
      }
    };
  }

  recordCompletion(wordId: string, correct: boolean, timeSpent: number): CompletionResult {
    // Boss battle doesn't have a recordCompletion method, so we simulate it
    return { sessionContinues: true };
  }

  reset(): void {
    // Boss battle doesn't have a reset method - no-op
  }
}

/**
 * Adapter for Precision Mode Service
 */
class PrecisionModeAdapter implements IChallengeService {
  async initialize(config: ChallengeConfig): Promise<void> {
    await precisionModeService.initializePrecisionMode(
      config.languageCode, 
      config.wordProgress, 
      config.targetWords
    );
  }

  async getNextWord(context: ChallengeContext): Promise<ChallengeResult> {
    const result = await precisionModeService.getNextPrecisionWord(
      context.wordsCompleted,
      context.wordProgress
    );

    return {
      word: result.word,
      options: result.options,
      quizMode: result.quizMode,
      aiEnhanced: result.aiEnhanced,
      metadata: {
        reasoning: result.reasoning,
        confidenceBoost: result.confidenceBoost,
        errorPreventionHints: result.errorPreventionHints,
        optimalPacing: result.optimalPacing
      }
    };
  }

  recordCompletion(wordId: string, correct: boolean, timeSpent: number, metadata?: { errorType?: string }): CompletionResult {
    const continues = precisionModeService.recordWordCompletion(wordId, correct, timeSpent, metadata?.errorType);
    return { 
      sessionContinues: continues,
      sessionFailed: !continues // Precision mode fails on any error
    };
  }

  reset(): void {
    precisionModeService.reset();
  }

  hasSessionFailed(): boolean {
    return precisionModeService.hasSessionFailed();
  }
}

/**
 * Adapter for Quick Dash Service
 */
class QuickDashAdapter implements IChallengeService {
  async initialize(config: ChallengeConfig): Promise<void> {
    await quickDashService.initializeQuickDash(
      config.languageCode, 
      config.wordProgress, 
      config.targetWords || 8, 
      config.timeLimit || 5
    );
  }

  async getNextWord(context: ChallengeContext): Promise<ChallengeResult> {
    const result = await quickDashService.getNextQuickDashWord(
      context.wordsCompleted,
      context.wordProgress,
      context.timeRemaining || 0
    );

    return {
      word: result.word,
      options: result.options,
      quizMode: result.quizMode,
      aiEnhanced: result.aiEnhanced,
      metadata: {
        reasoning: result.reasoning
      }
    };
  }

  recordCompletion(wordId: string, correct: boolean, timeSpent: number): CompletionResult {
    quickDashService.recordWordCompletion(wordId, correct, timeSpent);
    return { sessionContinues: true };
  }

  reset(): void {
    quickDashService.reset();
  }
}

/**
 * Adapter for Deep Dive Service
 */
class DeepDiveAdapter implements IChallengeService {
  async initialize(config: ChallengeConfig): Promise<void> {
    await deepDiveService.initializeDeepDive(
      config.languageCode, 
      config.targetWords || 20, 
      config.difficulty || 3
    );
  }

  async getNextWord(context: ChallengeContext): Promise<ChallengeResult> {
    const allWords = context.allWords || getWordsForLanguage(context.wordProgress ? Object.keys(context.wordProgress)[0]?.split('-')[0] : 'en') || [];
    
    const result = await deepDiveService.getNextDeepDiveWord(
      allWords,
      context.wordProgress,
      context.wordsCompleted,
      context.targetWords
    );

    // Handle specialized quiz modes - map them to Redux-compatible modes
    let standardQuizMode: StandardQuizMode;
    let finalOptions: string[] = [];
    
    if (['contextual-analysis', 'usage-example', 'synonym-antonym'].includes(result.quizMode as string)) {
      // For enhanced modes, force multiple-choice and generate options if needed
      standardQuizMode = 'multiple-choice';
      
      logger.debug(`🎯 Enhanced quiz mode: ${result.quizMode} → multiple-choice for word "${result.word.term}"`);
      
      console.log(`🎯 ENHANCED MODE DETECTED:`, {
        originalMode: result.quizMode,
        word: result.word.term,
        convertedTo: 'multiple-choice',
        aiEnhanced: result.aiEnhanced
      });
      
      // If Deep Dive didn't provide options (for open-ended modes), generate them
      if (!result.options || result.options.length === 0) {
        // Generate multiple choice options using the Deep Dive service's method
        const deepDiveServiceAny = deepDiveService as any;
        if (deepDiveServiceAny.generateMultipleChoiceOptions) {
          finalOptions = deepDiveServiceAny.generateMultipleChoiceOptions(result.word, allWords);
        } else {
          // Fallback: generate basic options
          finalOptions = this.generateBasicOptions(result.word, allWords);
        }
      } else {
        finalOptions = result.options;
      }
    } else if (['multiple-choice', 'letter-scramble', 'open-answer', 'fill-in-the-blank'].includes(result.quizMode as string)) {
      standardQuizMode = result.quizMode as StandardQuizMode;
      finalOptions = result.options || [];
      
      logger.debug(`🎯 Standard quiz mode: ${result.quizMode} for word "${result.word.term}"`);
    } else {
      standardQuizMode = 'multiple-choice';
      finalOptions = result.options || [];
      
      logger.debug(`🎯 Fallback quiz mode: ${result.quizMode} → multiple-choice for word "${result.word.term}"`);
    }

    return {
      word: result.word,
      options: finalOptions,
      quizMode: standardQuizMode,
      aiEnhanced: result.aiEnhanced,
      metadata: {
        reasoning: result.reasoning,
        originalQuizMode: result.quizMode, // Preserve the original mode for UI display
        enhancementLevel: ['contextual-analysis', 'usage-example', 'synonym-antonym'].includes(result.quizMode as string) ? 'advanced' : 'standard'
      }
    };
  }

  private generateBasicOptions(word: any, allWords: any[]): string[] {
    const direction = word.direction || 'definition-to-term';
    const correctAnswer = direction === 'definition-to-term' ? word.term : word.definition;
    
    // Get 3 random incorrect options
    const incorrectOptions: string[] = [];
    const shuffledWords = [...allWords].sort(() => 0.5 - Math.random());
    
    for (const candidate of shuffledWords) {
      if (candidate.id !== word.id && incorrectOptions.length < 3) {
        const incorrectAnswer = direction === 'definition-to-term' ? candidate.term : candidate.definition;
        if (incorrectAnswer !== correctAnswer && !incorrectOptions.includes(incorrectAnswer)) {
          incorrectOptions.push(incorrectAnswer);
        }
      }
    }
    
    // Create final options with correct answer at random position
    const options = [...incorrectOptions];
    const correctPos = Math.floor(Math.random() * 4);
    options.splice(correctPos, 0, correctAnswer);
    
    return options;
  }

  recordCompletion(wordId: string, correct: boolean, timeSpent: number): CompletionResult {
    // Deep dive doesn't have a recordCompletion method, so we simulate it
    return { sessionContinues: true };
  }

  reset(): void {
    deepDiveService.reset();
  }
}

/**
 * Adapter for Fill In The Blank Service
 */
class FillInTheBlankAdapter implements IChallengeService {
  async initialize(config: ChallengeConfig): Promise<void> {
    await fillInTheBlankService.initializeFillInTheBlank(
      config.languageCode, 
      config.targetWords || 15
    );
  }

  async getNextWord(context: ChallengeContext): Promise<ChallengeResult> {
    const allWords = context.allWords || getWordsForLanguage(context.wordProgress ? Object.keys(context.wordProgress)[0]?.split('-')[0] : 'en') || [];
    
    const result = await fillInTheBlankService.getNextFillInTheBlankWord(
      allWords,
      context.wordProgress,
      context.wordsCompleted,
      context.targetWords
    );

    return {
      word: result.word,
      options: result.options || [],
      quizMode: 'fill-in-the-blank', // Fixed quiz mode for this service
      aiEnhanced: result.aiEnhanced,
      metadata: {
        reasoning: result.reasoning
      }
    };
  }

  recordCompletion(wordId: string, correct: boolean, timeSpent: number, metadata?: { errorType?: string }): CompletionResult {
    // Fill-in-the-blank doesn't have a recordCompletion method, so we simulate it
    return { sessionContinues: true };
  }

  reset(): void {
    fillInTheBlankService.reset();
  }
}

// Export adapter instances
export const streakChallengeAdapter = new StreakChallengeAdapter();
export const bossBattleAdapter = new BossBattleAdapter();
export const precisionModeAdapter = new PrecisionModeAdapter();
export const quickDashAdapter = new QuickDashAdapter();
export const deepDiveAdapter = new DeepDiveAdapter();
export const fillInTheBlankAdapter = new FillInTheBlankAdapter();