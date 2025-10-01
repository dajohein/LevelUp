import React, { useEffect } from 'react';
import styled from '@emotion/styled';
import { keyframes, css } from '@emotion/react';

const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
`;

const fadeOut = keyframes`
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(1.2); }
`;

const Overlay = styled.div<{ isCorrect: boolean; show: boolean }>`
  position: fixed;
  ${props => props.isCorrect ? 
    'top: 2rem; left: 50%; transform: translateX(-50%); width: auto;' : 
    'top: 0; left: 0; right: 0; bottom: 0;'}
  background-color: ${props =>
    props.isCorrect ? 'transparent' : `${props.theme.colors.error}33`};
  display: flex;
  justify-content: center;
  align-items: ${props => props.isCorrect ? 'flex-start' : 'center'};
  opacity: 0;
  pointer-events: none;
  z-index: 1000;
  ${props =>
    css`
      animation: ${props.show ? fadeIn : fadeOut} ${props.show ? '0.5s' : '1s'} ease-out forwards;
    `}
`;

const FeedbackCard = styled.div<{ isCorrect: boolean }>`
  background-color: ${props => props.theme.colors.background};
  border-radius: ${props => props.isCorrect ? '12px' : '16px'};
  padding: ${props => props.isCorrect ? '1rem 1.5rem' : '2rem'};
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  border: 4px solid
    ${props => (props.isCorrect ? props.theme.colors.success : props.theme.colors.error)};
  text-align: center;
  max-width: ${props => props.isCorrect ? '200px' : '400px'};
  ${css`
    animation: ${fadeIn} 0.3s ease-out forwards;
  `}
`;

const FeedbackIcon = styled.div<{ isCorrect: boolean }>`
  font-size: ${props => props.isCorrect ? '2rem' : '4rem'};
  margin-bottom: ${props => props.isCorrect ? '0.5rem' : '1rem'};
`;

const FeedbackTitle = styled.div<{ isCorrect: boolean }>`
  font-size: ${props => props.isCorrect ? '1.2rem' : '1.5rem'};
  font-weight: bold;
  margin-bottom: ${props => props.isCorrect ? '0' : '1rem'};
  color: ${props => (props.isCorrect ? props.theme.colors.success : props.theme.colors.error)};
`;

const CorrectAnswerText = styled.div`
  font-size: 1.2rem;
  color: ${props => props.theme.colors.text};
  background-color: ${props => props.theme.colors.surface};
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-top: 1rem;
  border-left: 4px solid ${props => props.theme.colors.primary};
`;

const OriginalWordText = styled.div`
  font-size: 1.1rem;
  color: ${props => props.theme.colors.textSecondary};
  background-color: ${props => props.theme.colors.background};
  padding: 0.5rem 1rem;
  border-radius: 6px;
  margin-top: 0.5rem;
  border-left: 3px solid ${props => props.theme.colors.secondary};
`;

const WordContextText = styled.div`
  font-size: 0.9rem;
  color: ${props => props.theme.colors.textSecondary};
  font-style: italic;
  margin-top: 0.5rem;
  padding: 0.25rem 0;
`;

const CapitalizationFeedback = styled.div`
  font-size: 1rem;
  color: #ff9500;
  background-color: ${props => props.theme.colors.surface};
  padding: 0.5rem 1rem;
  border-radius: 8px;
  margin-top: 0.5rem;
  border-left: 4px solid #ff9500;
  font-style: italic;
`;

interface FeedbackOverlayProps {
  isCorrect: boolean | null;
  correctAnswer?: string;
  originalWord?: string;
  wordContext?: string;
  capitalizationFeedback?: string;
}

export const FeedbackOverlay: React.FC<FeedbackOverlayProps> = ({
  isCorrect,
  correctAnswer,
  originalWord,
  wordContext,
  capitalizationFeedback,
}) => {
  const [show, setShow] = React.useState(false);

  useEffect(() => {
    if (isCorrect !== null) {
      setShow(true);
      // Show for shorter time: 1 second for correct, 2.5 seconds for incorrect to see the answer
      const duration = isCorrect ? 1000 : 2500;
      const timer = setTimeout(() => setShow(false), duration);
      return () => clearTimeout(timer);
    }
  }, [isCorrect]);

  if (isCorrect === null) return null;

  return (
    <Overlay isCorrect={isCorrect} show={show}>
      <FeedbackCard isCorrect={isCorrect}>
        <FeedbackIcon isCorrect={isCorrect}>{isCorrect ? '🎉' : '❌'}</FeedbackIcon>
        <FeedbackTitle isCorrect={isCorrect}>{isCorrect ? 'Correct!' : 'Incorrect'}</FeedbackTitle>
        {!isCorrect && originalWord && (
          <OriginalWordText>
            You were learning: <strong>{originalWord}</strong>
          </OriginalWordText>
        )}
        {!isCorrect && correctAnswer && (
          <CorrectAnswerText>
            Correct answer: <strong>{correctAnswer}</strong>
          </CorrectAnswerText>
        )}
        {!isCorrect && wordContext && (
          <WordContextText>
            Context: {wordContext}
          </WordContextText>
        )}
        {isCorrect && capitalizationFeedback && (
          <CapitalizationFeedback>{capitalizationFeedback}</CapitalizationFeedback>
        )}
      </FeedbackCard>
    </Overlay>
  );
};
