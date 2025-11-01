/**
 * Quick Dash Challenge Service - AI Enhanced
 * 
 * Implements time-pressured learning with speed optimization and AI assistance
 * for cognitive load management under time constraints.
 */

import { Word, getWordsForLanguage } from './wordService';
import { WordProgress } from '../store/types';
import { 
  challengeAIIntegrator, 
  ChallengeAIContext
} from './challengeAIIntegrator';
import { logger } from './logger';
import { userLearningProfileStorage } from './storage/userLearningProfile';
import { selectWordForChallenge } from './wordSelectionManager';

interface QuickDashState {
  languageCode: string;
  targetWords: number;
  timeLimit: number; // seconds
  sessionId: string;
  currentWordIndex: number;
  startTime: number;
  wordTimers: number[]; // time spent on each word
  pressurePoints: Array<{ timeRemaining: number; accuracy: number }>;
  aiEnhancementsEnabled: boolean;
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
    _wordProgress?: { [key: string]: WordProgress }, // Unused - centralized word selection handles this
    targetWords: number = 8,
    timeLimit: number = 300, // 5 minutes
    _allWords?: Word[] // Unused - centralized word selection handles this
  ): Promise<void> {
    // Generate unique session ID for this quick dash challenge
    const sessionId = `quick-dash-${Date.now()}`;

    this.state = {
      languageCode,
      targetWords,
      timeLimit,
      sessionId,
      currentWordIndex: 0,
      startTime: Date.now(),
      wordTimers: [],
      pressurePoints: [],
      aiEnhancementsEnabled: challengeAIIntegrator.isAIAvailable(),
      speedOptimizations: []
    };

    logger.debug(`⚡ Quick Dash initialized with session ID: ${sessionId}, target: ${targetWords} words in ${timeLimit}s`);
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

    const { aiEnhancementsEnabled, targetWords } = this.state;

    // Calculate time pressure
    const timePressure = this.calculateTimePressure(timeRemaining);
    
    // Determine difficulty based on time pressure and progress
    let difficulty: 'easy' | 'medium' | 'hard';
    if (timePressure > 0.7 || timeRemaining < 60) {
      difficulty = 'easy'; // High time pressure = easier words
    } else if (timePressure > 0.4) {
      difficulty = 'medium';
    } else {
      difficulty = 'hard'; // Low time pressure = can handle harder words
    }

    // Use centralized word selection
    const selectionResult = selectWordForChallenge(
      this.state.languageCode,
      wordProgress,
      this.state.sessionId,
      difficulty
    );

    if (!selectionResult) {
      logger.error('No more words available for Quick Dash');
      throw new Error('No words available for Quick Dash');
    }

    const selectedWord = selectionResult.word;
    let quizMode = this.getSpeedOptimizedQuizMode(selectedWord, timePressure);
    let aiEnhanced = false;
    let speedHints: string[] = [];
    let reasoning: string[] = [];

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
          if (aiResult.aiRecommendedMode && ['multiple-choice', 'letter-scramble', 'open-answer', 'fill-in-the-blank'].includes(aiResult.aiRecommendedMode as any)) {
            quizMode = aiResult.aiRecommendedMode as QuickDashResult['quizMode'];
          }
          aiEnhanced = true;
          speedHints = this.generateSpeedHints(selectedWord, quizMode, timePressure);
          reasoning = aiResult.reasoning || [];
          
          // Record speed optimization patterns
          this.state.speedOptimizations.push(`time-pressure-${timePressure > 0.7 ? 'high' : 'moderate'}`);
        }
      } catch (error) {
        logger.warn('AI enhancement failed for Quick Dash, using fallback', { error });
      }
    }

    // Calculate optimal time allocation for this word
    const timeAllocated = this.calculateTimeAllocation(timeRemaining, targetWords - currentProgress);
    
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
   * Get quiz mode optimized for speed and user mastery level
   */
  private getSpeedOptimizedQuizMode(word: Word, timePressure: number): QuickDashResult['quizMode'] {
    // Get the word's mastery level to inform quiz mode selection
    const wordMastery = (word as any).currentMastery || 0; // Should be set by word selection logic
    
    // For very low mastery (new words), prioritize multiple-choice even under time pressure
    if (wordMastery < 20) {
      return 'multiple-choice';
    }
    
    // For low mastery, prefer simpler modes but allow some variety
    if (wordMastery < 40) {
      if (timePressure > 0.7) {
        return 'multiple-choice';
      }
      return Math.random() < 0.7 ? 'multiple-choice' : 'letter-scramble';
    }
    
    // For medium mastery, balance speed with challenge
    if (wordMastery < 70) {
      if (timePressure > 0.7) {
        return Math.random() < 0.6 ? 'multiple-choice' : 'letter-scramble';
      }
      if (timePressure > 0.4) {
        const rand = Math.random();
        if (rand < 0.4) return 'multiple-choice';
        if (rand < 0.7) return 'letter-scramble';
        return word.context ? 'fill-in-the-blank' : 'letter-scramble';
      }
      // Low pressure - allow more variety
      const rand = Math.random();
      if (rand < 0.3) return 'multiple-choice';
      if (rand < 0.6) return 'letter-scramble';
      if (rand < 0.8 && word.context) return 'fill-in-the-blank';
      return 'open-answer';
    }
    
    // For high mastery, challenge with harder modes but respect time pressure
    if (timePressure > 0.7) {
      return Math.random() < 0.4 ? 'multiple-choice' : 'letter-scramble';
    }
    if (timePressure > 0.4) {
      const rand = Math.random();
      if (rand < 0.3) return 'multiple-choice';
      if (rand < 0.5) return 'letter-scramble';
      if (rand < 0.7 && word.context) return 'fill-in-the-blank';
      return 'open-answer';
    }
    
    // Low pressure with high mastery - prefer challenging modes
    const rand = Math.random();
    if (rand < 0.2) return 'multiple-choice';
    if (rand < 0.4) return 'letter-scramble';
    if (rand < 0.7 && word.context) return 'fill-in-the-blank';
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
    
    // Use imported function from top-level import
    const allWords = getWordsForLanguage(this.state?.languageCode || 'de');
    
    // Quick generation for speed - prefer shorter, clear distractors
    // For Dutch→German direction, use other German terms as distractors
    const wrongAnswers = allWords
      .filter((w: Word) => w.id !== word.id)
      .map((w: Word) => w.term)
      .filter((term: string) => term !== correctAnswer)
      .filter((term: string) => term.length < correctAnswer.length + 20) // Similar length for speed
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

    console.log(`🔍 Quick Dash Debug: Word "${word.term}", collected ${wrongAnswers.length} wrong answers: [${wrongAnswers.join(', ')}]`);

    const options = [correctAnswer, ...wrongAnswers.slice(0, 3)];
    
    console.log(`🎯 Quick Dash Generated options for "${word.term}": [${options.join(', ')}] (${options.length} total)`);
    
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
    
    // Import here to avoid circular dependency
    const { getWordsForLanguage } = require('./wordService');
    const allWords = getWordsForLanguage(this.state?.languageCode || 'de');
    
    // For speed mode, prefer clearly different options
    const wrongTerms = allWords
      .filter((w: Word) => w.id !== word.id)
      .map((w: Word) => w.term)
      .filter((term: string) => term !== correctTerm)
      .filter((term: string) => Math.abs(term.length - correctTerm.length) <= 3) // Speed-friendly length
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