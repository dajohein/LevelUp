import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import styled from '@emotion/styled';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { RootState } from '../store/store';
import { nextWord, setLanguage, setCurrentModule } from '../store/gameSlice';
import {
  addTimeElapsed,
  completeSession,
  incrementWordsCompleted,
  addPerfectAccuracyBonus,
  setLanguage as setSessionLanguage,
} from '../store/sessionSlice';
import { useAudio } from '../features/audio/AudioContext';
import { words } from '../services/wordService';
import { calculateMasteryDecay } from '../services/masteryService';
import { useEnhancedGame } from '../hooks/useEnhancedGame';
import { UnifiedLoading } from './feedback/UnifiedLoading';
import { FeedbackOverlay } from './feedback/FeedbackOverlay';
import { AchievementManager } from './AchievementManager';
import { MultipleChoiceQuiz } from './quiz/MultipleChoiceQuiz';
import { OpenQuestionQuiz } from './quiz/OpenQuestionQuiz';
import { LetterScrambleQuiz } from './quiz/LetterScrambleQuiz';
import { LearningCard } from './quiz/LearningCard';
import { Navigation } from './Navigation';
import { LearningProgress } from './LearningProgress';
import { StorageManagement } from './StorageManagement';
import { LevelUpNotification } from './animations/LevelUpNotification';
import { useLevelUpDetection } from '../hooks/useLevelUpDetection';
import { keyframes, css } from '@emotion/react';
// Import styled components from our new component library
import { BaseButton } from '../styles/components/buttons';
import { 
  GameContentContainer, 
  SkipButtonContainer,
  QuickDashContainer as StyledQuickDashContainer,
  DeepDiveContainer as StyledDeepDiveContainer,
  StreakChallengeContainer as StyledStreakChallengeContainer,
  PrecisionModeContainer as StyledPrecisionModeContainer,
  BossBattleContainer as StyledBossBattleContainer
} from '../styles/components/gameLayouts';
import {
  ProgressItem as StyledProgressItem,
  ProgressValue as StyledProgressValue,
  ProgressLabel as StyledProgressLabel,
  BossIndicator as StyledBossIndicator,
  SpeedMeter as StyledSpeedMeter,
  StreakMultiplier as StyledStreakMultiplier,
  AccuracyMeter as StyledAccuracyMeter,
  BrainMeter as StyledBrainMeter,
  BossAvatar as StyledBossAvatar,
  BossNamePlate as StyledBossNamePlate,
  BossName as StyledBossName
} from '../styles/components/gameUI';

// Session Progress Animations
const progressShimmer = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

const GameContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: calc(100vh - 120px); /* Full height minus fixed headers */
  min-height: calc(100dvh - 120px); /* Dynamic viewport height for mobile */
  padding: ${props => props.theme.spacing.xl};
  padding-top: calc(
    120px + ${props => props.theme.spacing.lg}
  ); /* Account for Navigation (60px) + Progress (~60px) */
  padding-bottom: ${props => props.theme.spacing.xl};
  background-color: ${props => props.theme.colors.background};
  overflow-y: auto; /* Make content scrollable */
  overflow-x: hidden;
  box-sizing: border-box;
  position: relative; /* For floating directional hint */

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.md};
    padding-top: calc(100px + ${props => props.theme.spacing.md});
    padding-bottom: ${props => props.theme.spacing.lg};
    min-height: calc(100dvh - 100px);
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.sm};
    padding-top: calc(90px + ${props => props.theme.spacing.sm});
    padding-bottom: ${props => props.theme.spacing.md};
    min-height: calc(100dvh - 90px);
  }
`;

const SessionProgressBar = styled.div`
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.1) 0%,
    rgba(147, 51, 234, 0.1) 50%,
    rgba(236, 72, 153, 0.1) 100%
  );
  border: 2px solid rgba(59, 130, 246, 0.2);
  border-radius: 20px;
  padding: ${props => props.theme.spacing.lg};
  margin-bottom: ${props => props.theme.spacing.lg};
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(59, 130, 246, 0.2);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    ${css`
      animation: ${progressShimmer} 3s infinite;
    `}
  }

  @media (max-width: 768px) {
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.md};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
    margin-bottom: ${props => props.theme.spacing.xs};
    border-radius: 8px;
    border-width: 1px;
    flex-direction: row !important;
    justify-content: space-around;
    gap: ${props => props.theme.spacing.xs};
    min-height: auto;
    
    &:hover {
      transform: none;
    }
    
    &::before {
      display: none;
    }
  }
