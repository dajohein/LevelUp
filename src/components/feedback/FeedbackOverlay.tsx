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
  ${props =>
    props.isCorrect
      ? 'top: 2rem; left: 50%; transform: translateX(-50%); width: auto;'
      : 'top: 0; left: 0; right: 0; bottom: 0;'}
  background-color: ${props => (props.isCorrect ? 'transparent' : `${props.theme.colors.error}33`)};
  display: flex;
  justify-content: center;
  align-items: ${props => (props.isCorrect ? 'flex-start' : 'center')};
  opacity: 0;
  pointer-events: none;
  z-index: 1000;
  ${props => css`
    animation: ${props.show ? fadeIn : fadeOut} ${props.show ? '0.5s' : '1s'} ease-out forwards;
  `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: ${props => (props.show ? 1 : 0)};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    ${props =>
      props.isCorrect
        ? 'top: 1rem; left: 1rem; right: 1rem; transform: none; width: auto;'
        : 'padding: 1rem;'}
  }
`;

const VisuallyHiddenStatus = styled.div`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

const CorrectionReview = styled.details`
  max-width: 600px;
  margin: 1rem auto;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background-color: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text};

  summary {
    cursor: pointer;
    font-weight: 600;
  }

  p {
    margin: 0.5rem 0 0;
  }
`;

const FeedbackCard = styled.div<{ isCorrect: boolean }>`
  background-color: ${props => props.theme.colors.background};
  border-radius: ${props => (props.isCorrect ? '12px' : '16px')};
  padding: ${props => (props.isCorrect ? '1rem 1.5rem' : '2rem')};
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  border: 4px solid
    ${props => (props.isCorrect ? props.theme.colors.success : props.theme.colors.error)};
  text-align: center;
  max-width: ${props => (props.isCorrect ? '200px' : '400px')};
  ${css`
    animation: ${fadeIn} 0.3s ease-out forwards;
  `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    max-width: 100%;
    padding: ${props => (props.isCorrect ? '0.75rem 1rem' : '1.5rem')};
    margin: 0 1rem;
  }
`;

const RewardIndicator = styled.div`
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background-color: ${props => props.theme.colors.success};
  color: ${props => props.theme.colors.background};
  font-size: 1.15rem;
  font-weight: bold;
`;

const FeedbackIcon = styled.div<{ isCorrect: boolean }>`
  font-size: ${props => (props.isCorrect ? '2rem' : '4rem')};
  margin-bottom: ${props => (props.isCorrect ? '0.5rem' : '1rem')};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: ${props => (props.isCorrect ? '1.5rem' : '3rem')};
    margin-bottom: ${props => (props.isCorrect ? '0.25rem' : '0.75rem')};
  }
`;

const FeedbackTitle = styled.div<{ isCorrect: boolean }>`
  font-size: ${props => (props.isCorrect ? '1.2rem' : '1.5rem')};
  font-weight: bold;
  margin-bottom: ${props => (props.isCorrect ? '0' : '1rem')};
  color: ${props => (props.isCorrect ? props.theme.colors.success : props.theme.colors.error)};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: ${props => (props.isCorrect ? '1rem' : '1.25rem')};
    margin-bottom: ${props => (props.isCorrect ? '0' : '0.75rem')};
  }
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

interface FeedbackOverlayProps {
  isCorrect: boolean | null;
  answerSequence: number;
  selectedAnswer: string;
  correctAnswer?: string;
  originalWord?: string;
  wordContext?: string;
  capitalizationFeedback?: string;
}

export const FeedbackOverlay: React.FC<FeedbackOverlayProps> = ({
  isCorrect,
  answerSequence,
  selectedAnswer,
  correctAnswer,
  originalWord,
  wordContext,
  capitalizationFeedback,
}) => {
  const [show, setShow] = React.useState(false);
  const [reviewFeedback, setReviewFeedback] = React.useState<{
    isCorrect: boolean;
    selectedAnswer: string;
    correctAnswer?: string;
    originalWord?: string;
    wordContext?: string;
    capitalizationFeedback?: string;
  } | null>(null);

  useEffect(() => {
    if (isCorrect === null || answerSequence === 0) return;

    setReviewFeedback({
      isCorrect,
      selectedAnswer,
      correctAnswer,
      originalWord,
      wordContext,
      capitalizationFeedback,
    });
  }, [
    answerSequence,
    capitalizationFeedback,
    correctAnswer,
    isCorrect,
    originalWord,
    selectedAnswer,
    wordContext,
  ]);

  useEffect(() => {
    if (isCorrect === null || answerSequence === 0) return;

    setShow(true);
    const timer = setTimeout(() => setShow(false), isCorrect ? 1000 : 2500);
    return () => clearTimeout(timer);
  }, [answerSequence, isCorrect]);

  const announcement =
    isCorrect === null
      ? ''
      : `Answer ${answerSequence}: ${isCorrect ? 'Correct.' : 'Incorrect.'}${
          !isCorrect && correctAnswer ? ` Correct answer: ${correctAnswer}.` : ''
        }${isCorrect && capitalizationFeedback ? ` ${capitalizationFeedback}` : ''}`;

  return (
    <>
      <VisuallyHiddenStatus role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </VisuallyHiddenStatus>
      {isCorrect !== null && (
        <Overlay isCorrect={isCorrect} show={show} aria-hidden="true">
          {isCorrect ? (
            <RewardIndicator>★</RewardIndicator>
          ) : (
            <FeedbackCard isCorrect={false}>
              <FeedbackIcon isCorrect={false}>❌</FeedbackIcon>
              <FeedbackTitle isCorrect={false}>Incorrect</FeedbackTitle>
              {originalWord && (
                <OriginalWordText>
                  You were learning: <strong>{originalWord}</strong>
                </OriginalWordText>
              )}
              {correctAnswer && (
                <CorrectAnswerText>
                  Correct answer: <strong>{correctAnswer}</strong>
                </CorrectAnswerText>
              )}
              {wordContext && <WordContextText>Context: {wordContext}</WordContextText>}
            </FeedbackCard>
          )}
        </Overlay>
      )}
      {reviewFeedback && (
        <CorrectionReview>
          <summary>Review previous answer</summary>
          <p>{reviewFeedback.isCorrect ? 'Correct answer:' : 'Incorrect. Correct answer:'}</p>
          {reviewFeedback.correctAnswer && <p>{reviewFeedback.correctAnswer}</p>}
          {reviewFeedback.selectedAnswer && <p>Your answer: {reviewFeedback.selectedAnswer}</p>}
          {reviewFeedback.originalWord && <p>You were learning: {reviewFeedback.originalWord}</p>}
          {reviewFeedback.wordContext && <p>Context: {reviewFeedback.wordContext}</p>}
          {reviewFeedback.capitalizationFeedback && <p>{reviewFeedback.capitalizationFeedback}</p>}
        </CorrectionReview>
      )}
    </>
  );
};
