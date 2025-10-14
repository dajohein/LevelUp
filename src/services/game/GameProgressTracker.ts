import { store } from '../../store/store';
import { updateWordProgress } from '../../store/gameSlice';
import { calculateMasteryDecay } from '../masteryService';

export interface ProgressMetrics {
  currentMastery: number;
  streak: number;
  accuracy: number;
  timeSpent: number;
  wordsCompleted: number;
}

export interface FeedbackInfo {
  originalWord: string;
  correctAnswer: string;
  context: string;
}

export interface AnswerValidationResult {
  isCorrect: boolean;
  feedbackInfo: FeedbackInfo;
  progressMetrics: ProgressMetrics;
}

/**
 * Manages game progress tracking, mastery calculations, and learning analytics.
 * Extracted from Game.tsx to improve separation of concerns.
 */
export class GameProgressTracker {
  private dispatch = store.dispatch;

  /**
   * Check if answer is correct and gather progress metrics
   */
  validateAnswer(
    answer: string,
    currentWord: any,
    quizMode: string,
    wordProgress: any,
    getQuizQuestion: (word: any, mode: string) => string,
    getQuizAnswer: (word: any, mode: string) => string,
    getQuestionWord: (word: any) => string,
    getAnswerWord: (word: any) => string,
    checkAnswerCorrectness: (answer: string) => boolean,
    isUnidirectionalMode: (mode: string) => boolean
  ): AnswerValidationResult {
    const isCorrect = checkAnswerCorrectness(answer);
    
    // Calculate current mastery for progress tracking
    const currentMastery = this.calculateWordMastery(currentWord, wordProgress);
    
    // Prepare feedback information based on quiz mode
    const feedbackInfo = this.prepareFeedbackInfo(
      currentWord,
      quizMode,
      getQuizQuestion,
      getQuizAnswer,
      getQuestionWord,
      getAnswerWord,
      isUnidirectionalMode
    );

    // Calculate progress metrics
    const progressMetrics: ProgressMetrics = {
      currentMastery,
      streak: 0, // Will be updated by caller with session data
      accuracy: 0, // Will be updated by caller with session data
      timeSpent: 0, // Will be updated by caller with timing data
      wordsCompleted: 0 // Will be updated by caller with session data
    };

    return {
      isCorrect,
      feedbackInfo,
      progressMetrics
    };
  }

  /**
   * Calculate mastery level for a word including decay
   */
  private calculateWordMastery(currentWord: any, wordProgress: any): number {
    if (!currentWord?.id || !wordProgress[currentWord.id]) {
      return 0;
    }

    const progress = wordProgress[currentWord.id];
    return calculateMasteryDecay(
      progress.lastReviewed,
      progress.mastery || 0
    );
  }

  /**
   * Prepare feedback information based on quiz mode and word direction
   */
  private prepareFeedbackInfo(
    currentWord: any,
    quizMode: string,
    getQuizQuestion: (word: any, mode: string) => string,
    getQuizAnswer: (word: any, mode: string) => string,
    getQuestionWord: (word: any) => string,
    getAnswerWord: (word: any) => string,
    isUnidirectionalMode: (mode: string) => boolean
  ): FeedbackInfo {
    if (isUnidirectionalMode(quizMode)) {
      // Unidirectional modes: Show Dutch as question, target language as answer
      return {
        originalWord: getQuizQuestion(currentWord, quizMode), // Dutch translation
        correctAnswer: getQuizAnswer(currentWord, quizMode), // Target language word
        context: typeof currentWord?.context === 'string' ? currentWord.context : '',
      };
    } else {
      // Bidirectional modes: Follow word direction
      return {
        originalWord: getQuestionWord(currentWord),
        correctAnswer: getAnswerWord(currentWord),
        context: typeof currentWord?.context === 'string' ? currentWord.context : '',
      };
    }
  }

  /**
   * Generate unique feedback tracking key for analytics
   */
  generateFeedbackKey(currentWord: any, getQuestionWord: (word: any) => string): string {
    return currentWord
      ? `${currentWord.id}-${getQuestionWord(currentWord)}-${Date.now()}`
      : `unknown-${Date.now()}`;
  }

  /**
   * Update word progress in Redux store
   */
  updateWordProgress(wordId: string, progressData: any): void {
    this.dispatch(updateWordProgress({
      wordId,
      progress: progressData
    }));
  }

  /**
   * Calculate learning status for word display with full complexity
   */
  calculateWordLearningStatus(
    currentWord: any,
    wordProgress: any,
    shouldShowCard: boolean
  ): {
    currentMastery: number;
    shouldShowCard: boolean;
    isDevelopmentMode: boolean;
    isTrulyNewWord: boolean;
    needsReinforcement: boolean;
  } {
    if (!currentWord) {
      return {
        currentMastery: 0,
        shouldShowCard: false,
        isDevelopmentMode: process.env.NODE_ENV === 'development',
        isTrulyNewWord: false,
        needsReinforcement: false
      };
    }

    const currentWordProgress = wordProgress[currentWord.id];
    const currentMastery = this.calculateWordMastery(currentWord, wordProgress);

    // Truly new word - never practiced before
    if (!currentWordProgress) {
      return {
        currentMastery: 0,
        shouldShowCard: process.env.NODE_ENV === 'development' && shouldShowCard,
        isDevelopmentMode: process.env.NODE_ENV === 'development',
        isTrulyNewWord: true,
        needsReinforcement: false
      };
    }

    // Check if word is truly new (very low mastery)
    const isTrulyNewWord = currentMastery < 20;

    // Check if word needs reinforcement due to mistakes (complex logic preserved)
    const needsReinforcement =
      // Recent mistakes: more incorrect than correct answers
      currentWordProgress.timesIncorrect > currentWordProgress.timesCorrect ||
      // Low consecutive correct count (less than 3 in a row)
      ((currentWordProgress.directions?.['term-to-definition']?.consecutiveCorrect || 0) < 3 &&
        (currentWordProgress.directions?.['definition-to-term']?.consecutiveCorrect || 0) < 3) ||
      // Low mastery with some incorrect answers (needs practice)
      (currentMastery < 50 && currentWordProgress.timesIncorrect > 0);

    return {
      currentMastery,
      shouldShowCard: process.env.NODE_ENV === 'development' && shouldShowCard,
      isDevelopmentMode: process.env.NODE_ENV === 'development',
      isTrulyNewWord,
      needsReinforcement
    };
  }

  /**
   * Track word timing for performance analytics
   */
  trackWordTiming(startTime: number): {
    timeSpent: number;
    performanceScore: number;
  } {
    const timeSpent = Date.now() - startTime;
    
    // Calculate performance score based on response time
    // Faster responses get higher scores (max 100, min 0)
    const performanceScore = Math.max(0, Math.min(100, 100 - (timeSpent / 1000) * 10));

    return {
      timeSpent,
      performanceScore
    };
  }

  /**
   * Update comprehensive progress metrics
   */
  updateProgressMetrics(
    wordId: string,
    isCorrect: boolean,
    timeSpent: number,
    currentStreak: number,
    sessionAccuracy: number
  ): void {
    const progressData = {
      lastReviewed: Date.now(),
      timeSpent,
      isCorrect,
      streak: currentStreak,
      accuracy: sessionAccuracy,
      repetitions: 1 // Will be incremented by existing logic
    };

    this.updateWordProgress(wordId, progressData);
  }
}

// Export singleton instance
export const gameProgressTracker = new GameProgressTracker();