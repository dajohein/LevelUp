/**
 * Transparent AI-Enhanced Game Hook
 * 
 * Drop-in replacement for useEnhancedGame that adds AI control
 * while maintaining the same interface for seamless integration.
 * 
 * AI features work silently in the background:
 * - Detects struggling patterns and switches to multiple choice
 * - Detects excellence and increases difficulty/challenge
 * - Monitors cognitive load and adjusts accordingly
 * - All changes appear as natural learning progression
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { aiEnhancedWordService } from '../services/aiEnhancedWordService';
import { Word } from '../services/wordService';
import { updateWordProgress } from '../store/gameSlice';
import { calculateMasteryGain } from '../services/masteryService';
import { logger } from '../services/logger';

interface TransparentAIGameState {
  isUsingSpacedRepetition: boolean;
  isSessionActive: boolean;
  currentWordInfo: {
    word: Word | null;
    quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';
    options: string[];
    isReviewWord: boolean;
    progress: number;
    wordType: 'group' | 'review';
  } | null;
  sessionStats: {
    currentIndex: number;
    totalWords: number;
    accuracy: number;
    isComplete: boolean;
  };
  aiDecisions: number; // Track AI interventions (hidden from user)
}

interface TransparentAIGameActions {
  handleEnhancedAnswer: (isCorrect: boolean, timeSpent?: number) => Promise<{ isComplete: boolean }>;
  getCurrentWordInfo: () => TransparentAIGameState['currentWordInfo'];
  getSessionStats: () => TransparentAIGameState['sessionStats'];
  forceCompleteSession: () => void;
}

export const useTransparentAIGame = (
  languageCode: string, 
  moduleId?: string
): TransparentAIGameState & TransparentAIGameActions => {
  
  const dispatch = useDispatch();
  
  // Memoized selector to prevent unnecessary rerenders
  const { wordProgress, currentLanguage } = useSelector((state: RootState) => ({
    wordProgress: state.game.wordProgress,
    currentLanguage: state.game.language
  }), (left, right) => left.wordProgress === right.wordProgress && left.currentLanguage === right.currentLanguage);

  const [state, setState] = useState<TransparentAIGameState>({
    isUsingSpacedRepetition: true,
    isSessionActive: false,
    currentWordInfo: null,
    sessionStats: {
      currentIndex: 0,
      totalWords: 0,
      accuracy: 0,
      isComplete: false
    },
    aiDecisions: 0
  });

  // Performance tracking for AI decisions (simplified without batching metrics)
  const performanceTrackerRef = useRef({
    consecutiveCorrect: 0,
    consecutiveIncorrect: 0,
    responseTimeHistory: [] as number[],
    lastAnswerTime: Date.now(),
    sessionMetrics: {
      sessionRestartsAvoided: 0,
      lastOptimizationReport: Date.now()
    }
  });

  const sessionInitializedRef = useRef(false);

  // Initialize AI-enhanced session transparently
  useEffect(() => {
    if (languageCode && !sessionInitializedRef.current) {
      initializeTransparentSession();
      sessionInitializedRef.current = true;
    }
  }, [languageCode, moduleId]);

  const initializeTransparentSession = useCallback(async () => {
    try {
      logger.debug('🔄 Initializing transparent AI session');
      logger.debug(`Current Redux language: ${currentLanguage}, requested language: ${languageCode}`);
      logger.debug('Word progress available:', Object.keys(wordProgress).length, 'words');
      logger.debug('Word progress IDs:', Object.keys(wordProgress));
      
      // Check if we need to load progress for the requested language
      if (currentLanguage !== languageCode) {
        logger.warn(`Language mismatch! Redux has ${currentLanguage}, but requesting ${languageCode}. May need to reload word progress.`);
        return; // Exit early if language mismatch
      }
      
      // Quick validation - if no progress available, skip session
      if (Object.keys(wordProgress).length === 0) {
        logger.debug('No word progress available for language:', languageCode);
        return;
      }
      
      const success = await aiEnhancedWordService.initializeLearningSession(
        languageCode,
        'ai_user', // Silent AI user
        moduleId,
        wordProgress
      );

      if (success) {
        setState(prev => ({
          ...prev,
          isSessionActive: true,
          isUsingSpacedRepetition: true
        }));
        
        await refreshCurrentWord();
        logger.debug('✅ Transparent AI session initialized');
      }
    } catch (error) {
      logger.error('Failed to initialize transparent AI session:', error);
      // Fallback to non-AI mode silently
      setState(prev => ({
        ...prev,
        isSessionActive: false,
        isUsingSpacedRepetition: false
      }));
    }
  }, [languageCode, moduleId, wordProgress]);

  const refreshCurrentWord = async () => {
    try {
      const wordInfo = await aiEnhancedWordService.getCurrentWord();
      const stats = aiEnhancedWordService.getSessionStats();

      if (wordInfo) {
        setState(prev => ({
          ...prev,
          currentWordInfo: {
            word: wordInfo.word,
            quizMode: wordInfo.quizMode,
            options: wordInfo.options,
            isReviewWord: wordInfo.isReviewWord,
            progress: wordInfo.progress,
            wordType: wordInfo.wordType
          },
          sessionStats: {
            currentIndex: stats.currentIndex,
            totalWords: stats.totalWords,
            accuracy: stats.accuracy,
            isComplete: stats.isComplete
          },
          aiDecisions: stats.aiDecisions
        }));

        // Silent logging of AI decisions (only in debug mode)
        if (wordInfo.aiDecision && process.env.NODE_ENV === 'development') {
          logger.debug('🤖 AI intervention:', {
            word: wordInfo.word?.term,
            mode: wordInfo.quizMode,
            confidence: Math.round(wordInfo.aiDecision.confidence * 100)
          });
        }
      } else {
        // Session complete - automatically start a new session for continuous learning
        logger.debug('🔄 Session completed, starting new AI session');
        
        setState(prev => ({
          ...prev,
          currentWordInfo: null,
          sessionStats: { ...prev.sessionStats, isComplete: true },
          isSessionActive: false
        }));

        // Auto-restart session after a brief delay for better UX
        setTimeout(async () => {
          await initializeTransparentSession();
        }, 1000);
      }
    } catch (error) {
      logger.error('Failed to refresh word in transparent mode:', error);
    }
  };

  const handleEnhancedAnswer = useCallback(async (
    isCorrect: boolean, 
    timeSpent: number = 5000
  ): Promise<{ isComplete: boolean }> => {
    try {
      const responseTime = Math.max(1000, timeSpent); // Minimum 1 second
      
      // Update performance tracking for AI analysis
      updatePerformanceTracking(isCorrect, responseTime);

      // Record with AI system (transparent to user)
      const result = await aiEnhancedWordService.recordAnswer(
        isCorrect, 
        responseTime,
        0 // hints used
      );

      // Update Redux store with mastery progress
      if (state.currentWordInfo?.word) {
        const currentProgress = wordProgress[state.currentWordInfo.word.id];
        const currentMastery = currentProgress?.xp || 0;
        const newMastery = calculateMasteryGain(
          currentMastery,
          isCorrect,
          state.currentWordInfo.quizMode
        );

        const updatedProgress = {
          ...currentProgress,
          xp: newMastery, // Use the new mastery directly, don't add to current
          lastPracticed: new Date().toISOString()
          // Note: streak is not part of the WordProgress type, so we don't include it here
        };

        logger.debug(`Word XP update: ${state.currentWordInfo.word.term} (ID: ${state.currentWordInfo.word.id}) - ${currentMastery} → ${newMastery} (+${newMastery - currentMastery})`);

        // Direct Redux dispatch - storage orchestrator handles the actual debouncing
        dispatch(updateWordProgress({
          wordId: state.currentWordInfo.word.id,
          progress: updatedProgress
        }));

        // Note: Score updates happen in the Game component UI layer
        // We don't need to update Redux score here for transparent operation
      }

      // Handle AI recommendations silently
      if (result.shouldIntervene && result.intervention) {
        // Log AI intervention but don't show to user
        logger.debug('🤖 AI intervention (silent):', {
          type: result.intervention.type,
          message: result.intervention.message,
          applied: 'transparently'
        });
        
        // Count AI decisions for internal tracking
        setState(prev => ({
          ...prev,
          aiDecisions: prev.aiDecisions + 1
        }));
      }

      if (result.isSessionComplete) {
        logger.debug('🔄 Session completed via recordAnswer, starting new AI session');
        
        setState(prev => ({
          ...prev,
          isSessionActive: false,
          sessionStats: { ...prev.sessionStats, isComplete: true }
        }));

        // Intelligent session restart - only restart if user is actively learning
        // Check recent activity to avoid unnecessary computation
        const recentActivity = Date.now() - performanceTrackerRef.current.lastAnswerTime;
        const shouldRestart = recentActivity < 30000; // 30 seconds of recent activity
        
        if (shouldRestart) {
          setTimeout(async () => {
            await initializeTransparentSession();
          }, 2000); // Increased delay to reduce session churn
        } else {
          performanceTrackerRef.current.sessionMetrics.sessionRestartsAvoided++;
          logger.debug('🎯 Session restart skipped - user inactive, saving resources');
        }

        return { isComplete: true };
      }

      // Refresh to get next word with potential AI adjustments
      await refreshCurrentWord();
      return { isComplete: false };

    } catch (error) {
      logger.error('Enhanced answer handling failed:', error);
      return { isComplete: false };
    }
  }, [state.currentWordInfo, wordProgress, dispatch]);

  const updatePerformanceTracking = (isCorrect: boolean, responseTime: number) => {
    const tracker = performanceTrackerRef.current;
    
    // Update streaks
    if (isCorrect) {
      tracker.consecutiveCorrect++;
      tracker.consecutiveIncorrect = 0;
    } else {
      tracker.consecutiveIncorrect++;
      tracker.consecutiveCorrect = 0;
    }

    // Track response times (for cognitive load analysis)
    tracker.responseTimeHistory.push(responseTime);
    if (tracker.responseTimeHistory.length > 10) {
      tracker.responseTimeHistory.shift(); // Keep last 10 only
    }

    tracker.lastAnswerTime = Date.now();

    // Silent logging for AI analysis (development only)
    if (process.env.NODE_ENV === 'development') {
      logger.debug('📊 Performance tracking:', {
        correct: tracker.consecutiveCorrect,
        incorrect: tracker.consecutiveIncorrect,
        avgResponseTime: Math.round(tracker.responseTimeHistory.reduce((a, b) => a + b, 0) / tracker.responseTimeHistory.length),
        cognitiveLoad: responseTime > 15000 ? 'high' : responseTime < 3000 ? 'low' : 'normal'
      });
    }
  };

  const getCurrentWordInfo = useCallback(() => {
    return state.currentWordInfo;
  }, [state.currentWordInfo]);

  const getSessionStats = useCallback(() => {
    return {
      ...state.sessionStats,
      // Hide AI decision count from user interface
      aiDecisions: 0 // Always return 0 to keep it transparent
    };
  }, [state.sessionStats]);

  const forceCompleteSession = useCallback(() => {
    setState(prev => ({
      ...prev,
      isSessionActive: false,
      sessionStats: { ...prev.sessionStats, isComplete: true }
    }));
  }, []);

  return {
    // State
    isUsingSpacedRepetition: state.isUsingSpacedRepetition,
    isSessionActive: state.isSessionActive,
    currentWordInfo: state.currentWordInfo,
    sessionStats: state.sessionStats,
    aiDecisions: 0, // Always hidden from user
    
    // Actions
    handleEnhancedAnswer,
    getCurrentWordInfo,
    getSessionStats,
    forceCompleteSession
  };
};

// Export with same name as original for drop-in replacement
export const useEnhancedGame = useTransparentAIGame;