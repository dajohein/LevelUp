import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { RootState } from '../store/store';
import { nextWord, checkAnswer, setLanguage } from '../store/gameSlice';
import {
  addCorrectAnswer,
  addIncorrectAnswer,
  addTimeElapsed,
  completeSession,
  incrementWordsCompleted,
  addPerfectAccuracyBonus,
  addIncorrectWordForReview,
  setLanguage as setSessionLanguage,
} from '../store/sessionSlice';
import { useAudio } from '../features/audio/AudioContext';
import { words } from '../services/wordService';
import { Loading } from './feedback/Loading';
import { Progress } from './feedback/Progress';
import { FeedbackOverlay } from './feedback/FeedbackOverlay';
import { AchievementManager } from './AchievementManager';
import { MultipleChoiceQuiz } from './quiz/MultipleChoiceQuiz';
import { OpenQuestionQuiz } from './quiz/OpenQuestionQuiz';
import { Navigation } from './Navigation';
import { LearningProgress } from './LearningProgress';
import { StorageManagement } from './StorageManagement';

const GameContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: calc(100vh - 120px); /* Full height minus fixed headers */
  padding: ${props => props.theme.spacing.xl};
  padding-top: calc(
    120px + ${props => props.theme.spacing.lg}
  ); /* Account for Navigation (60px) + Progress (~60px) */
  padding-bottom: ${props => props.theme.spacing.xl};
  background-color: ${props => props.theme.colors.background};
  overflow-y: auto; /* Make content scrollable */
  box-sizing: border-box;
`;

const GameContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  width: 100%;
  max-width: 800px;
  gap: ${props => props.theme.spacing.lg};
  min-height: 300px; /* Reduced minimum height for smaller screens */

  @media (max-height: 600px) {
    min-height: 200px;
    gap: ${props => props.theme.spacing.md};
  }
`;

const SkipButtonContainer = styled.div`
  margin-top: ${props => props.theme.spacing.lg};
  padding: ${props => props.theme.spacing.md} 0;
  flex-shrink: 0; /* Ensure skip button is always visible */

  @media (max-height: 600px) {
    margin-top: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.sm} 0;
  }
`;

const SessionProgressBar = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.lg};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ProgressItem = styled.div`
  text-align: center;
  color: ${props => props.theme.colors.text};
`;

const ProgressValue = styled.div`
  font-size: 1.2rem;
  font-weight: bold;
  color: ${props => props.theme.colors.primary};
`;

const ProgressLabel = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.colors.textSecondary};
`;

const Button = styled.button<{ disabled?: boolean }>`
  padding: 1rem 2rem;
  font-size: 1.2rem;
  border: none;
  border-radius: 8px;
  background-color: ${props =>
    props.disabled ? props.theme.colors.textSecondary : props.theme.colors.primary};
  color: white;
  cursor: ${props => (props.disabled ? 'not-allowed' : 'pointer')};
  transition: all 0.3s ease;

  &:hover {
    background-color: ${props =>
      props.disabled ? props.theme.colors.textSecondary : props.theme.colors.secondary};
  }
`;

const BossIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${props => props.theme.spacing.sm};
  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
  color: white;
  padding: ${props => props.theme.spacing.md};
  border-radius: 12px;
  font-weight: bold;
  font-size: 1.1rem;
  box-shadow: 0 4px 15px rgba(238, 90, 36, 0.3);
  animation: pulse 2s infinite;
  margin-bottom: ${props => props.theme.spacing.lg};

  @keyframes pulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
    100% {
      transform: scale(1);
    }
  }
`;

// Mode-specific themed containers
const QuickDashContainer = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: 2px solid #00d4aa;
  border-radius: 16px;
  padding: ${props => props.theme.spacing.lg};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(45deg, transparent, rgba(0, 212, 170, 0.1), transparent);
    animation: lightning 3s linear infinite;
  }

  @keyframes lightning {
    0% {
      transform: translateX(-100%) translateY(-100%) rotate(45deg);
    }
    100% {
      transform: translateX(100%) translateY(100%) rotate(45deg);
    }
  }
`;

const DeepDiveContainer = styled.div`
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  border: 2px solid #0099cc;
  border-radius: 16px;
  padding: ${props => props.theme.spacing.lg};
  position: relative;
  box-shadow: 0 8px 32px rgba(79, 172, 254, 0.2);

  &::after {
    content: '🧠';
    position: absolute;
    top: 10px;
    right: 10px;
    font-size: 2rem;
    opacity: 0.3;
  }
