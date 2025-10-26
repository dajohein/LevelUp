import React from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { AnimatedInput } from '../animations/AnimatedInput';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${props => props.theme.spacing.lg};
  animation: ${fadeIn} 0.3s ease-out;
  width: 100%;
  max-width: 600px;
`;

const Word = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: ${props => props.theme.colors.text};
  margin-bottom: ${props => props.theme.spacing.md};
  text-align: center;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1.5rem;
    margin-bottom: ${props => props.theme.spacing.sm};
  }
`;

const ProgressContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.9rem;
  margin-top: ${props => props.theme.spacing.md};
`;

const ProgressBar = styled.div<{ progress: number }>`
  width: 100px;
  height: 6px;
  background-color: ${props => props.theme.colors.surface};
  border-radius: 3px;
  overflow: hidden;

  &::after {
    content: '';
    display: block;
    width: ${props => props.progress}%;
    height: 100%;
    background-color: ${props => props.theme.colors.primary};
    transition: width 0.3s ease;
  }
`;

const ModeIndicator = styled.div`
  background-color: ${props => props.theme.colors.primary};
  color: white;
  padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.md};
  border-radius: ${props => props.theme.borderRadius.full};
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ContextSection = styled.div`
  background-color: ${props => props.theme.colors.surface};
  border-radius: ${props => props.theme.borderRadius.md};
  padding: ${props => props.theme.spacing.md};
  margin: ${props => props.theme.spacing.sm} 0;
  border-left: 4px solid ${props => props.theme.colors.primary};
  max-width: 600px;
  width: 100%;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.sm};
    margin: ${props => props.theme.spacing.xs} 0;
    border-left-width: 3px;
  }
`;

const ContextSentence = styled.div`
  font-style: italic;
  color: ${props => props.theme.colors.text};
  margin-bottom: ${props => props.theme.spacing.xs};
  font-size: 1.1rem;
`;

const ContextTranslation = styled.div`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.95rem;
`;

const ContextLabel = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.colors.textSecondary};
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.5px;
  margin-bottom: ${props => props.theme.spacing.xs};
`;

interface OpenQuestionQuizProps {
  word: string;
  userAnswer: string;
  onAnswerChange: (answer: string) => void;
  onSubmit: () => void;
  isCorrect?: boolean;
  isError?: boolean;
  hint?: string;
  disabled?: boolean;
  level?: number;
  xp?: number;
  context?: { sentence: string; translation: string; audio?: string };
}

const OpenQuestionQuizComponent: React.FC<OpenQuestionQuizProps> = ({
  word,
  userAnswer,
  onAnswerChange,
  onSubmit,
  isCorrect,
  isError,
  hint,
  disabled = false,
  level = 1,
  xp = 0,
  context,
}) => {
  return (
    <Container>
      <ModeIndicator>Open Answer Mode</ModeIndicator>

      <Word>{word}</Word>
      
      {context && (
        <ContextSection>
          <ContextLabel>Example usage</ContextLabel>
          <ContextSentence>{context.sentence}</ContextSentence>
          {userAnswer && (isCorrect === true || isError === true) ? (
            <ContextTranslation>{context.translation}</ContextTranslation>
          ) : (
            <ContextTranslation style={{ fontStyle: 'italic', opacity: 0.7, fontSize: '0.9rem' }}>
              Translation will appear after answering
            </ContextTranslation>
          )}
        </ContextSection>
      )}
      
      <AnimatedInput
        value={userAnswer}
        onChange={onAnswerChange}
        onSubmit={onSubmit}
        isCorrect={isCorrect}
        isError={isError}
        hint={hint}
        disabled={disabled}
        placeholder="Type your translation..."
      />
      <ProgressContainer>
        <span>Level {level}</span>
        <ProgressBar progress={xp % 100} />
        <span>{xp} XP</span>
      </ProgressContainer>
    </Container>
  );
};

export const OpenQuestionQuiz = React.memo(OpenQuestionQuizComponent);
