/**
 * Boss Battle Service - AI Enhanced (Cleaned up version)
 * 
 * Implements challenging word selection for boss battles with intelligent
 * AI adaptations using centralized word selection.
 */

import { Word } from './wordService';
import { WordProgress } from '../store/types';
import { 
  challengeAIIntegrator, 
  ChallengeAIContext 
} from './challengeAIIntegrator';
import { logger } from './logger';
import { selectWordForChallenge } from './wordSelectionManager';
import { selectQuizMode } from './quizModeSelectionUtils';
import { userLearningProfileStorage } from './storage/userLearningProfile';

interface BossBattleSessionResults {
  completedWords: number;
  totalTargetWords: number;
  accuracy: number;
  totalTimeSpent: number;
  finalBossReached: boolean;
  finalBossDefeated: boolean;
  aiEnhancementsUsed: number;
}

interface BossBattleState {
  languageCode: string;
  moduleId?: string; // Track selected module
  wordsCompleted: number;
  targetWords: number;
  sessionId: string;
  // AI enhancement state
  sessionStartTime: number;
  performanceHistory: Array<{
    isCorrect: boolean;
    timeSpent: number;
    quizMode: string;
    difficulty: number;
    bossPhase: string;
  }>;
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
  aiEnhancementsEnabled: boolean;
}

class BossBattleService {
  private state: BossBattleState | null = null;

  /**
   * Initialize a new boss battle session
   */
  initializeBossBattle(
    languageCode: string, 
    _wordProgress?: { [key: string]: WordProgress }, // Unused - centralized word selection handles this
    targetWords: number = 25,
    _allWords?: Word[], // Unused - centralized word selection handles this
    moduleId?: string // Module for scoped challenges
  ): void {
    // Generate unique session ID for this boss battle
    const sessionId = `boss-battle-${Date.now()}`;

    this.state = {
      languageCode,
      moduleId, // Store module for word selection
      wordsCompleted: 0,
      targetWords,
      sessionId,
      // AI enhancement initialization
      sessionStartTime: Date.now(),
      performanceHistory: [],
      consecutiveCorrect: 0,
      consecutiveIncorrect: 0,
      aiEnhancementsEnabled: challengeAIIntegrator.isAIAvailable(),
    };

    logger.debug(`⚔️ Boss battle initialized with session ID: ${sessionId}, target: ${targetWords} rounds`);
  }

  /**
   * Get the next word for the boss battle with AI enhancements
   */
  async getNextBossWord(
    wordsCompleted: number,
    wordProgress: { [key: string]: WordProgress },
    lastWordResult?: { isCorrect: boolean; timeSpent: number; quizMode: string }
  ): Promise<{
    word: Word | null;
    options: string[];
    quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';
    aiEnhanced: boolean;
    reasoning?: string[];
    bossPhase: string;
  }> {
    if (!this.state) {
      logger.error('Boss battle not initialized');
      return { 
        word: null, 
        options: [], 
        quizMode: 'multiple-choice', 
        aiEnhanced: false,
        bossPhase: 'unknown'
      };
    }

    // Update performance tracking
    if (lastWordResult) {
      this.updateBossPerformanceHistory(lastWordResult, wordsCompleted);
    }

    this.state.wordsCompleted = wordsCompleted;

    // Determine current difficulty level based on boss battle progression
    const progressPercentage = wordsCompleted / this.state.targetWords;
    let difficulty: 'easy' | 'medium' | 'hard';
    
    // Boss battles get progressively harder
    if (progressPercentage < 0.3) {
      difficulty = 'medium'; // Start with medium difficulty
    } else if (progressPercentage < 0.8) {
      difficulty = 'hard'; // Escalate to hard
    } else {
      difficulty = 'hard'; // Final phase - maximum difficulty
    }
    
    // Special handling for final boss word
    const isFinalBoss = wordsCompleted >= this.state.targetWords - 1;
    const bossPhase = this.getBossPhase(progressPercentage, isFinalBoss);
    
    logger.debug(`⚔️ Boss battle word ${wordsCompleted + 1}/${this.state.targetWords}, difficulty: ${difficulty}${isFinalBoss ? ' (FINAL BOSS!)' : ''}`);

    // Use centralized word selection
    const selectionResult = selectWordForChallenge(
      this.state.languageCode,
      wordProgress,
      this.state.sessionId,
      difficulty,
      this.state.moduleId // Pass module for scoped selection
    );

    if (!selectionResult) {
      logger.error('No words available for boss battle at this difficulty');
      return { 
        word: null, 
        options: [], 
        quizMode: 'multiple-choice', 
        aiEnhanced: false,
        bossPhase
      };
    }

    const selectedWord = selectionResult.word;
    const currentDifficultyLevel = progressPercentage * 100; // Convert to 0-100 scale

    return this.generateAIEnhancedBossQuiz(selectedWord, currentDifficultyLevel, bossPhase, wordProgress);
  }

