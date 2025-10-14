/**
 * Streak Challenge Service - AI Enhanced
 * 
 * Implements progressive difficulty word selection for streak challenges with
 * intelligent AI adaptations. Words get progressively harder as the streak increases,
 * while AI monitors cognitive load and adjusts difficulty and quiz modes dynamically.
 */

import { Word, getWordsForLanguage } from './wordService';
import { WordProgress } from '../store/types';
import { calculateMasteryDecay } from './masteryService';
import { 
  challengeAIIntegrator, 
  ChallengeAIContext, 
  AIEnhancedWordSelection 
} from './challengeAIIntegrator';
import { logger } from './logger';
import { userLearningProfileStorage } from './storage/userLearningProfile';

interface StreakChallengeState {
  languageCode: string;
  currentStreak: number;
  usedWordIds: Set<string>;
  difficultyTier: number;
  availableWords: Word[];
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
  initializeStreak(languageCode: string, wordProgress: { [key: string]: WordProgress }): void {
    const allWords = getWordsForLanguage(languageCode);
    
    if (!allWords || allWords.length === 0) {
      logger.error('No words available for streak challenge');
      return;
    }

    // Sort words by difficulty (mastery level, practice count, etc.)
    const sortedWords = this.sortWordsByDifficulty(allWords, wordProgress);

    this.state = {
      languageCode,
      currentStreak: 0,
      usedWordIds: new Set(),
      difficultyTier: 1,
      availableWords: sortedWords,
      // AI enhancement initialization
      sessionStartTime: Date.now(),
      performanceHistory: [],
      consecutiveCorrect: 0,
      consecutiveIncorrect: 0,
      aiEnhancementsEnabled: challengeAIIntegrator.isAIAvailable(),
    };

    logger.debug(`🔥 Streak challenge initialized with ${allWords.length} words`);
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

    // Update streak and calculate new difficulty tier
    this.state.currentStreak = currentStreak;
    const newDifficultyTier = this.calculateDifficultyTier(currentStreak);
    
    if (newDifficultyTier > this.state.difficultyTier) {
      this.state.difficultyTier = newDifficultyTier;
      logger.debug(`📈 Difficulty increased to tier ${newDifficultyTier} at streak ${currentStreak}`);
    }

    // Select appropriate word based on difficulty tier
    const selectedWord = this.selectWordForTier(this.state.difficultyTier, wordProgress);
    
    if (!selectedWord) {
      // If we've exhausted words at this tier, move to harder tier or cycle
      const higherTierWord = this.selectWordForTier(Math.min(5, this.state.difficultyTier + 1), wordProgress);
      if (higherTierWord) {
        return this.generateAIEnhancedQuiz(higherTierWord, currentStreak, wordProgress);
      }
      
      // Last resort: reset used words and start over
      this.state.usedWordIds.clear();
      const resetWord = this.selectWordForTier(this.state.difficultyTier, wordProgress);
      if (resetWord) {
        return this.generateAIEnhancedQuiz(resetWord, currentStreak, wordProgress);
      }
      
      logger.error('No words available for streak challenge');
      return { word: null, options: [], quizMode: 'multiple-choice', aiEnhanced: false };
    }

    return this.generateAIEnhancedQuiz(selectedWord, currentStreak, wordProgress);
  }

  /**
   * Calculate difficulty tier based on current streak
   */
  private calculateDifficultyTier(streak: number): number {
    if (streak < 3) return 1;      // Easy words
    if (streak < 7) return 2;      // Medium-easy words  
    if (streak < 12) return 3;     // Medium words
    if (streak < 18) return 4;     // Hard words
    return 5;                      // Expert words
  }

  /**
   * Sort words by difficulty (easier first)
   */
  private sortWordsByDifficulty(words: Word[], wordProgress: { [key: string]: WordProgress }): Word[] {
    return words.sort((a, b) => {
      const aProgress = wordProgress[a.id];
      const bProgress = wordProgress[b.id];
      
      // Words never practiced are easiest
      if (!aProgress && !bProgress) return 0;
      if (!aProgress) return -1;
      if (!bProgress) return 1;
      
      // Calculate difficulty score (lower = easier)
      const aScore = this.calculateDifficultyScore(aProgress);
      const bScore = this.calculateDifficultyScore(bProgress);
      
      return aScore - bScore;
    });
  }

  /**
   * Calculate difficulty score for a word (lower = easier)
   */
  private calculateDifficultyScore(progress: WordProgress): number {
    if (!progress) return 0; // Never practiced = easiest
    
    const mastery = calculateMasteryDecay(progress.lastPracticed || '', progress.xp || 0);
    const accuracy = progress.timesCorrect / Math.max(1, progress.timesCorrect + progress.timesIncorrect);
    const practiceCount = (progress.timesCorrect || 0) + (progress.timesIncorrect || 0);
    
    // Higher mastery and accuracy = easier word
    // More practice = potentially easier (well-known word)
    return 100 - mastery + (1 - accuracy) * 50 + Math.max(0, 10 - practiceCount);
  }

