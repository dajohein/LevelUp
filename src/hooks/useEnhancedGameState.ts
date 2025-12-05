import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../store/store';
import {
  nextWord,
  setCurrentWord,
  setLanguage,
  setCurrentModule,
  checkAnswer,
} from '../store/gameSlice';
import {
  addTimeElapsed,
  completeSession,
  addPerfectAccuracyBonus,
  setLanguage as setSessionLanguage,
  clearStaleSession,
} from '../store/sessionSlice';
import { useEnhancedGame } from './useEnhancedGame';
import { useLevelUpDetection } from './useLevelUpDetection';
import { useAudio } from '../features/audio/AudioContext';
import { words } from '../services/wordService';
import { gameServices } from '../services/game';
import { challengeServiceManager } from '../services/challengeServiceManager';

export interface GameState {
  inputValue: string;
  setInputValue: (value: string) => void;
  isTransitioning: boolean;
  setIsTransitioning: (transitioning: boolean) => void;
  languageName: string;
  languageFlag: string;
  sessionTimer: number;
  wordTimer: number;
  wordStartTime: number | null;
  sessionCompleted: boolean;
  showLearningCard: boolean;
  lastAnswerCorrect: boolean | null;
  setLastAnswerCorrect: (correct: boolean | null) => void;
  lastSelectedAnswer: string;
  setLastSelectedAnswer: (answer: string) => void;
  feedbackQuestionKey: string;
  setFeedbackQuestionKey: (key: string) => void;
  feedbackWordInfo: {
    originalWord: string;
    correctAnswer: string;
    context: string;
  } | null;
  setFeedbackWordInfo: (info: any) => void;
}

export interface GameHandlers {
  handleSubmit: (answer: string) => void;
  handleOpenQuestionSubmit: () => void;
  handleWordTransition: (
    transitionType?: 'enhanced' | 'standard' | 'quiz',
    additionalData?: any
  ) => Promise<void>;
  handleContinueFromLearningCard: () => void;
  checkAnswerCorrectness: (answer: string) => boolean;
  formatTime: (seconds: number) => string;
}

export interface GameHelpers {
  getQuestionWord: (word: any) => string;
  getAnswerWord: (word: any) => string;
  isUnidirectionalMode: (quizMode: string) => boolean;
  getQuizQuestion: (word: any, quizMode: string) => string;
  getQuizAnswer: (word: any, quizMode: string) => string;
  contextForWord: any;
  wordLearningStatus: {
    isTrulyNewWord: boolean;
    needsReinforcement: boolean;
  };
}

export interface UseEnhancedGameStateProps {
  languageCode: string;
  moduleId?: string;
  currentWord: any;
  quizMode: string;
  wordProgress: any;
  currentSession: any;
  sessionProgress: any;
  isSessionActive: boolean;
  sessionStartTime: number | null;
  gameLanguage: string | null;
}

export interface UseEnhancedGameStateReturn {
  gameState: GameState;
  gameHandlers: GameHandlers;
  gameHelpers: GameHelpers;
  enhancedGame: {
    isUsingSpacedRepetition: boolean;
    handleEnhancedAnswer: (isCorrect: boolean) => any;
    getCurrentWordInfo: () => any;
    getSessionStats: () => any;
    forceCompleteSession: () => void;
  };
  levelUp: {
    showLevelUp: boolean;
    newLevel: number;
    totalXP: number;
    closeLevelUp: () => void;
  };
  audio: {
    playCorrect: () => void;
    playIncorrect: () => void;
  };
}

