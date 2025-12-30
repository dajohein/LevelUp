// TODO: Clean up unused parameters in adapter methods (tracked)

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
  StandardQuizMode,
} from './challengeServiceInterface';
import { streakChallengeService } from './streakChallengeService';
import { bossBattleService } from './bossBattleService';
import { precisionModeService } from './precisionModeService';
import { quickDashService } from './quickDashService';
import { deepDiveService } from './deepDiveService';
import { fillInTheBlankService } from './fillInTheBlankService';
// Removed unused imports to reduce lint noise
import { generateModuleScopedOptions, generateScrambledVersions } from './optionGenerationUtils';
import { logger } from './logger';

/**
 * Adapter for Streak Challenge Service
 */
class StreakChallengeAdapter implements IChallengeService {
  async initialize(config: ChallengeConfig): Promise<void> {
    streakChallengeService.initializeStreak(
      config.languageCode,
      config.wordProgress,
      config.allWords, // Pass module-specific or all words
      config.moduleId // Pass module for scoped challenges
    );
  }

  async getNextWord(context: ChallengeContext): Promise<ChallengeResult> {
    const result = await streakChallengeService.getNextStreakWord(
      context.currentStreak,
      context.wordProgress
    );

    if (!result.word) {
      throw new Error('No word available for streak challenge');
    }

    // Generate appropriate options based on quiz mode using shared utilities
    let finalOptions: string[] = [];
    if (result.quizMode === 'multiple-choice') {
      finalOptions = generateModuleScopedOptions(
        result.word,
        context.languageCode,
        context.allWords || []
      );
      console.log(
        `🎯 Streak Challenge: Generated ${finalOptions.length} options for "${result.word.term}": [${finalOptions.join(', ')}]`
      );
    } else if (result.quizMode === 'letter-scramble') {
      // Use easy difficulty for streak building
      finalOptions = [result.word.term, ...generateScrambledVersions(result.word.term, 'easy')];
    } else if (result.quizMode === 'fill-in-the-blank') {
      finalOptions = [result.word.definition];
    } else {
      // For open-answer, no options needed
      finalOptions = [];
    }

    return {
      word: result.word,
      options: finalOptions,
      quizMode: result.quizMode,
      aiEnhanced: result.aiEnhanced,
      metadata: {
        reasoning: result.reasoning,
      },
    };
  }