  /**
   * Determine boss battle phase
   */
  private getBossPhase(progressPercentage: number, isFinalBoss: boolean): string {
    if (isFinalBoss) return 'final-boss';
    if (progressPercentage < 0.3) return 'early-boss';
    if (progressPercentage < 0.7) return 'mid-boss';
    return 'late-boss';
  }

  /**
   * Update boss battle performance history
   */
  private updateBossPerformanceHistory(
    result: { isCorrect: boolean; timeSpent: number; quizMode: string },
    wordsCompleted: number
  ): void {
    if (!this.state) return;

    // Update consecutive tracking
    if (result.isCorrect) {
      this.state.consecutiveCorrect++;
      this.state.consecutiveIncorrect = 0;
    } else {
      this.state.consecutiveIncorrect++;
      this.state.consecutiveCorrect = 0;
    }

    // Add to performance history
    const progressPercentage = wordsCompleted / this.state.targetWords;
    const bossPhase = this.getBossPhase(progressPercentage, wordsCompleted >= this.state.targetWords - 1);
    
    this.state.performanceHistory.push({
      isCorrect: result.isCorrect,
      timeSpent: result.timeSpent,
      quizMode: result.quizMode,
      difficulty: progressPercentage * 100,
      bossPhase
    });

    // Keep only recent history (last 8 words for AI analysis)
    if (this.state.performanceHistory.length > 8) {
      this.state.performanceHistory = this.state.performanceHistory.slice(-8);
    }
  }

  /**
   * Generate AI-enhanced boss quiz with intelligent adaptations
   */
  private async generateAIEnhancedBossQuiz(
    word: Word,
    difficultyLevel: number,
    bossPhase: string,
    wordProgress: { [key: string]: WordProgress }
  ): Promise<{
    word: Word;
    options: string[];
    quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';
    aiEnhanced: boolean;
    reasoning?: string[];
    bossPhase: string;
  }> {
    if (!this.state) {
      return {
        word,
        options: [],
        quizMode: 'multiple-choice',
        aiEnhanced: false,
        bossPhase
      };
    }

    // Calculate progress percentage for AI context
    const progressPercentage = this.state.wordsCompleted / this.state.targetWords;

    // Generate baseline quiz mode using simplified selection
    const baselineQuizMode = selectQuizMode({
      word,
      wordProgress,
      context: 'boss-battle',
      allowOpenAnswer: true
    });

    // If AI is disabled, use baseline approach
    if (!this.state.aiEnhancementsEnabled) {
      const options = this.generateBossOptions(word, baselineQuizMode);
      return {
        word,
        options,
        quizMode: baselineQuizMode,
        aiEnhanced: false,
        bossPhase
      };
    }

    try {
      // Create AI context for boss battle analysis
      const aiContext: ChallengeAIContext = {
        sessionType: 'boss-battle',
        currentProgress: {
          wordsCompleted: this.state.wordsCompleted,
          targetWords: this.state.targetWords,
          currentStreak: this.state.consecutiveCorrect,
          consecutiveCorrect: this.state.consecutiveCorrect,
          consecutiveIncorrect: this.state.consecutiveIncorrect,
          recentAccuracy: this.calculateCurrentAccuracy(),
          sessionDuration: Date.now() - this.state.sessionStartTime
        },
        userState: {
          recentPerformance: this.state.performanceHistory
        },
        challengeContext: {
          currentDifficulty: difficultyLevel,
          phaseProgress: progressPercentage,
          isEarlyPhase: bossPhase === 'early-boss',
          isFinalPhase: bossPhase === 'final-boss'
        }
      };

      // Get AI enhancement
      const aiEnhancement = await challengeAIIntegrator.enhanceWordSelection(
        word,
        baselineQuizMode,
        aiContext,
        wordProgress
      );

      // Generate options for the AI-selected mode
      const finalQuizMode = aiEnhancement.aiRecommendedMode as typeof baselineQuizMode || baselineQuizMode;
      const options = this.generateBossOptions(word, finalQuizMode);

      logger.debug(`🤖 AI-enhanced boss word: ${word.term}`, {
        baseline: baselineQuizMode,
        aiMode: aiEnhancement.aiRecommendedMode,
        reasoning: aiEnhancement.reasoning,
        phase: bossPhase,
        difficulty: difficultyLevel
      });

      return {
        word,
        options,
        quizMode: finalQuizMode,
        aiEnhanced: true,
        reasoning: aiEnhancement.reasoning,
        bossPhase
      };

    } catch (error) {
      logger.error('❌ AI enhancement failed for boss battle, using baseline:', error);
      
      const options = this.generateBossOptions(word, baselineQuizMode);
      return {
        word,
        options,
        quizMode: baselineQuizMode,
        aiEnhanced: false,
        bossPhase
      };
    }
  }

