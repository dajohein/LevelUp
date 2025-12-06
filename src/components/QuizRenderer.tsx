import React from 'react';
import styled from '@emotion/styled';
import { MultipleChoiceQuiz } from './quiz/MultipleChoiceQuiz';
import { OpenQuestionQuiz } from './quiz/OpenQuestionQuiz';
import { LetterScrambleQuiz } from './quiz/LetterScrambleQuiz';
import { FillInTheBlankQuiz } from './quiz/FillInTheBlankQuiz';
import { LearningCard } from './quiz/LearningCard';
import { gameServices } from '../services/game';

// Import styled components from Game.tsx (will need to be shared)
const QuickDashContainer = styled.div`
  background: linear-gradient(45deg, #ff6b35, #f7931e);
  border-radius: 15px;
  padding: 20px;
  border: 3px solid #ff4500;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    animation: shimmer 2s linear infinite;
  }

  @keyframes shimmer {
    0% {
      transform: translateX(-100%) translateY(-100%) rotate(45deg);
    }
    100% {
      transform: translateX(100%) translateY(100%) rotate(45deg);
    }
  }
`;

const DeepDiveContainer = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 15px;
  padding: 20px;
  border: 3px solid #4c51bf;
  position: relative;
`;

const StreakChallengeContainer = styled.div<{ streak: number }>`
  background: ${props =>
    props.streak > 10
      ? 'linear-gradient(45deg, #ffd700, #ffed4e)'
      : props.streak > 5
        ? 'linear-gradient(45deg, #ffa500, #ffd700)'
        : 'linear-gradient(45deg, #4CAF50, #8BC34A)'};
  border-radius: 15px;
  padding: 20px;
  border: 3px solid
    ${props => (props.streak > 10 ? '#ffd700' : props.streak > 5 ? '#ffa500' : '#4CAF50')};
  position: relative;
  transition: all 0.3s ease;

  ${props =>
    props.streak > 10 &&
    `
    animation: goldenGlow 2s ease-in-out infinite alternate;
    
    @keyframes goldenGlow {
      from { box-shadow: 0 0 20px rgba(255, 215, 0, 0.5); }
      to { box-shadow: 0 0 40px rgba(255, 215, 0, 0.8); }
    }
  `}
`;

const PrecisionModeContainer = styled.div`
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border-radius: 15px;
  padding: 20px;
  border: 3px solid #2196f3;
  position: relative;

  &::after {
    content: '🎯';
    position: absolute;
    top: 10px;
    right: 15px;
    font-size: 24px;
    opacity: 0.7;
  }
`;

const FillInTheBlankContainer = styled.div`
  background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
  border-radius: 15px;
  padding: 20px;
  border: 3px solid #9c27b0;
  position: relative;

  &::after {
    content: '📝';
    position: absolute;
    top: 10px;
    right: 15px;
    font-size: 24px;
    opacity: 0.7;
  }
`;

const BossBattleContainer = styled.div<{ damage?: boolean }>`
  background: linear-gradient(135deg, #263238 0%, #37474f 100%);
  border-radius: 15px;
  padding: 20px;
  border: 3px solid #f44336;
  position: relative;
  transition: all 0.3s ease;

  ${props =>
    props.damage &&
    `
    animation: damageFlash 0.5s ease-in-out;
    
    @keyframes damageFlash {
      0%, 100% { background: linear-gradient(135deg, #263238 0%, #37474f 100%); }
      50% { background: linear-gradient(135deg, #b71c1c 0%, #d32f2f 100%); }
    }
  `}
`;

const StreakMultiplier = styled.div<{ streak: number }>`
  position: absolute;
  top: 10px;
  right: 15px;
  background: rgba(255, 255, 255, 0.95);
  padding: 8px 12px;
  border-radius: 20px;
  font-weight: bold;
  color: ${props => (props.streak > 10 ? '#ffd700' : props.streak > 5 ? '#ffa500' : '#4CAF50')};
  font-size: 16px;
  border: 2px solid
    ${props => (props.streak > 10 ? '#ffd700' : props.streak > 5 ? '#ffa500' : '#4CAF50')};
  animation: ${props => (props.streak > 0 ? 'streakBounce 0.6s ease-out' : 'none')};

  @keyframes streakBounce {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.2);
    }
    100% {
      transform: scale(1);
    }
  }