`;

const BossTitle = styled.div`
  font-size: 0.9rem;
  color: #dc143c;
  font-style: italic;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
`;

const HealthBarContainer = styled.div`
  margin-left: 60px;
  position: relative;
`;

const HealthBarBackground = styled.div`
  width: 100%;
  height: 24px;
  background: linear-gradient(90deg, rgba(139, 0, 0, 0.3), rgba(0, 0, 0, 0.6));
  border-radius: 12px;
  border: 2px solid #8b0000;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
`;

const HealthBarFill = styled.div<{ health: number }>`
  width: ${props => props.health}%;
  height: 100%;
  background: linear-gradient(90deg, #dc143c 0%, #ff4500 30%, #ffd700 70%, #32cd32 100%);
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.3) 50%,
      transparent 100%
    );
    animation: healthShimmer 2s linear infinite;
  }

  @keyframes healthShimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(300%);
    }
  }
`;

const HealthText = styled.div<{ health: number }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-weight: bold;
  font-size: 0.9rem;
  color: ${props => (props.health > 30 ? '#FFFFFF' : '#FFD700')};
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.9);
  pointer-events: none;
  z-index: 1;
`;

const BossHealthBar = styled.div<{ health: number }>`
  position: relative;
  width: 100%;
  margin-bottom: ${props => props.theme.spacing.lg};
  padding: ${props => props.theme.spacing.md};
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.8), rgba(139, 0, 0, 0.6));
  border-radius: 20px;
  border: 3px solid #8b0000;
  box-shadow: 0 0 20px rgba(139, 0, 0, 0.5), inset 0 0 20px rgba(0, 0, 0, 0.5);
`;

