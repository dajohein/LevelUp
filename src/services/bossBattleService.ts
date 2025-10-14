/**
 * Boss Battle Service - AI Enhanced
 * 
 * Implements challenging word selection for boss battles with intelligent
 * AI adaptations. Selects the hardest, most challenging words from the entire 
 * language pool with AI-driven quiz mode selection and cognitive load monitoring.
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

interface BossBattleState {
  languageCode: string;
  wordsCompleted: number;
  targetWords: number;
  usedWordIds: Set<string>;
  challengeWords: Word[];
  difficultyProgression: number[];
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
      // AI enhancement initialization
      sessionStartTime: Date.now(),
      performanceHistory: [],
      consecutiveCorrect: 0,
      consecutiveIncorrect: 0,
      aiEnhancementsEnabled: challengeAIIntegrator.isAIAvailable(),
    };

    logger.debug(`⚔️ Boss battle initialized with ${challengeWords.length} challenge words for ${targetWords} rounds`);
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

    // Determine current difficulty level (0-100 scale)
    const progressPercentage = wordsCompleted / this.state.targetWords;
    const currentDifficultyLevel = this.state.difficultyProgression[Math.min(wordsCompleted, this.state.difficultyProgression.length - 1)];
    
    // Special handling for final boss word
    const isFinalBoss = wordsCompleted >= this.state.targetWords - 1;
    const bossPhase = this.getBossPhase(progressPercentage, isFinalBoss);
    
    logger.debug(`⚔️ Boss battle word ${wordsCompleted + 1}/${this.state.targetWords}, difficulty: ${currentDifficultyLevel}${isFinalBoss ? ' (FINAL BOSS!)' : ''}`);

    // Select appropriate word based on difficulty level
    const selectedWord = isFinalBoss 
      ? this.selectFinalBossWord(wordProgress)
      : this.selectWordForDifficulty(currentDifficultyLevel, wordProgress);
    
    if (!selectedWord) {
      logger.error('No words available for boss battle at this difficulty');
      return { 
        word: null, 
        options: [], 
        quizMode: 'multiple-choice', 
        aiEnhanced: false,
        bossPhase
      };
    }

    return this.generateAIEnhancedBossQuiz(selectedWord, currentDifficultyLevel, isFinalBoss, wordProgress, bossPhase);
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
   * Generate challenging options for boss battles
   */
  private generateBossOptions(word: Word, quizMode: string): string[] {
    switch (quizMode) {
      case 'multiple-choice':
        return this.generateBossMultipleChoiceOptions(word);
      
      case 'letter-scramble':
        return this.generateBossLetterScrambleOptions(word);
      
      case 'open-answer':
        return []; // Open answer doesn't need options
      
      case 'fill-in-the-blank':
        return this.generateBossFillInTheBlankOptions(word);
      
      default:
        return [];
    }
  }

  /**
   * Generate challenging multiple choice options for boss battles
   */
  private generateBossMultipleChoiceOptions(word: Word): string[] {
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
   * Generate challenging letter scramble options for boss battles
   */
  private generateBossLetterScrambleOptions(word: Word): string[] {
    const correctAnswer = word.direction === 'definition-to-term' ? word.term : word.definition;
    const options = [correctAnswer];
    
    // For boss battles, create more deceptive scrambles
    for (let i = 0; i < 3; i++) {
      let scrambled = this.createBossScramble(correctAnswer, i + 1);
      // Ensure we don't duplicate the correct answer
      while (options.includes(scrambled) || scrambled === correctAnswer) {
        scrambled = this.createBossScramble(correctAnswer, Math.random() * 4 + 1);
      }
      options.push(scrambled);
    }
    
    return options.sort(() => 0.5 - Math.random());
  }

  /**
   * Generate challenging fill-in-the-blank options for boss battles
   */
  private generateBossFillInTheBlankOptions(word: Word): string[] {
    if (!this.state) return [];

    const correctAnswer = word.direction === 'definition-to-term' ? word.term : word.definition;
    
    // For boss battles, use more sophisticated distractors
    const wrongAnswers = this.state.challengeWords
      .filter(w => w.id !== word.id)
      .map(w => word.direction === 'definition-to-term' ? w.term : w.definition)
      .filter(answer => answer !== correctAnswer)
      .filter(answer => Math.abs(answer.length - correctAnswer.length) <= 3) // Similar length for challenging options
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    
    // Boss-level fallbacks if needed
    while (wrongAnswers.length < 3) {
      const bossFallbacks = ['challenging-alternative', 'complex-option', 'sophisticated-choice'];
      for (const fallback of bossFallbacks) {
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
   * Create challenging scrambles for boss battles
   */
  private createBossScramble(text: string, difficulty: number): string {
    const words = text.split(' ');
    
    if (words.length === 1) {
      // Single word - use advanced scrambling
      return this.scrambleBossWord(words[0], difficulty);
    } else {
      // Multiple words - scramble both order and letters
      const scrambledWords = words.map(word => this.scrambleBossWord(word, difficulty * 0.7));
      return scrambledWords.reverse().join(' '); // Reverse word order for extra challenge
    }
  }

  /**
   * Advanced word scrambling for boss battles
   */
  private scrambleBossWord(word: string, difficulty: number): string {
    if (word.length <= 2) return word; // Don't scramble very short words
    
    const chars = word.split('');
    const level = Math.floor(difficulty) % 4;
    
    switch (level) {
      case 0:
        // Reverse with middle swap
        chars.reverse();
        if (chars.length > 4) {
          const mid = Math.floor(chars.length / 2);
          [chars[mid - 1], chars[mid + 1]] = [chars[mid + 1], chars[mid - 1]];
        }
        break;
      
      case 1:
        // Split and reverse sections
        const firstHalf = chars.slice(0, Math.floor(chars.length / 2)).reverse();
        const secondHalf = chars.slice(Math.floor(chars.length / 2)).reverse();
        return firstHalf.concat(secondHalf).join('');
      
      case 2:
        // Advanced pattern scramble
        for (let i = 0; i < chars.length; i += 2) {
          if (i + 1 < chars.length) {
            [chars[i], chars[i + 1]] = [chars[i + 1], chars[i]];
          }
        }
        chars.reverse();
        break;
      
      case 3:
      default:
        // Full random scramble with strategic placement
        for (let i = chars.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [chars[i], chars[j]] = [chars[j], chars[i]];
        }
        break;
    }
    
    return chars.join('');
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
      aiEnhanced: this.state.aiEnhancementsEnabled,
      performanceHistory: this.state.performanceHistory.length,
    };
  }

  /**
   * Update performance history for AI analysis
   */
  private updateBossPerformanceHistory(
    result: { isCorrect: boolean; timeSpent: number; quizMode: string },
    wordsCompleted: number
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

    // Determine boss phase
    const progressPercentage = wordsCompleted / this.state.targetWords;
    const bossPhase = this.getBossPhase(progressPercentage, wordsCompleted >= this.state.targetWords - 1);

    // Add to performance history
    this.state.performanceHistory.push({
      isCorrect: result.isCorrect,
      timeSpent: result.timeSpent,
      quizMode: result.quizMode,
      difficulty: this.state.difficultyProgression[Math.min(wordsCompleted, this.state.difficultyProgression.length - 1)],
      bossPhase: bossPhase
    });

    // Keep only recent history (last 8 words for AI analysis)
    if (this.state.performanceHistory.length > 8) {
      this.state.performanceHistory = this.state.performanceHistory.slice(-8);
    }
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
   * Generate AI-enhanced boss quiz with intelligent adaptations
   */
  private async generateAIEnhancedBossQuiz(
    word: Word,
    difficultyLevel: number,
    isFinalBoss: boolean,
    wordProgress: { [key: string]: WordProgress },
    bossPhase: string
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

    // Calculate recent accuracy
    const recentPerformance = this.state.performanceHistory.slice(-4); // Last 4 words
    const recentAccuracy = recentPerformance.length > 0 
      ? recentPerformance.filter(p => p.isCorrect).length / recentPerformance.length 
      : 0.6; // Default assumption for boss battles

    // Generate baseline quiz mode based on difficulty and phase
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
          consecutiveCorrect: this.state.consecutiveCorrect,
          consecutiveIncorrect: this.state.consecutiveIncorrect,
          recentAccuracy: recentAccuracy,
          sessionDuration: Date.now() - this.state.sessionStartTime
        },
        userState: {
          recentPerformance: this.state.performanceHistory
        },
        challengeContext: {
          currentDifficulty: difficultyLevel,
          phaseProgress: this.state.wordsCompleted / this.state.targetWords,
          isEarlyPhase: bossPhase === 'early-boss',
          isFinalPhase: isFinalBoss
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
      const options = this.generateBossOptions(word, aiEnhancement.aiRecommendedMode || baselineQuizMode);

      logger.debug(`🤖 AI-enhanced boss word: ${word.term}`, {
        baseline: baselineQuizMode,
        aiMode: aiEnhancement.aiRecommendedMode,
        reasoning: aiEnhancement.reasoning,
        phase: bossPhase,
        difficulty: difficultyLevel,
        isFinalBoss
      });

      return {
        word,
        options,
        quizMode: aiEnhancement.aiRecommendedMode as any || baselineQuizMode,
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
        reasoning: ['AI enhancement failed - using baseline boss selection'],
        bossPhase
      };
    }
  }

  /**
   * Generate quiz mode for boss battles (baseline logic)
   */
  private generateBossQuizMode(
    difficultyLevel: number, 
    isFinalBoss: boolean
  ): 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank' {
    if (isFinalBoss) {
      // Final boss: hardest modes only
      return Math.random() < 0.6 ? 'open-answer' : 'fill-in-the-blank';
    } else if (difficultyLevel >= 80) {
      // High difficulty: challenging modes
      const rand = Math.random();
      if (rand < 0.2) return 'multiple-choice';
      else if (rand < 0.4) return 'letter-scramble';
      else if (rand < 0.7) return 'open-answer';
      else return 'fill-in-the-blank';
    } else if (difficultyLevel >= 60) {
      // Medium-high difficulty: mixed modes
      const rand = Math.random();
      if (rand < 0.3) return 'multiple-choice';
      else if (rand < 0.6) return 'letter-scramble';
      else return 'open-answer';
    } else {
      // Lower difficulty: easier modes to start
      return Math.random() < 0.5 ? 'multiple-choice' : 'letter-scramble';
    }
  }

  /**
   * Save boss battle session performance data
   */
  async saveBossPerformance(
    userId: string,
    sessionData: {
      wordsCompleted: number;
      completed: boolean;
      wasAIEnhanced: boolean;
      finalBossReached: boolean;
      finalBossDefeated: boolean;
      phasePerformance: { [phase: string]: { accuracy: number; avgTime: number; adaptations: number } };
      quizMode: string;
      cognitiveLoad: 'low' | 'moderate' | 'high' | 'overload';
    }
  ): Promise<void> {
    try {
      await userLearningProfileStorage.updateBossBattleData(userId, sessionData);
      
      logger.info('Boss battle performance saved', {
        userId,
        wordsCompleted: sessionData.wordsCompleted,
        completed: sessionData.completed,
        finalBossReached: sessionData.finalBossReached,
        wasAIEnhanced: sessionData.wasAIEnhanced
      });
    } catch (error) {
      logger.error('Failed to save boss battle performance', { userId, error });
    }
  }
}

// Export singleton instance
export const bossBattleService = new BossBattleService();