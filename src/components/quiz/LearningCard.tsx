/**
 * Learning Card Component
 *
 * Shows a new word with its translation and context before testing
 * Helps users learn the word before being quizzed on it
 */

import React, { useState, useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';

const slideIn = keyframes`
  from { 
    opacity: 0; 
    transform: translateY(20px); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
`;

const CardContainer = styled.div`
  background: linear-gradient(135deg, #2a2a2a 0%, #3a3a3a 100%);
  border-radius: 20px;
  padding: 2rem;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.3);
  border: 2px solid ${props => props.theme.colors.primary};
  animation: ${slideIn} 0.5s ease-out;
  text-align: center;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 1.5rem;
    border-radius: 16px;
    max-width: 100%;
    margin: 0 ${props => props.theme.spacing.sm};
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  color: ${props => props.theme.colors.primary};
  font-size: 1.1rem;
  font-weight: 600;
`;

const WordDisplay = styled.div`
  margin-bottom: 1.5rem;
`;

const MainWord = styled.div`
  font-size: 2.5rem;
  font-weight: bold;
  color: ${props => props.theme.colors.text};
  margin-bottom: 0.5rem;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 2rem;
  }
`;

const Translation = styled.div`
  font-size: 1.8rem;
  color: ${props => props.theme.colors.primary};
  margin-bottom: 1rem;
  font-weight: 500;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1.5rem;
  }
`;

const Context = styled.div`
  font-size: 1rem;
  color: ${props => props.theme.colors.textSecondary};
  font-style: italic;
  margin-bottom: 1.5rem;
  padding: 0.75rem 1rem;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border-left: 4px solid ${props => props.theme.colors.secondary};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 0.9rem;
    padding: 0.5rem 0.75rem;
  }
`;

const Progress = styled.div`
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
`;

const ProgressText = styled.div`
  font-size: 0.9rem;
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: 0.5rem;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ progress: number }>`
  height: 100%;
  background: linear-gradient(
    90deg,
    ${props => props.theme.colors.primary},
    ${props => props.theme.colors.secondary}
  );
  width: ${props => props.progress}%;
  transition: width 0.3s ease;
`;

const ContinueButton = styled.button`
  background: linear-gradient(
    135deg,
    ${props => props.theme.colors.primary},
    ${props => props.theme.colors.secondary}
  );
  color: white;
  border: none;
  border-radius: 12px;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(0, 100, 200, 0.3);

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    min-height: ${props => props.theme.touchTarget.minimum};
    padding: 1rem 1.5rem;
    width: 100%;
    font-size: 1rem;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 100, 200, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
`;

const Timer = styled.div`
  font-size: 0.9rem;
  color: ${props => props.theme.colors.textSecondary};
  margin-top: 1rem;
`;

const BrainProgressContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${props => props.theme.spacing.md};
  margin-top: ${props => props.theme.spacing.md};
  font-size: 0.9rem;
  color: ${props => props.theme.colors.textSecondary};

  @media (max-width: 768px) {
    font-size: 0.8rem;
    gap: ${props => props.theme.spacing.sm};
  }
`;

const BrainIcon = styled.div<{ filled: boolean; partial?: boolean }>`
  width: 24px;
  height: 24px;
  position: relative;
  transition: all 0.3s ease;

  @media (max-width: 768px) {
    width: 20px;
    height: 20px;
  }

  &::before {
    content: '🧠';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    filter: ${props => 
      props.filled 
        ? 'none' 
        : props.partial 
          ? 'brightness(0.7) saturate(0.8)'
          : 'grayscale(1) brightness(0.4)'
    };
    transform: ${props => props.filled || props.partial ? 'scale(1.1)' : 'scale(1)'};
  }
`;

const BrainContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const BrainProgress: React.FC<{ xp: number; level: number }> = ({ xp, level }) => {
  // Calculate progress within current level (0-100%)
  const progressInLevel = xp % 100;
  
  // Calculate how many brains should be filled
  const brain1Filled = progressInLevel >= 33;
  const brain2Filled = progressInLevel >= 66;
  const brain3Filled = progressInLevel >= 99;
  
  const brain1Partial = progressInLevel >= 10 && progressInLevel < 33;
  const brain2Partial = progressInLevel >= 40 && progressInLevel < 66;
  const brain3Partial = progressInLevel >= 80 && progressInLevel < 99;

  return (
    <BrainProgressContainer>
      <span>Level {level}</span>
      <BrainContainer>
        <BrainIcon filled={brain1Filled} partial={brain1Partial} />
        <BrainIcon filled={brain2Filled} partial={brain2Partial} />
        <BrainIcon filled={brain3Filled} partial={brain3Partial} />
      </BrainContainer>
      <span>{xp} XP</span>
    </BrainProgressContainer>
  );
};

interface LearningCardProps {
  word: any;
  currentIndex: number;
  totalWords: number;
  level?: number;
  xp?: number;
  onContinue: () => void;
  autoAdvance?: boolean;
  autoAdvanceDelay?: number;
  reason?: 'new' | 'reinforcement'; // Why the learning card is shown
}

export const LearningCard: React.FC<LearningCardProps> = ({
  word,
  currentIndex,
  totalWords,
  level,
  xp,
  onContinue,
  autoAdvance = true,
  autoAdvanceDelay = 3000, // 3 seconds default
  reason = 'new',
}) => {
  const [timeLeft, setTimeLeft] = useState(autoAdvanceDelay / 1000);
  const onContinueRef = useRef(onContinue);

  // Update the ref when onContinue changes
  useEffect(() => {
    onContinueRef.current = onContinue;
  }, [onContinue]);

  useEffect(() => {
    if (autoAdvance) {
      // Reset timer when autoAdvance or delay changes
      setTimeLeft(autoAdvanceDelay / 1000);

      const timer = setTimeout(() => onContinueRef.current(), autoAdvanceDelay);

      const countdown = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(countdown);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearTimeout(timer);
        clearInterval(countdown);
      };
    } else {
      setTimeLeft(0);
    }
  }, [autoAdvance, autoAdvanceDelay]); // Removed onContinue from dependencies

  const getQuestionWord = (word: any) => {
    const direction = word.direction || 'definition-to-term';
    if (direction === 'term-to-definition') {
      return word.term;
    } else {
      return word.definition;
    }
  };

  const getAnswerWord = (word: any) => {
    const direction = word.direction || 'definition-to-term';
    if (direction === 'term-to-definition') {
      return word.definition;
    } else {
      return word.term;
    }
  };

  const progress = ((currentIndex + 1) / totalWords) * 100;

  return (
    <CardContainer>
      <CardHeader>
        {reason === 'new' ? (
          <>
            <span>🌱</span>
            Learning New Word
          </>
        ) : (
          <>
            <span>📝</span>
            Practice Time - Let's Review!
          </>
        )}
      </CardHeader>

      <WordDisplay>
        <MainWord>{getQuestionWord(word)}</MainWord>
        <Translation>{getAnswerWord(word)}</Translation>
        {word.context && (
          <Context>
            "{typeof word.context === 'string' 
              ? word.context 
              : word.context.sentence || word.context.translation || ''
            }"
          </Context>
        )}
      </WordDisplay>

      {/* Show brain progress if XP data is available, otherwise show session progress */}
      {level !== undefined && xp !== undefined ? (
        <BrainProgress xp={xp} level={level} />
      ) : (
        <Progress>
          <ProgressText>
            Word {currentIndex + 1} of {totalWords}
          </ProgressText>
          <ProgressBar>
            <ProgressFill progress={progress} />
          </ProgressBar>
        </Progress>
      )}
      
      {/* Always show session progress below brain progress when both are available */}
      {level !== undefined && xp !== undefined && (
        <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '0.9rem', color: '#666' }}>
          Word {currentIndex + 1} of {totalWords}
        </div>
      )}

      <ContinueButton onClick={onContinue}>Ready to Practice</ContinueButton>

      {autoAdvance && timeLeft > 0 && (
        <Timer>Auto-advancing in {timeLeft}s (click to continue now)</Timer>
      )}
    </CardContainer>
  );
};
