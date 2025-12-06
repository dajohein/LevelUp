/**
 * Hook for AI-Enhanced Learning with real-time adaptation
 *
 * Provides the Game component with AI-driven learning capabilities:
 * - Adaptive difficulty based on cognitive load detection
 * - Dynamic quiz mode switching for struggling/excelling learners
 * - Real-time intervention suggestions
 * - Performance-based learning recommendations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { aiEnhancedWordService } from '../services/aiEnhancedWordService';
import { AdaptiveLearningDecision } from '../services/adaptiveLearningEngine';
import { Word } from '../services/wordService';
import { logger } from '../services/logger';

interface AILearningState {
  currentWord: Word | null;
  quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer' | 'fill-in-the-blank';
  options: string[];
  isReviewWord: boolean;
  progress: number;
  wordType: 'group' | 'review';
  aiDecision?: AdaptiveLearningDecision;
  aiRecommendations: any[];
  shouldShowIntervention: boolean;
  interventionMessage: string;
  isAIEnabled: boolean;
  sessionStats: {
    currentIndex: number;
    totalWords: number;
    accuracy: number;
    isComplete: boolean;
    aiDecisions: number;
    sessionDuration: number;
  };
}

interface AILearningActions {
  initializeSession: (languageCode: string, moduleId?: string) => Promise<boolean>;
  recordAnswer: (
    isCorrect: boolean,
    timeSpent?: number,
    hintsUsed?: number
  ) => Promise<{
    isComplete: boolean;
    shouldShowIntervention: boolean;
    interventionMessage?: string;
  }>;
  skipIntervention: () => void;
  toggleAI: (enabled: boolean) => void;
  refreshCurrentWord: () => Promise<void>;
}

interface UseAILearningOptions {
  userId?: string;
  enableAI?: boolean;
}

export const useAILearning = (
  options: UseAILearningOptions = {}
): [AILearningState, AILearningActions] => {
  const { userId = 'default_user', enableAI: enableAIOption = true } = options;

  // Get word progress from Redux store (with fallback for missing store)
  const { wordProgress, language } = useSelector(
    (state: any) => ({
      wordProgress: state?.game?.wordProgress || {},
      language: state?.game?.language || '',
    }),
    () => true
  ); // Always use shallow equality

  const [state, setState] = useState<AILearningState>({
    currentWord: null,
    quizMode: 'multiple-choice',
    options: [],
    isReviewWord: false,
    progress: 0,
    wordType: 'group',
    aiRecommendations: [],
    shouldShowIntervention: false,
    interventionMessage: '',
    isAIEnabled: enableAIOption,
    sessionStats: {
      currentIndex: 0,
      totalWords: 0,
      accuracy: 0,
      isComplete: false,
      aiDecisions: 0,
      sessionDuration: 0,
    },
  });

  const sessionInitializedRef = useRef(false);
  const lastLanguageRef = useRef<string>('');

  // Initialize AI learning when component mounts or language changes
  useEffect(() => {
    if (language && language !== lastLanguageRef.current) {
      lastLanguageRef.current = language;
      sessionInitializedRef.current = false;
    }
  }, [language]);

  // Set AI enabled state
  useEffect(() => {
    aiEnhancedWordService.setAIEnabled(enableAIOption);
    setState(prev => ({ ...prev, isAIEnabled: enableAIOption }));
  }, [enableAIOption]);

  /**
   * Initialize AI-enhanced learning session
   */
  const initializeSession = useCallback(
    async (languageCode: string, moduleId?: string): Promise<boolean> => {
      try {
        logger.debug(`🚀 Initializing AI learning session for ${languageCode}`);

        const success = await aiEnhancedWordService.initializeLearningSession(
          languageCode,
          userId,
          moduleId,
          wordProgress
        );

        if (success) {
          sessionInitializedRef.current = true;
          await refreshCurrentWord();

          logger.debug('✅ AI learning session initialized successfully');
          return true;
        } else {
          logger.warn('❌ Failed to initialize AI learning session');
          return false;
        }
      } catch (error) {
        logger.error('AI learning session initialization failed:', error);
        return false;
      }
    },
    [userId, wordProgress]
  );

  /**
   * Refresh current word with AI analysis
   */
  const refreshCurrentWord = useCallback(async (): Promise<void> => {
    try {
      const wordInfo = await aiEnhancedWordService.getCurrentWord();
      const stats = aiEnhancedWordService.getSessionStats();

      if (wordInfo) {
        setState(prev => ({
          ...prev,
          currentWord: wordInfo.word,
          quizMode: wordInfo.quizMode,
          options: wordInfo.options,
          isReviewWord: wordInfo.isReviewWord,
          progress: wordInfo.progress,
          wordType: wordInfo.wordType,
          aiDecision: wordInfo.aiDecision,
          shouldShowIntervention: wordInfo.shouldShowIntervention || false,
          interventionMessage: wordInfo.interventionMessage || '',
          sessionStats: stats,
        }));

        // Log AI decision if present
        if (wordInfo.aiDecision) {
          logger.debug('🤖 AI decision applied:', {
            word: wordInfo.word?.term,
            mode: wordInfo.quizMode,
            reasoning: wordInfo.aiDecision.reasoning,
            confidence: wordInfo.aiDecision.confidence,
          });
        }
      } else {
        // Session complete
        setState(prev => ({
          ...prev,
          currentWord: null,
          sessionStats: { ...stats, isComplete: true },
        }));
      }
    } catch (error) {
      logger.error('Failed to refresh current word:', error);
    }
  }, []);

  /**
   * Record answer with AI tracking and intervention detection
   */
  const recordAnswer = useCallback(
    async (
      isCorrect: boolean,
      timeSpent = 0,
      hintsUsed = 0
    ): Promise<{
      isComplete: boolean;
      shouldShowIntervention: boolean;
      interventionMessage?: string;
    }> => {
      try {
        const result = await aiEnhancedWordService.recordAnswer(isCorrect, timeSpent, hintsUsed);

        // Update state with AI recommendations
        setState(prev => ({
          ...prev,
          aiRecommendations: result.aiRecommendations || [],
          sessionStats: aiEnhancedWordService.getSessionStats(),
        }));

        // If session is complete, don't try to get next word
        if (result.isSessionComplete) {
          setState(prev => ({
            ...prev,
            currentWord: null,
            sessionStats: { ...prev.sessionStats, isComplete: true },
          }));

          return {
            isComplete: true,
            shouldShowIntervention: false,
          };
        }

        // Refresh to get next word
        await refreshCurrentWord();

        // Handle AI interventions
        const shouldShowIntervention = result.shouldIntervene || false;
        const interventionMessage = result.intervention?.message || '';

        if (shouldShowIntervention) {
          logger.debug('🚨 AI intervention triggered:', {
            type: result.intervention?.type,
            message: interventionMessage,
            priority: result.intervention?.priority,
          });
        }

        return {
          isComplete: false,
          shouldShowIntervention,
          interventionMessage,
        };
      } catch (error) {
        logger.error('Failed to record AI-enhanced answer:', error);
        return {
          isComplete: false,
          shouldShowIntervention: false,
        };
      }
    },
    [refreshCurrentWord]
  );

  /**
   * Dismiss current intervention
   */
  const skipIntervention = useCallback(() => {
    setState(prev => ({
      ...prev,
      shouldShowIntervention: false,
      interventionMessage: '',
    }));
  }, []);

  /**
   * Enable or disable AI features
   */
  const toggleAI = useCallback((enabled: boolean) => {
    aiEnhancedWordService.setAIEnabled(enabled);
    setState(prev => ({
      ...prev,
      isAIEnabled: enabled,
    }));
  }, []);

  // Auto-initialize session when language is available and not already initialized
  useEffect(() => {
    if (language && !sessionInitializedRef.current && enableAIOption) {
      initializeSession(language);
    }
  }, [language, enableAIOption, initializeSession]);

  const actions: AILearningActions = {
    initializeSession,
    recordAnswer,
    skipIntervention,
    toggleAI,
    refreshCurrentWord,
  };

  return [state, actions];
};