export const useEnhancedGameState = ({
  languageCode,
  moduleId,
  currentWord,
  quizMode,
  wordProgress,
  currentSession,
  sessionProgress,
  isSessionActive,
  sessionStartTime,
  gameLanguage,
}: UseEnhancedGameStateProps): UseEnhancedGameStateReturn => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Get current module from Redux state for debugging
  const currentModule = useSelector((state: RootState) => state.game.module);

  // Local UI state
  const [inputValue, setInputValue] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [languageName, setLanguageName] = useState('');
  const [languageFlag, setLanguageFlag] = useState('');
  const [sessionTimer, setSessionTimer] = useState(0);
  const [wordTimer, setWordTimer] = useState(0);
  const [wordStartTime, setWordStartTime] = useState<number | null>(null);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [showLearningCard, setShowLearningCard] = useState(false);

  // Ref to prevent multiple session initializations
  const sessionInitializedRef = useRef(false);

  // Feedback state for enhanced learning system
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [lastSelectedAnswer, setLastSelectedAnswer] = useState<string>('');
  const [feedbackQuestionKey, setFeedbackQuestionKey] = useState<string>('');
  const [feedbackWordInfo, setFeedbackWordInfo] = useState<{
    originalWord: string;
    correctAnswer: string;
    context: string;
  } | null>(null);

  const previousWordRef = useRef<string>('');

  // Enhanced integrations
  const { playCorrect, playIncorrect } = useAudio();
  const {
    isUsingSpacedRepetition,
    handleEnhancedAnswer,
    getCurrentWordInfo,
    getSessionStats,
    forceCompleteSession,
  } = useEnhancedGame(languageCode, moduleId);
  const { showLevelUp, newLevel, totalXP, closeLevelUp } = useLevelUpDetection();

  // Helper functions
  const getQuestionWord = useCallback((word: any): string => {
    return gameServices.modeHandler.getQuestionWord(word);
  }, []);

  const getAnswerWord = useCallback((word: any): string => {
    return gameServices.modeHandler.getAnswerWord(word);
  }, []);

  const isUnidirectionalMode = useCallback((quizMode: string): boolean => {
    return gameServices.modeHandler.isUnidirectionalMode(quizMode);
  }, []);

  const getQuizQuestion = useCallback((word: any, quizMode: string): string => {
    return gameServices.modeHandler.getQuizQuestion(word, quizMode);
  }, []);

  const getQuizAnswer = useCallback((word: any, quizMode: string): string => {
    return gameServices.modeHandler.getQuizAnswer(word, quizMode);
  }, []);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Context calculation (memoized to prevent render loops)
  const contextForWord = useMemo(() => {
    const enhancedWordInfo = getCurrentWordInfo();
    const wordToUse = enhancedWordInfo?.word || currentWord;
    if (!wordToUse) return null;
    return gameServices.modeHandler.getContextForDirection(wordToUse);
  }, [currentWord?.id, getCurrentWordInfo]);

  // Learning status calculation
  const wordLearningStatus = useMemo(() => {
    if (!currentWord) return { isTrulyNewWord: false, needsReinforcement: false };

    const status = gameServices.progressTracker.calculateWordLearningStatus(
      currentWord,
      wordProgress,
      false
    );

    return {
      isTrulyNewWord: status.isTrulyNewWord,
      needsReinforcement: status.needsReinforcement,
    };
  }, [currentWord?.id, wordProgress]);

  // Answer correctness checker
  const checkAnswerCorrectness = useCallback(
    (answer: string): boolean => {
      const enhancedWordInfo = getCurrentWordInfo();
      const wordToUse = enhancedWordInfo?.word || currentWord;

      if (!wordToUse) return false;

      const quizModeToUse = enhancedWordInfo?.quizMode || quizMode;

      // For enhanced comprehension modes, any non-empty answer is considered correct
      // These are open-ended learning exercises, not strict quizzes
      if (['contextual-analysis', 'usage-example', 'synonym-antonym'].includes(quizModeToUse)) {
        return answer.trim().length > 0; // Accept any meaningful input
      }

      const correctAnswer = getQuizAnswer(wordToUse, quizModeToUse);
      return answer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
    },
    [currentWord, quizMode, getCurrentWordInfo, getQuizAnswer]
  );

  // Main submission handler
  const handleSubmit = useCallback(
    (answer: string) => {
      const enhancedWordInfo = getCurrentWordInfo();
      const currentWordToUse = gameServices.modeHandler.getCurrentWord(
        enhancedWordInfo,
        currentWord
      );
      const quizModeToUse = gameServices.modeHandler.getCurrentQuizMode(enhancedWordInfo, quizMode);

      // Validate answer and get feedback using service
      const validationResult = gameServices.progressTracker.validateAnswer(
        answer,
        currentWordToUse,
        quizModeToUse,
        wordProgress,
        getQuizQuestion,
        getQuizAnswer,
        getQuestionWord,
        getAnswerWord,
        checkAnswerCorrectness,
        (mode: string) => gameServices.modeHandler.isUnidirectionalMode(mode)
      );

      // Update feedback state
      setFeedbackWordInfo(validationResult.feedbackInfo);
      setLastAnswerCorrect(validationResult.isCorrect);
      setLastSelectedAnswer(answer);
      setFeedbackQuestionKey(
        gameServices.progressTracker.generateFeedbackKey(currentWordToUse, getQuestionWord)
      );

      // Play audio feedback
      if (validationResult.isCorrect) {
        playCorrect();
      } else {
        playIncorrect();
      }

      // CRITICAL: Dispatch game/checkAnswer action to update word progress
      // This ensures word progress is saved and modules show correct completion percentages
      dispatch(checkAnswer(answer));

      // Handle enhanced vs standard game logic
      if (isUsingSpacedRepetition) {
        const result = handleEnhancedAnswer(validationResult.isCorrect);

        const completionResult = gameServices.sessionManager.handleEnhancedSessionCompletion(
          result,
          gameLanguage || undefined,
          languageCode
        );

        if (completionResult.isComplete && completionResult.shouldNavigate) {
          setSessionCompleted(true);
          navigate(completionResult.navigationPath!);
          return;
        }
      }

      // Standard game logic
      setInputValue('');
      setIsTransitioning(true);

      gameServices.sessionManager.handleAnswerSubmission(
        validationResult.isCorrect,
        currentSession,
        isSessionActive,
        sessionTimer,
        sessionProgress
      );

      // Trigger delayed transition
      setTimeout(
        () => {
          handleWordTransition();
        },
        gameServices.modeHandler.getOptimalTiming(quizModeToUse, validationResult.isCorrect)
      );
    },
    [
      currentWord,
      quizMode,
      wordProgress,
      currentSession,
      sessionProgress,
      isSessionActive,
      sessionTimer,
      languageCode,
      gameLanguage,
      isUsingSpacedRepetition,
      getCurrentWordInfo,
      handleEnhancedAnswer,
      getQuizQuestion,
      getQuizAnswer,
      getQuestionWord,
      getAnswerWord,
      checkAnswerCorrectness,
      playCorrect,
      playIncorrect,
      navigate,
    ]
  );

  // Word transition handler
  const handleWordTransition = useCallback(
    async (transitionType: 'enhanced' | 'standard' | 'quiz' = 'standard', additionalData?: any) => {
      try {
        await new Promise(resolve => setTimeout(resolve, 2000));

        if (transitionType === 'enhanced') {
          const result = additionalData;
          if (result && typeof result === 'object' && 'isComplete' in result && result.isComplete) {
            setSessionCompleted(true);
          } else {
            setIsTransitioning(false);
            setWordTimer(0);
            setWordStartTime(Date.now());
          }
          return;
        }

        setIsTransitioning(false);
        setWordTimer(0);
        setWordStartTime(Date.now());

        if (!isUsingSpacedRepetition && isSessionActive && currentSession) {
          if (
            currentSession?.id &&
            challengeServiceManager.isSessionTypeSupported(currentSession.id)
          ) {
            const timeRemaining = Math.max(0, currentSession.timeLimit! * 60 - sessionTimer);

            const context = {
              wordsCompleted: sessionProgress.wordsCompleted,
              currentStreak: sessionProgress.currentStreak,
              timeRemaining,
              targetWords: currentSession.targetWords || 15,
              wordProgress,
              languageCode: languageCode,
              moduleId: currentModule || undefined, // Add current module for module-specific practice
            };

            const result = await challengeServiceManager.getNextWord(currentSession.id, context);

            if (result.word) {
              dispatch(
                setCurrentWord({
                  word: result.word,
                  options: result.options,
                  quizMode: result.quizMode,
                })
              );
            }
          } else {
            dispatch(nextWord());
          }
        }
      } catch (error) {
        console.error(`Failed to get next word from ${currentSession?.id} service:`, error);
        dispatch(nextWord());
      }
    },
    [
      currentSession?.id,
      sessionProgress.wordsCompleted,
      sessionProgress.currentStreak,
      sessionTimer,
      wordProgress,
      languageCode,
      isUsingSpacedRepetition,
      dispatch,
    ]
  );

  const handleOpenQuestionSubmit = useCallback(() => {
    handleSubmit(inputValue);
  }, [handleSubmit, inputValue]);

  const handleContinueFromLearningCard = useCallback(() => {
    setShowLearningCard(false);
  }, []);

  // Reset feedback state when word changes
  useEffect(() => {
    const enhancedWordInfo = getCurrentWordInfo();
    const wordToUse = enhancedWordInfo?.word || currentWord;
    const currentQuestionKey = `${wordToUse?.id || 'unknown'}-${
      wordToUse ? getQuestionWord(wordToUse) : 'unknown'
    }`;

    if (previousWordRef.current && previousWordRef.current !== currentQuestionKey) {
      setLastAnswerCorrect(null);
      setLastSelectedAnswer('');
      setFeedbackQuestionKey('');
      setFeedbackWordInfo(null);
    }
    previousWordRef.current = currentQuestionKey;
  }, [currentWord, getCurrentWordInfo, getQuestionWord]);

  // Learning card display logic
  useEffect(() => {
    if (currentWord) {
      const enhancedWordInfo = getCurrentWordInfo();
      const wordXP = wordProgress[currentWord.id]?.xp || 0;

      // Show learning card for truly new words regardless of spaced repetition mode
      // This ensures new words get proper introduction in both enhanced and session modes
      const shouldShowCard =
        wordLearningStatus.isTrulyNewWord ||
        (wordLearningStatus.needsReinforcement && isUsingSpacedRepetition);

      // In spaced repetition mode, use the full enhanced logic
      if (
        isUsingSpacedRepetition &&
        enhancedWordInfo &&
        enhancedWordInfo.wordType === 'group' &&
        !enhancedWordInfo.isReviewWord
      ) {
        setShowLearningCard(shouldShowCard);
      }
      // In session mode, show learning card for truly new words only
      // FIXED: Also check XP directly to ensure 0 XP words always get learning cards
      else if (isSessionActive && (wordLearningStatus.isTrulyNewWord || wordXP === 0)) {
        setShowLearningCard(true);
      }
      // Default case - no learning card
      else {
        setShowLearningCard(false);
      }
    } else {
      setShowLearningCard(false);
    }
  }, [
    isUsingSpacedRepetition,
    isSessionActive,
    currentWord,
    wordLearningStatus,
    getCurrentWordInfo,
    wordProgress,
  ]);

  // Clear stale sessions first, before any other initialization
  useEffect(() => {
    if (languageCode) {
      dispatch(clearStaleSession());
    }
  }, [languageCode, dispatch]); // Run immediately when languageCode is available

  // Language initialization (runs after stale session clearing)
  useEffect(() => {
    if (languageCode) {
      dispatch(setLanguage(languageCode));
      dispatch(setSessionLanguage(languageCode));

      if (moduleId) {
        dispatch(setCurrentModule(moduleId));
      }

      const langData = words[languageCode];
      if (langData) {
        setLanguageName(langData.name);
        setLanguageFlag(langData.flag);
      }

      // Only initialize session if one is actually active (user has started a session)
      // FIXED: Add sessionInitialized ref to prevent multiple initializations
      if (
        !isUsingSpacedRepetition &&
        isSessionActive &&
        currentSession &&
        !sessionInitializedRef.current
      ) {
        sessionInitializedRef.current = true;
        gameServices.sessionManager
          .initializeSession(
            currentSession,
            languageCode,
            wordProgress,
            sessionProgress,
            currentModule || undefined // Pass current module for module-specific practice
          )
          .then(success => {
            if (!success) {
              dispatch(nextWord());
            }
          })
          .catch(error => {
            console.error(`Failed to initialize session:`, error);
            dispatch(nextWord());
          });
      }
    }
  }, [dispatch, languageCode, moduleId, isSessionActive]); // Removed currentSession?.id to prevent re-runs

  // Session state management
  useEffect(() => {
    if (isSessionActive && currentSession) {
      setSessionCompleted(false);
      setSessionTimer(0);
      setWordTimer(0);
      setWordStartTime(Date.now());
      // Reset session initialization flag when a new session becomes active
      sessionInitializedRef.current = false;
    }
  }, [isSessionActive, currentSession?.id]);

  // Session completion logic
  useEffect(() => {
    const checkCompletion = () => {
      if (!currentSession || !isSessionActive || sessionCompleted) return;

      const shouldComplete =
        (currentSession.targetWords !== -1 &&
          sessionProgress.wordsCompleted >= currentSession.targetWords) ||
        (currentSession.timeLimit && sessionTimer >= currentSession.timeLimit * 60) ||
        (currentSession.allowedMistakes !== undefined &&
          sessionProgress.incorrectAnswers > currentSession.allowedMistakes);

      if (shouldComplete) {
        setSessionCompleted(true);

        if (currentSession.id === 'precision-mode' && sessionProgress.incorrectAnswers === 0) {
          dispatch(addPerfectAccuracyBonus());
        }

        if (isUsingSpacedRepetition) {
          forceCompleteSession();
        }

        dispatch(completeSession());
        navigate(`/completed/${languageCode}`);
      }
    };

    if (isSessionActive && currentSession) {
      checkCompletion();
    }
  }, [
    sessionProgress.wordsCompleted,
    sessionProgress.incorrectAnswers,
    isSessionActive,
    currentSession,
    sessionCompleted,
    sessionTimer,
    dispatch,
    navigate,
    languageCode,
    isUsingSpacedRepetition,
    forceCompleteSession,
  ]);

  // Timer system
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSessionActive && sessionStartTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const sessionElapsed = Math.floor((now - sessionStartTime) / 1000);
        setSessionTimer(sessionElapsed);
        dispatch(addTimeElapsed(1));

        if (currentSession?.id === 'quick-dash' && wordStartTime && !isTransitioning) {
          const wordElapsed = Math.floor((now - wordStartTime) / 1000);
          setWordTimer(wordElapsed);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [
    isSessionActive,
    sessionStartTime,
    wordStartTime,
    isTransitioning,
    currentSession?.id,
    dispatch,
  ]);

  return {
    gameState: {
      inputValue,
      setInputValue,
      isTransitioning,
      setIsTransitioning,
      languageName,
      languageFlag,
      sessionTimer,
      wordTimer,
      wordStartTime,
      sessionCompleted,
      showLearningCard,
      lastAnswerCorrect,
      setLastAnswerCorrect,
      lastSelectedAnswer,
      setLastSelectedAnswer,
      feedbackQuestionKey,
      setFeedbackQuestionKey,
      feedbackWordInfo,
      setFeedbackWordInfo,
    },
    gameHandlers: {
      handleSubmit,
      handleOpenQuestionSubmit,
      handleWordTransition,
      handleContinueFromLearningCard,
      checkAnswerCorrectness,
      formatTime,
    },
    gameHelpers: {
      getQuestionWord,
      getAnswerWord,
      isUnidirectionalMode,
      getQuizQuestion,
      getQuizAnswer,
      contextForWord,
      wordLearningStatus,
    },
    enhancedGame: {
      isUsingSpacedRepetition,
      handleEnhancedAnswer,
      getCurrentWordInfo,
      getSessionStats,
      forceCompleteSession,
    },
    levelUp: {
      showLevelUp,
      newLevel,
      totalXP,
      closeLevelUp,
    },
    audio: {
      playCorrect,
      playIncorrect,
    },
  };
};
