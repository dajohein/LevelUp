/**
 * Quick Dash Challenge Service - AI Enhanced
 * 
 * Implements time-pressured learning with speed optimization and AI assistance
 * for cognitive load management under time constraints.
 */

import { Word, getWordsForLanguage } from './wordService';
import { WordProgress } from '../store/types';
import { calculateMasteryDecay } from './masteryService';
import { 
  challengeAIIntegrator, 
  ChallengeAIContext
} from './challengeAIIntegrator';
import { logger } from './logger';
import { userLearningProfileStorage } from './storage/userLearningProfile';

interface QuickDashState {
  languageCode: string;
  targetWords: number;
  timeLimit: number; // seconds
  currentWordIndex: number;
  startTime: number;
  wordTimers: number[]; // time spent on each word
  pressurePoints: Array<{ timeRemaining: number; accuracy: number }>;
  aiEnhancementsEnabled: boolean;
  allWords: Word[];
  usedWordIds: Set<string>;
  speedOptimizations: string[];
}

interface QuickDashResult {
  word: Word;
  options: string[];
  quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';
  aiEnhanced: boolean;
  timeAllocated: number; // seconds allocated for this word
  speedHints?: string[];
  reasoning?: string[];
}

class QuickDashService {
  private state: QuickDashState | null = null;

  /**
   * Initialize Quick Dash challenge
   */
  async initializeQuickDash(
    languageCode: string, 
    wordProgress: { [key: string]: WordProgress },
    targetWords: number = 8,
    timeLimit: number = 300, // 5 minutes
    allWords?: Word[] // Optional pre-filtered words (e.g., module-specific)
  ): Promise<void> {
    // Use provided words or get all words for language
    const wordsToUse = allWords || getWordsForLanguage(languageCode);
    
    if (!wordsToUse || wordsToUse.length === 0) {
      logger.error('No words available for Quick Dash challenge');
      throw new Error('No words available for Quick Dash challenge');
    }

    // Filter and sort words for quick learning (familiar but not mastered)
    const quickDashWords = this.selectQuickDashWords(wordsToUse, wordProgress);
    
    if (quickDashWords.length < targetWords) {
      logger.warn('Insufficient words for Quick Dash, padding with random words', {
        available: quickDashWords.length,
        required: targetWords
      });
    }

    this.state = {
      languageCode,
      targetWords,
      timeLimit,
      currentWordIndex: 0,
      startTime: Date.now(),
      wordTimers: [],
      pressurePoints: [],
      allWords: quickDashWords,
      usedWordIds: new Set(),
      aiEnhancementsEnabled: challengeAIIntegrator.isAIAvailable(),
      speedOptimizations: []
    };

    logger.debug(`⚡ Quick Dash initialized with ${quickDashWords.length} words for ${timeLimit}s`);
  }

