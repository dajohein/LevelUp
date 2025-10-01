/**
 * Enhanced Word Service with Spaced Repetition Integration
 *
 * Provides intellig      this.state = {
        currentSession: session,
        currentLanguageCode: languageCode,
        currentWordIndex: 0,
        sessionWords: interleaved,
        sessionResults: [],
        sessionStartTime: Date.now(),
      };d selection using the spaced repetition learning engine
 * Maintains backward compatibility with existing game logic
 */

import { WordProgress } from '../store/types';
import { Word, getWordsForLanguage } from './wordService';
import { getWordsForModule } from './moduleService';
import { learningCacheService } from './cacheService';
import {
  interleaveSessionWords,
  LearningSession,
  analyzeSessionPerformance,
  SessionAnalysis,
} from './spacedRepetitionService';
import { logger } from './logger';

// Enhanced word service state
interface EnhancedWordServiceState {
  currentSession: LearningSession | null;
  currentLanguageCode: string | null;
  currentWordIndex: number;
  sessionWords: Array<{
    word: Word;
    quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer';
    type: 'group' | 'review';
    difficulty?: number;
  }>;
  sessionResults: Array<{
    wordId: string;
    isCorrect: boolean;
    timeSpent: number;
    quizMode: string;
  }>;
  sessionStartTime: number;
}

class EnhancedWordService {
  private state: EnhancedWordServiceState = {
    currentSession: null,
    currentLanguageCode: null,
    currentWordIndex: 0,
    sessionWords: [],
    sessionResults: [],
    sessionStartTime: 0,
  };

  /**
   * Initialize a new learning session
   */
  initializeLearningSession(
    languageCode: string,
    moduleId?: string,
    wordProgress: { [key: string]: WordProgress } = {}
  ): boolean {
    try {
      logger.debug(
        `🚀 Initializing learning session for ${languageCode}${moduleId ? `/${moduleId}` : ''}`
      );

      // Get words for the session
      const words = moduleId
        ? getWordsForModule(languageCode, moduleId)
        : getWordsForLanguage(languageCode);

      if (words.length === 0) {
        logger.warn(`No words available for ${languageCode}${moduleId ? `/${moduleId}` : ''}`);
        return false;
      }

      // Create learning session using cache service
      const session = learningCacheService.createLearningSession(
        languageCode,
        words,
        wordProgress,
        Math.min(3, Math.floor(words.length * 0.1)) // 10% for review, max 3
      );

      if (!session) {
        logger.warn('Failed to create learning session');
        return false;
      }

      // Interleave session words for variety
      const interleavedWords = interleaveSessionWords(session);

      this.state = {
        currentSession: session,
        currentLanguageCode: languageCode,
        currentWordIndex: 0,
        sessionWords: interleavedWords,
        sessionResults: [],
        sessionStartTime: Date.now(),
      };

      logger.debug(`✅ Learning session initialized:`, {
        sessionType: session.sessionType,
        totalWords: interleavedWords.length,
        groupWords: session.words.length,
        reviewWords: session.reviewWords.length,
      });

      return true;
    } catch (error) {
      logger.error('Failed to initialize learning session:', error);
      return false;
    }
  }

  /**
   * Get the current word and quiz information
   */
  getCurrentWord(): {
    word: Word | null;
    quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer';
    options: string[];
    isReviewWord: boolean;
    progress: number;
    wordType: 'group' | 'review';
  } | null {
    if (!this.state.currentSession || !this.state.sessionWords.length) {
      return null;
    }

    const currentWordData = this.state.sessionWords[this.state.currentWordIndex];
    if (!currentWordData) {
      return null;
    }

    const { word, quizMode, type } = currentWordData;
    const progress = (this.state.currentWordIndex / this.state.sessionWords.length) * 100;

    // Generate options for multiple choice
    let options: string[] = [];
    if (quizMode === 'multiple-choice') {
      options = this.generateMultipleChoiceOptions(word, this.getAllSessionWords());
    }

    return {
      word,
      quizMode,
      options,
      isReviewWord: type === 'review',
      progress,
      wordType: type,
    };
  }

  /**
   * Record an answer and move to the next word
   */
  recordAnswer(
    isCorrect: boolean,
    timeSpent: number = 0
  ): {
    isSessionComplete: boolean;
    nextWord: ReturnType<EnhancedWordService['getCurrentWord']>;
  } {
    if (!this.state.currentSession || !this.state.sessionWords.length) {
      return { isSessionComplete: true, nextWord: null };
    }

    const currentWordData = this.state.sessionWords[this.state.currentWordIndex];
    if (currentWordData) {
      // Record the result
      this.state.sessionResults.push({
        wordId: currentWordData.word.id,
        isCorrect,
        timeSpent,
        quizMode: currentWordData.quizMode,
      });

      logger.debug(`📝 Recorded answer:`, {
        word: currentWordData.word.term,
        correct: isCorrect,
        time: timeSpent,
        mode: currentWordData.quizMode,
      });
    }

    // Move to next word
    this.state.currentWordIndex++;

    // Check if session is complete
    const isSessionComplete = this.state.currentWordIndex >= this.state.sessionWords.length;

    if (isSessionComplete) {
      this.completeSession();
    }

    return {
      isSessionComplete,
      nextWord: isSessionComplete ? null : this.getCurrentWord(),
    };
  }

