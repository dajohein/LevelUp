/**
 * Streak Challenge Service
 * 
 * Implements progressive difficulty word selection for streak challenges.
 * Words get progressively harder as the streak increases, ensuring a challenging
 * and engaging experience that tests the user's knowledge limits.
 */

import { Word, getWordsForLanguage } from './wordService';
import { WordProgress } from '../store/types';
import { calculateMasteryDecay } from './masteryService';
import { logger } from './logger';

interface StreakChallengeState {
  languageCode: string;
  currentStreak: number;
  usedWordIds: Set<string>;
  difficultyTier: number;
  availableWords: Word[];
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
    };

    logger.debug(`🔥 Streak challenge initialized with ${allWords.length} words`);
  }

  /**
   * Get the next word for the streak challenge based on current difficulty
   */
  getNextStreakWord(
    currentStreak: number,
    wordProgress: { [key: string]: WordProgress }
  ): {
    word: Word | null;
    options: string[];
    quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';
  } {
    if (!this.state) {
      logger.error('Streak challenge not initialized');
      return { word: null, options: [], quizMode: 'multiple-choice' };
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
        return this.generateQuizForWord(higherTierWord, currentStreak);
      }
      
      // Last resort: reset used words and start over
      this.state.usedWordIds.clear();
      const resetWord = this.selectWordForTier(this.state.difficultyTier, wordProgress);
      if (resetWord) {
        return this.generateQuizForWord(resetWord, currentStreak);
      }
      
      logger.error('No words available for streak challenge');
      return { word: null, options: [], quizMode: 'multiple-choice' };
    }

    return this.generateQuizForWord(selectedWord, currentStreak);
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
    if (quizMode !== 'multiple-choice') return [];
    
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
    };
  }
}

// Export singleton instance
export const streakChallengeService = new StreakChallengeService();