`;

const StreakChallengeContainer = styled.div<{ streak: number }>`
  background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
  border: 2px solid #ff6b6b;
  border-radius: 16px;
  padding: ${props => props.theme.spacing.lg};
  position: relative;
  animation: ${props => (props.streak > 5 ? 'fireGlow 1s ease-in-out infinite alternate' : 'none')};

  &::before {
    content: '🔥';
    position: absolute;
    top: 10px;
    right: 10px;
    font-size: 2rem;
    animation: ${props => (props.streak > 0 ? 'flameDance 2s ease-in-out infinite' : 'none')};
  }

  @keyframes fireGlow {
    0% {
      box-shadow: 0 0 20px rgba(255, 107, 107, 0.3);
    }
    100% {
      box-shadow: 0 0 40px rgba(255, 107, 107, 0.6);
    }
  }

  @keyframes flameDance {
    0%,
    100% {
      transform: rotate(-5deg) scale(1);
    }
    50% {
      transform: rotate(5deg) scale(1.1);
    }
  }
`;

const PrecisionModeContainer = styled.div`
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
  border: 2px solid #00b4db;
  border-radius: 16px;
  padding: ${props => props.theme.spacing.lg};
  position: relative;

  &::before {
    content: '🎯';
    position: absolute;
    top: 50%;
    left: 10px;
    transform: translateY(-50%);
    font-size: 1.5rem;
    opacity: 0.4;
  }

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    right: 10px;
    transform: translateY(-50%);
    width: 30px;
    height: 30px;
    border: 2px solid #00b4db;
    border-radius: 50%;
    opacity: 0.3;
  }
`;

const BossBattleContainer = styled.div<{ damage?: boolean }>`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: 3px solid #ee5a24;
  border-radius: 16px;
  padding: ${props => props.theme.spacing.lg};
  position: relative;
  animation: ${props => (props.damage ? 'shake 0.5s ease-in-out' : 'none')};

  &::before {
    content: '⚔️';
    position: absolute;
    top: 10px;
    left: 10px;
    font-size: 2rem;
    animation: swordGlow 3s ease-in-out infinite;
  }

  @keyframes shake {
    0%,
    100% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(-5px);
    }
    75% {
      transform: translateX(5px);
    }
  }

  @keyframes swordGlow {
    0%,
    100% {
      filter: drop-shadow(0 0 5px #ee5a24);
    }
    50% {
      filter: drop-shadow(0 0 15px #ee5a24);
    }
  }
`;

const SpeedMeter = styled.div<{ speed: number }>`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  background: rgba(0, 212, 170, 0.1);
  border: 1px solid #00d4aa;
  border-radius: 20px;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.md};

  &::before {
    content: '⚡';
    font-size: 1.2rem;
    animation: ${props => (props.speed > 80 ? 'electricPulse 0.5s infinite' : 'none')};
  }

  @keyframes electricPulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.2);
    }
  }
`;

const StreakMultiplier = styled.div<{ streak: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(45deg, #ff6b6b, #ee5a24);
  color: white;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  font-weight: bold;
  font-size: 1.2rem;
  position: absolute;
  top: -10px;
  right: -10px;
  animation: ${props =>
    props.streak > 0 ? 'streakGlow 1s ease-in-out infinite alternate' : 'none'};
  transform: ${props => (props.streak > 5 ? 'scale(1.2)' : 'scale(1)')};
  transition: transform 0.3s ease;

  @keyframes streakGlow {
    0% {
      box-shadow: 0 0 10px rgba(255, 107, 107, 0.5);
    }
    100% {
      box-shadow: 0 0 25px rgba(255, 107, 107, 0.8);
    }
  }
`;

const AccuracyMeter = styled.div<{ accuracy: number }>`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  background: rgba(0, 180, 219, 0.1);
  border: 1px solid #00b4db;
  border-radius: 20px;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.md};

  &::before {
    content: '🎯';
    font-size: 1.2rem;
  }

  &::after {
    content: '${props => props.accuracy}% Accuracy';
    font-weight: bold;
    color: ${props => (props.accuracy === 100 ? '#00b4db' : '#666')};
  }
`;