  recordCompletion(_wordId: string, _correct: boolean, _timeSpent: number): CompletionResult {
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
      config.targetWords,
      config.allWords, // Pass module-specific or all words
      config.moduleId // Pass module ID for scoped challenges
    );
  }

  async getNextWord(context: ChallengeContext): Promise<ChallengeResult> {
    const result = await bossBattleService.getNextBossWord(
      context.wordsCompleted,
      context.wordProgress
    );

    if (!result.word) {
      throw new Error('No word available for boss battle');
    }

    // Generate appropriate options based on quiz mode using shared utilities
    let finalOptions: string[] = [];
    if (result.quizMode === 'multiple-choice') {
      finalOptions = generateModuleScopedOptions(
        result.word,
        context.languageCode,
        context.allWords || []
      );
      console.log(
        `🎯 Boss Battle: Generated ${finalOptions.length} options for "${result.word.term}": [${finalOptions.join(', ')}]`
      );
    } else if (result.quizMode === 'letter-scramble') {
      // Use boss-level difficulty for maximum challenge
      finalOptions = [result.word.term, ...generateScrambledVersions(result.word.term, 'boss')];
    } else if (result.quizMode === 'fill-in-the-blank') {
      finalOptions = generateModuleScopedOptions(
        result.word,
        context.languageCode,
        context.allWords || []
      );
    } else {
      // For open-answer, no options needed
      finalOptions = [];
    }

    return {
      word: result.word,
      options: finalOptions,
      quizMode: result.quizMode,
      aiEnhanced: result.aiEnhanced,
      metadata: {
        reasoning: result.reasoning,
        bossPhase: result.bossPhase,
      },
    };
  }

  recordCompletion(_wordId: string, _correct: boolean, _timeSpent: number): CompletionResult {
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
      config.targetWords,
      config.allWords, // Pass module-specific or all words
      config.moduleId // Pass moduleId for module-specific challenges
    );
  }

  async getNextWord(context: ChallengeContext): Promise<ChallengeResult> {
    const result = await precisionModeService.getNextPrecisionWord(
      context.wordsCompleted,
      context.wordProgress
    );

    // FIXED: Generate module-scoped options instead of using Precision Mode's internal options
    let finalOptions: string[] = [];
    if (result.quizMode === 'multiple-choice') {
      finalOptions = generateModuleScopedOptions(
        result.word,
        context.languageCode,
        context.allWords || []
      );
      console.log(
        `🎯 Precision Mode: Generated ${finalOptions.length} options for "${result.word.term}": [${finalOptions.join(', ')}]`
      );
    } else if (result.quizMode === 'fill-in-the-blank') {
      finalOptions = [result.word.definition];
    } else if (result.quizMode === 'letter-scramble') {
      // Generate scrambled letters for letter scramble with precision difficulty
      const correctTerm = result.word.term;
      finalOptions = [correctTerm, ...generateScrambledVersions(correctTerm, 'hard')]; // Precision = hard difficulty
    } else {
      // For open-answer, no options needed
      finalOptions = [];
    }

    return {
      word: result.word,
      options: finalOptions, // Use centrally generated options
      quizMode: result.quizMode,
      aiEnhanced: result.aiEnhanced,
      metadata: {
        reasoning: result.reasoning,
        confidenceBoost: result.confidenceBoost,
        errorPreventionHints: result.errorPreventionHints,
        optimalPacing: result.optimalPacing,
      },
    };
  }

  recordCompletion(
    wordId: string,
    correct: boolean,
    timeSpent: number,
    metadata?: { errorType?: string }
  ): CompletionResult {
    const continues = precisionModeService.recordWordCompletion(
      wordId,
      correct,
      timeSpent,
      metadata?.errorType
    );
    return {
      sessionContinues: continues,
      sessionFailed: !continues, // Precision mode fails on any error
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
      config.timeLimit || 5,
      config.allWords, // Pass module-specific or all words
      config.moduleId // Pass module ID for scoped challenges
    );
  }

  async getNextWord(context: ChallengeContext): Promise<ChallengeResult> {
    const result = await quickDashService.getNextQuickDashWord(
      context.wordsCompleted,
      context.wordProgress,
      context.timeRemaining || 0
    );

    // Generate module-scoped options for consistent 4-option multiple choice
    let finalOptions: string[] = [];
    if (result.quizMode === 'multiple-choice') {
      finalOptions = generateModuleScopedOptions(
        result.word,
        context.languageCode,
        context.allWords || []
      );
      console.log(
        `🎯 Quick Dash: Generated ${finalOptions.length} options for "${result.word.term}": [${finalOptions.join(', ')}]`
      );
    } else {
      finalOptions = result.options;
    }

    return {
      word: result.word,
      options: finalOptions,
      quizMode: result.quizMode,
      aiEnhanced: result.aiEnhanced,
      metadata: {
        reasoning: result.reasoning,
      },
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
      config.difficulty || 3,
      config.moduleId // Pass module ID for scoped challenges
    );
  }

  async getNextWord(context: ChallengeContext): Promise<ChallengeResult> {
    // Use allWords from context - this is already correctly set by challengeServiceManager
    // to either module-specific words or all language words based on context.moduleId
    const allWords = context.allWords || [];

    if (allWords.length === 0) {
      logger.warn(`🔍 No words available for Deep Dive in context:`, {
        languageCode: context.languageCode,
        moduleId: context.moduleId,
        hasAllWords: !!context.allWords,
      });
    }

    // FIXED: Correct parameter alignment for getNextDeepDiveWord
    // Signature: (wordProgress, currentProgress, targetWords, aiEnhancementsEnabled)
    const result = await deepDiveService.getNextDeepDiveWord(
      context.wordProgress, // ✅ wordProgress: { [key: string]: WordProgress }
      context.wordsCompleted, // ✅ currentProgress: number (how many completed)
      context.targetWords, // ✅ targetWords: number (session target)
      true // ✅ aiEnhancementsEnabled: boolean
    );

    // Handle specialized quiz modes - improve variety while maintaining compatibility
    let standardQuizMode: StandardQuizMode;
    let finalOptions: string[] = [];

    if (
      ['contextual-analysis', 'usage-example', 'synonym-antonym'].includes(
        result.quizMode as string
      )
    ) {
      // Check word mastery level to avoid giving difficult modes to new words
      const wordProgress = context.wordProgress[result.word.id];
      const masteryLevel = wordProgress?.xp || 0; // Use XP instead of masteryLevel
      const isNewWord = masteryLevel === 0;

      // For enhanced modes, use varied quiz types but respect mastery level
      const enhancedModeMapping: { [key: string]: StandardQuizMode } = {
        'contextual-analysis': isNewWord
          ? 'multiple-choice'
          : Math.random() > 0.5
            ? 'multiple-choice'
            : 'fill-in-the-blank',
        'usage-example': isNewWord
          ? 'multiple-choice'
          : Math.random() > 0.3
            ? 'open-answer'
            : 'multiple-choice',
        'synonym-antonym': isNewWord
          ? 'multiple-choice'
          : Math.random() > 0.4
            ? 'letter-scramble'
            : 'multiple-choice',
      };

      standardQuizMode = enhancedModeMapping[result.quizMode as string] || 'multiple-choice';

      logger.debug(
        `🎯 Enhanced quiz mode: ${result.quizMode} → ${standardQuizMode} for word "${result.word.term}" (mastery: ${masteryLevel})`
      );

      console.log(`🎯 ENHANCED MODE DETECTED:`, {
        originalMode: result.quizMode,
        word: result.word.term,
        convertedTo: standardQuizMode,
        aiEnhanced: result.aiEnhanced,
        masteryLevel,
        isNewWord,
      });

      // Generate appropriate options based on the converted mode
      if (standardQuizMode === 'multiple-choice') {
        finalOptions = generateModuleScopedOptions(result.word, context.languageCode, allWords);
      } else if (standardQuizMode === 'fill-in-the-blank') {
        // For fill-in-the-blank, provide the full definition as a single option
        finalOptions = [result.word.definition];
      } else {
        // For open-answer and letter-scramble, no options needed
        finalOptions = [];
      }
    } else if (
      ['multiple-choice', 'letter-scramble', 'open-answer', 'fill-in-the-blank'].includes(
        result.quizMode as string
      )
    ) {
      standardQuizMode = result.quizMode as StandardQuizMode;

      // Generate appropriate options based on the quiz mode
      if (standardQuizMode === 'multiple-choice') {
        finalOptions = generateModuleScopedOptions(result.word, context.languageCode, allWords);
      } else if (standardQuizMode === 'letter-scramble') {
        // Determine difficulty based on challenge context
        const difficultyMap: { [key: string]: 'easy' | 'medium' | 'hard' | 'boss' } = {
          'deep-dive': 'medium', // Deep learning = moderate scrambling
          streak: 'easy', // Streak building = easier scrambling
          'quick-dash': 'hard', // Speed challenge = harder scrambling
          'boss-battle': 'boss', // Boss battle = maximum scrambling
          precision: 'hard', // Precision = hard scrambling
        };

        const sessionType = context.metadata?.sessionType || 'medium';
        const scrambleDifficulty = difficultyMap[sessionType] || 'medium';

        finalOptions = [
          result.word.term,
          ...generateScrambledVersions(result.word.term, scrambleDifficulty),
        ];
      } else {
        // For open-answer and fill-in-the-blank, no options needed
        finalOptions = [];
      }

      logger.debug(`🎯 Standard quiz mode: ${result.quizMode} for word "${result.word.term}"`);
    } else {
      standardQuizMode = 'multiple-choice';
      finalOptions = generateModuleScopedOptions(result.word, context.languageCode, allWords);

      logger.debug(
        `🎯 Fallback quiz mode: ${result.quizMode} → multiple-choice for word "${result.word.term}"`
      );
    }

    return {
      word: result.word,
      options: finalOptions,
      quizMode: standardQuizMode,
      aiEnhanced: result.aiEnhanced,
      metadata: {
        reasoning: result.reasoning,
        originalQuizMode: result.quizMode, // Preserve the original mode for UI display
        enhancementLevel: ['contextual-analysis', 'usage-example', 'synonym-antonym'].includes(
          result.quizMode as string
        )
          ? 'advanced'
          : 'standard',
      },
    };
  }

  recordCompletion(wordId: string, correct: boolean, timeSpent: number): CompletionResult {
    // Record completion in Deep Dive service for analytics and AI
    deepDiveService.recordWordCompletion(wordId, correct, timeSpent);
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
    // Use allWords from context - this is already correctly set by challengeServiceManager
    // to either module-specific words or all language words based on context.moduleId
    const allWords = context.allWords || [];

    if (allWords.length === 0) {
      logger.warn(`🔍 No words available for Fill In The Blank in context:`, {
        languageCode: context.languageCode,
        moduleId: context.moduleId,
        hasAllWords: !!context.allWords,
      });
    }

    const result = await fillInTheBlankService.getNextFillInTheBlankWord(
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
        reasoning: result.reasoning,
      },
    };
  }

  recordCompletion(
    _wordId: string,
    _correct: boolean,
    _timeSpent: number,
    _metadata?: { errorType?: string }
  ): CompletionResult {
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