export const Game: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { languageCode, moduleId } = useParams<{ languageCode: string; moduleId?: string }>();
  
  // Optimize Redux selectors with memoization to prevent unnecessary re-renders
  const gameState = useSelector((state: RootState) => ({
    currentWord: state.game.currentWord,
    currentOptions: state.game.currentOptions,
    quizMode: state.game.quizMode,
    wordProgress: state.game.wordProgress,
    capitalizationFeedback: state.game.capitalizationFeedback,
    language: state.game.language,
  }), (left, right) => 
    left.currentWord?.id === right.currentWord?.id &&
    left.quizMode === right.quizMode &&
    left.language === right.language &&
    Object.keys(left.wordProgress).length === Object.keys(right.wordProgress).length
  );
  
  const sessionState = useSelector((state: RootState) => ({
    currentSession: state.session.currentSession,
    progress: state.session.progress,
    isSessionActive: state.session.isSessionActive,
    sessionStartTime: state.session.sessionStartTime,
  }), (left, right) =>
    left.currentSession?.id === right.currentSession?.id &&
    left.isSessionActive === right.isSessionActive &&
    left.progress.wordsCompleted === right.progress.wordsCompleted
  );

  const {
    currentWord,
    currentOptions,
    quizMode,
    wordProgress,
    capitalizationFeedback,
    language: gameLanguage,
  } = gameState;
  
  const {
    currentSession,
    progress: sessionProgress,
    isSessionActive,
    sessionStartTime,
  } = sessionState;

  const [inputValue, setInputValue] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [languageName, setLanguageName] = useState('');
  const [languageFlag, setLanguageFlag] = useState('');
  const [sessionTimer, setSessionTimer] = useState(0);
  const [wordTimer, setWordTimer] = useState(0);
  const [wordStartTime, setWordStartTime] = useState<number | null>(null);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [showLearningCard, setShowLearningCard] = useState(false);

  // Local feedback state for enhanced learning system
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [lastSelectedAnswer, setLastSelectedAnswer] = useState<string>('');
  const [feedbackQuestionKey, setFeedbackQuestionKey] = useState<string>(''); // Track unique question instance
  const [feedbackWordInfo, setFeedbackWordInfo] = useState<{
    originalWord: string;
    correctAnswer: string;
    context: string;
  } | null>(null);
  const previousWordRef = useRef<string>(''); // Track previous word to detect changes
  const { playCorrect, playIncorrect } = useAudio();

  // Enhanced Learning System Integration
  const {
    isUsingSpacedRepetition,
    handleEnhancedAnswer,
    getCurrentWordInfo,
    getSessionStats,
    forceCompleteSession,
  } = useEnhancedGame(languageCode!, moduleId);

  // Level-up detection
  const { showLevelUp, newLevel, totalXP, closeLevelUp } = useLevelUpDetection();

  // Reset feedback state when word changes
  useEffect(() => {
    const enhancedWordInfo = getCurrentWordInfo();
    const wordToUse = enhancedWordInfo?.word || currentWord;
    const currentQuestionKey = `${wordToUse?.id || 'unknown'}-${
      wordToUse ? getQuestionWord(wordToUse) : 'unknown'
    }`;

    // Clear feedback if word has changed
    if (previousWordRef.current && previousWordRef.current !== currentQuestionKey) {
      setLastAnswerCorrect(null);
      setLastSelectedAnswer('');
      setFeedbackQuestionKey('');
      setFeedbackWordInfo(null); // Clear captured feedback info
    }
    previousWordRef.current = currentQuestionKey;
  }, [currentWord]); // Only depend on currentWord state, not functions // Only depend on currentWord, not the function

  // Memoize expensive mastery calculation and learning card decision
  const wordLearningStatus = useMemo(() => {
    if (!currentWord) return { isTrulyNewWord: false, needsReinforcement: false };
    
    const currentWordProgress = wordProgress[currentWord.id];
    
    // Truly new word - never practiced before
    if (!currentWordProgress) {
      return { isTrulyNewWord: true, needsReinforcement: false };
    }
    
    const currentMastery = calculateMasteryDecay(
      currentWordProgress.lastPracticed || '',
      currentWordProgress.xp || 0
    );
    
    // Check if word is truly new (very low mastery)
    const isTrulyNewWord = currentMastery < 20;
    
    // Check if word needs reinforcement due to mistakes
    const needsReinforcement = (
      // Recent mistakes: more incorrect than correct answers
      (currentWordProgress.timesIncorrect > currentWordProgress.timesCorrect) ||
      // Low consecutive correct count (less than 3 in a row)
      ((currentWordProgress.directions?.['term-to-definition']?.consecutiveCorrect || 0) < 3 &&
       (currentWordProgress.directions?.['definition-to-term']?.consecutiveCorrect || 0) < 3) ||
      // Low mastery with some incorrect answers (needs practice)
      (currentMastery < 50 && currentWordProgress.timesIncorrect > 0)
    );
    
    return { isTrulyNewWord, needsReinforcement };
  }, [currentWord?.id, wordProgress]);

  // Check if we should show learning card for new words or words needing reinforcement
  useEffect(() => {
    if (isUsingSpacedRepetition && currentWord) {
      const enhancedWordInfo = getCurrentWordInfo();
      if (
        enhancedWordInfo &&
        enhancedWordInfo.wordType === 'group' &&
        !enhancedWordInfo.isReviewWord
      ) {
        // Show learning card for truly new words OR words that need reinforcement
        const shouldShowCard = wordLearningStatus.isTrulyNewWord || wordLearningStatus.needsReinforcement;
        setShowLearningCard(shouldShowCard);
        
        // Debug logging for development
        if (process.env.NODE_ENV === 'development' && shouldShowCard) {
          console.log(`📚 Learning card shown for word "${currentWord.term}":`, {
            isNew: wordLearningStatus.isTrulyNewWord,
            needsReinforcement: wordLearningStatus.needsReinforcement,
            wordProgress: wordProgress[currentWord.id]
          });
        }
      } else {
        setShowLearningCard(false);
      }
    } else {
      setShowLearningCard(false);
    }
  }, [isUsingSpacedRepetition, currentWord, wordLearningStatus]); // Use memoized status

  useEffect(() => {
    if (languageCode) {
      dispatch(setLanguage(languageCode));
      dispatch(setSessionLanguage(languageCode)); // Set session language separately

      // Set the current module if provided
      if (moduleId) {
        dispatch(setCurrentModule(moduleId));
      }

      // Get language name and flag from dynamic language data
      const langData = words[languageCode];
      if (langData) {
        setLanguageName(langData.name);
        setLanguageFlag(langData.flag);
      }

      // Load the first word after setting the language
      // Use enhanced system by default
      if (!isUsingSpacedRepetition) {
        dispatch(nextWord());
      }
    }
  }, [dispatch, languageCode, moduleId]); // Removed isUsingSpacedRepetition to prevent infinite loops

  // Reset completion flag when session starts
  useEffect(() => {
    if (isSessionActive && currentSession) {
      setSessionCompleted(false);
      setSessionTimer(0);
      setWordTimer(0);
      setWordStartTime(Date.now());
    }
  }, [isSessionActive, currentSession?.id]); // Reset when session starts or changes

  // Separate effect to check session completion after state updates
  useEffect(() => {
    const checkCompletion = () => {
      if (!currentSession || !isSessionActive || sessionCompleted) return;

      const shouldComplete =
        // Target words reached (if not unlimited)
        (currentSession.targetWords !== -1 &&
          sessionProgress.wordsCompleted >= currentSession.targetWords) ||
        // Time limit exceeded (check current timer, but don't depend on it in useEffect)
        (currentSession.timeLimit && sessionTimer >= currentSession.timeLimit * 60) ||
        // Too many mistakes (for precision mode or streak challenge)
        (currentSession.allowedMistakes !== undefined &&
          sessionProgress.incorrectAnswers >= currentSession.allowedMistakes);

      if (shouldComplete) {
        setSessionCompleted(true); // Prevent multiple completions

        // Add perfect accuracy bonus for Precision Mode
        if (currentSession.id === 'precision-mode' && sessionProgress.incorrectAnswers === 0) {
          dispatch(addPerfectAccuracyBonus());
        }

        // Record analytics for enhanced learning system
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
    dispatch,
    navigate,
    languageCode,
  ]);

  // Separate effect for time-based completion to avoid infinite loops
  useEffect(() => {
    if (isSessionActive && currentSession && !sessionCompleted && currentSession.timeLimit) {
      if (sessionTimer >= currentSession.timeLimit * 60) {
        setSessionCompleted(true);

        // Record analytics for enhanced learning system
        if (isUsingSpacedRepetition) {
          forceCompleteSession();
        }

        dispatch(completeSession());
        navigate(`/completed/${languageCode}`);
      }
    }
  }, [
    sessionTimer,
    isSessionActive,
    currentSession,
    sessionCompleted,
    dispatch,
    navigate,
    languageCode,
  ]);

  // Optimized timer system - single timer for both session and word tracking
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSessionActive && sessionStartTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const sessionElapsed = Math.floor((now - sessionStartTime) / 1000);
        setSessionTimer(sessionElapsed);
        dispatch(addTimeElapsed(1));

        // Update word timer for Quick Dash mode
        if (currentSession?.id === 'quick-dash' && wordStartTime && !isTransitioning) {
          const wordElapsed = Math.floor((now - wordStartTime) / 1000);
          setWordTimer(wordElapsed);
        }
      }, 1000); // Single unified timer
    }
    return () => clearInterval(interval);
  }, [isSessionActive, sessionStartTime, currentSession?.id, wordStartTime, isTransitioning, dispatch]);

  const handleSubmit = (answer: string) => {
    // Always use enhanced learning system
    const isCorrect = checkAnswerCorrectness(answer);

    // Get current word info to track feedback BEFORE any state changes
    const enhancedWordInfo = getCurrentWordInfo();
    const currentWordToUse = enhancedWordInfo?.word || currentWord;

    // Capture feedback information immediately before any transitions
    setFeedbackWordInfo({
      originalWord: getQuestionWord(currentWordToUse),
      correctAnswer: getAnswerWord(currentWordToUse),
      context: currentWordToUse?.context || '',
    });

    // Update local feedback state
    setLastAnswerCorrect(isCorrect);
    setLastSelectedAnswer(answer);
    setFeedbackQuestionKey(
      `${currentWordToUse.id}-${getQuestionWord(currentWordToUse)}-${Date.now()}`
    ); // Track unique question instance

    // Play audio feedback
    if (isCorrect) {
      playCorrect();
    } else {
      playIncorrect();
    }

    const result = handleEnhancedAnswer(isCorrect);

    if (result && typeof result === 'object' && 'isComplete' in result) {
      if (result.isComplete) {
        // Session completed - show recommendations and analytics
        setSessionCompleted(true);

        // Use the correct language code for navigation
        const actualLanguageCode = gameLanguage || languageCode;

        // Complete the session in Redux store and navigate
        dispatch(completeSession());
        navigate(`/completed/${actualLanguageCode}`);
      } else {
        // Move to next word
        setInputValue('');
        setIsTransitioning(true);

        // Update session counter if answer was correct and we're in a session
        if (isCorrect && isSessionActive && currentSession) {
          dispatch(incrementWordsCompleted());
        }

        setTimeout(
          () => {
            setIsTransitioning(false);
            setWordTimer(0);
            setWordStartTime(Date.now());
            // Note: feedback state is reset by useEffect when word changes
          },
          isCorrect ? 1200 : 3000
        ); // Fast for correct, slower for incorrect to show feedback
      }
    }
  };

  // Helper function to check answer correctness
  const checkAnswerCorrectness = (answer: string): boolean => {
    const enhancedWordInfo = getCurrentWordInfo();
    const wordToUse = enhancedWordInfo?.word || currentWord;

    if (!wordToUse) return false;

    const correctAnswer = getAnswerWord(wordToUse);
    return answer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
  };

  const handleOpenQuestionSubmit = () => {
    handleSubmit(inputValue);
  };

  const handleContinueFromLearningCard = useCallback(() => {
    setShowLearningCard(false);
  }, []);

  // Helper functions to determine quiz direction
  const getQuestionWord = (word: any) => {
    const direction = word.direction || 'definition-to-term'; // default to old behavior
    return direction === 'definition-to-term' ? word.definition : word.term;
  };

  const getAnswerWord = (word: any) => {
    const direction = word.direction || 'definition-to-term'; // default to old behavior
    return direction === 'definition-to-term' ? word.term : word.definition;
  };

  const getContextForDirection = (word: any) => {
    // If word has explicit context field, use it
    if (word.context) {
      return {
        sentence: word.context.sentence,
        translation: word.context.translation,
      };
    }

    // Fallback: no context available
    return undefined;
  };

  if (!currentWord) {
    return <UnifiedLoading text="Loading words..." />;
  }

  // If we're in session mode but no session is active, redirect to session selection
  // Only redirect if we're specifically on the /game/{lang}/session route, not completed
  const isSessionGameRoute = window.location.pathname.endsWith('/session');
  if (isSessionGameRoute && !isSessionActive) {
    navigate(`/sessions/${languageCode}`);
    return <UnifiedLoading text="Redirecting to session selection..." />;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Function to render themed quiz based on session type
  const renderThemedQuiz = () => {
    // Get word info from enhanced system if available
    const enhancedWordInfo = isUsingSpacedRepetition ? getCurrentWordInfo() : null;
    const wordToUse = enhancedWordInfo?.word || currentWord;
    const quizModeToUse = enhancedWordInfo?.quizMode || quizMode;
    const optionsToUse = enhancedWordInfo?.options || currentOptions || [];

    // Generate unique key for current question
    const currentQuestionKey = `${wordToUse.id}-${getQuestionWord(wordToUse)}`;

    // Only show feedback if it belongs to the current question instance
    const shouldShowFeedback = feedbackQuestionKey.startsWith(currentQuestionKey);
    const currentAnswerCorrect = shouldShowFeedback ? lastAnswerCorrect : null;
    const currentSelectedAnswer = shouldShowFeedback ? lastSelectedAnswer : '';

    const quizContent =
      showLearningCard && isUsingSpacedRepetition ? (
        <LearningCard
          word={wordToUse}
          currentIndex={getSessionStats()?.currentIndex || 0}
          totalWords={getSessionStats()?.totalWords || 1}
          onContinue={handleContinueFromLearningCard}
          autoAdvance={true}
          autoAdvanceDelay={4000} // 4 seconds to read the word
          reason={wordLearningStatus.isTrulyNewWord ? 'new' : 'reinforcement'}
        />
      ) : (
        <>
          {quizModeToUse === 'multiple-choice' ? (
            <MultipleChoiceQuiz
              key={`mc-${wordToUse.id}-${getQuestionWord(wordToUse)}`} // Force remount on word change
              word={getQuestionWord(wordToUse)}
              options={optionsToUse}
              onSelect={handleSubmit}
              isCorrect={currentAnswerCorrect === true}
              selectedOption={currentSelectedAnswer}
              disabled={isTransitioning}
              level={Math.floor((wordProgress[wordToUse.id]?.xp || 0) / 100)}
              xp={wordProgress[wordToUse.id]?.xp || 0}
              context={getContextForDirection(wordToUse)}
            />
          ) : quizModeToUse === 'letter-scramble' ? (
            <LetterScrambleQuiz
              key={`ls-${wordToUse.id}-${getQuestionWord(wordToUse)}`} // Force remount on word change
              word={
                wordToUse.direction === 'definition-to-term' ? wordToUse.term : wordToUse.definition
              }
              definition={
                wordToUse.direction === 'definition-to-term' ? wordToUse.definition : wordToUse.term
              }
              context={getContextForDirection(wordToUse)}
              currentWord={(getSessionStats()?.currentIndex || 0) + 1}
              totalWords={getSessionStats()?.totalWords || 10}
              disabled={isTransitioning}
              onAnswer={correct => {
                // Track feedback and play audio
                setLastAnswerCorrect(correct);
                setFeedbackQuestionKey(
                  `${wordToUse.id}-${getQuestionWord(wordToUse)}-${Date.now()}`
                ); // Track unique question instance
                if (correct) {
                  playCorrect();
                } else {
                  playIncorrect();
                }

                // Process answer through learning system
                const result = handleEnhancedAnswer(correct);
                setIsTransitioning(true);

                setTimeout(() => {
                  if (
                    result &&
                    typeof result === 'object' &&
                    'isComplete' in result &&
                    result.isComplete
                  ) {
                    setSessionCompleted(true);
                  } else {
                    setIsTransitioning(false);
                    setWordTimer(0);
                    setWordStartTime(Date.now());
                    // Note: feedback state is reset by useEffect when word changes
                  }
                }, 2000);
              }}
            />
          ) : (
            <OpenQuestionQuiz
              key={`oq-${wordToUse.id}-${getQuestionWord(wordToUse)}`} // Force remount on word change
              word={getQuestionWord(wordToUse)}
              userAnswer={inputValue}
              onAnswerChange={setInputValue}
              onSubmit={handleOpenQuestionSubmit}
              isCorrect={currentAnswerCorrect === true}
              disabled={isTransitioning}
              level={Math.floor((wordProgress[wordToUse.id]?.xp || 0) / 100)}
              xp={wordProgress[wordToUse.id]?.xp || 0}
              context={getContextForDirection(wordToUse)}
            />
          )}
        </>
      );

    if (!isSessionActive || !currentSession) {
      return quizContent;
    }

    // Calculate metrics for UI effects
    const currentSpeed =
      currentSession.id === 'quick-dash' && wordTimer > 0
        ? Math.max(0, 100 - wordTimer * 10) // 10% per second decrease
        : sessionTimer > 0
        ? Math.max(0, 100 - sessionTimer * 2)
        : 100;
    const accuracy =
      sessionProgress.correctAnswers + sessionProgress.incorrectAnswers > 0
        ? Math.round(
            (sessionProgress.correctAnswers /
              (sessionProgress.correctAnswers + sessionProgress.incorrectAnswers)) *
              100
          )
        : 100;
    const knowledgeLevel = Math.min(
      100,
      sessionProgress.correctAnswers * 5 + sessionProgress.currentStreak * 10
    );
    const bossHealth = Math.max(0, 100 - sessionProgress.wordsCompleted * 4);

    switch (currentSession.id) {
      case 'quick-dash':
        return (
          <StyledQuickDashContainer>
            <StyledSpeedMeter speed={currentSpeed}>Speed: {currentSpeed}%</StyledSpeedMeter>
            {quizContent}
          </StyledQuickDashContainer>
        );

      case 'deep-dive':
        return (
          <StyledDeepDiveContainer>
            <StyledBrainMeter knowledge={knowledgeLevel} />
            {quizContent}
          </StyledDeepDiveContainer>
        );

      case 'streak-challenge':
        return (
          <StyledStreakChallengeContainer streak={sessionProgress.currentStreak}>
            <StyledStreakMultiplier streak={sessionProgress.currentStreak}>
              {sessionProgress.currentStreak > 0
                ? `x${Math.min(
                    Math.pow(1.5, Math.min(sessionProgress.currentStreak, 10)),
                    8
                  ).toFixed(1)}`
                : 'x1.0'}
            </StyledStreakMultiplier>
            {quizContent}
          </StyledStreakChallengeContainer>
        );

      case 'precision-mode':
        return (
          <StyledPrecisionModeContainer>
            <StyledAccuracyMeter accuracy={accuracy} />
            {quizContent}
          </StyledPrecisionModeContainer>
        );

      case 'boss-battle':
        return (
          <StyledBossBattleContainer damage={false}>
            <BossHealthBar health={bossHealth}>
              <StyledBossAvatar health={bossHealth} />
              <StyledBossNamePlate>
                <StyledBossName>🗡️ Word Destroyer</StyledBossName>
                <BossTitle>Master of Confusion</BossTitle>
              </StyledBossNamePlate>
              <HealthBarContainer>
                <HealthBarBackground>
                  <HealthBarFill health={bossHealth} />
                </HealthBarBackground>
                <HealthText health={bossHealth}>{bossHealth}% HP</HealthText>
              </HealthBarContainer>
            </BossHealthBar>
            {quizContent}
          </StyledBossBattleContainer>
        );

      default:
        return quizContent;
    }
  };

  return (
    <>
      <Navigation languageName={languageName} languageFlag={languageFlag} />
      <GameContainer>
        {isSessionActive && currentSession && (
          <SessionProgressBar>
            <StyledProgressItem variant="score">
              <StyledProgressValue variant="score">{sessionProgress.score}</StyledProgressValue>
              <StyledProgressLabel>Score</StyledProgressLabel>
            </StyledProgressItem>
            <StyledProgressItem variant="words">
              <StyledProgressValue variant="words">
                {currentSession.targetWords === -1
                  ? sessionProgress.wordsCompleted
                  : `${sessionProgress.wordsCompleted}/${currentSession.targetWords}`}
              </StyledProgressValue>
              <StyledProgressLabel>Words</StyledProgressLabel>
            </StyledProgressItem>
            <StyledProgressItem variant="streak">
              <StyledProgressValue variant="streak">{sessionProgress.currentStreak}</StyledProgressValue>
              <StyledProgressLabel>Streak</StyledProgressLabel>
            </StyledProgressItem>
            {currentSession.timeLimit && (
              <StyledProgressItem variant="time">
                <StyledProgressValue variant="time">{formatTime(sessionTimer)}</StyledProgressValue>
                <StyledProgressLabel>Time</StyledProgressLabel>
              </StyledProgressItem>
            )}
            {currentSession.allowedMistakes !== undefined && (
              <StyledProgressItem variant="lives">
                <StyledProgressValue variant="lives">
                  {currentSession.allowedMistakes - sessionProgress.incorrectAnswers}
                </StyledProgressValue>
                <StyledProgressLabel>Lives</StyledProgressLabel>
              </StyledProgressItem>
            )}
          </SessionProgressBar>
        )}

        {/* Show learning progress when not in session mode */}
        {!isSessionActive && (
          <>
            <LearningProgress enhanced />
            <StorageManagement compact />
          </>
        )}

        <GameContentContainer>
          {/* Boss Battle Indicator for final word */}
          {isSessionActive &&
            currentSession?.id === 'boss-battle' &&
            sessionProgress.wordsCompleted >= currentSession.targetWords - 1 && (
              <StyledBossIndicator>⚔️ BOSS WORD - FINAL CHALLENGE! ⚔️</StyledBossIndicator>
            )}

          {renderThemedQuiz()}
        </GameContentContainer>
        <SkipButtonContainer>
          <BaseButton
            size="lg"
            onClick={() => {
              dispatch(nextWord());
              // Increment words completed in session if session is active
              if (isSessionActive && currentSession) {
                dispatch(incrementWordsCompleted());
              }
            }}
            disabled={isTransitioning}
          >
            Skip
          </BaseButton>
        </SkipButtonContainer>
      </GameContainer>
      <FeedbackOverlay
        isCorrect={lastAnswerCorrect}
        correctAnswer={feedbackWordInfo?.correctAnswer || ''}
        originalWord={feedbackWordInfo?.originalWord || ''}
        wordContext={feedbackWordInfo?.context || ''}
        capitalizationFeedback={capitalizationFeedback}
      />
      <AchievementManager />

      {/* Level Up Notification */}
      {showLevelUp && (
        <LevelUpNotification newLevel={newLevel} totalXP={totalXP} onClose={closeLevelUp} />
      )}
    </>
  );
};