const BrainMeter = styled.div<{ knowledge: number }>`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  background: rgba(79, 172, 254, 0.1);
  border: 1px solid #4facfe;
  border-radius: 20px;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.md};

  &::before {
    content: '🧠';
    font-size: 1.2rem;
    animation: brainPulse 2s ease-in-out infinite;
  }

  &::after {
    content: 'Knowledge: ${props => props.knowledge}%';
    font-weight: bold;
    color: #4facfe;
  }

  @keyframes brainPulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }
`;

const BossHealthBar = styled.div<{ health: number }>`
  width: 100%;
  background: rgba(238, 90, 36, 0.2);
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: ${props => props.theme.spacing.md};
  border: 2px solid #ee5a24;

  &::before {
    content: '';
    display: block;
    width: ${props => props.health}%;
    height: 20px;
    background: linear-gradient(90deg, #ee5a24, #ff6b6b);
    transition: width 0.5s ease;
  }

  &::after {
    content: 'Boss Health: ${props => props.health}%';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-weight: bold;
    color: white;
    font-size: 0.9rem;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
  }
`;

export const Game: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { languageCode } = useParams<{ languageCode: string }>();
  const {
    currentWord,
    currentOptions,
    isCorrect,
    quizMode,
    lastAnswer,
    wordProgress,
    capitalizationFeedback,
  } = useSelector((state: RootState) => state.game);
  const {
    currentSession,
    progress: sessionProgress,
    isSessionActive,
    sessionStartTime,
  } = useSelector((state: RootState) => state.session);

  const [inputValue, setInputValue] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [languageName, setLanguageName] = useState('');
  const [languageFlag, setLanguageFlag] = useState('');
  const [sessionTimer, setSessionTimer] = useState(0);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [bossDamageEffect, setBossDamageEffect] = useState(false);
  const { playCorrect, playIncorrect } = useAudio();

  // Language flags mapping
  const languageFlags: { [key: string]: string } = {
    es: '🇪🇸',
    de: '🇩🇪',
  };

  useEffect(() => {
    if (languageCode) {
      dispatch(setLanguage(languageCode));
      dispatch(setSessionLanguage(languageCode)); // Set session language separately
      // Get language name from wordService
      const langData = words[languageCode];
      if (langData) {
        setLanguageName(langData.name);
        setLanguageFlag(languageFlags[languageCode] || '');
      }
    }
  }, [dispatch, languageCode]);

  // Reset completion flag when session starts
  useEffect(() => {
    if (isSessionActive && currentSession) {
      setSessionCompleted(false);
      setSessionTimer(0);
    }
  }, [isSessionActive, currentSession?.id]); // Reset when session starts or changes

  useEffect(() => {
    if (isCorrect !== null) {
      isCorrect ? playCorrect() : playIncorrect();

      // Update session progress if session is active
      if (isSessionActive && currentSession) {
        if (isCorrect) {
          // Calculate bonuses based on session type
          let timeBonus = 0;
          let streakBonus = 0;
          let contextBonus = 0;
          let perfectRecallBonus = 0;

          // Quick Dash: Speed bonus
          if (currentSession.id === 'quick-dash') {
            timeBonus = Math.max(0, 50 - sessionTimer);
            streakBonus = sessionProgress.currentStreak >= 3 ? 25 : 0;
          }

          // Deep Dive: Context and perfect recall bonuses
          else if (currentSession.id === 'deep-dive') {
            contextBonus = 30; // Context bonus for deep dive
            // Perfect recall bonus if answered correctly on first try for this word
            if (sessionProgress.currentStreak > 0) {
              perfectRecallBonus = 100;
            }
          }

          // Precision Mode: No bonuses here, but will get perfect accuracy bonus at end
          else if (currentSession.id === 'precision-mode') {
            // No special bonuses during game
          }

          // Boss Battle: Progressive difficulty bonus is handled in the reducer
          else if (currentSession.id === 'boss-battle') {
            // Difficulty bonus is calculated in sessionSlice
          }

          dispatch(addCorrectAnswer({ timeBonus, streakBonus, contextBonus, perfectRecallBonus }));
        } else {
          dispatch(addIncorrectAnswer());

          // For Deep Dive, track incorrect words for spaced repetition
          if (currentSession.id === 'deep-dive' && currentWord) {
            dispatch(addIncorrectWordForReview(currentWord.id));
          }

          // For Boss Battle, show damage effect
          if (currentSession.id === 'boss-battle') {
            setBossDamageEffect(true);
            setTimeout(() => setBossDamageEffect(false), 500);
          }

          // For Precision Mode, session ends immediately on first mistake
          if (currentSession.id === 'precision-mode') {
            setSessionCompleted(true);
            dispatch(completeSession());
            navigate(`/session-complete/${languageCode}`);
            return;
          }
        }
      }
    }
  }, [
    isCorrect,
    playCorrect,
    playIncorrect,
    isSessionActive,
    currentSession,
    sessionCompleted,
    dispatch,
    navigate,
    languageCode,
  ]);

  // Separate effect to check session completion after state updates
  useEffect(() => {
    const checkCompletion = () => {
      if (!currentSession || !isSessionActive || sessionCompleted) return;

      console.log('Checking session completion:', {
        wordsCompleted: sessionProgress.wordsCompleted,
        targetWords: currentSession.targetWords,
        incorrectAnswers: sessionProgress.incorrectAnswers,
        allowedMistakes: currentSession.allowedMistakes,
        timeLimit: currentSession.timeLimit,
        sessionTimer: sessionTimer,
      });

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
        console.log('Session should complete!');
        setSessionCompleted(true); // Prevent multiple completions

        // Add perfect accuracy bonus for Precision Mode
        if (currentSession.id === 'precision-mode' && sessionProgress.incorrectAnswers === 0) {
          dispatch(addPerfectAccuracyBonus());
        }

        dispatch(completeSession());
        navigate(`/session-complete/${languageCode}`);
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
        console.log('Session time limit exceeded!');
        setSessionCompleted(true);
        dispatch(completeSession());
        navigate(`/session-complete/${languageCode}`);
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

  // Timer for session tracking
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSessionActive && sessionStartTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
        setSessionTimer(elapsed);
        dispatch(addTimeElapsed(1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSessionActive, sessionStartTime, dispatch]);

  const resetState = () => {
    setIsTransitioning(false);
    setInputValue('');
  };

  const handleSubmit = (answer: string) => {
    dispatch(checkAnswer(answer));
    setInputValue('');
    setIsTransitioning(true);

    // Wait for feedback animation before moving to next word
    setTimeout(() => {
      resetState();
      dispatch(nextWord());

      // Increment words completed in session if session is active
      if (isSessionActive && currentSession) {
        dispatch(incrementWordsCompleted());
      }
    }, 2000); // Match feedback duration
  };

  const handleOpenQuestionSubmit = () => {
    handleSubmit(inputValue);
  };

  // Helper functions to determine quiz direction
  const getQuestionWord = (word: any) => {
    const direction = word.direction || 'definition-to-term'; // default to old behavior
    return direction === 'definition-to-term' ? word.definition : word.term;
  };

  const getContextForDirection = (word: any) => {
    if (!word.context) return undefined;

    const direction = word.direction || 'definition-to-term';

    // When showing Dutch word (definition-to-term): show Dutch context
    // When showing German word (term-to-definition): show German context
    // This way we don't give away the answer in the context

    if (direction === 'definition-to-term') {
      // Showing Dutch word, so show Dutch context with German translation
      return {
        sentence: word.context.translation, // Dutch context
        translation: word.context.sentence, // German translation (shows after answering)
      };
    } else {
      // Showing German word, so show German context with Dutch translation
      return {
        sentence: word.context.sentence, // German context
        translation: word.context.translation, // Dutch translation (shows after answering)
      };
    }
  };

  if (!currentWord) {
    return <Loading message="Loading words..." />;
  }

  // If we're in session mode but no session is active, redirect to session selection
  const isSessionRoute = window.location.pathname.includes('/session');
  if (isSessionRoute && !isSessionActive) {
    navigate(`/sessions/${languageCode}`);
    return <Loading message="Redirecting to session selection..." />;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Function to render themed quiz based on session type
  const renderThemedQuiz = () => {
    const quizContent =
      quizMode === 'multiple-choice' ? (
        <MultipleChoiceQuiz
          word={getQuestionWord(currentWord)}
          options={currentOptions || []}
          onSelect={handleSubmit}
          isCorrect={isCorrect === true}
          selectedOption={lastAnswer || ''}
          disabled={isTransitioning}
          level={Math.floor((wordProgress[currentWord.id]?.xp || 0) / 100)}
          xp={wordProgress[currentWord.id]?.xp || 0}
          context={getContextForDirection(currentWord)}
        />
      ) : (
        <OpenQuestionQuiz
          word={getQuestionWord(currentWord)}
          userAnswer={inputValue}
          onAnswerChange={setInputValue}
          onSubmit={handleOpenQuestionSubmit}
          isCorrect={isCorrect === true}
          disabled={isTransitioning}
          level={Math.floor((wordProgress[currentWord.id]?.xp || 0) / 100)}
          xp={wordProgress[currentWord.id]?.xp || 0}
          context={getContextForDirection(currentWord)}
        />
      );

    if (!isSessionActive || !currentSession) {
      return quizContent;
    }

    // Calculate metrics for UI effects
    const currentSpeed = sessionTimer > 0 ? Math.max(0, 100 - sessionTimer * 2) : 100;
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
          <QuickDashContainer>
            <SpeedMeter speed={currentSpeed}>Speed: {currentSpeed}%</SpeedMeter>
            {quizContent}
          </QuickDashContainer>
        );

      case 'deep-dive':
        return (
          <DeepDiveContainer>
            <BrainMeter knowledge={knowledgeLevel} />
            {quizContent}
          </DeepDiveContainer>
        );

      case 'streak-challenge':
        return (
          <StreakChallengeContainer streak={sessionProgress.currentStreak}>
            <StreakMultiplier streak={sessionProgress.currentStreak}>
              {sessionProgress.currentStreak > 0
                ? `x${Math.min(
                    Math.pow(1.5, Math.min(sessionProgress.currentStreak, 10)),
                    8
                  ).toFixed(1)}`
                : 'x1.0'}
            </StreakMultiplier>
            {quizContent}
          </StreakChallengeContainer>
        );

      case 'precision-mode':
        return (
          <PrecisionModeContainer>
            <AccuracyMeter accuracy={accuracy} />
            {quizContent}
          </PrecisionModeContainer>
        );

      case 'boss-battle':
        return (
          <BossBattleContainer damage={bossDamageEffect}>
            <BossHealthBar health={bossHealth} />
            {quizContent}
          </BossBattleContainer>
        );

      default:
        return quizContent;
    }
  };

  return (
    <>
      <Navigation languageName={languageName} languageFlag={languageFlag} />
      <Progress />
      <GameContainer>
        {isSessionActive && currentSession && (
          <SessionProgressBar>
            <ProgressItem>
              <ProgressValue>{sessionProgress.score}</ProgressValue>
              <ProgressLabel>Score</ProgressLabel>
            </ProgressItem>
            <ProgressItem>
              <ProgressValue>
                {currentSession.targetWords === -1
                  ? sessionProgress.wordsCompleted
                  : `${sessionProgress.wordsCompleted}/${currentSession.targetWords}`}
              </ProgressValue>
              <ProgressLabel>Words</ProgressLabel>
            </ProgressItem>
            <ProgressItem>
              <ProgressValue>{sessionProgress.currentStreak}</ProgressValue>
              <ProgressLabel>Streak</ProgressLabel>
            </ProgressItem>
            {currentSession.timeLimit && (
              <ProgressItem>
                <ProgressValue>{formatTime(sessionTimer)}</ProgressValue>
                <ProgressLabel>Time</ProgressLabel>
              </ProgressItem>
            )}
            {currentSession.allowedMistakes !== undefined && (
              <ProgressItem>
                <ProgressValue>
                  {currentSession.allowedMistakes - sessionProgress.incorrectAnswers}
                </ProgressValue>
                <ProgressLabel>Lives</ProgressLabel>
              </ProgressItem>
            )}
          </SessionProgressBar>
        )}

        {/* Show learning progress when not in session mode */}
        {!isSessionActive && (
          <>
            <LearningProgress />
            <StorageManagement compact />
          </>
        )}

        <GameContent>
          {/* Boss Battle Indicator for final word */}
          {isSessionActive &&
            currentSession?.id === 'boss-battle' &&
            sessionProgress.wordsCompleted >= currentSession.targetWords - 1 && (
              <BossIndicator>⚔️ BOSS WORD - FINAL CHALLENGE! ⚔️</BossIndicator>
            )}

          {renderThemedQuiz()}
        </GameContent>
        <SkipButtonContainer>
          <Button
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
          </Button>
        </SkipButtonContainer>
      </GameContainer>
      <FeedbackOverlay
        isCorrect={isCorrect}
        correctAnswer={currentWord?.term}
        capitalizationFeedback={capitalizationFeedback}
      />
      <AchievementManager />
    </>
  );
};
