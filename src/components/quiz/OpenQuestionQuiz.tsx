import React from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { AnimatedInput } from '../animations/AnimatedInput';

// Brain progress component for consistent visual progress
const BrainProgressContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: ${props => props.theme.spacing.sm};
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: ${props => props.theme.spacing.md};
`;

const BrainIcon = styled.span<{ filled: boolean; partial?: boolean }>`
  font-size: 18px;
  transition: all 0.3s ease;
  position: relative;
  display: inline-block;
  
  opacity: ${props => 
    props.filled 
      ? '1' 
      : props.partial 
      ? '0.7' 
      : '0.3'};
      
  filter: ${props => 
    props.filled 
      ? 'hue-rotate(0deg) saturate(1.2) brightness(1.1)' 
      : props.partial 
      ? 'hue-rotate(30deg) saturate(0.8) brightness(0.9)' 
      : 'grayscale(0.8) brightness(0.5)'};
      
  transform: ${props => 
    props.filled 
      ? 'scale(1.15)' 
      : props.partial 
      ? 'scale(1.05)' 
      : 'scale(0.95)'};

  ${props => props.filled && `
    text-shadow: 0 0 8px rgba(76, 175, 80, 0.4);
  `}

  ${props => props.partial && `
    animation: brainPulse 2s ease-in-out infinite;
    text-shadow: 0 0 4px rgba(255, 152, 0, 0.3);
  `}

  @keyframes brainPulse {
    0%, 100% { 
      opacity: 0.7; 
      transform: scale(1.05);
    }
    50% { 
      opacity: 0.9; 
      transform: scale(1.1);
    }
  }
`;

const ProgressText = styled.span`
  margin-left: 8px;
  font-size: 0.9rem;
  color: ${props => props.theme.colors.textSecondary};
  font-weight: 500;
`;

// Brain progress component
const BrainProgress: React.FC<{ xp: number; level: number }> = ({ xp, level }) => {
  const progressInLevel = xp % 100;
  
  const getBrainFillStates = (progress: number) => {
    const states = [];
    
    if (progress <= 0) states.push(false);
    else if (progress <= 33) states.push('partial');
    else states.push(true);
    
    if (progress <= 33) states.push(false);
    else if (progress <= 66) states.push('partial');
    else states.push(true);
    
    if (progress <= 66) states.push(false);
    else if (progress < 100) states.push('partial');
    else states.push(true);
    
    return states;
  };

  const fillStates = getBrainFillStates(progressInLevel);
  const getProgressLabel = (progress: number, level: number) => {
    if (level === 0 && progress < 25) return 'Rookie';
    if (progress > 75) return 'Expert';
    if (progress > 50) return 'Learning';
    if (progress > 25) return 'Started';
    return 'Beginner';
  };

  return (
    <BrainProgressContainer>
      {['🧠', '🧠', '🧠'].map((emoji, index) => (
        <BrainIcon 
          key={index}
          filled={fillStates[index] === true}
          partial={fillStates[index] === 'partial'}
        >
          {emoji}
        </BrainIcon>
      ))}
      <ProgressText>
        {getProgressLabel(progressInLevel, level)} • {xp} XP
      </ProgressText>
    </BrainProgressContainer>
  );
};

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
      <BrainProgress xp={xp} level={level} />
    </Container>
  );
};

export const OpenQuestionQuiz = React.memo(OpenQuestionQuizComponent);
