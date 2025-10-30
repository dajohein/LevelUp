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

interface StreakChallengeState {
  languageCode: string;
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
    _allWords?: Word[] // Unused - centralized word selection handles this
  ): void {
    // Generate unique session ID for this streak challenge
    const sessionId = `streak-challenge-${Date.now()}`;

    this.state = {
      languageCode,
      currentStreak: 0,
      sessionId,
      // AI enhancement initialization
      sessionStartTime: Date.now(),
      performanceHistory: [],
      consecutiveCorrect: 0,
      consecutiveIncorrect: 0,
      aiEnhancementsEnabled: challengeAIIntegrator.isAIAvailable(),
    };

    logger.debug(`🔥 Streak challenge initialized with session ID: ${sessionId}`);
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

    // Use centralized word selection
    const selectionResult = selectWordForChallenge(
      this.state.languageCode,
      wordProgress,
      this.state.sessionId,
      difficulty
    );

    if (!selectionResult) {
      logger.error('No words available for streak challenge');
      return { word: null, options: [], quizMode: 'multiple-choice', aiEnhanced: false };
    }

    return this.generateAIEnhancedQuiz(selectionResult.word, currentStreak, wordProgress);
  }

  /**
   * Generate multiple choice options
   */
  private generateOptions(word: Word, quizMode: string): string[] {
    switch (quizMode) {
      case 'multiple-choice':
        return this.generateMultipleChoiceOptions(word);
      
      case 'letter-scramble':
        return this.generateLetterScrambleOptions(word);
      
      case 'open-answer':
        return []; // Open answer doesn't need options
      
      case 'fill-in-the-blank':
        return this.generateFillInTheBlankOptions(word);
      
      default:
        return [];
    }
  }

  /**
   * Generate multiple choice options for streak challenge
   */
  private generateMultipleChoiceOptions(word: Word): string[] {
    if (!this.state) return [];

    const correctAnswer = word.direction === 'definition-to-term' ? word.term : word.definition;
    
    // Import here to avoid circular dependency
    const { getWordsForLanguage } = require('./wordService');
    const allWords = getWordsForLanguage(this.state.languageCode);
    
    // Get wrong answers from similar difficulty words
    const wrongAnswers = allWords
      .filter((w: Word) => w.id !== word.id)
      .map((w: Word) => word.direction === 'definition-to-term' ? w.term : w.definition)
      .filter((answer: string) => answer !== correctAnswer)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    const options = [correctAnswer, ...wrongAnswers];
    return options.sort(() => 0.5 - Math.random()); // Shuffle options
  }

  /**
   * Generate letter scramble options for streak challenge
   */
  private generateLetterScrambleOptions(word: Word): string[] {
    const correctTerm = word.direction === 'definition-to-term' ? word.term : word.definition;
    const options = [correctTerm];
    
    // Generate scrambled versions
    for (let i = 0; i < 3; i++) {
      let scrambled = this.scrambleText(correctTerm, i + 1);
      // Ensure we don't duplicate the correct answer
      while (options.includes(scrambled) || scrambled === correctTerm) {
        scrambled = this.scrambleText(correctTerm, Math.random() * 3 + 1);
      }
      options.push(scrambled);
    }
    
    return options.sort(() => 0.5 - Math.random());
  }

  /**
   * Generate fill-in-the-blank options for streak challenge
   */
  private generateFillInTheBlankOptions(word: Word): string[] {
    if (!this.state) return [];

    const correctAnswer = word.direction === 'definition-to-term' ? word.term : word.definition;
    
    // Import here to avoid circular dependency
    const { getWordsForLanguage } = require('./wordService');
    const allWords = getWordsForLanguage(this.state.languageCode);
    
    // Get plausible alternatives of similar length and complexity
    const wrongAnswers = allWords
      .filter((w: Word) => w.id !== word.id)
      .map((w: Word) => word.direction === 'definition-to-term' ? w.term : w.definition)
      .filter((answer: string) => answer !== correctAnswer)
      .filter((answer: string) => Math.abs(answer.length - correctAnswer.length) <= 4) // Similar length
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    
    // Fallback if not enough similar words
    while (wrongAnswers.length < 3) {
      const fallbacks = ['alternative', 'different', 'another'];
      for (const fallback of fallbacks) {
        if (!wrongAnswers.includes(fallback) && wrongAnswers.length < 3) {
          wrongAnswers.push(fallback);
        }
      }
      break;
    }
    
    const options = [correctAnswer, ...wrongAnswers];
    return options.sort(() => 0.5 - Math.random());
  }

  /**
   * Scramble text for letter-scramble quiz mode
   */
  private scrambleText(text: string, level: number): string {
    const words = text.split(' ');
    
    if (words.length === 1) {
      // Single word - scramble letters
      return this.scrambleWord(words[0], level);
    } else {
      // Multiple words - scramble word order and individual words
      const scrambledWords = words.map(word => this.scrambleWord(word, level * 0.5));
      return scrambledWords.sort(() => 0.5 - Math.random()).join(' ');
    }
  }

  /**
   * Scramble individual word
   */
  private scrambleWord(word: string, level: number): string {
    if (word.length <= 2) return word; // Don't scramble very short words
    
    const chars = word.split('');
    
    switch (Math.floor(level) % 3) {
      case 0:
        // Light scramble - swap adjacent characters
        for (let i = 0; i < chars.length - 1; i += 2) {
          [chars[i], chars[i + 1]] = [chars[i + 1], chars[i]];
        }
        break;
      
      case 1:
        // Medium scramble - reverse order
        chars.reverse();
        break;
      
      case 2:
      default:
        // Heavy scramble - random shuffle
        for (let i = chars.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [chars[i], chars[j]] = [chars[j], chars[i]];
        }
        break;
    }
    
    return chars.join('');
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

    // Generate baseline quiz mode based on streak
    const baselineQuizMode = this.generateQuizModeForTier(currentStreak, currentStreak);

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
          currentDifficulty: currentStreak < 5 ? 20 : currentStreak < 15 ? 50 : 80,
          tierLevel: currentStreak < 5 ? 1 : currentStreak < 15 ? 3 : 5,
          isEarlyPhase: currentStreak <= 5,
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
   * Generate quiz mode for difficulty tier (baseline logic)
   */
  private generateQuizModeForTier(tier: number, _streak: number): 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank' {
    // Tier 1 (0-2 streak): Easier modes
    if (tier === 1) {
      return Math.random() < 0.7 ? 'multiple-choice' : 'letter-scramble';
    }
    
    // Tier 2 (3-6 streak): Mixed easier modes
    if (tier === 2) {
      return Math.random() < 0.5 ? 'multiple-choice' : 'letter-scramble';
    }
    
    // Tier 3 (7-11 streak): Introduce open-answer
    if (tier === 3) {
      const rand = Math.random();
      if (rand < 0.3) return 'multiple-choice';
      if (rand < 0.6) return 'letter-scramble';
      return 'open-answer';
    }
    
    // Tier 4 (12-17 streak): More challenging
    if (tier === 4) {
      const rand = Math.random();
      if (rand < 0.2) return 'multiple-choice';
      if (rand < 0.4) return 'letter-scramble';
      if (rand < 0.7) return 'open-answer';
      return 'fill-in-the-blank';
    }
    
    // Tier 5 (18+ streak): Expert level
    const rand = Math.random();
    if (rand < 0.1) return 'multiple-choice';
    if (rand < 0.2) return 'letter-scramble';
    if (rand < 0.5) return 'open-answer';
    return 'fill-in-the-blank';
  }

  /**
   * Save streak challenge session performance data
   */
  async saveStreakPerformance(
    userId: string,
    sessionData: {
      streak: number;
      wordsCompleted: number;
      accuracy: number;
      wasAIEnhanced: boolean;
      tier: number;
      quizMode: string;
      cognitiveLoad: 'low' | 'moderate' | 'high' | 'overload';
      adaptationsUsed: string[];
    }
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