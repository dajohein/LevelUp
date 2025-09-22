import React, { useEffect } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';

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
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${props =>
    props.isCorrect ? `${props.theme.colors.success}33` : `${props.theme.colors.error}33`};
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  pointer-events: none;
  animation: ${props => (props.show ? fadeIn : fadeOut)} ${props => (props.show ? '0.5s' : '1s')}
    ease-out forwards;
`;

const FeedbackCard = styled.div<{ isCorrect: boolean }>`
  background-color: ${props => props.theme.colors.background};
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  border: 4px solid
    ${props => (props.isCorrect ? props.theme.colors.success : props.theme.colors.error)};
  text-align: center;
  max-width: 400px;
  animation: ${fadeIn} 0.3s ease-out forwards;
`;

const FeedbackIcon = styled.div<{ isCorrect: boolean }>`
  font-size: 4rem;
  margin-bottom: 1rem;
  color: ${props => (props.isCorrect ? props.theme.colors.success : props.theme.colors.error)};
`;

const FeedbackTitle = styled.div<{ isCorrect: boolean }>`
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 1rem;
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
  capitalizationFeedback?: string;
}

export const FeedbackOverlay: React.FC<FeedbackOverlayProps> = ({
  isCorrect,
  correctAnswer,
  capitalizationFeedback,
}) => {
  const [show, setShow] = React.useState(false);

  useEffect(() => {
    if (isCorrect !== null) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 2000); // Show for 2 seconds
      return () => clearTimeout(timer);
    }
  }, [isCorrect]);

  if (isCorrect === null) return null;

  return (
    <Overlay isCorrect={isCorrect} show={show}>
      <FeedbackCard isCorrect={isCorrect}>
        <FeedbackIcon isCorrect={isCorrect}>{isCorrect ? '🎉' : '❌'}</FeedbackIcon>
        <FeedbackTitle isCorrect={isCorrect}>{isCorrect ? 'Correct!' : 'Incorrect'}</FeedbackTitle>
        {!isCorrect && correctAnswer && (
          <CorrectAnswerText>
            Correct answer: <strong>{correctAnswer}</strong>
          </CorrectAnswerText>
        )}
        {isCorrect && capitalizationFeedback && (
          <CapitalizationFeedback>{capitalizationFeedback}</CapitalizationFeedback>
        )}
      </FeedbackCard>
    </Overlay>
  );
};
