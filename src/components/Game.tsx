// @ts-nocheck
// Cleaned up unused imports, variables, and parameters
// See docs/TYPESCRIPT_STRICT_MODE_PLAN.md for ongoing strict mode efforts

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { RootState } from '../store/store';
import { nextWord, setCurrentWord } from '../store/gameSlice';
import { incrementWordsCompleted, addCorrectAnswer, addIncorrectAnswer } from '../store/sessionSlice';
import { GameContainer, GameContent, SkipButtonContainer, Button } from './Game/GameStyledComponents';
import { useEnhancedGameState } from '../hooks/useEnhancedGameState';
import { challengeServiceManager } from '../services/challengeServiceManager';
import { UnifiedLoading } from './feedback/UnifiedLoading';
import { FeedbackOverlay } from './feedback/FeedbackOverlay';
import { AchievementManager } from './AchievementManager';
import { QuizRenderer } from './QuizRenderer';
import { SessionManager } from './SessionManager';
import { Navigation } from './Navigation';
import { LevelUpNotification } from './animations/LevelUpNotification';

export const Game: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { languageCode, moduleId } = useParams<{ languageCode: string; moduleId?: string }>();

  // Optimize Redux selectors with memoization to prevent unnecessary re-renders
  const reduxGameState = useSelector(
    (state: RootState) => ({
      currentWord: state.game.currentWord,
      currentOptions: state.game.currentOptions,
      quizMode: state.game.quizMode,
      wordProgress: state.game.wordProgress,
      capitalizationFeedback: state.game.capitalizationFeedback,
      language: state.game.language,
    }),
    (left, right) =>
      left.currentWord?.id === right.currentWord?.id &&
      left.quizMode === right.quizMode &&
      left.language === right.language &&
      Object.keys(left.wordProgress).length === Object.keys(right.wordProgress).length
  );

  const sessionState = useSelector(
    (state: RootState) => ({
      currentSession: state.session.currentSession,
      progress: state.session.progress,
      isSessionActive: state.session.isSessionActive,
      sessionStartTime: state.session.sessionStartTime,
    }),
    (left, right) =>
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
  } = reduxGameState;

  const {
    currentSession,
    progress: sessionProgress,
    isSessionActive,
    sessionStartTime,
  } = sessionState;

  // Enhanced game state management hook
  const { gameState, gameHandlers, gameHelpers, enhancedGame, levelUp, audio } =
    useEnhancedGameState({
      languageCode: languageCode!,
      moduleId,
      currentWord,
      quizMode,
      wordProgress,
      currentSession,
      sessionProgress,
      isSessionActive,
      sessionStartTime,
      gameLanguage,
    });

  // Destructure for easy access
  const {
    inputValue,
    setInputValue,
    isTransitioning,
    setIsTransitioning,
    languageName,
    languageFlag,
    sessionTimer,
    wordTimer,
    sessionCompleted,
    showLearningCard,
    lastAnswerCorrect,
    setLastAnswerCorrect,
    lastSelectedAnswer,
    feedbackQuestionKey,
    setFeedbackQuestionKey,
    feedbackWordInfo,
  } = gameState;

  const {
    handleSubmit,
    handleOpenQuestionSubmit,
    handleWordTransition,
    handleContinueFromLearningCard,
    formatTime,
  } = gameHandlers;

  const {
    contextForWord,
    wordLearningStatus,
  } = gameHelpers;

  const {
    isUsingSpacedRepetition,
    handleEnhancedAnswer,
    getCurrentWordInfo,
    getSessionStats,
  } = enhancedGame;

  const { showLevelUp, newLevel, totalXP, closeLevelUp } = levelUp;
  const { playCorrect, playIncorrect } = audio;

  // Check for redirect to session selection (moved to useEffect to avoid render-time navigation)
  useEffect(() => {
    const isSessionGameRoute = window.location.pathname.endsWith('/session');
    if (isSessionGameRoute && !isSessionActive && !sessionCompleted) {
      navigate(`/sessions/${languageCode}`);
    }
  }, [isSessionActive, sessionCompleted, languageCode, navigate]);

  if (!currentWord) {
    return <UnifiedLoading text="Loading words..." />;
  }

  // Function to render themed quiz based on session type
  const renderThemedQuiz = () => {
    return (
      <QuizRenderer
        currentWord={currentWord}
        quizMode={quizMode}
        currentOptions={currentOptions}
        wordProgress={wordProgress}
        isUsingSpacedRepetition={isUsingSpacedRepetition}
        getCurrentWordInfo={getCurrentWordInfo}
        showLearningCard={showLearningCard}
        wordLearningStatus={wordLearningStatus}
        currentSession={currentSession}
        isSessionActive={isSessionActive}
        sessionProgress={sessionProgress}
        getSessionStats={getSessionStats}
        isTransitioning={isTransitioning}
        inputValue={inputValue}
        setInputValue={setInputValue}
        lastAnswerCorrect={lastAnswerCorrect}
        lastSelectedAnswer={lastSelectedAnswer}
        feedbackQuestionKey={feedbackQuestionKey}
        wordTimer={wordTimer}
        sessionTimer={sessionTimer}
        contextForWord={contextForWord}
        handleSubmit={handleSubmit}
        handleOpenQuestionSubmit={handleOpenQuestionSubmit}
        handleContinueFromLearningCard={handleContinueFromLearningCard}
        handleWordTransition={handleWordTransition}
        handleEnhancedAnswer={handleEnhancedAnswer}
        playCorrect={playCorrect}
        playIncorrect={playIncorrect}
        dispatch={dispatch}
        incrementWordsCompleted={incrementWordsCompleted}
        addCorrectAnswer={addCorrectAnswer}
        addIncorrectAnswer={addIncorrectAnswer}
        setLastAnswerCorrect={setLastAnswerCorrect}
        setFeedbackQuestionKey={setFeedbackQuestionKey}
        setIsTransitioning={setIsTransitioning}
      />
    );
  };

  return (
    <>
      <Navigation languageName={languageName} languageFlag={languageFlag} />
      <GameContainer>
        <SessionManager
          isSessionActive={isSessionActive}
          currentSession={currentSession}
          sessionProgress={sessionProgress}
          sessionTimer={sessionTimer}
          formatTime={formatTime}
        />

        <GameContent>{renderThemedQuiz()}</GameContent>
        <SkipButtonContainer>
          <Button
            onClick={() => {
              // Use unified challenge service manager for all special modes
              if (
                currentSession?.id &&
                challengeServiceManager.isSessionTypeSupported(currentSession.id) &&
                !isUsingSpacedRepetition
              ) {
                // For streak challenges, reset the service first
                if (currentSession.id === 'streak-challenge') {
                  challengeServiceManager.resetSession(currentSession.id);
                }

                const timeRemaining = Math.max(0, currentSession.timeLimit! * 60 - sessionTimer);

                const context = {
                  wordsCompleted: sessionProgress.wordsCompleted,
                  currentStreak: 0, // Reset streak on skip
                  timeRemaining,
                  targetWords: currentSession.targetWords || 15,
                  wordProgress,
                  languageCode: languageCode!,
                };

                challengeServiceManager
                  .getNextWord(currentSession.id, context)
                  .then(result => {
                    dispatch(
                      setCurrentWord({
                        word: result.word!,
                        options: result.options,
                        quizMode: result.quizMode,
                      })
                    );
                  })
                  .catch(error => {
                    console.error(
                      `Failed to get next word from ${currentSession.id} service on skip:`,
                      error
                    );
                    dispatch(nextWord()); // Fallback
                  });
              } else {
                dispatch(nextWord());
              }

              // Increment words completed in session if session is active
              if (isSessionActive && currentSession) {
                dispatch(incrementWordsCompleted());
                // FIXED: Don't falsely record skipped words as correct answers
                // Skipped words should only increment the word counter, not trigger save operations
              }
            }}
            disabled={isTransitioning}
          >
            Skip
          </Button>
        </SkipButtonContainer>
      </GameContainer>
      <FeedbackOverlay
        isCorrect={lastAnswerCorrect}
        correctAnswer={feedbackWordInfo?.correctAnswer || ''}
        originalWord={feedbackWordInfo?.originalWord || ''}
        wordContext={
          feedbackWordInfo?.context
            ? typeof feedbackWordInfo.context === 'string'
              ? feedbackWordInfo.context
              : (feedbackWordInfo.context as any)?.sentence ||
                (feedbackWordInfo.context as any)?.translation ||
                ''
            : ''
        }
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

// Memoize the Game component to prevent unnecessary re-renders
export default React.memo(Game);
