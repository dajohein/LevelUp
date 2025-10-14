/**
 * Boss Battle Service
 * 
 * Implements challenging word selection for boss battles.
 * Selects the hardest, most challenging words from the entire language pool
 * with mixed difficulty levels and varied quiz modes for the ultimate test.
 */

import { Word, getWordsForLanguage } from './wordService';
import { WordProgress } from '../store/types';
import { calculateMasteryDecay } from './masteryService';
import { logger } from './logger';

interface BossBattleState {
  languageCode: string;
  wordsCompleted: number;
  targetWords: number;
  usedWordIds: Set<string>;
  challengeWords: Word[];
  difficultyProgression: number[];
}

class BossBattleService {
  private state: BossBattleState | null = null;

  /**
   * Initialize a new boss battle session
   */
  initializeBossBattle(
    languageCode: string, 
    wordProgress: { [key: string]: WordProgress },
    targetWords: number = 25
  ): void {
    const allWords = getWordsForLanguage(languageCode);
    
    if (!allWords || allWords.length === 0) {
      logger.error('No words available for boss battle');
      return;
    }

    // Create challenge word pool with strategic difficulty distribution
    const challengeWords = this.createBossWordPool(allWords, wordProgress);
    
    // Create difficulty progression (gets harder towards the end)
    const difficultyProgression = this.createDifficultyProgression(targetWords);

    this.state = {
      languageCode,
      wordsCompleted: 0,
      targetWords,
      usedWordIds: new Set(),
      challengeWords,
      difficultyProgression,
    };

    logger.debug(`⚔️ Boss battle initialized with ${challengeWords.length} challenge words for ${targetWords} rounds`);
  }

  /**
   * Get the next word for the boss battle based on current progression
   */
  getNextBossWord(
    wordsCompleted: number,
    wordProgress: { [key: string]: WordProgress }
  ): {
    word: Word | null;
    options: string[];
    quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';
  } {
    if (!this.state) {
      logger.error('Boss battle not initialized');
      return { word: null, options: [], quizMode: 'multiple-choice' };
    }

    this.state.wordsCompleted = wordsCompleted;

    // Determine current difficulty level (0-100 scale)
    const progressPercentage = wordsCompleted / this.state.targetWords;
    const currentDifficultyLevel = this.state.difficultyProgression[Math.min(wordsCompleted, this.state.difficultyProgression.length - 1)];
    
    // Special handling for final boss word
    const isFinalBoss = wordsCompleted >= this.state.targetWords - 1;
    
    logger.debug(`⚔️ Boss battle word ${wordsCompleted + 1}/${this.state.targetWords}, difficulty: ${currentDifficultyLevel}${isFinalBoss ? ' (FINAL BOSS!)' : ''}`);

    // Select appropriate word based on difficulty level
    const selectedWord = isFinalBoss 
      ? this.selectFinalBossWord(wordProgress)
      : this.selectWordForDifficulty(currentDifficultyLevel, wordProgress);
    
    if (!selectedWord) {
      logger.error('No words available for boss battle at this difficulty');
      return { word: null, options: [], quizMode: 'multiple-choice' };
    }

    return this.generateBossQuiz(selectedWord, currentDifficultyLevel, isFinalBoss);
  }

  /**
   * Create a curated pool of challenging words for the boss battle
   */
  private createBossWordPool(words: Word[], wordProgress: { [key: string]: WordProgress }): Word[] {
    // Score each word by difficulty/challenge level
    const scoredWords = words.map(word => ({
      word,
      challengeScore: this.calculateChallengeScore(word, wordProgress[word.id])
    }));

    // Sort by challenge score (highest first) and return words
    return scoredWords
      .sort((a, b) => b.challengeScore - a.challengeScore)
      .map(item => item.word);
  }

