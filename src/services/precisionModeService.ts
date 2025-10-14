/**
 * Precision Mode Challenge Service - AI Enhanced
 * 
 * Implements zero-mistake learning with AI assistance for error prevention
 * and cognitive load management in high-stakes scenarios.
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

interface PrecisionModeState {
  languageCode: string;
  targetWords: number;
  currentWordIndex: number;
  errorCount: number;
  sessionFailed: boolean;
  startTime: number;
  wordTimings: Array<{ wordId: string; timeSpent: number; correct: boolean }>;
  aiEnhancementsEnabled: boolean;
  allWords: Word[];
  usedWordIds: Set<string>;
  errorPatterns: Array<{ wordNumber: number; errorType: string; timestamp: Date }>;
  recoveryStrategies: string[];
  currentStrategy: {
    pacing: number; // seconds per word
    quizMode: string;
    cognitiveLoadLevel: 'minimal' | 'low' | 'moderate';
  };
}

interface PrecisionModeResult {
  word: Word;
  options: string[];
  quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';
  aiEnhanced: boolean;
  confidenceBoost?: string[];
  errorPreventionHints?: string[];
  optimalPacing: number; // recommended time to spend
  reasoning?: string[];
}

class PrecisionModeService {
  private state: PrecisionModeState | null = null;

  /**
   * Initialize Precision Mode challenge
   */
  async initializePrecisionMode(
    languageCode: string, 
    wordProgress: { [key: string]: WordProgress },
    targetWords: number = 15
  ): Promise<void> {
    const allWords = getWordsForLanguage(languageCode);
    
    if (!allWords || allWords.length === 0) {
      logger.error('No words available for Precision Mode');
      throw new Error('No words available for Precision Mode');
    }

    // Select words with high confidence potential (well-known but with slight challenge)
    const precisionWords = this.selectPrecisionWords(allWords, wordProgress);
    
    if (precisionWords.length < targetWords) {
      logger.warn('Insufficient words for Precision Mode, padding with additional words', {
        available: precisionWords.length,
        required: targetWords
      });
    }

    this.state = {
      languageCode,
      targetWords,
      currentWordIndex: 0,
      errorCount: 0,
      sessionFailed: false,
      startTime: Date.now(),
      wordTimings: [],
      allWords: precisionWords,
      usedWordIds: new Set(),
      aiEnhancementsEnabled: challengeAIIntegrator.isAIAvailable(),
      errorPatterns: [],
      recoveryStrategies: [],
      currentStrategy: {
        pacing: 8.0, // Start with 8 seconds per word
        quizMode: 'multiple-choice', // Start with easier mode
        cognitiveLoadLevel: 'low'
      }
    };

    logger.debug(`🎯 Precision Mode initialized with ${precisionWords.length} words`);
  }

  /**
   * Get next word with AI-enhanced error prevention
   */
  async getNextPrecisionWord(
    currentProgress: number,
    wordProgress: { [key: string]: WordProgress }
  ): Promise<PrecisionModeResult> {
    if (!this.state) {
      logger.error('Precision Mode not initialized');
      throw new Error('Precision Mode must be initialized first');
    }

    if (this.state.sessionFailed) {
      throw new Error('Precision Mode session has failed due to error');
    }

    const { allWords, aiEnhancementsEnabled, usedWordIds, targetWords, errorCount } = this.state;

    // Calculate error risk and adjust strategy
    const errorRisk = this.calculateErrorRisk(currentProgress, errorCount);
    this.adjustStrategyForErrorPrevention(errorRisk);

    const candidates = allWords.filter(word => !usedWordIds.has(word.id));
    
    if (candidates.length === 0) {
      logger.error('No more words available for Precision Mode');
      throw new Error('No words available for Precision Mode');
    }

    let selectedWord: Word;
    let quizMode: PrecisionModeResult['quizMode'];
    let aiEnhanced = false;
    let confidenceBoost: string[] = [];
    let errorPreventionHints: string[] = [];
    let reasoning: string[] = [];

    // Basic word selection first
    selectedWord = candidates[0];
    quizMode = this.getConfidenceOptimizedQuizMode(selectedWord, errorRisk);

    // AI-enhanced word selection for error prevention
    if (aiEnhancementsEnabled && errorRisk > 0.2) {
      const aiContext: ChallengeAIContext = {
        sessionType: 'precision-mode',
        currentProgress: {
          wordsCompleted: currentProgress,
          targetWords: targetWords,
          consecutiveCorrect: 0,
          consecutiveIncorrect: 0,
          recentAccuracy: currentProgress > 0 ? 1.0 - (errorCount / currentProgress) : 1.0,
          sessionDuration: (Date.now() - this.state.startTime) / 1000,
          accuracy: currentProgress > 0 ? 1.0 - (errorCount / currentProgress) : 1.0,
          timeElapsed: (Date.now() - this.state.startTime) / 1000
        },
        userState: {
          recentPerformance: []
        },
        challengeContext: {
          currentDifficulty: 50,
          errorRisk: errorRisk,
          perfectAccuracyRequired: true,
          currentErrorCount: errorCount,
          isEarlyPhase: currentProgress < 3,
          isFinalPhase: currentProgress > targetWords * 0.8 // Final 20%
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
            quizMode = aiResult.aiRecommendedMode as PrecisionModeResult['quizMode'];
          }
          aiEnhanced = true;
          confidenceBoost = this.generateConfidenceBoosts(selectedWord, errorRisk);
          errorPreventionHints = this.generateErrorPreventionHints(selectedWord, quizMode);
          reasoning = aiResult.reasoning || [];
          
          // Record recovery strategy
          this.state.recoveryStrategies.push(`error-prevention-${errorRisk > 0.5 ? 'high' : 'moderate'}`);
        } else {
          selectedWord = this.selectSafestWord(candidates, wordProgress);
          quizMode = this.getConfidenceOptimizedQuizMode(selectedWord, errorRisk);
        }
      } catch (error) {
        logger.warn('AI enhancement failed for Precision Mode, using safest word', { error });
        selectedWord = this.selectSafestWord(candidates, wordProgress);
        quizMode = this.getConfidenceOptimizedQuizMode(selectedWord, errorRisk);
      }
    } else {
      selectedWord = this.selectSafestWord(candidates, wordProgress);
      quizMode = this.getConfidenceOptimizedQuizMode(selectedWord, errorRisk);
    }

    // Track word usage
    usedWordIds.add(selectedWord.id);
    
    // Generate options based on quiz mode
    const options = this.generateOptions(selectedWord, quizMode);

    logger.debug(`🎯 Precision Mode word selected: ${selectedWord.term} (${quizMode}, AI: ${aiEnhanced}, Risk: ${errorRisk.toFixed(2)})`);

    return {
      word: selectedWord,
      options,
      quizMode,
      aiEnhanced,
      confidenceBoost: confidenceBoost.length > 0 ? confidenceBoost : undefined,
      errorPreventionHints: errorPreventionHints.length > 0 ? errorPreventionHints : undefined,
      optimalPacing: this.state.currentStrategy.pacing,
      reasoning: reasoning.length > 0 ? reasoning : undefined
    };
  }

  /**
   * Record word completion and check for session failure
   */
  recordWordCompletion(wordId: string, correct: boolean, timeSpent: number, errorType?: string): boolean {
    if (!this.state) return false;

    this.state.wordTimings.push({
      wordId,
      timeSpent,
      correct
    });

    if (!correct) {
      this.state.errorCount++;
      this.state.sessionFailed = true; // Precision Mode fails on first error
      
      // Record error pattern
      this.state.errorPatterns.push({
        wordNumber: this.state.currentWordIndex + 1,
        errorType: errorType || 'unknown',
        timestamp: new Date()
      });
      
      logger.warn('Precision Mode session failed due to error', {
        wordId,
        wordNumber: this.state.currentWordIndex + 1,
        errorType
      });
      
      return false; // Session failed
    }

    this.state.currentWordIndex++;
    logger.debug(`Precision Mode word completed: ${wordId}, time: ${timeSpent}s`);
    
    return true; // Session continues
  }

  /**
   * Save Precision Mode session performance
   */
  async savePrecisionModePerformance(
    userId: string,
    sessionData: {
      completed: boolean;
      accuracy: number;
      wordsCompleted: number;
      wasAIEnhanced: boolean;
      finalScore: number;
    }
  ): Promise<void> {
    if (!this.state) {
      logger.warn('Cannot save Precision Mode performance - no active session');
      return;
    }

    try {
      const avgTimePerWord = this.state.wordTimings.length > 0 ? 
        this.state.wordTimings.reduce((sum, timing) => sum + timing.timeSpent, 0) / this.state.wordTimings.length : 0;

      const failurePoint = this.state.sessionFailed ? this.state.currentWordIndex + 1 : 0;
      const errorTypes = this.state.errorPatterns.map(pattern => pattern.errorType);

      await userLearningProfileStorage.updatePrecisionModeData(userId, {
        completed: sessionData.completed,
        failurePoint,
        accuracy: sessionData.accuracy,
        averageTimePerWord: avgTimePerWord,
        wasAIEnhanced: sessionData.wasAIEnhanced,
        errorTypes,
        quizModeUsed: this.state.currentStrategy.quizMode,
        cognitiveLoadStrategy: this.state.currentStrategy.cognitiveLoadLevel,
        mistakeDetails: this.state.errorPatterns.length > 0 ? this.state.errorPatterns[0] : undefined
      });
      
      logger.info('Precision Mode performance saved', {
        userId,
        completed: sessionData.completed,
        failurePoint,
        wasAIEnhanced: sessionData.wasAIEnhanced
      });
    } catch (error) {
      logger.error('Failed to save Precision Mode performance', { userId, error });
    }
  }

  /**
   * Select words optimized for precision (high confidence)
   */
  private selectPrecisionWords(allWords: Word[], wordProgress: { [key: string]: WordProgress }): Word[] {
    return allWords
      .map(word => ({
        word,
        confidenceScore: this.calculateConfidenceScore(word, wordProgress[word.id])
      }))
      .sort((a, b) => b.confidenceScore - a.confidenceScore)
      .slice(0, 25) // Top 25 words for precision learning
      .map(item => item.word);
  }

  /**
   * Calculate confidence score (how likely user is to get this word right)
   */
  private calculateConfidenceScore(word: Word, progress?: WordProgress): number {
    let score = 50; // Base score

    if (progress) {
      const mastery = progress.xp || 0;
      
      // Favor words with high mastery but not perfect (to avoid boredom)
      if (mastery > 0.7 && mastery < 0.95) {
        score += 40; // Sweet spot for precision
      } else if (mastery >= 0.95) {
        score += 25; // Very safe but potentially boring
      } else if (mastery > 0.5) {
        score += 15; // Moderate confidence
      } else {
        score -= 30; // Too risky for precision mode
      }

      // Favor words with recent successful attempts
      // Simulate recent attempts from available data
      const recentAttempts = [{correct: progress.timesCorrect > progress.timesIncorrect}];
      const recentSuccess = recentAttempts.slice(-3).filter((attempt: any) => attempt.correct).length;
      score += recentSuccess * 10;

      // Apply mastery decay
      const decayedMastery = calculateMasteryDecay(progress.lastPracticed || '', progress.xp || 0);
      score += decayedMastery * 20;

      // Penalize words with recent errors
      const recentErrors = recentAttempts.slice(-5).filter((attempt: any) => !attempt.correct).length;
      score -= recentErrors * 15;
    }

    // Favor shorter, simpler words for precision
    if (word.term.length <= 6) {
      score += 10;
    } else if (word.term.length > 12) {
      score -= 15;
    }

    // Favor common words
    if (word.level && word.level <= 2) {
      score += 15;
    } else if (word.level && word.level >= 4) {
      score -= 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate error risk based on current progress
   */
  private calculateErrorRisk(currentProgress: number, errorCount: number): number {
    if (currentProgress === 0) return 0.1; // Low initial risk
    
    // Risk increases with fatigue and pressure
    const fatigueRisk = Math.min(0.3, currentProgress * 0.02); // 2% per word completed
    const pressureRisk = errorCount > 0 ? 0.5 : 0; // Any error creates pressure
    const progressRisk = currentProgress > 10 ? 0.2 : 0; // Higher risk in later stages
    
    return Math.min(0.8, fatigueRisk + pressureRisk + progressRisk);
  }

  /**
   * Adjust strategy based on error risk
   */
  private adjustStrategyForErrorPrevention(errorRisk: number): void {
    if (!this.state) return;

    // Increase pacing (more time) for higher risk
    if (errorRisk > 0.5) {
      this.state.currentStrategy.pacing = 12.0; // 12 seconds per word
      this.state.currentStrategy.cognitiveLoadLevel = 'minimal';
      this.state.currentStrategy.quizMode = 'multiple-choice'; // Easiest mode
    } else if (errorRisk > 0.3) {
      this.state.currentStrategy.pacing = 10.0; // 10 seconds per word
      this.state.currentStrategy.cognitiveLoadLevel = 'low';
    } else {
      this.state.currentStrategy.pacing = 8.0; // Normal pacing
      this.state.currentStrategy.cognitiveLoadLevel = 'moderate';
    }
  }

  /**
   * Select the safest word from candidates
   */
  private selectSafestWord(candidates: Word[], wordProgress: { [key: string]: WordProgress }): Word {
    return candidates
      .map(word => ({
        word,
        safetyScore: this.calculateConfidenceScore(word, wordProgress[word.id])
      }))
      .sort((a, b) => b.safetyScore - a.safetyScore)[0].word;
  }

  /**
   * Get quiz mode optimized for confidence
   */
  private getConfidenceOptimizedQuizMode(word: Word, errorRisk: number): PrecisionModeResult['quizMode'] {
    // Higher error risk = easier quiz modes
    if (errorRisk > 0.6) {
      return 'multiple-choice'; // Safest option
    }
    
    if (errorRisk > 0.4) {
      return Math.random() < 0.7 ? 'multiple-choice' : 'letter-scramble';
    }
    
    if (errorRisk > 0.2) {
      const rand = Math.random();
      if (rand < 0.4) return 'multiple-choice';
      if (rand < 0.7) return 'letter-scramble';
      return 'fill-in-the-blank';
    }
    
    // Low risk allows more challenging modes
    const rand = Math.random();
    if (rand < 0.3) return 'multiple-choice';
    if (rand < 0.5) return 'letter-scramble';
    if (rand < 0.8) return 'fill-in-the-blank';
    return 'open-answer';
  }

  /**
   * Generate confidence-boosting messages
   */
  private generateConfidenceBoosts(word: Word, errorRisk: number): string[] {
    const boosts: string[] = [];
    
    if (errorRisk > 0.5) {
      boosts.push('Take your time - accuracy is more important than speed');
      boosts.push('Trust your knowledge - you\'ve seen this word before');
    }
    
    if (word.term.length <= 6) {
      boosts.push('This is a familiar, shorter word - you\'ve got this!');
    }
    
    boosts.push('Stay calm and confident - precision is your strength');
    
    return boosts;
  }

  /**
   * Generate error prevention hints
   */
  private generateErrorPreventionHints(word: Word, quizMode: string): string[] {
    const hints: string[] = [];
    
    if (quizMode === 'multiple-choice') {
      hints.push('Read all options carefully before choosing');
      hints.push('Eliminate options that don\'t make sense');
    }
    
    if (quizMode === 'open-answer') {
      hints.push('Double-check your spelling before submitting');
      hints.push('Think about the word\'s structure and components');
    }
    
    hints.push('Take a moment to recall the context you learned this word in');
    
    return hints;
  }

  /**
   * Generate quiz options with intelligent distractors for all quiz modes
   */
  private generateOptions(word: Word, quizMode: PrecisionModeResult['quizMode']): string[] {
    if (!this.state) return [];

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
   * Generate multiple choice options
   */
  private generateMultipleChoiceOptions(word: Word): string[] {
    const correctAnswer = word.definition;
    const allWords = this.state!.allWords;
    
    // Get wrong answers from similar level words to create challenging but fair distractors
    const wrongAnswers = allWords
      .filter(w => w.id !== word.id)
      .filter(w => Math.abs((w.level || 3) - (word.level || 3)) <= 1) // Similar difficulty
      .map(w => w.definition)
      .filter(definition => definition !== correctAnswer)
      .filter(definition => definition.length > 10) // Avoid very short definitions
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    // If we don't have enough similar-level words, fall back to any words
    while (wrongAnswers.length < 3) {
      const fallbackAnswers = allWords
        .filter(w => w.id !== word.id)
        .map(w => w.definition)
        .filter(definition => definition !== correctAnswer)
        .filter(definition => !wrongAnswers.includes(definition))
        .sort(() => 0.5 - Math.random())
        .slice(0, 3 - wrongAnswers.length);
      
      wrongAnswers.push(...fallbackAnswers);
      break; // Prevent infinite loop
    }

    const options = [correctAnswer, ...wrongAnswers.slice(0, 3)];
    return options.sort(() => 0.5 - Math.random()); // Shuffle options
  }

  /**
   * Generate letter scramble options (scrambled versions of the correct term)
   */
  private generateLetterScrambleOptions(word: Word): string[] {
    const correctTerm = word.term;
    const options = [correctTerm];
    
    // Generate scrambled versions
    for (let i = 0; i < 3; i++) {
      let scrambled = this.scrambleWord(correctTerm, i + 1);
      // Ensure we don't duplicate the correct answer or previous scrambles
      while (options.includes(scrambled) || scrambled === correctTerm) {
        scrambled = this.scrambleWord(correctTerm, i + 2);
      }
      options.push(scrambled);
    }
    
    return options.sort(() => 0.5 - Math.random());
  }

  /**
   * Generate fill-in-the-blank options (terms that could fit in a sentence)
   */
  private generateFillInTheBlankOptions(word: Word): string[] {
    const correctTerm = word.term;
    const allWords = this.state!.allWords;
    
    // Get words of similar length and type that could plausibly fit
    const wrongTerms = allWords
      .filter(w => w.id !== word.id)
      .filter(w => Math.abs(w.term.length - correctTerm.length) <= 2) // Similar length
      .filter(w => Math.abs((w.level || 3) - (word.level || 3)) <= 1) // Similar difficulty
      .map(w => w.term)
      .filter(term => term !== correctTerm)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    
    // Fallback if not enough similar words
    while (wrongTerms.length < 3) {
      const fallbackTerms = allWords
        .filter(w => w.id !== word.id)
        .map(w => w.term)
        .filter(term => term !== correctTerm)
        .filter(term => !wrongTerms.includes(term))
        .sort(() => 0.5 - Math.random())
        .slice(0, 3 - wrongTerms.length);
      
      wrongTerms.push(...fallbackTerms);
      break;
    }
    
    const options = [correctTerm, ...wrongTerms.slice(0, 3)];
    return options.sort(() => 0.5 - Math.random());
  }

  /**
   * Scramble a word for letter-scramble quiz mode
   */
  private scrambleWord(word: string, scrambleLevel: number): string {
    const chars = word.split('');
    
    // Different scrambling strategies based on level
    switch (scrambleLevel) {
      case 1:
        // Light scramble - swap adjacent characters
        for (let i = 0; i < chars.length - 1; i += 2) {
          [chars[i], chars[i + 1]] = [chars[i + 1], chars[i]];
        }
        break;
      
      case 2:
        // Medium scramble - reverse sections
        const mid = Math.floor(chars.length / 2);
        const firstHalf = chars.slice(0, mid).reverse();
        const secondHalf = chars.slice(mid).reverse();
        return firstHalf.concat(secondHalf).join('');
      
      case 3:
      default:
        // Heavy scramble - full random shuffle
        for (let i = chars.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [chars[i], chars[j]] = [chars[j], chars[i]];
        }
        break;
    }
    
    return chars.join('');
  }

  /**
   * Reset Precision Mode session
   */
  reset(): void {
    this.state = null;
    logger.debug('Precision Mode session reset');
  }

  /**
   * Get current session state
   */
  getSessionState(): PrecisionModeState | null {
    return this.state;
  }

  /**
   * Check if session has failed
   */
  hasSessionFailed(): boolean {
    return this.state?.sessionFailed || false;
  }
}

// Export singleton instance
export const precisionModeService = new PrecisionModeService();