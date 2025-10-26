import React from 'react';
import styled from '@emotion/styled';
import { keyframes, css } from '@emotion/react';

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

const EnhancementIndicator = styled.div`
  background: linear-gradient(45deg, #ff6b6b, #ffd93d);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: inline-block;
  margin-bottom: ${props => props.theme.spacing.sm};
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
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

const LevelIndicator = styled.div`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.9rem;
  margin-top: ${props => props.theme.spacing.sm};
`;

const XPProgress = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.9rem;
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
  direction,
  enhancementLevel,
  originalQuizMode,
  sessionProgress = 0,
  context,
}) => {
  console.log('🎯 MultipleChoiceQuiz props:', { context, enhancementLevel, originalQuizMode, level, xp, sessionProgress });
  
  // Show enhancement indicator when session has progressed (indicating advanced modes are active)
  const isEnhanced = sessionProgress >= 0.3 || context || enhancementLevel === 'advanced';
  const enhancementText = sessionProgress >= 0.7 ? 'Advanced Deep Dive' : 
                         sessionProgress >= 0.5 ? 'Enhanced Learning' : 
                         sessionProgress >= 0.3 ? 'Context Mode' : 'Enhanced Learning';
  
  return (
    <Container>
      {isEnhanced && (
        <EnhancementIndicator>
          ✨ {enhancementText}
        </EnhancementIndicator>
      )}
      
      <Word>{word}</Word>
      {context && (
        <ContextSection>
          <ContextLabel>Example usage</ContextLabel>
          <ContextSentence>{context.sentence}</ContextSentence>
          {selectedOption ? (
            <ContextTranslation>{context.translation}</ContextTranslation>
          ) : (
            <ContextTranslation style={{ fontStyle: 'italic', opacity: 0.7, fontSize: '0.9rem' }}>
              Translation will appear after answering
            </ContextTranslation>
          )}
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
      <XPProgress>
        <LevelIndicator>Level {level}</LevelIndicator>
        <ProgressBar progress={xp % 100} />
        {xp} XP
      </XPProgress>
    </Container>
  );
};

export const MultipleChoiceQuiz = React.memo(MultipleChoiceQuizComponent);
