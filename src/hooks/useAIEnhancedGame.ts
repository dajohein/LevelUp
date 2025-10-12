/**
 * AI-Enhanced Game Hook (Simple Version)
 * 
 * Extends the existing useEnhancedGame with simple AI features.
 * This is a gradual introduction of AI capabilities without breaking changes.
 */

import { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { enhancedWordService } from '../services/enhancedWordService';
import { simpleAILearning, SimpleAIContext } from '../services/simpleAILearning';
import { logger } from '../services/logger';

export interface AIEnhancedGameState {
  isUsingSpacedRepetition: boolean;
  isUsingAI: boolean; // New: AI enhancement flag
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
    aiReasoning?: string[]; // New: AI decision reasoning
    aiConfidence?: number; // New: AI confidence score
  } | null;
  recommendations: string[];
  sessionEvents: SimpleAIContext['sessionEvents']; // New: Track AI events
}

export const useAIEnhancedGame = (languageCode: string, moduleId?: string, enableAI = true) => {
  const { wordProgress } = useSelector((state: RootState) => state.game);

  const [enhancedState, setEnhancedState] = useState<AIEnhancedGameState>({
    isUsingSpacedRepetition: false,
    isUsingAI: enableAI,
    sessionProgress: null,
    currentWordInfo: null,
    recommendations: [],
    sessionEvents: []
  });

  const [wordStartTime, setWordStartTime] = useState<number>(Date.now());

  /**
   * Initialize enhanced learning session with optional AI
   */
  const initializeEnhancedSession = useCallback(async () => {
    if (!languageCode) {
      logger.warn('No language code provided for enhanced session');
      return;
    }

    try {
      logger.info(`🚀 Starting ${enableAI ? 'AI-enhanced' : 'standard'} learning session for ${languageCode}`);
      
      const sessionInitialized = enhancedWordService.initializeLearningSession(languageCode, moduleId, wordProgress);
      
      if (!sessionInitialized) {
        logger.error('Failed to initialize enhanced session');
        return;
      }
      
      setEnhancedState(prev => ({
        ...prev,
        isUsingSpacedRepetition: true,
        sessionProgress: {
          currentIndex: 0,
          totalWords: 10, // We'll update this as we go
          correctAnswers: 0,
          accuracy: 0,
          timeElapsed: 0,
          sessionType: 'enhanced'
        },
        recommendations: []
      }));

      // Load first word with AI enhancement
      await loadNextWord();

    } catch (error) {
      logger.error('Enhanced session initialization failed:', error);
    }
  }, [languageCode, moduleId, enableAI]);

  /**
   * Load next word with AI-driven quiz mode selection
   */
  const loadNextWord = useCallback(async () => {
    if (!languageCode) return;

    try {
      const currentWordInfo = enhancedWordService.getCurrentWord();
      
      if (!currentWordInfo) {
        logger.warn('No more words available');
        return;
      }

      const { word, quizMode: defaultQuizMode, options } = currentWordInfo;
      let finalQuizMode = defaultQuizMode;
      let aiReasoning: string[] = [];
      let aiConfidence = 1.0;

      // Apply AI enhancement if enabled
      if (enableAI && enhancedState.sessionEvents.length > 0) {
        try {
          const currentPerformance = simpleAILearning.analyzeSessionPerformance(enhancedState.sessionEvents);
          
          const context: SimpleAIContext = {
            languageCode,
            sessionEvents: enhancedState.sessionEvents,
            currentPerformance
          };

          const wordProgressData = word ? wordProgress[word.id] : undefined;
          const aiDecision = simpleAILearning.makeAdaptiveDecision(context, wordProgressData);
          
          finalQuizMode = aiDecision.quizMode;
          aiReasoning = aiDecision.reasoning;
          aiConfidence = aiDecision.confidence;

          logger.debug(`🤖 AI selected quiz mode: ${finalQuizMode} (confidence: ${aiConfidence.toFixed(2)})`, {
            reasoning: aiReasoning
          });

        } catch (error) {
          logger.error('AI enhancement failed, using default quiz mode:', error);
          aiReasoning = ['AI enhancement unavailable, using default mode'];
          aiConfidence = 0.5;
        }
      }

      setEnhancedState(prev => ({
        ...prev,
        currentWordInfo: {
          word,
          quizMode: finalQuizMode,
          options,
          isReviewWord: currentWordInfo.isReviewWord,
          wordType: currentWordInfo.wordType,
          aiReasoning: enableAI ? aiReasoning : undefined,
          aiConfidence: enableAI ? aiConfidence : undefined
        }
      }));

      setWordStartTime(Date.now());

    } catch (error) {
      logger.error('Failed to load next word:', error);
    }
  }, [languageCode, moduleId, enableAI, wordProgress, enhancedState.sessionEvents]);

  /**
   * Track word attempt with AI learning
   */
  const trackWordAttempt = useCallback((wordId: string, correct: boolean) => {
    const responseTime = Date.now() - wordStartTime;
    
    // Record answer in enhanced word service
    const result = enhancedWordService.recordAnswer(correct, responseTime);
    
    // Add to session events for AI analysis
    setEnhancedState(prev => ({
      ...prev,
      sessionEvents: [
        ...prev.sessionEvents,
        {
          wordId,
          correct,
          responseTime,
          timestamp: Date.now()
        }
      ],
      sessionProgress: prev.sessionProgress ? {
        ...prev.sessionProgress,
        correctAnswers: correct ? prev.sessionProgress.correctAnswers + 1 : prev.sessionProgress.correctAnswers,
        currentIndex: prev.sessionProgress.currentIndex + 1,
        accuracy: (prev.sessionProgress.correctAnswers + (correct ? 1 : 0)) / (prev.sessionProgress.currentIndex + 1)
      } : null
    }));

    logger.debug(`📊 Word attempt tracked: ${wordId} - ${correct ? 'correct' : 'incorrect'} (${responseTime}ms)`);
    
    // If session is not complete, load next word
    if (!result.isSessionComplete) {
      loadNextWord();
    }
    
    return result.isSessionComplete;
  }, [wordStartTime, loadNextWord]);

  /**
   * Public interface that matches the original useEnhancedGame
   */
  return {
    // Original interface
    enhancedState: {
      isUsingSpacedRepetition: enhancedState.isUsingSpacedRepetition,
      sessionProgress: enhancedState.sessionProgress,
      currentWordInfo: enhancedState.currentWordInfo ? {
        word: enhancedState.currentWordInfo.word,
        quizMode: enhancedState.currentWordInfo.quizMode,
        options: enhancedState.currentWordInfo.options,
        isReviewWord: enhancedState.currentWordInfo.isReviewWord,
        wordType: enhancedState.currentWordInfo.wordType
      } : null,
      recommendations: enhancedState.recommendations
    },
    
    // Enhanced interface
    aiEnhancedState: enhancedState,
    
    // Methods
    initializeEnhancedSession,
    loadNextWord,
    trackWordAttempt,
    
    // AI-specific methods
    getAIInsights: useCallback(() => {
      if (!enableAI) return null;
      
      const performance = simpleAILearning.analyzeSessionPerformance(enhancedState.sessionEvents);
      return {
        performance,
        currentWordReasoning: enhancedState.currentWordInfo?.aiReasoning || [],
        confidence: enhancedState.currentWordInfo?.aiConfidence || 0
      };
    }, [enableAI, enhancedState.sessionEvents, enhancedState.currentWordInfo]),
    
    toggleAI: useCallback(() => {
      setEnhancedState(prev => ({
        ...prev,
        isUsingAI: !prev.isUsingAI
      }));
    }, [])
  };
};

// Backward compatibility export
export const useEnhancedGameWithAI = useAIEnhancedGame;