  /**
   * Get next word with AI-enhanced time optimization
   */
  async getNextQuickDashWord(
    currentProgress: number,
    wordProgress: { [key: string]: WordProgress },
    timeRemaining: number
  ): Promise<QuickDashResult> {
    if (!this.state) {
      logger.error('Quick Dash not initialized');
      throw new Error('Quick Dash must be initialized first');
    }

    const { allWords, aiEnhancementsEnabled, usedWordIds, targetWords } = this.state;

    // Calculate time pressure and select appropriate word
    const timePressure = this.calculateTimePressure(timeRemaining);
    const candidates = allWords.filter(word => !usedWordIds.has(word.id));
    
    if (candidates.length === 0) {
      logger.error('No more words available for Quick Dash');
      throw new Error('No words available for Quick Dash');
    }

    let selectedWord: Word;
    let quizMode: QuickDashResult['quizMode'];
    let aiEnhanced = false;
    let speedHints: string[] = [];
    let reasoning: string[] = [];
    let timeAllocated: number;

    // Basic word selection first
    // Basic word selection first - just pick the first candidate for now
    selectedWord = candidates[0];
    quizMode = this.getSpeedOptimizedQuizMode(selectedWord, timePressure);

    // AI-enhanced word selection for time optimization
    if (aiEnhancementsEnabled && timePressure > 0.3) {
      const aiContext: ChallengeAIContext = {
        sessionType: 'quick-dash',
        currentProgress: {
          wordsCompleted: currentProgress,
          accuracy: this.calculateCurrentAccuracy(wordProgress),
          targetWords: targetWords,
          timeElapsed: (Date.now() - this.state.startTime) / 1000,
          consecutiveCorrect: 0,
          consecutiveIncorrect: 0,
          recentAccuracy: this.calculateCurrentAccuracy(wordProgress),
          sessionDuration: (Date.now() - this.state.startTime) / 1000
        },
        userState: {
          recentPerformance: []
        },
        challengeContext: {
          currentDifficulty: 50,
          timePressure: timePressure,
          speedFocus: true,
          remainingTime: timeRemaining,
          isEarlyPhase: currentProgress < 3,
          isFinalPhase: timeRemaining < 60 // Final minute
        }
      };

      try {
        const aiResult = await challengeAIIntegrator.enhanceWordSelection(
          selectedWord,
          quizMode,
          aiContext,
          wordProgress
        );

        if (aiResult.interventionNeeded) {
          selectedWord = aiResult.selectedWord;
          if (aiResult.aiRecommendedMode && ['multiple-choice', 'letter-scramble', 'open-answer', 'fill-in-the-blank'].includes(aiResult.aiRecommendedMode as any)) {
            quizMode = aiResult.aiRecommendedMode as QuickDashResult['quizMode'];
          }
          aiEnhanced = true;
          speedHints = this.generateSpeedHints(selectedWord, quizMode, timePressure);
          reasoning = aiResult.reasoning || [];
          
          // Record speed optimization patterns
          this.state.speedOptimizations.push(`time-pressure-${timePressure > 0.7 ? 'high' : 'moderate'}`);
        } else {
          selectedWord = candidates[Math.floor(Math.random() * candidates.length)];
          quizMode = this.getSpeedOptimizedQuizMode(selectedWord, timePressure);
        }
      } catch (error) {
        logger.warn('AI enhancement failed for Quick Dash, using fallback', { error });
        selectedWord = candidates[Math.floor(Math.random() * candidates.length)];
        quizMode = this.getSpeedOptimizedQuizMode(selectedWord, timePressure);
      }
    } else {
      selectedWord = candidates[Math.floor(Math.random() * candidates.length)];
      quizMode = this.getSpeedOptimizedQuizMode(selectedWord, timePressure);
    }

    // Calculate optimal time allocation for this word
    timeAllocated = this.calculateTimeAllocation(timeRemaining, targetWords - currentProgress);

    // Track word usage
    usedWordIds.add(selectedWord.id);
    
    // Generate options based on quiz mode
    const options = this.generateOptions(selectedWord, quizMode);

    // Record pressure point
    const currentAccuracy = this.calculateCurrentAccuracy(wordProgress);
    this.state.pressurePoints.push({
      timeRemaining,
      accuracy: currentAccuracy
    });

    logger.debug(`⚡ Quick Dash word selected: ${selectedWord.term} (${quizMode}, AI: ${aiEnhanced}, Time: ${timeAllocated}s)`);

    return {
      word: selectedWord,
      options,
      quizMode,
      aiEnhanced,
      timeAllocated,
      speedHints: speedHints.length > 0 ? speedHints : undefined,
      reasoning: reasoning.length > 0 ? reasoning : undefined
    };
  }

  /**
   * Record Quick Dash word completion
   */
  recordWordCompletion(wordId: string, correct: boolean, timeSpent: number): void {
    if (!this.state) return;

    this.state.wordTimers.push(timeSpent);
    this.state.currentWordIndex++;

    logger.debug(`Quick Dash word completed: ${wordId}, correct: ${correct}, time: ${timeSpent}s`);
  }

  /**
   * Save Quick Dash session performance
   */
  async saveQuickDashPerformance(
    userId: string,
    sessionData: {
      completed: boolean;
      score: number;
      totalTime: number;
      accuracy: number;
      wasAIEnhanced: boolean;
      wordsCompleted: number;
    }
  ): Promise<void> {
    if (!this.state) {
      logger.warn('Cannot save Quick Dash performance - no active session');
      return;
    }

    try {
      const avgTimePerWord = this.state.wordTimers.length > 0 ? 
        this.state.wordTimers.reduce((sum, time) => sum + time, 0) / this.state.wordTimers.length : 0;

      await userLearningProfileStorage.updateQuickDashData(userId, {
        completed: sessionData.completed,
        score: sessionData.score,
        timePerWord: avgTimePerWord,
        totalTime: sessionData.totalTime,
        accuracy: sessionData.accuracy,
        wasAIEnhanced: sessionData.wasAIEnhanced,
        pressurePoints: this.state.pressurePoints,
        timeOptimizations: this.state.speedOptimizations
      });
      
      logger.info('Quick Dash performance saved', {
        userId,
        score: sessionData.score,
        completed: sessionData.completed,
        wasAIEnhanced: sessionData.wasAIEnhanced
      });
    } catch (error) {
      logger.error('Failed to save Quick Dash performance', { userId, error });
    }
  }