`;

const ContextMeter = styled.div<{ contextualWords: number }>`
  position: absolute;
  top: 10px;
  right: 45px;
  background: rgba(255, 255, 255, 0.9);
  padding: 8px 12px;
  border-radius: 20px;
  font-weight: bold;
  color: ${props =>
    props.contextualWords > 10 ? '#4CAF50' : props.contextualWords > 5 ? '#FF9800' : '#9c27b0'};
  font-size: 14px;
  border: 2px solid
    ${props =>
      props.contextualWords > 10 ? '#4CAF50' : props.contextualWords > 5 ? '#FF9800' : '#9c27b0'};

  &::after {
    content: '${props => props.contextualWords} words';
  }
`;

const BossAvatar = styled.div<{ health: number }>`
  width: 80px;
  height: 80px;
  background: ${props =>
    props.health > 70
      ? 'linear-gradient(45deg, #f44336, #d32f2f)'
      : props.health > 30
        ? 'linear-gradient(45deg, #ff9800, #f57c00)'
        : 'linear-gradient(45deg, #4caf50, #388e3c)'};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  margin-right: 15px;
  border: 3px solid #fff;
  transition: all 0.3s ease;

  &::after {
    content: '👹';
    filter: ${props => (props.health < 30 ? 'grayscale(1)' : 'none')};
  }

  ${props =>
    props.health < 30 &&
    `
    animation: defeat 2s ease-in-out infinite;
    
    @keyframes defeat {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(-5deg); }
      75% { transform: rotate(5deg); }
    }
  `}
`;

const BossNamePlate = styled.div`
  flex: 1;
  margin-right: 15px;
`;

const BossName = styled.div`
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 4px;
`;

const BossTitle = styled.div`
  color: #ffcdd2;
  font-size: 12px;
  font-style: italic;
`;

const HealthBarContainer = styled.div`
  width: 150px;
`;

const HealthBarBackground = styled.div`
  width: 100%;
  height: 20px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 5px;
`;

const HealthBarFill = styled.div<{ health: number }>`
  width: ${props => props.health}%;
  height: 100%;
  background: ${props =>
    props.health > 70
      ? 'linear-gradient(90deg, #f44336, #d32f2f)'
      : props.health > 30
        ? 'linear-gradient(90deg, #ff9800, #f57c00)'
        : 'linear-gradient(90deg, #4caf50, #388e3c)'};
  transition: all 0.5s ease;
  border-radius: 10px;
`;

const HealthText = styled.div<{ health: number }>`
  color: ${props => (props.health > 70 ? '#ffcdd2' : props.health > 30 ? '#fff3e0' : '#e8f5e8')};
  font-size: 12px;
  text-align: center;
  font-weight: bold;
`;

const BossHealthBar = styled.div<{ health: number }>`
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.3);
  padding: 15px;
  border-radius: 10px;
  margin-bottom: 20px;
  border: 2px solid
    ${props => (props.health > 70 ? '#f44336' : props.health > 30 ? '#ff9800' : '#4caf50')};
