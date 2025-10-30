import React from 'react';
import styled from '@emotion/styled';
import { keyframes, css } from '@emotion/react';

// Brain progress component for consistent visual progress
const BrainProgressContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: ${props => props.theme.spacing.sm};
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const BrainIcon = styled.span<{ filled: boolean; partial?: boolean }>`
  font-size: 18px;
  transition: all 0.3s ease;
  position: relative;
  display: inline-block;
  
  /* Visual states based on progress */
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

  /* Add a subtle glow for filled brains */
  ${props => props.filled && `
    text-shadow: 0 0 8px rgba(76, 175, 80, 0.4);
  `}

  /* Add a gentle pulse for partial brains */
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
  // Calculate progress within current level (0-100 based on XP within level)
  const progressInLevel = xp % 100; // Assuming 100 XP per level
  
  const getBrainFillStates = (progress: number) => {
    const states = [];
    
    // First brain: 0-33%
    if (progress <= 0) states.push(false);
    else if (progress <= 33) states.push('partial');
    else states.push(true);
    
    // Second brain: 34-66%
    if (progress <= 33) states.push(false);
    else if (progress <= 66) states.push('partial');
    else states.push(true);
    
    // Third brain: 67-100%
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

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${props => props.theme.spacing.lg};
  ${css`
    animation: ${fadeIn} 0.3s ease-out;
  `}
`;

const Word = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: ${props => props.theme.colors.text};
  margin-bottom: ${props => props.theme.spacing.md};
  text-align: center;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: 1.8rem;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1.5rem;
    margin-bottom: ${props => props.theme.spacing.sm};
  }
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

const OptionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${props => props.theme.spacing.md};
  max-width: 600px;
  width: 100%;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
    gap: ${props => props.theme.spacing.sm};
    max-width: 400px;
  }
`;

const Option = styled.button<{ isCorrect?: boolean; isError?: boolean }>`
  padding: ${props => props.theme.spacing.lg};
  font-size: 1.2rem;
  border: none;
  border-radius: ${props => props.theme.borderRadius.lg};
  background-color: ${props => {
    if (props.isCorrect) return props.theme.colors.success;
    if (props.isError) return props.theme.colors.error;
    return props.theme.colors.surface;
  }};
  color: ${props => props.theme.colors.text};
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: ${props => props.theme.touchTarget.comfortable};
  ${css`
    animation: ${fadeIn} 0.3s ease-out;
  `}

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }

  ${props =>
    props.isCorrect &&
    css`
      animation: ${pulse} 0.5s ease-out;
    `}

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.md};
    font-size: 1.1rem;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.sm};
    font-size: 1rem;
    min-height: ${props => props.theme.touchTarget.minimum};
  }
`;

interface MultipleChoiceQuizProps {
  word: string;
  options: string[];
  onSelect: (answer: string) => void;
  isCorrect?: boolean;
  selectedOption?: string;
  disabled?: boolean;
  level?: number;
  xp?: number;
  direction?: 'term-to-definition' | 'definition-to-term';
  enhancementLevel?: 'standard' | 'advanced';
  originalQuizMode?: string;
  sessionProgress?: number; // 0-1 progress through session
  context?: {
    sentence: string;
    translation: string;
    audio?: string;
  };
}

const MultipleChoiceQuizComponent: React.FC<MultipleChoiceQuizProps> = ({
  word,
  options,
  onSelect,
  isCorrect,
  selectedOption,
  disabled,
  level = 1,
  xp = 0,
  // direction, // Removed unused parameter
  enhancementLevel,
  originalQuizMode,
  sessionProgress = 0,
  context,
}) => {
  // Show enhancement indicator when session has progressed (indicating advanced modes are active)
  // Removed unused variables: isEnhanced, enhancementText
  
  // Only show context before answering if the user is still learning the word
  // Consider a word "learned" if it has significant XP (level 2+ or 200+ XP)
  const isWordLearned = (level || 0) >= 2 || (xp || 0) >= 200;
  
  // Check if this is a phrase (contains multiple words) vs a single word
  const isPhrase = word.trim().split(/\s+/).length > 1;
  
  // Show context if:
  // 1. It's NOT a phrase (phrases don't need context as they are self-contextual), AND
  // 2. User has already answered (for learning reinforcement), OR
  // 3. User is still learning this word (low level/XP)
  const shouldShowContext = context && !isPhrase && (selectedOption || !isWordLearned);
  
  // Keep enhancement data for debugging (console.log above shows it)
  // UI enhancement indicator removed for cleaner interface
  
  return (
    <Container>
      
      <Word>{word}</Word>
      {shouldShowContext && (
        <ContextSection>
          <ContextLabel>Example usage</ContextLabel>
          <ContextSentence>{context.sentence}</ContextSentence>
          <ContextTranslation>{context.translation}</ContextTranslation>
        </ContextSection>
      )}
      <OptionsGrid>
        {options.map(option => (
          <Option
            key={option}
            onClick={() => onSelect(option)}
            disabled={disabled}
            isCorrect={isCorrect && option === selectedOption}
            isError={!isCorrect && option === selectedOption}
          >
            {option}
          </Option>
        ))}
      </OptionsGrid>
      <BrainProgress xp={xp || 0} level={level || 0} />
    </Container>
  );
};

export const MultipleChoiceQuiz = React.memo(MultipleChoiceQuizComponent);