  /**
   * Select words optimized for speed learning
   */
  private selectQuickDashWords(allWords: Word[], wordProgress: { [key: string]: WordProgress }): Word[] {
    return allWords
      .map(word => ({
        word,
        speedScore: this.calculateSpeedScore(word, wordProgress[word.id])
      }))
      .sort((a, b) => b.speedScore - a.speedScore)
      .slice(0, 20) // Top 20 words for speed learning
      .map(item => item.word);
  }

  /**
   * Calculate speed learning suitability score
   */
  private calculateSpeedScore(word: Word, progress?: WordProgress): number {
    let score = 50; // Base score

    if (progress) {
      // Favor words with some familiarity but room for improvement
      const mastery = progress.xp || 0;
      if (mastery > 0.3 && mastery < 0.8) {
        score += 30; // Sweet spot for speed learning
      } else if (mastery >= 0.8) {
        score += 10; // Good for confidence building
      } else {
        score -= 20; // Too unfamiliar for speed mode
      }

      // Favor words with recent activity (faster recall)
      const daysSinceLastSeen = progress.lastPracticed ?
        (Date.now() - new Date(progress.lastPracticed).getTime()) / (1000 * 60 * 60 * 24) : 30;
      if (daysSinceLastSeen < 3) {
        score += 20;
      } else if (daysSinceLastSeen < 7) {
        score += 10;
      }

      // Apply mastery decay for realistic difficulty
      const decayedMastery = calculateMasteryDecay(progress.lastPracticed || '', progress.xp || 0);
      score += decayedMastery * 15;
    }

    // Favor shorter words for speed
    if (word.term.length <= 6) {
      score += 15;
    } else if (word.term.length <= 10) {
      score += 5;
    } else {
      score -= 10;
    }

    // Favor common words (if level rating available)
    if (word.level && word.level <= 3) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate time pressure level (0-1)
   */
  private calculateTimePressure(timeRemaining: number): number {
    if (!this.state) return 0;
    
    const timeRatio = timeRemaining / this.state.timeLimit;
    const progressRatio = this.state.currentWordIndex / this.state.targetWords;
    
    // Pressure increases when time is running out relative to progress
    if (progressRatio > timeRatio) {
      return Math.min(1, (progressRatio - timeRatio) * 2);
    }
    
    return Math.max(0, 1 - timeRatio);
  }

  /**
   * Get quiz mode optimized for speed
   */
  private getSpeedOptimizedQuizMode(_word: Word, timePressure: number): QuickDashResult['quizMode'] {
    // Under high time pressure, favor faster quiz modes
    if (timePressure > 0.7) {
      return Math.random() < 0.7 ? 'multiple-choice' : 'letter-scramble';
    }
    
    if (timePressure > 0.4) {
      const rand = Math.random();
      if (rand < 0.5) return 'multiple-choice';
      if (rand < 0.8) return 'letter-scramble';
      return 'fill-in-the-blank';
    }
    
    // Low pressure allows all modes
    const rand = Math.random();
    if (rand < 0.3) return 'multiple-choice';
    if (rand < 0.6) return 'letter-scramble';
    if (rand < 0.8) return 'fill-in-the-blank';
    return 'open-answer';
  }

  /**
   * Generate speed hints for time optimization
   */
  private generateSpeedHints(word: Word, quizMode: string, timePressure: number): string[] {
    const hints: string[] = [];
    
    if (timePressure > 0.6) {
      hints.push('Focus on first impression - trust your instinct');
    }
    
    if (quizMode === 'multiple-choice') {
      hints.push('Eliminate obviously wrong answers first');
    }
    
    if (quizMode === 'letter-scramble') {
      hints.push('Look for familiar letter patterns');
    }
    
    if (word.term.length > 8) {
      hints.push('Break long words into smaller parts');
    }
    
    return hints;
  }

  /**
   * Calculate optimal time allocation per word
   */
  private calculateTimeAllocation(timeRemaining: number, wordsRemaining: number): number {
    if (wordsRemaining <= 0) return timeRemaining;
    
    const baseTime = timeRemaining / wordsRemaining;
    const minTime = 10; // Minimum 10 seconds per word
    const maxTime = 45; // Maximum 45 seconds per word
    
    return Math.max(minTime, Math.min(maxTime, baseTime));
  }

  /**
   * Calculate current accuracy
   */
  private calculateCurrentAccuracy(_wordProgress: { [key: string]: WordProgress }): number {
    if (!this.state || this.state.currentWordIndex === 0) return 1.0;
    
    // This would typically be calculated from the actual session results
    // For now, return a reasonable estimate
    return 0.85; // 85% default accuracy
  }

  /**
   * Generate quiz options with speed-optimized distractors
   */
  private generateOptions(word: Word, quizMode: QuickDashResult['quizMode']): string[] {
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
   * Generate multiple choice options optimized for speed
   */
  private generateMultipleChoiceOptions(word: Word): string[] {
    // For definition-to-term direction (Dutch question → German answer)
    // The correct answer should be the German term, not the Dutch definition
    const correctAnswer = word.term;
    
    // For speed optimization, use a cached approach if possible
    // Otherwise generate from a reasonable pool
    const allWords = this.state?.allWords || [];
    
    // Quick generation for speed - prefer shorter, clear distractors
    // For Dutch→German direction, use other German terms as distractors
    const wrongAnswers = allWords
      .filter(w => w.id !== word.id)
      .map(w => w.term)
      .filter(term => term !== correctAnswer)
      .filter(term => term.length < correctAnswer.length + 20) // Similar length for speed
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    // Fallback if not enough words available
    while (wrongAnswers.length < 3) {
      const fallbacks = [
        'das Andere',
        'die Alternative', 
        'der Begriff'
      ];
      
      for (const fallback of fallbacks) {
        if (!wrongAnswers.includes(fallback) && wrongAnswers.length < 3) {
          wrongAnswers.push(fallback);
        }
      }
      break;
    }

    const options = [correctAnswer, ...wrongAnswers.slice(0, 3)];
    return options.sort(() => 0.5 - Math.random()); // Quick shuffle
  }

  /**
   * Generate letter scramble options for speed learning
   */
  private generateLetterScrambleOptions(word: Word): string[] {
    const correctTerm = word.term;
    const options = [correctTerm];
    
    // For speed mode, create easily distinguishable scrambles
    for (let i = 0; i < 3; i++) {
      let scrambled = this.quickScrambleWord(correctTerm, i + 1);
      // Ensure we don't duplicate the correct answer
      while (options.includes(scrambled) || scrambled === correctTerm) {
        scrambled = this.quickScrambleWord(correctTerm, Math.random() * 3 + 1);
      }
      options.push(scrambled);
    }
    
    return options.sort(() => 0.5 - Math.random());
  }

  /**
   * Generate fill-in-the-blank options for speed learning
   */
  private generateFillInTheBlankOptions(word: Word): string[] {
    const correctTerm = word.term;
    const allWords = this.state?.allWords || [];
    
    // For speed mode, prefer clearly different options
    const wrongTerms = allWords
      .filter(w => w.id !== word.id)
      .map(w => w.term)
      .filter(term => term !== correctTerm)
      .filter(term => Math.abs(term.length - correctTerm.length) <= 3) // Speed-friendly length
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    
    // Speed-optimized fallbacks
    while (wrongTerms.length < 3) {
      const fallbacks = ['alternative', 'different', 'other'];
      for (const fallback of fallbacks) {
        if (!wrongTerms.includes(fallback) && wrongTerms.length < 3) {
          wrongTerms.push(fallback);
        }
      }
      break;
    }
    
    const options = [correctTerm, ...wrongTerms.slice(0, 3)];
    return options.sort(() => 0.5 - Math.random());
  }

  /**
   * Quick scramble method optimized for speed recognition
   */
  private quickScrambleWord(word: string, level: number): string {
    const chars = word.split('');
    
    // Simple but effective scrambling for speed mode
    switch (Math.floor(level) % 3) {
      case 0:
        // Reverse order
        return chars.reverse().join('');
      
      case 1:
        // Swap first and last characters
        if (chars.length > 1) {
          [chars[0], chars[chars.length - 1]] = [chars[chars.length - 1], chars[0]];
        }
        return chars.join('');
      
      case 2:
      default:
        // Random shuffle but keep first letter (easier for speed recognition)
        const firstChar = chars[0];
        const remaining = chars.slice(1);
        for (let i = remaining.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
        }
        return firstChar + remaining.join('');
    }
  }

  /**
   * Reset Quick Dash session
   */
  reset(): void {
    this.state = null;
    logger.debug('Quick Dash session reset');
  }

  /**
   * Get current session state
   */
  getSessionState(): QuickDashState | null {
    return this.state;
  }
}

// Export singleton instance
export const quickDashService = new QuickDashService();