  /**
   * Select a word for the given difficulty tier
   */
  private selectWordForTier(tier: number, wordProgress: { [key: string]: WordProgress }): Word | null {
    if (!this.state) return null;

    // Calculate tier boundaries (quintiles)
    const totalWords = this.state.availableWords.length;
    const tierSize = Math.ceil(totalWords / 5);
    const startIndex = Math.max(0, (tier - 1) * tierSize);
    const endIndex = Math.min(totalWords, tier * tierSize);
    
    // Get words in this tier that haven't been used recently
    const tierWords = this.state.availableWords.slice(startIndex, endIndex);
    const availableWords = tierWords.filter(word => !this.state!.usedWordIds.has(word.id));
    
    if (availableWords.length === 0) {
      return null; // No available words in this tier
    }

    // For higher tiers, prefer less mastered words
    let selectedWord: Word;
    if (tier >= 3) {
      // Select word with lowest mastery in this tier
      selectedWord = availableWords.reduce((hardest, word) => {
        const hardestProgress = wordProgress[hardest.id];
        const wordProgress_ = wordProgress[word.id];
        
        const hardestMastery = hardestProgress ? calculateMasteryDecay(
          hardestProgress.lastPracticed || '', hardestProgress.xp || 0
        ) : 0;
        const wordMastery = wordProgress_ ? calculateMasteryDecay(
          wordProgress_.lastPracticed || '', wordProgress_.xp || 0
        ) : 0;
        
        return wordMastery < hardestMastery ? word : hardest;
      });
    } else {
      // For easier tiers, select randomly
      selectedWord = availableWords[Math.floor(Math.random() * availableWords.length)];
    }

    // Mark word as used
    this.state.usedWordIds.add(selectedWord.id);
    
    // Clean up used words if we've used too many (keep memory reasonable)
    if (this.state.usedWordIds.size > Math.min(50, totalWords * 0.7)) {
      const oldestWords = Array.from(this.state.usedWordIds).slice(0, 10);
      oldestWords.forEach(id => this.state!.usedWordIds.delete(id));
    }

    return selectedWord;
  }

  /**
   * Generate quiz format and options for selected word
   */
  private generateQuizForWord(word: Word, streak: number): {
    word: Word;
    options: string[];
    quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';
  } {
    // Quiz mode selection based on streak (gets harder)
    let quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';
    
    if (streak < 5) {
      // Early streak: easier modes
      quizMode = Math.random() < 0.7 ? 'multiple-choice' : 'letter-scramble';
    } else if (streak < 10) {
      // Mid streak: mixed modes
      const rand = Math.random();
      if (rand < 0.4) quizMode = 'multiple-choice';
      else if (rand < 0.7) quizMode = 'letter-scramble';
      else quizMode = 'open-answer';
    } else {
      // High streak: harder modes
      const rand = Math.random();
      if (rand < 0.2) quizMode = 'multiple-choice';
      else if (rand < 0.4) quizMode = 'letter-scramble';
      else if (rand < 0.7) quizMode = 'open-answer';
      else quizMode = 'fill-in-the-blank';
    }

    // Generate options for multiple choice
    const options = this.generateOptions(word, quizMode);

    return { word, options, quizMode };
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
    const allWords = this.state.availableWords;
    
    // Get wrong answers from similar difficulty words
    const wrongAnswers = allWords
      .filter(w => w.id !== word.id)
      .map(w => word.direction === 'definition-to-term' ? w.term : w.definition)
      .filter(answer => answer !== correctAnswer)
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
    const allWords = this.state.availableWords;
    
    // Get plausible alternatives of similar length and complexity
    const wrongAnswers = allWords
      .filter(w => w.id !== word.id)
      .map(w => word.direction === 'definition-to-term' ? w.term : w.definition)
      .filter(answer => answer !== correctAnswer)
      .filter(answer => Math.abs(answer.length - correctAnswer.length) <= 4) // Similar length
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
      this.state.usedWordIds.clear();
      this.state.difficultyTier = 1;
    }
  }

  /**
   * Get current streak statistics
   */
  getStreakStats() {
    if (!this.state) return null;
    
    return {
      currentStreak: this.state.currentStreak,
      difficultyTier: this.state.difficultyTier,
      wordsUsed: this.state.usedWordIds.size,
      totalWords: this.state.availableWords.length,
      aiEnhanced: this.state.aiEnhancementsEnabled,
      performanceHistory: this.state.performanceHistory.length,
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

    // Add to performance history
    this.state.performanceHistory.push({
      isCorrect: result.isCorrect,
      timeSpent: result.timeSpent,
      quizMode: result.quizMode,
      difficulty: this.state.difficultyTier * 20, // Convert tier to percentage
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

    // Generate baseline quiz mode based on tier
    const baselineQuizMode = this.generateQuizModeForTier(this.state.difficultyTier, currentStreak);

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
          currentDifficulty: this.state.difficultyTier * 20, // Convert tier to percentage
          tierLevel: this.state.difficultyTier,
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
        tier: this.state.difficultyTier
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
  private generateQuizModeForTier(tier: number, streak: number): 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank' {
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