  /**
   * Complete the current session and record analytics
   */
  private completeSession(): SessionAnalysis | null {
    if (!this.state.currentSession) return null;

    const sessionDuration = Date.now() - this.state.sessionStartTime;
    const performance = analyzeSessionPerformance(
      this.state.currentSession,
      this.state.sessionResults
    );

    // Get all studied word IDs
    const wordsStudied = this.state.sessionResults.map(r => r.wordId);

    // Record session in cache
    learningCacheService.recordSession(
      this.getCurrentLanguageCode(),
      this.state.currentSession,
      performance,
      wordsStudied
    );

    logger.debug(`🏁 Session completed:`, {
      duration: Math.round(sessionDuration / 1000),
      wordsLearned: performance.wordsLearned,
      accuracy: Math.round(performance.averageAccuracy * 100),
      recommendations: performance.recommendations.length,
    });

    return performance;
  }

  /**
   * Manually complete the current session (called from external components)
   */
  forceCompleteSession(): SessionAnalysis | null {
    return this.completeSession();
  }

  /**
   * Get session progress information
   */
  getSessionProgress(): {
    currentIndex: number;
    totalWords: number;
    correctAnswers: number;
    accuracy: number;
    timeElapsed: number;
    sessionType: string;
  } | null {
    if (!this.state.currentSession) return null;

    const correctAnswers = this.state.sessionResults.filter(r => r.isCorrect).length;
    const accuracy =
      this.state.sessionResults.length > 0 ? correctAnswers / this.state.sessionResults.length : 0;
    const timeElapsed = Math.round((Date.now() - this.state.sessionStartTime) / 1000);

    return {
      currentIndex: this.state.currentWordIndex,
      totalWords: this.state.sessionWords.length,
      correctAnswers,
      accuracy,
      timeElapsed,
      sessionType: this.state.currentSession.sessionType,
    };
  }

  /**
   * Reset the current session
   */
  resetSession(): void {
    this.state = {
      currentSession: null,
      currentLanguageCode: null,
      currentWordIndex: 0,
      sessionWords: [],
      sessionResults: [],
      sessionStartTime: 0,
    };
    logger.debug('🔄 Session reset');
  }

  /**
   * Check if there's an active session
   */
  hasActiveSession(): boolean {
    return this.state.currentSession !== null;
  }

  /**
   * Get the current session info
   */
  getCurrentSessionInfo() {
    return this.state.currentSession;
  }

  /**
   * Fallback method for backward compatibility - get random word using original logic
   */
  getRandomWordFallback(
    languageCode: string,
    wordProgress: { [key: string]: WordProgress },
    lastWordId?: string,
    moduleId?: string
  ): {
    word: Word | null;
    options: string[];
    quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer';
  } {
    // Import and use the original logic from wordService
    const { getRandomWord, getRandomWordFromModule } = require('./wordService');

    if (moduleId) {
      return getRandomWordFromModule(languageCode, moduleId, wordProgress, lastWordId);
    } else {
      return getRandomWord(languageCode, wordProgress, lastWordId);
    }
  }

  /**
   * Generate multiple choice options
   */
  private generateMultipleChoiceOptions(targetWord: Word, allWords: Word[]): string[] {
    const direction = targetWord.direction || 'definition-to-term';
    const correctAnswer =
      direction === 'definition-to-term' ? targetWord.term : targetWord.definition;

    // Filter out the correct answer and get random incorrect options
    const incorrectOptions = allWords
      .filter(w => w.id !== targetWord.id)
      .map(w => (direction === 'definition-to-term' ? w.term : w.definition))
      .filter(option => option !== correctAnswer);

    // Shuffle and take 3 incorrect options
    const shuffledIncorrect = incorrectOptions.sort(() => Math.random() - 0.5).slice(0, 3);

    // Create options array with correct answer in random position
    const options = [...shuffledIncorrect];
    const correctPosition = Math.floor(Math.random() * 4);
    options.splice(correctPosition, 0, correctAnswer);

    return options;
  }

  /**
   * Get all words from current session
   */
  private getAllSessionWords(): Word[] {
    if (!this.state.currentSession) return [];

    return [
      ...this.state.currentSession.words.map(w => w.word),
      ...this.state.currentSession.reviewWords.map(w => w.word),
    ];
  }

  /**
   * Helper to get current language code (would need to be passed or stored)
   */
  private getCurrentLanguageCode(): string {
    return this.state.currentLanguageCode || 'de'; // Default fallback
  }

  /**
   * Get learning analytics
   */
  getLearningAnalytics(languageCode: string) {
    return learningCacheService.getAnalytics(languageCode);
  }

  /**
   * Get recent session history
   */
  getSessionHistory(languageCode: string, limit: number = 10) {
    return learningCacheService.getSessionHistory(languageCode, limit);
  }

  /**
   * Force refresh word groups
   */
  refreshWordGroups(
    languageCode: string,
    wordProgress: { [key: string]: WordProgress },
    moduleId?: string
  ) {
    const words = moduleId
      ? getWordsForModule(languageCode, moduleId)
      : getWordsForLanguage(languageCode);

    return learningCacheService.refreshWordGroups(languageCode, words, wordProgress);
  }
}

// Export singleton instance
export const enhancedWordService = new EnhancedWordService();
