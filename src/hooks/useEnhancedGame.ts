/**
 * Enhanced Game Component Hook
 *
 * Integrates the spaced repetition learning engine with the existing game component
 * Provides seamless backward compatibility while adding intelligent word grouping
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { enhancedWordService } from '../services/enhancedWordService';
import { logger } from '../services/logger';

export interface EnhancedGameState {
  isUsingSpacedRepetition: boolean;
  sessionProgress: {
    currentIndex: number;
    totalWords: number;
    correctAnswers: number;
    accuracy: number;
    timeElapsed: number;
    sessionType: string;
  } | null;
  currentWordInfo: {
    word: any;
    quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';
    options: string[];
    isReviewWord: boolean;
    wordType: 'group' | 'review';
  } | null;
  recommendations: string[];
}

export const useEnhancedGame = (languageCode: string, moduleId?: string) => {
  const { wordProgress } = useSelector((state: RootState) => state.game);
  const { currentSession, progress: sessionProgress } = useSelector(
    (state: RootState) => state.session
  );

  const [enhancedState, setEnhancedState] = useState<EnhancedGameState>({
    isUsingSpacedRepetition: false,
    sessionProgress: null,
    currentWordInfo: null,
    recommendations: [],
  });

  const [wordStartTime, setWordStartTime] = useState<number>(Date.now());

  /**
   * Initialize enhanced learning session
   */
  const initializeEnhancedSession = useCallback(async () => {
    if (!languageCode) {
      logger.debug('🔄 No language code provided');
      setEnhancedState(prev => ({ ...prev, isUsingSpacedRepetition: false }));
      return false;
    }

    // Disable enhanced learning for challenges that need full word pool access
    if (
      currentSession?.id === 'streak-challenge' ||
      currentSession?.id === 'boss-battle' ||
      currentSession?.id === 'precision-mode'
    ) {
      logger.debug(`🎯 ${currentSession.name} detected - using full word pool mode`);
      setEnhancedState(prev => ({ ...prev, isUsingSpacedRepetition: false }));
      return false;
    }

    try {
      logger.debug('🚀 Initializing enhanced learning session');

      const success = enhancedWordService.initializeLearningSession(
        languageCode,
        moduleId,
        wordProgress
      );

      if (success) {
        const currentWord = enhancedWordService.getCurrentWord();
        const sessionProgress = enhancedWordService.getSessionProgress();

        setEnhancedState({
          isUsingSpacedRepetition: true,
          sessionProgress,
          currentWordInfo: currentWord,
          recommendations: [],
        });

        setWordStartTime(Date.now());

        logger.debug('✅ Enhanced session initialized successfully');
        return true;
      } else {
        logger.warn('⚠️ Failed to initialize enhanced session, insufficient data');
        setEnhancedState(prev => ({ ...prev, isUsingSpacedRepetition: false }));
        return false;
      }
    } catch (error) {
      logger.error('❌ Error initializing enhanced session:', error);
      setEnhancedState(prev => ({ ...prev, isUsingSpacedRepetition: false }));
      return false;
    }
  }, [languageCode, moduleId, wordProgress, currentSession]);

  /**
   * Handle answer submission in the learning system
   */
  const handleEnhancedAnswer = useCallback(
    (isCorrect: boolean) => {
      if (!enhancedState.isUsingSpacedRepetition) {
        return false;
      }

      const timeSpent = Math.round((Date.now() - wordStartTime) / 1000);
      const result = enhancedWordService.recordAnswer(isCorrect, timeSpent);

      if (result.isSessionComplete) {
        logger.debug('🏁 Enhanced session completed');

        // Get final recommendations
        const sessionHistory = enhancedWordService.getSessionHistory(languageCode, 1);

        let recommendations: string[] = [];
        if (sessionHistory.length > 0) {
          recommendations = sessionHistory[0].performance.recommendations;
        }

        setEnhancedState(prev => ({
          ...prev,
          sessionProgress: null,
          currentWordInfo: null,
          recommendations,
        }));

        // Reset the enhanced service
        enhancedWordService.resetSession();

        return { isComplete: true, recommendations };
      } else {
        // Update state with next word
        const sessionProgress = enhancedWordService.getSessionProgress();

        setEnhancedState(prev => ({
          ...prev,
          sessionProgress,
          currentWordInfo: result.nextWord,
        }));

        setWordStartTime(Date.now());
        return { isComplete: false, nextWord: result.nextWord };
      }
    },
    [enhancedState.isUsingSpacedRepetition, wordStartTime, languageCode]
  );

  /**
   * Get current word information
   */
  const getCurrentWordInfo = useCallback(() => {
    if (enhancedState.isUsingSpacedRepetition && enhancedState.currentWordInfo) {
      return {
        ...enhancedState.currentWordInfo,
        isEnhanced: true,
      };
    }

    // Return null if system is not active yet
    return null;
  }, [enhancedState]);

  /**
   * Get session statistics
   */
  const getSessionStats = useCallback(() => {
    if (enhancedState.isUsingSpacedRepetition && enhancedState.sessionProgress) {
      return {
        ...enhancedState.sessionProgress,
        isEnhanced: true,
      };
    }

    // For non-enhanced sessions (Deep Dive, etc.), use real session progress from Redux
    if (currentSession && sessionProgress) {
      return {
        currentIndex: sessionProgress.wordsCompleted,
        totalWords: currentSession.targetWords,
        correctAnswers: sessionProgress.correctAnswers,
        accuracy:
          sessionProgress.wordsCompleted > 0
            ? sessionProgress.correctAnswers / sessionProgress.wordsCompleted
            : 0,
        timeElapsed: sessionProgress.timeElapsed,
        sessionType: currentSession.name || 'Learning Session',
        isEnhanced: false,
      };
    }

    // Return basic stats if no session is active
    return {
      currentIndex: 0,
      totalWords: 20, // Default Deep Dive target
      correctAnswers: 0,
      accuracy: 0,
      timeElapsed: 0,
      sessionType: 'Learning Session',
      isEnhanced: false,
    };
  }, [enhancedState, currentSession, sessionProgress]);

  /**
   * Reset enhanced session
   */
  const resetEnhancedSession = useCallback(() => {
    enhancedWordService.resetSession();
    setEnhancedState({
      isUsingSpacedRepetition: false,
      sessionProgress: null,
      currentWordInfo: null,
      recommendations: [],
    });
    logger.debug('🔄 Enhanced session reset');
  }, []);

  /**
   * Check if the learning system is available
   */
  const canUseEnhancedMode = useCallback(() => {
    return languageCode && Object.keys(wordProgress).length >= 0;
  }, [languageCode, wordProgress]);

  /**
   * Get learning recommendations
   */
  const getLearningRecommendations = useCallback(() => {
    if (enhancedState.recommendations.length > 0) {
      return enhancedState.recommendations;
    }

    // Generate basic recommendations based on current state
    const sessionStats = getSessionStats();
    const recommendations: string[] = [];

    if (sessionStats.accuracy < 0.7) {
      recommendations.push('Focus on understanding word meanings and context');
      recommendations.push('Try using the hint feature when struggling');
    }

    if (sessionStats.accuracy > 0.9) {
      recommendations.push("Great job! You're ready for more challenging words");
      recommendations.push('Consider practicing with open-ended questions');
    }

    return recommendations;
  }, [enhancedState.recommendations, getSessionStats]);

  /**
   * Get learning analytics for display
   */
  const getLearningAnalytics = useCallback(() => {
    return enhancedWordService.getLearningAnalytics(languageCode);
  }, [languageCode]);

  // Auto-initialize enhanced mode for free-play (no active session).
  // Tracks the last language that was auto-initialized to avoid duplicate inits
  // and to reset correctly when the user switches languages or completes a session.
  const autoInitLanguageRef = useRef('');

  useEffect(() => {
    if (currentSession) {
      // A session just started – clear the ref so we re-init when it ends.
      autoInitLanguageRef.current = '';
    } else if (languageCode && autoInitLanguageRef.current !== languageCode) {
      // Free-play mode and language is ready – initialize the enhanced session.
      autoInitLanguageRef.current = languageCode;
      initializeEnhancedSession();
    }
    // Note: intentionally omitting `initializeEnhancedSession` from deps to avoid
    // re-running on every wordProgress update (it changes when wordProgress changes).
    // The `autoInitLanguageRef` ref guard ensures we only initialize once per language.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [languageCode, currentSession]);

  return {
    // State
    enhancedState,
    isUsingSpacedRepetition: enhancedState.isUsingSpacedRepetition,

    // Methods
    initializeEnhancedSession,
    handleEnhancedAnswer,
    getCurrentWordInfo,
    getSessionStats,
    resetEnhancedSession,
    canUseEnhancedMode,
    getLearningRecommendations,
    getLearningAnalytics,
    forceCompleteSession: () => enhancedWordService.forceCompleteSession(),

    // Utilities
    refreshWordGroups: () =>
      enhancedWordService.refreshWordGroups(languageCode, wordProgress, moduleId),
    hasActiveSession: () => enhancedWordService.hasActiveSession(),
    getSessionHistory: (limit?: number) =>
      enhancedWordService.getSessionHistory(languageCode, limit),
  };
};