  /**
   * Generate options for boss battle quiz - now handled by adapter
   */
  private generateBossOptions(_word: Word, _quizMode: string): string[] {
    // All option generation now handled by adapter for proper module scoping
    return [];
  }

  /**
   * Calculate current accuracy for AI context
   */
  private calculateCurrentAccuracy(): number {
    if (!this.state || this.state.performanceHistory.length === 0) {
      return 0.8; // Default assumption
    }
    
    const recentHistory = this.state.performanceHistory.slice(-5);
    const correct = recentHistory.filter(h => h.isCorrect).length;
    return correct / recentHistory.length;
  }

  /**
   * Reset the boss battle
   */
  resetBossBattle(): void {
    if (this.state) {
      this.state.wordsCompleted = 0;
      this.state.consecutiveCorrect = 0;
      this.state.consecutiveIncorrect = 0;
      this.state.performanceHistory = [];
    }
  }

  /**
   * Get current boss battle statistics
   */
  getBossBattleStats() {
    if (!this.state) return null;
    
    return {
      wordsCompleted: this.state.wordsCompleted,
      targetWords: this.state.targetWords,
      sessionId: this.state.sessionId,
      aiEnhanced: this.state.aiEnhancementsEnabled,
      performanceHistory: this.state.performanceHistory.length,
      consecutiveCorrect: this.state.consecutiveCorrect,
      consecutiveIncorrect: this.state.consecutiveIncorrect,
    };
  }

  /**
   * Record boss battle completion and analytics
   */
  async recordBossBattleCompletion(
    userId: string,
    wordId: string,
    isCorrect: boolean,
    timeSpent: number,
    bossPhase: string,
    difficultyLevel: number,
    wasAIEnhanced: boolean = false
  ): Promise<void> {
    if (!this.state) {
      throw new Error('Boss battle session not initialized');
    }

    try {
      await userLearningProfileStorage.updateBossBattleData(userId || 'default_user', {
        wordsCompleted: this.state.wordsCompleted,
        completed: isCorrect,
        wasAIEnhanced: wasAIEnhanced,
        finalBossReached: this.state.wordsCompleted >= this.state.targetWords - 1,
        finalBossDefeated: isCorrect && this.state.wordsCompleted >= this.state.targetWords - 1,
        phasePerformance: {
          [bossPhase]: {
            accuracy: isCorrect ? 1.0 : 0.0,
            avgTime: timeSpent,
            adaptations: wasAIEnhanced ? 1 : 0
          }
        },
        quizMode: 'boss-battle',
        cognitiveLoad: difficultyLevel > 70 ? 'high' : difficultyLevel > 40 ? 'moderate' : 'low'
      });

      // Update internal state
      if (isCorrect) {
        this.state.consecutiveCorrect++;
        this.state.consecutiveIncorrect = 0;
      } else {
        this.state.consecutiveIncorrect++;
        this.state.consecutiveCorrect = 0;
      }

      // Record performance history
      this.state.performanceHistory.push({
        isCorrect,
        timeSpent,
        quizMode: 'boss-battle',
        difficulty: difficultyLevel,
        bossPhase
      });

      logger.debug(`⚔️ Boss battle completion recorded: ${wordId}, correct: ${isCorrect}, phase: ${bossPhase}`);
    } catch (error) {
      logger.error('❌ Failed to record boss battle completion:', error);
    }
  }

  /**
   * Save boss battle performance data
   */
  async saveBossPerformance(userId: string, sessionResults: BossBattleSessionResults): Promise<void> {
    logger.debug(`💾 Saving boss battle performance for user ${userId}`);
    // Note: This method is used by example files but actual implementation
    // would depend on specific storage requirements. For now, we just log.
    logger.info('Boss battle performance would be saved here', { userId, sessionResults });
  }
}

// Export singleton instance
export const bossBattleService = new BossBattleService();