  /**
   * Calculate how challenging a word is (higher = more challenging)
   */
  private calculateChallengeScore(word: Word, progress?: WordProgress): number {
    let score = 50; // Base challenge score

    if (!progress) {
      // Unknown words are moderately challenging
      return score + 20; // 70 total
    }

    const mastery = calculateMasteryDecay(progress.lastPracticed || '', progress.xp || 0);
    const accuracy = progress.timesCorrect / Math.max(1, progress.timesCorrect + progress.timesIncorrect);
    const practiceCount = (progress.timesCorrect || 0) + (progress.timesIncorrect || 0);

    // Lower mastery = more challenging
    score += Math.max(0, 80 - mastery);

    // Lower accuracy = more challenging
    score += Math.max(0, (1 - accuracy) * 40);

    // Words with some practice but low success are most challenging
    if (practiceCount > 0 && practiceCount < 10) {
      score += 30; // Sweet spot for challenging words
    }

    // Very long words are more challenging
    if (word.term.length > 10) {
      score += 15;
    }

    // Words with complex context (if available) are more challenging
    if (word.context && typeof word.context === 'object' && word.context.sentence) {
      score += 10;
    }

    return Math.min(100, score); // Cap at 100
  }

  /**
   * Create difficulty progression curve for the boss battle
   */
  private createDifficultyProgression(targetWords: number): number[] {
    const progression: number[] = [];
    
    for (let i = 0; i < targetWords; i++) {
      const progressPercentage = i / (targetWords - 1);
      
      // Difficulty curve: starts at 40%, ramps up to 95%
      // Early: 40-60% (warmup with moderately hard words)
      // Middle: 60-80% (steady increase)  
      // End: 80-95% (brutal finale)
      let difficulty: number;
      
      if (progressPercentage < 0.3) {
        // Early phase: 40-60%
        difficulty = 40 + (progressPercentage / 0.3) * 20;
      } else if (progressPercentage < 0.7) {
        // Middle phase: 60-80%
        const middleProgress = (progressPercentage - 0.3) / 0.4;
        difficulty = 60 + middleProgress * 20;
      } else {
        // Final phase: 80-95%
        const finalProgress = (progressPercentage - 0.7) / 0.3;
        difficulty = 80 + finalProgress * 15;
      }
      
      progression.push(Math.round(difficulty));
    }
    
    return progression;
  }

  /**
   * Select a word based on difficulty level (0-100)
   */
  private selectWordForDifficulty(difficultyLevel: number, wordProgress: { [key: string]: WordProgress }): Word | null {
    if (!this.state) return null;

    // Calculate word pool range based on difficulty level
    const totalWords = this.state.challengeWords.length;
    const poolSize = Math.max(10, Math.floor(totalWords * 0.3)); // Use top 30% as selection pool
    const startIndex = Math.max(0, Math.floor((difficultyLevel / 100) * (totalWords - poolSize)));
    const endIndex = Math.min(totalWords, startIndex + poolSize);

    // Get candidate words in difficulty range that haven't been used
    const candidateWords = this.state.challengeWords
      .slice(startIndex, endIndex)
      .filter(word => !this.state!.usedWordIds.has(word.id));

    if (candidateWords.length === 0) {
      // If no unused words at this difficulty, expand the search
      const allUnused = this.state.challengeWords.filter(word => !this.state!.usedWordIds.has(word.id));
      if (allUnused.length === 0) {
        // Last resort: reuse words but prefer harder ones
        return this.state.challengeWords[0];
      }
      return allUnused[0];
    }

    // Select the most challenging word from candidates
    const selectedWord = candidateWords.reduce((hardest, word) => {
      const hardestScore = this.calculateChallengeScore(hardest, wordProgress[hardest.id]);
      const wordScore = this.calculateChallengeScore(word, wordProgress[word.id]);
      return wordScore > hardestScore ? word : hardest;
    });

    // Mark as used
    this.state.usedWordIds.add(selectedWord.id);
    
    return selectedWord;
  }