`;

export interface QuizRendererProps {
  // Word and quiz state
  currentWord: any;
  quizMode: string;
  currentOptions: string[];
  wordProgress: { [key: string]: any };

  // Enhanced game state
  isUsingSpacedRepetition: boolean;
  getCurrentWordInfo: () => any;
  showLearningCard: boolean;
  wordLearningStatus: { isTrulyNewWord: boolean; needsReinforcement: boolean };

  // Session state
  currentSession: any;
  sessionProgress: any;
  getSessionStats: () => any;

  // UI state
  isTransitioning: boolean;
  inputValue: string;
  setInputValue: (value: string) => void;
  lastAnswerCorrect: boolean | null;
  lastSelectedAnswer: string;
  feedbackQuestionKey: string;

  // Context
  contextForWord: any;

  // Handlers
  handleSubmit: (answer: string) => void;
  handleOpenQuestionSubmit: () => void;
  handleContinueFromLearningCard: () => void;
}

export const QuizRenderer: React.FC<QuizRendererProps> = ({
  currentWord,
  quizMode,
  currentOptions,
  wordProgress,
  isUsingSpacedRepetition,
  getCurrentWordInfo,
  showLearningCard,
  wordLearningStatus,
  currentSession,
  sessionProgress,
  getSessionStats,
  isTransitioning,
  inputValue,
  setInputValue,
  lastAnswerCorrect,
  lastSelectedAnswer,
  feedbackQuestionKey,
  contextForWord,
  handleSubmit,
  handleOpenQuestionSubmit,
  handleContinueFromLearningCard,
}) => {
  // Get word info from enhanced system if available
  const enhancedWordInfo = isUsingSpacedRepetition ? getCurrentWordInfo() : null;
  const wordToUse = enhancedWordInfo?.word || currentWord;
  let quizModeToUse = enhancedWordInfo?.quizMode || quizMode;
  const optionsToUse = enhancedWordInfo?.options || currentOptions || [];

  // Session-specific quiz mode overrides
  if (currentSession?.id === 'fill-in-the-blank') {
    // Only use fill-in-the-blank if the word has context, otherwise respect the original mode
    const hasContext = wordToUse.context && wordToUse.context.sentence;
    if (!hasContext && quizModeToUse === 'fill-in-the-blank') {
      // If no context available for fill-in-blank, fall back to the word service's recommendation
      const wordXP = wordProgress[wordToUse.id]?.xp || 0;
      quizModeToUse = wordXP < 20 ? 'multiple-choice' : 'open-answer';
    }
  }

  // If quiz mode was changed and we need options for multiple-choice, generate them
  if (quizModeToUse === 'multiple-choice' && optionsToUse.length === 0) {
    // This shouldn't happen if services are working properly, but as a safety net:
    console.warn(
      `⚠️ Multiple-choice mode selected but no options provided for word "${wordToUse.term}"`
    );
    // For now, we'll let it render empty and the services should be fixed
  }

  // Generate unique key for current question
  const currentQuestionKey = `${wordToUse.id}-${gameServices.modeHandler.getQuestionWord(wordToUse)}`;

  // Only show feedback if it belongs to the current question instance
  const shouldShowFeedback = feedbackQuestionKey.startsWith(currentQuestionKey);
  const currentAnswerCorrect = shouldShowFeedback ? lastAnswerCorrect : null;
  const currentSelectedAnswer = shouldShowFeedback ? lastSelectedAnswer : '';

  const quizContent =
    showLearningCard && !isTransitioning ? ( // Don't show learning card during transitions
      <LearningCard
        key={`learning-${wordToUse.id}`} // Force re-render for each word
        word={wordToUse}
        currentIndex={getSessionStats()?.currentIndex || 0}
        totalWords={getSessionStats()?.totalWords || 1}
        level={Math.floor((wordProgress[wordToUse.id]?.xp || 0) / 100)}
        xp={wordProgress[wordToUse.id]?.xp || 0}
        onContinue={handleContinueFromLearningCard}
        autoAdvance={false} // Simple: user controls when to continue
        reason={wordLearningStatus.isTrulyNewWord ? 'new' : 'reinforcement'}
      />
    ) : (
      <>
        {quizModeToUse === 'multiple-choice' ? (
          <MultipleChoiceQuiz
            key={`mc-${wordToUse.id}-${quizModeToUse}`} // Stable key based on word ID and mode
            word={gameServices.modeHandler.getQuizQuestion(wordToUse, quizModeToUse)}
            options={optionsToUse}
            onSelect={handleSubmit}
            isCorrect={currentAnswerCorrect === true}
            selectedOption={currentSelectedAnswer}
            disabled={isTransitioning}
            level={Math.floor((wordProgress[wordToUse.id]?.xp || 0) / 100)}
            xp={wordProgress[wordToUse.id]?.xp || 0}
            sessionProgress={
              sessionProgress?.wordsCompleted / Math.max(sessionProgress?.targetWords || 20, 1)
            }
            context={contextForWord}
          />
        ) : quizModeToUse === 'letter-scramble' ? (
          <LetterScrambleQuiz
            key={`ls-${wordToUse.id}-${quizModeToUse}`} // Stable key based on word ID and mode
            word={gameServices.modeHandler.getQuizAnswer(wordToUse, quizModeToUse)} // Always scramble the target language word (German/Spanish)
            definition={gameServices.modeHandler.getQuizQuestion(wordToUse, quizModeToUse)} // Show Dutch translation as hint
            context={contextForWord}
            currentWord={(getSessionStats()?.currentIndex || 0) + 1}
            totalWords={getSessionStats()?.totalWords || 10}
            level={Math.floor((wordProgress[wordToUse.id]?.xp || 0) / 100)}
            xp={wordProgress[wordToUse.id]?.xp || 0}
            disabled={isTransitioning}
            onAnswer={correct => {
              // Use the unified handleSubmit for consistent word progress tracking
              const targetAnswer = gameServices.modeHandler.getQuizAnswer(wordToUse, quizModeToUse);
              handleSubmit(correct ? targetAnswer : 'incorrect_answer');
            }}
          />
        ) : quizModeToUse === 'fill-in-the-blank' ? (
          <FillInTheBlankQuiz
            key={`fib-${wordToUse.id}-${quizModeToUse}`} // Stable key based on word ID and mode
            word={gameServices.modeHandler.getQuizAnswer(wordToUse, quizModeToUse)} // Always ask for the target language (German/Spanish)
            questionWord={gameServices.modeHandler.getQuizQuestion(wordToUse, quizModeToUse)} // Show Dutch word to translate
            userAnswer={inputValue}
            onAnswerChange={setInputValue}
            onSubmit={handleOpenQuestionSubmit}
            isCorrect={currentAnswerCorrect === true}
            disabled={isTransitioning}
            level={Math.floor((wordProgress[wordToUse.id]?.xp || 0) / 100)}
            xp={wordProgress[wordToUse.id]?.xp || 0}
            context={contextForWord}
            currentWord={(getSessionStats()?.currentIndex || 0) + 1}
            totalWords={getSessionStats()?.totalWords || 10}
          />
        ) : (
          <OpenQuestionQuiz
            key={`oq-${wordToUse.id}-${quizModeToUse}`} // Stable key based on word ID and mode
            word={gameServices.modeHandler.getQuizQuestion(wordToUse, quizModeToUse)} // Show Dutch translation as the question
            userAnswer={inputValue}
            onAnswerChange={setInputValue}
            onSubmit={handleOpenQuestionSubmit}
            isCorrect={currentAnswerCorrect === true}
            disabled={isTransitioning}
            level={Math.floor((wordProgress[wordToUse.id]?.xp || 0) / 100)}
            xp={wordProgress[wordToUse.id]?.xp || 0}
            context={contextForWord}
          />
        )}
      </>
    );

  // Handle session-specific themed rendering
  const bossHealth = sessionProgress?.bossHealth || 100;

  switch (currentSession?.id) {
    case 'quick-dash':
      return <QuickDashContainer>{quizContent}</QuickDashContainer>;

    case 'deep-dive':
      return <DeepDiveContainer>{quizContent}</DeepDiveContainer>;

    case 'streak-challenge':
      return (
        <StreakChallengeContainer streak={sessionProgress.currentStreak}>
          <StreakMultiplier streak={sessionProgress.currentStreak}>
            {sessionProgress.currentStreak > 0
              ? `x${Math.min(Math.pow(1.5, Math.min(sessionProgress.currentStreak, 20)), 8).toFixed(
                  1
                )}`
              : 'x1.0'}
          </StreakMultiplier>
          {quizContent}
        </StreakChallengeContainer>
      );

    case 'precision-mode':
      return <PrecisionModeContainer>{quizContent}</PrecisionModeContainer>;

    case 'fill-in-the-blank':
      return (
        <FillInTheBlankContainer>
          <ContextMeter contextualWords={sessionProgress.wordsCompleted} />
          {quizContent}
        </FillInTheBlankContainer>
      );

    case 'boss-battle':
      return (
        <BossBattleContainer damage={false}>
          <BossHealthBar health={bossHealth}>
            <BossAvatar health={bossHealth} />
            <BossNamePlate>
              <BossName>🗡️ Word Destroyer</BossName>
              <BossTitle>Master of Confusion</BossTitle>
            </BossNamePlate>
            <HealthBarContainer>
              <HealthBarBackground>
                <HealthBarFill health={bossHealth} />
              </HealthBarBackground>
              <HealthText health={bossHealth}>{bossHealth}% HP</HealthText>
            </HealthBarContainer>
          </BossHealthBar>
          {quizContent}
        </BossBattleContainer>
      );

    default:
      return quizContent;
  }
};

export default QuizRenderer;
