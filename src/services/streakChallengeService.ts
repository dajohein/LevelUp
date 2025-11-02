/**
 * Streak Challenge Service - AI Enhanced
 * 
 * Implements progressive difficulty word selection for streak challenges with
 * intelligent AI adaptations. Words get progressively harder as the streak increases,
 * while AI monitors cognitive load and adjusts difficulty and quiz modes dynamically.
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
import { getWordMasteryTier, generateQuizModeForMastery } from './quizModeSelectionUtils';
import { StreakChallengeSessionData } from '../types/challengeTypes';

interface StreakChallengeState {
  languageCode: string;
  moduleId?: string; // Track selected module
  currentStreak: number;
  sessionId: string;
  // AI enhancement state
  sessionStartTime: number;
  performanceHistory: Array<{
    isCorrect: boolean;
    timeSpent: number;
    quizMode: string;
    difficulty: number;
    streak: number;
  }>;
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
  aiEnhancementsEnabled: boolean;
}

class StreakChallengeService {
  private state: StreakChallengeState | null = null;

  /**
   * Initialize a new streak challenge session
   */
  initializeStreak(
    languageCode: string, 
    _wordProgress?: { [key: string]: WordProgress }, // Unused - centralized word selection handles this
    _allWords?: Word[], // Unused - centralized word selection handles this
    moduleId?: string // Module for scoped challenges
  ): void {
    // Generate unique session ID for this streak challenge
    const sessionId = `streak-challenge-${Date.now()}`;

    this.state = {
      languageCode,
      moduleId, // Store module for word selection
      currentStreak: 0,
      sessionId,
      // AI enhancement initialization
      sessionStartTime: Date.now(),
      performanceHistory: [],
      consecutiveCorrect: 0,
      consecutiveIncorrect: 0,
      aiEnhancementsEnabled: challengeAIIntegrator.isAIAvailable(),
    };

    logger.debug(`🔥 Streak challenge initialized with session ID: ${sessionId}${moduleId ? ` (module: ${moduleId})` : ' (all words)'}`);
  }

  /**
   * Get the next word for the streak challenge with AI enhancements
   */
  async getNextStreakWord(
    currentStreak: number,
    wordProgress: { [key: string]: WordProgress },
    lastWordResult?: { isCorrect: boolean; timeSpent: number; quizMode: string }
  ): Promise<{
    word: Word | null;
    options: string[];
    quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';
    aiEnhanced: boolean;
    reasoning?: string[];
  }> {
    if (!this.state) {
      logger.error('Streak challenge not initialized');
      return { word: null, options: [], quizMode: 'multiple-choice', aiEnhanced: false };
    }

    // Update performance tracking
    if (lastWordResult) {
      this.updatePerformanceHistory(lastWordResult, currentStreak);
    }

    // Update streak
    this.state.currentStreak = currentStreak;

    // Calculate difficulty based on streak (easier progression than before)
    let difficulty: 'easy' | 'medium' | 'hard';
    if (currentStreak < 5) {
      difficulty = 'easy';
    } else if (currentStreak < 15) {
      difficulty = 'medium'; 
    } else {
      difficulty = 'hard';
    }

    // Use centralized word selection with module support
    const selectionResult = selectWordForChallenge(
      this.state.languageCode,
      wordProgress,
      this.state.sessionId,
      difficulty,
      this.state.moduleId // Pass module for scoped selection
    );

    if (!selectionResult) {
      logger.error('No words available for streak challenge');
      return { word: null, options: [], quizMode: 'multiple-choice', aiEnhanced: false };
    }

    return this.generateAIEnhancedQuiz(selectionResult.word, currentStreak, wordProgress);
  }

  /**
   * Generate options - now handled by adapter for consistent module scoping
   */
  private generateOptions(_word: Word, _quizMode: string): string[] {
    // All option generation now handled by adapter for proper module scoping
    return [];
  }

  /**
   * Reset the streak challenge
   */
  resetStreak(): void {
    if (this.state) {
      this.state.currentStreak = 0;
      this.state.consecutiveCorrect = 0;
      this.state.consecutiveIncorrect = 0;
      this.state.performanceHistory = [];
    }
  }

  /**
   * Get current streak statistics
   */
  getStreakStats() {
    if (!this.state) return null;
    
    return {
      currentStreak: this.state.currentStreak,
      sessionId: this.state.sessionId,
      aiEnhanced: this.state.aiEnhancementsEnabled,
      performanceHistory: this.state.performanceHistory.length,
      consecutiveCorrect: this.state.consecutiveCorrect,
      consecutiveIncorrect: this.state.consecutiveIncorrect,
    };
  }

  /**
   * Update performance history for AI analysis
   */
  private updatePerformanceHistory(
    result: { isCorrect: boolean; timeSpent: number; quizMode: string },
    streak: number
  ): void {
    if (!this.state) return;

    // Update consecutive counters
    if (result.isCorrect) {
      this.state.consecutiveCorrect++;
      this.state.consecutiveIncorrect = 0;
    } else {
      this.state.consecutiveIncorrect++;
      this.state.consecutiveCorrect = 0;
    }

    // Add to performance history (use current streak as difficulty indicator)
    const difficulty = streak < 5 ? 20 : streak < 15 ? 50 : 80;
    this.state.performanceHistory.push({
      isCorrect: result.isCorrect,
      timeSpent: result.timeSpent,
      quizMode: result.quizMode,
      difficulty: difficulty,
      streak: streak
    });

    // Keep only recent history (last 10 words for AI analysis)
    if (this.state.performanceHistory.length > 10) {
      this.state.performanceHistory = this.state.performanceHistory.slice(-10);
    }
  }

  /**
   * Generate AI-enhanced quiz with intelligent mode selection
   */
  private async generateAIEnhancedQuiz(
    word: Word,
    currentStreak: number,
    wordProgress: { [key: string]: WordProgress }
  ): Promise<{
    word: Word;
    options: string[];
    quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';
    aiEnhanced: boolean;
    reasoning?: string[];
  }> {
    if (!this.state) {
      return {
        word,
        options: [],
        quizMode: 'multiple-choice',
        aiEnhanced: false
      };
    }

    // Calculate recent accuracy
    const recentPerformance = this.state.performanceHistory.slice(-5); // Last 5 words
    const recentAccuracy = recentPerformance.length > 0 
      ? recentPerformance.filter(p => p.isCorrect).length / recentPerformance.length 
      : 0.8; // Default assumption

    // Get word's experience level for quiz mode selection
    const wordXP = wordProgress[word.id]?.xp || 0;
    const wordMasteryLevel = getWordMasteryTier(wordXP);
    
    // Generate baseline quiz mode based on WORD EXPERIENCE, not streak
    const baselineQuizMode = generateQuizModeForMastery(wordMasteryLevel);

    // If AI is disabled, use baseline approach
    if (!this.state.aiEnhancementsEnabled) {
      const options = this.generateOptions(word, baselineQuizMode);
      return {
        word,
        options,
        quizMode: baselineQuizMode,
        aiEnhanced: false
      };
    }

    try {
      // Create AI context for analysis
      const aiContext: ChallengeAIContext = {
        sessionType: 'streak-challenge',
        currentProgress: {
          wordsCompleted: this.state.performanceHistory.length,
          targetWords: 50, // Streak challenges don't have fixed targets
          currentStreak: currentStreak,
          consecutiveCorrect: this.state.consecutiveCorrect,
          consecutiveIncorrect: this.state.consecutiveIncorrect,
          recentAccuracy: recentAccuracy,
          sessionDuration: Date.now() - this.state.sessionStartTime
        },
        userState: {
          recentPerformance: this.state.performanceHistory
        },
        challengeContext: {
          currentDifficulty: wordXP < 20 ? 20 : wordXP < 100 ? 50 : 80,
          tierLevel: wordMasteryLevel,
          isEarlyPhase: wordXP === 0, // New word is early phase
          isFinalPhase: false // Streak challenges don't have final phase
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
      const options = this.generateOptions(word, aiEnhancement.aiRecommendedMode || baselineQuizMode);

      logger.debug(`🤖 AI-enhanced streak word: ${word.term}`, {
        baseline: baselineQuizMode,
        aiMode: aiEnhancement.aiRecommendedMode,
        reasoning: aiEnhancement.reasoning,
        streak: currentStreak,
        tier: currentStreak < 5 ? 1 : currentStreak < 15 ? 3 : 5
      });

      return {
        word,
        options,
        quizMode: aiEnhancement.aiRecommendedMode as any || baselineQuizMode,
        aiEnhanced: true,
        reasoning: aiEnhancement.reasoning
      };

    } catch (error) {
      logger.error('❌ AI enhancement failed for streak challenge, using baseline:', error);
      
      const options = this.generateOptions(word, baselineQuizMode);
      return {
        word,
        options,
        quizMode: baselineQuizMode,
        aiEnhanced: false,
        reasoning: ['AI enhancement failed - using baseline selection']
      };
    }
  }

  /**
   * Save streak challenge session performance data
   */
  async saveStreakPerformance(
    userId: string,
    sessionData: StreakChallengeSessionData
  ): Promise<void> {
    try {
      await userLearningProfileStorage.updateStreakChallengeData(userId, sessionData);
      
      logger.info('Streak challenge performance saved', {
        userId,
        streak: sessionData.streak,
        tier: sessionData.tier,
        wasAIEnhanced: sessionData.wasAIEnhanced
      });
    } catch (error) {
      logger.error('Failed to save streak challenge performance', { userId, error });
    }
  }
}

// Export singleton instance
export const streakChallengeService = new StreakChallengeService();