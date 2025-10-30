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

interface BossBattleState {
  languageCode: string;
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
    _allWords?: Word[] // Unused - centralized word selection handles this
  ): void {
    // Generate unique session ID for this boss battle
    const sessionId = `boss-battle-${Date.now()}`;

    this.state = {
      languageCode,
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
      difficulty
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

    return this.generateAIEnhancedBossQuiz(selectedWord, currentDifficultyLevel, isFinalBoss, bossPhase, wordProgress);
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
    isFinalBoss: boolean,
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

    // Generate baseline quiz mode based on difficulty
    const baselineQuizMode = this.generateBossQuizMode(difficultyLevel, isFinalBoss);

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
   * Generate quiz mode based on boss difficulty
   */
  private generateBossQuizMode(
    difficultyLevel: number,
    isFinalBoss: boolean
  ): 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank' {
    if (isFinalBoss) {
      // Final boss always gets the hardest mode
      return 'open-answer';
    }
    
    // Scale quiz difficulty with boss progression
    if (difficultyLevel >= 85) {
      return Math.random() < 0.7 ? 'open-answer' : 'fill-in-the-blank';
    } else if (difficultyLevel >= 65) {
      return Math.random() < 0.5 ? 'fill-in-the-blank' : 'letter-scramble';
    } else {
      return Math.random() < 0.6 ? 'letter-scramble' : 'multiple-choice';
    }
  }

  /**
   * Generate options for boss battle quiz
   */
  private generateBossOptions(word: Word, quizMode: string): string[] {
    switch (quizMode) {
      case 'multiple-choice':
        return this.generateBossMultipleChoiceOptions(word);
      case 'letter-scramble':
        return this.generateBossLetterScrambleOptions(word);
      case 'fill-in-the-blank':
        return this.generateBossFillInTheBlankOptions(word);
      case 'open-answer':
      default:
        return []; // Open answer doesn't need options
    }
  }

  /**
   * Generate challenging multiple choice options
   */
  private generateBossMultipleChoiceOptions(word: Word): string[] {
    const correctAnswer = word.term;
    
    // Import here to avoid circular dependency
    const { getWordsForLanguage } = require('./wordService');
    const allWords = getWordsForLanguage(this.state?.languageCode || 'de');
    
    // Get challenging wrong answers
    const wrongAnswers = allWords
      .filter((w: Word) => w.id !== word.id)
      .map((w: Word) => w.term)
      .filter((term: string) => term !== correctAnswer)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    // Fallback if not enough words
    while (wrongAnswers.length < 3) {
      const fallbacks = ['der Boss', 'die Herausforderung', 'das Finale'];
      for (const fallback of fallbacks) {
        if (!wrongAnswers.includes(fallback) && wrongAnswers.length < 3) {
          wrongAnswers.push(fallback);
        }
      }
      break;
    }

    const options = [correctAnswer, ...wrongAnswers.slice(0, 3)];
    return options.sort(() => 0.5 - Math.random()); // Shuffle options
  }

  /**
   * Generate challenging letter scramble options
   */
  private generateBossLetterScrambleOptions(word: Word): string[] {
    const correctTerm = word.term;
    const options = [correctTerm];
    
    // Generate increasingly scrambled versions for boss battle
    for (let i = 0; i < 3; i++) {
      const scrambled = this.createBossScramble(correctTerm, 80 + i * 5); // High difficulty
      options.push(scrambled);
    }
    
    return options.sort(() => 0.5 - Math.random());
  }

  /**
   * Generate challenging fill-in-the-blank options
   */
  private generateBossFillInTheBlankOptions(word: Word): string[] {
    const correctTerm = word.term;
    
    // Import here to avoid circular dependency
    const { getWordsForLanguage } = require('./wordService');
    const allWords = getWordsForLanguage(this.state?.languageCode || 'de');
    
    // Get challenging alternatives
    const wrongTerms = allWords
      .filter((w: Word) => w.id !== word.id)
      .map((w: Word) => w.term)
      .filter((term: string) => term !== correctTerm)
      .slice(0, 3);
    
    const options = [correctTerm, ...wrongTerms.slice(0, 3)];
    return options.sort(() => 0.5 - Math.random());
  }

  /**
   * Create boss-level scramble (more challenging)
   */
  private createBossScramble(text: string, difficulty: number): string {
    const words = text.split(' ');
    return words.map(word => this.scrambleBossWord(word, difficulty)).join(' ');
  }

  /**
   * Scramble individual word with boss-level difficulty
   */
  private scrambleBossWord(word: string, difficulty: number): string {
    if (word.length <= 3) return word; // Don't scramble very short words
    
    const chars = word.split('');
    const scrambleIntensity = Math.min(Math.floor((difficulty / 100) * word.length), word.length - 1);
    
    // Boss-level scrambling: more aggressive shuffling
    for (let i = 0; i < scrambleIntensity; i++) {
      const idx1 = Math.floor(Math.random() * chars.length);
      const idx2 = Math.floor(Math.random() * chars.length);
      [chars[idx1], chars[idx2]] = [chars[idx2], chars[idx1]];
    }
    
    return chars.join('');
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
   * Save boss battle performance data
   */
  async saveBossPerformance(userId: string, sessionResults: any): Promise<void> {
    logger.debug(`💾 Saving boss battle performance for user ${userId}`);
    // Note: This method is used by example files but actual implementation
    // would depend on specific storage requirements. For now, we just log.
    logger.info('Boss battle performance would be saved here', { userId, sessionResults });
  }
}

// Export singleton instance
export const bossBattleService = new BossBattleService();