  /**
   * Select the ultimate final boss word
   */
  private selectFinalBossWord(wordProgress: { [key: string]: WordProgress }): Word | null {
    if (!this.state) return null;

    // For final boss, select the absolute hardest word available
    const unusedWords = this.state.challengeWords.filter(word => !this.state!.usedWordIds.has(word.id));
    const wordPool = unusedWords.length > 0 ? unusedWords : this.state.challengeWords;

    // Find the most challenging word
    const finalBossWord = wordPool.reduce((hardest, word) => {
      const hardestScore = this.calculateChallengeScore(hardest, wordProgress[hardest.id]);
      const wordScore = this.calculateChallengeScore(word, wordProgress[word.id]);
      return wordScore > hardestScore ? word : hardest;
    });

    this.state.usedWordIds.add(finalBossWord.id);
    
    logger.debug(`⚔️ FINAL BOSS WORD SELECTED: ${finalBossWord.term} (challenge score: ${this.calculateChallengeScore(finalBossWord, wordProgress[finalBossWord.id])})`);
    
    return finalBossWord;
  }

  /**
   * Generate quiz format for boss word
   */
  private generateBossQuiz(
    word: Word, 
    difficultyLevel: number, 
    isFinalBoss: boolean
  ): {
    word: Word;
    options: string[];
    quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';
  } {
    // Quiz mode selection based on difficulty and boss progression
    let quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';
    
    if (isFinalBoss) {
      // Final boss: hardest modes only
      quizMode = Math.random() < 0.6 ? 'open-answer' : 'fill-in-the-blank';
    } else if (difficultyLevel >= 80) {
      // High difficulty: challenging modes
      const rand = Math.random();
      if (rand < 0.2) quizMode = 'multiple-choice';
      else if (rand < 0.4) quizMode = 'letter-scramble';
      else if (rand < 0.7) quizMode = 'open-answer';
      else quizMode = 'fill-in-the-blank';
    } else if (difficultyLevel >= 60) {
      // Medium-high difficulty: mixed modes
      const rand = Math.random();
      if (rand < 0.3) quizMode = 'multiple-choice';
      else if (rand < 0.6) quizMode = 'letter-scramble';
      else quizMode = 'open-answer';
    } else {
      // Lower difficulty: easier modes to start
      quizMode = Math.random() < 0.5 ? 'multiple-choice' : 'letter-scramble';
    }

    // Generate options for multiple choice
    const options = this.generateBossOptions(word, quizMode);

    return { word, options, quizMode };
  }

  /**
   * Generate challenging multiple choice options
   */
  private generateBossOptions(word: Word, quizMode: string): string[] {
    if (quizMode !== 'multiple-choice') return [];
    
    if (!this.state) return [];

    const correctAnswer = word.direction === 'definition-to-term' ? word.term : word.definition;
    
    // For boss battles, create more challenging distractors
    const wrongAnswers = this.state.challengeWords
      .filter(w => w.id !== word.id)
      .map(w => word.direction === 'definition-to-term' ? w.term : w.definition)
      .filter(answer => answer !== correctAnswer)
      // Prefer longer, more complex wrong answers for boss battles
      .sort((a, b) => b.length - a.length)
      .slice(0, 5) // Get more options to choose from
      .sort(() => 0.5 - Math.random()) // Shuffle
      .slice(0, 3); // Take 3 best distractors

    const options = [correctAnswer, ...wrongAnswers];
    return options.sort(() => 0.5 - Math.random()); // Shuffle final options
  }

  /**
   * Reset the boss battle
   */
  resetBossBattle(): void {
    if (this.state) {
      this.state.wordsCompleted = 0;
      this.state.usedWordIds.clear();
    }
  }

  /**
   * Get current boss battle statistics
   */
  getBossBattleStats() {
    if (!this.state) return null;
    
    const currentDifficulty = this.state.difficultyProgression[Math.min(this.state.wordsCompleted, this.state.difficultyProgression.length - 1)];
    
    return {
      wordsCompleted: this.state.wordsCompleted,
      targetWords: this.state.targetWords,
      currentDifficulty,
      wordsUsed: this.state.usedWordIds.size,
      totalChallengeWords: this.state.challengeWords.length,
      progressPercentage: (this.state.wordsCompleted / this.state.targetWords) * 100,
    };
  }
}

// Export singleton instance
export const bossBattleService = new BossBattleService();