import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from '@emotion/styled';
import { keyframes, css } from '@emotion/react';
import { logger } from '../../services/logger';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const letterPop = keyframes`
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
`;

const letterShake = keyframes`
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
`;

const successGlow = keyframes`
  0% { box-shadow: 0 0 0 rgba(16, 185, 129, 0.5); }
  50% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.8); }
  100% { box-shadow: 0 0 0 rgba(16, 185, 129, 0.5); }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${props => props.theme.spacing.lg};
  ${css`
    animation: ${fadeIn} 0.3s ease-out;
  `}
  width: 100%;
  max-width: 600px;
`;

const Word = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: ${props => props.theme.colors.text};
  margin-bottom: ${props => props.theme.spacing.md};
  text-align: center;
`;

const ContextSection = styled.div`
  background-color: ${props => props.theme.colors.surface};
  border-radius: ${props => props.theme.borderRadius.md};
  padding: ${props => props.theme.spacing.md};
  margin: ${props => props.theme.spacing.sm} 0;
  border-left: 4px solid ${props => props.theme.colors.primary};
  max-width: 600px;
  width: 100%;
`;

const ContextSentence = styled.div`
  font-style: italic;
  color: ${props => props.theme.colors.text};
  margin-bottom: ${props => props.theme.spacing.xs};
  font-size: 1.1rem;
`;

const ContextTranslation = styled.div`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.9rem;
`;

const ContextPlaceholder = styled(ContextTranslation)`
  font-style: italic;
  opacity: 0.6;
`;

const AnswerContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${props => props.theme.spacing.md};
  width: 100%;
`;

const AnswerDisplay = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: ${props => props.theme.spacing.xs};
  min-height: 60px;
  padding: ${props => props.theme.spacing.md};
  background-color: ${props => props.theme.colors.surface};
  border-radius: ${props => props.theme.borderRadius.md};
  border: 2px solid ${props => props.theme.colors.surface};
  align-items: center;
  margin-bottom: ${props => props.theme.spacing.md};
`;

const AnswerLetter = styled.div<{
  isCorrect?: boolean;
  isWrong?: boolean;
  isWrongPosition?: boolean;
}>`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props =>
    props.isCorrect
      ? '#10b981'
      : props.isWrong
      ? '#ef4444'
      : props.isWrongPosition
      ? '#f59e0b'
      : props.theme.colors.primary};
  color: white;
  border-radius: ${props => props.theme.borderRadius.sm};
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  ${css`
    animation: ${letterPop} 0.3s ease-out;
  `}

  ${props =>
    props.isCorrect &&
    css`
      animation: ${successGlow} 0.5s ease-out;
    `}

  ${props =>
    props.isWrong &&
    css`
      animation: ${letterShake} 0.5s ease-out;
    `}

  ${props =>
    props.isWrongPosition &&
    css`
      animation: ${letterShake} 0.3s ease-out;
    `}

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
`;

const LetterPool = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: ${props => props.theme.spacing.sm};
  padding: ${props => props.theme.spacing.md};
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: ${props => props.theme.borderRadius.md};
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const LetterTile = styled.div<{ isUsed?: boolean }>`
  width: 45px;
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props =>
    props.isUsed ? 'rgba(75, 85, 99, 0.5)' : 'rgba(59, 130, 246, 0.8)'};
  color: white;
  border-radius: ${props => props.theme.borderRadius.sm};
  font-size: 1.3rem;
  font-weight: bold;
  cursor: ${props => (props.isUsed ? 'not-allowed' : 'pointer')};
  transition: all 0.2s ease;
  opacity: ${props => (props.isUsed ? 0.4 : 1)};
  ${css`
    animation: ${letterPop} 0.3s ease-out;
  `}

  &:hover {
    ${props =>
      !props.isUsed &&
      `
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
      background-color: rgba(59, 130, 246, 1);
    `}
  }

  &:active {
    transform: scale(0.95);
  }
`;

const HintContainer = styled.div`
  text-align: center;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.9rem;
  margin-top: ${props => props.theme.spacing.sm};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.sm};
  margin-top: ${props => props.theme.spacing.md};
`;

const ActionButton = styled.button<{ variant?: 'clear' | 'hint' }>`
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  border-radius: ${props => props.theme.borderRadius.sm};
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  ${props =>
    props.variant === 'clear'
      ? `
    background-color: rgba(239, 68, 68, 0.8);
    color: white;
    &:hover {
      background-color: rgba(239, 68, 68, 1);
      transform: translateY(-1px);
    }
  `
      : props.variant === 'hint'
      ? `
    background-color: rgba(245, 158, 11, 0.8);
    color: white;
    &:hover {
      background-color: rgba(245, 158, 11, 1);
      transform: translateY(-1px);
    }
  `
      : `
    background-color: ${props.theme.colors.primary};
    color: white;
    &:hover {
      background-color: ${props.theme.colors.secondary};
      transform: translateY(-1px);
    }
  `}
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

interface LetterScrambleQuizProps {
  word: string; // The answer the user needs to build
  definition: string; // The question/prompt shown to the user
  context?: {
    sentence: string;
    translation: string;
  };
  currentWord: number;
  totalWords: number;
  onAnswer: (isCorrect: boolean) => void;
  disabled?: boolean;
}

export const LetterScrambleQuiz: React.FC<LetterScrambleQuizProps> = ({
  word,
  definition,
  context,
  currentWord,
  totalWords,
  onAnswer,
  disabled = false,
}) => {
  const [userAnswer, setUserAnswer] = useState<string[]>([]);
  const [availableLetters, setAvailableLetters] = useState<
    { letter: string; index: number; used: boolean }[]
  >([]);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);

  // Initialize scrambled letters
  useEffect(() => {
    logger.debug('🔄 LetterScrambleQuiz: Resetting for new word:', word, 'definition:', definition);
    const letters = word
      .toLowerCase()
      .split('')
      .map((letter, index) => ({
        letter,
        index,
        used: false,
      }));

    // Shuffle the letters
    const shuffled = [...letters].sort(() => Math.random() - 0.5);
    setAvailableLetters(shuffled);
    setUserAnswer([]);
    setShowResult(false);
    setIsCorrect(false);
    setHintsUsed(0);
    hasCheckedRef.current = false;
    logger.debug('✨ LetterScrambleQuiz: State reset complete');
  }, [word, definition]);

  const addLetter = useCallback(
    (letterIndex: number) => {
      const letter = availableLetters[letterIndex];
      if (letter.used) {
        return;
      }
      setUserAnswer(prev => [...prev, letter.letter]);
      setAvailableLetters(prev =>
        prev.map((l, i) => (i === letterIndex ? { ...l, used: true } : l))
      );
    },
    [availableLetters]
  );

  const removeLetter = useCallback(
    (answerIndex: number) => {
      const removedLetter = userAnswer[answerIndex];
      setUserAnswer(prev => prev.filter((_, i) => i !== answerIndex));

      // Find the first unused letter tile with this letter and mark it as available
      setAvailableLetters(prev => {
        const updatedLetters = [...prev];
        const letterToRestore = updatedLetters.find(l => l.letter === removedLetter && l.used);
        if (letterToRestore) {
          letterToRestore.used = false;
        }
        return updatedLetters;
      });
    },
    [userAnswer]
  );

  const clearAnswer = useCallback(() => {
    setUserAnswer([]);
    setAvailableLetters(prev => prev.map(l => ({ ...l, used: false })));
  }, []);

  // Check if a letter at a specific position is correct
  const getLetterStatus = useCallback(
    (position: number) => {
      if (position >= userAnswer.length) return 'empty';
      if (showResult) {
        return isCorrect ? 'correct' : 'wrong';
      }

      const userLetter = userAnswer[position]?.toLowerCase();
      const targetLetter = word.toLowerCase()[position];

      if (userLetter === targetLetter) {
        return 'correct-position';
      } else {
        return 'wrong-position';
      }
    },
    [userAnswer, word, showResult, isCorrect]
  );

  // Keyboard support
  const handleLetterKeyDown = useCallback(
    (e: React.KeyboardEvent, letterIndex: number) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        addLetter(letterIndex);
      }
    },
    [addLetter]
  );

  const handleAnswerKeyDown = useCallback(
    (e: React.KeyboardEvent, answerIndex: number) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (userAnswer[answerIndex]) {
          removeLetter(answerIndex);
        }
      }
    },
    [userAnswer, removeLetter]
  );

  const giveHint = useCallback(() => {
    if (hintsUsed >= word.length || userAnswer.length >= word.length) return;

    const correctLetter = word.toLowerCase()[userAnswer.length];
    const availableLetter = availableLetters.find(l => l.letter === correctLetter && !l.used);

    if (availableLetter) {
      const letterIndex = availableLetters.indexOf(availableLetter);
      addLetter(letterIndex);
      setHintsUsed(prev => prev + 1);
    }
  }, [word, userAnswer, availableLetters, hintsUsed, addLetter]);

  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasCheckedRef = useRef(false);

  // Auto-check when word is complete
  useEffect(() => {
    // Clear any existing timeout
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
      checkTimeoutRef.current = null;
    }

    if (
      userAnswer.length === word.length &&
      !showResult &&
      userAnswer.length > 0 &&
      !disabled &&
      !hasCheckedRef.current
    ) {
      logger.debug('⏰ LetterScrambleQuiz: Checking completed word');
      checkTimeoutRef.current = setTimeout(() => {
        // Call checkAnswer directly without dependency
        if (hasCheckedRef.current) return;

        hasCheckedRef.current = true;
        const userWord = userAnswer.join('').toLowerCase();
        const targetWord = word.toLowerCase();
        const correct = userWord === targetWord;

        logger.debug('🎯 LetterScrambleQuiz: Answer check:', { userWord, targetWord, correct });

        setIsCorrect(correct);
        setShowResult(true);
        onAnswer(correct);

        checkTimeoutRef.current = null;
      }, 300);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
        checkTimeoutRef.current = null;
      }
    };
  }, [userAnswer.length, word.length, showResult, disabled, userAnswer, word, onAnswer]);

  // Keyboard typing support
  useEffect(() => {
    if (disabled || showResult) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      // Handle backspace to remove last letter
      if (key === 'backspace') {
        event.preventDefault();
        if (userAnswer.length > 0) {
          const lastIndex = userAnswer.length - 1;
          removeLetter(lastIndex);
        }
        return;
      }

      // Handle letter keys
      if (key.length === 1 && /[a-zA-Z ]/.test(key)) {
        event.preventDefault();

        // Find an unused letter that matches the typed key
        const availableLetter = availableLetters.find(
          l => l.letter.toLowerCase() === key && !l.used
        );

        if (availableLetter) {
          const letterIndex = availableLetters.indexOf(availableLetter);
          addLetter(letterIndex);
        }
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [availableLetters, userAnswer, disabled, showResult, addLetter, removeLetter]);

  const progress = (currentWord / totalWords) * 100;

  return (
    <Container>
      <Word>{definition}</Word>

      {context && (
        <ContextSection>
          {showResult ? (
            <>
              <ContextSentence>"{context.sentence}"</ContextSentence>
              <ContextTranslation>{context.translation}</ContextTranslation>
            </>
          ) : (
            <ContextPlaceholder>Context will appear after answering</ContextPlaceholder>
          )}
        </ContextSection>
      )}

      <AnswerContainer>
        <AnswerDisplay role="group" aria-label="Answer letters">
          {Array.from({ length: word.length }, (_, index) => {
            const status = getLetterStatus(index);
            return (
              <AnswerLetter
                key={index}
                isCorrect={status === 'correct' || status === 'correct-position'}
                isWrong={status === 'wrong'}
                isWrongPosition={status === 'wrong-position'}
                onClick={() => !disabled && userAnswer[index] && removeLetter(index)}
                onKeyDown={e => handleAnswerKeyDown(e, index)}
                role="button"
                aria-label={
                  userAnswer[index] ? `Remove letter ${userAnswer[index]}` : 'Empty position'
                }
                tabIndex={userAnswer[index] ? 0 : -1}
              >
                {userAnswer[index] || '_'}
              </AnswerLetter>
            );
          })}
        </AnswerDisplay>

        <LetterPool role="group" aria-label="Available letters to choose from">
          {availableLetters.map((letter, index) => (
            <LetterTile
              key={`${letter.letter}-${letter.index}`}
              isUsed={letter.used}
              onClick={() => {
                if (disabled) return;
                addLetter(index);
              }}
              onKeyDown={e => handleLetterKeyDown(e, index)}
              role="button"
              aria-label={
                letter.used
                  ? `Letter ${letter.letter.toUpperCase()} already used`
                  : `Add letter ${letter.letter.toUpperCase()}`
              }
              aria-disabled={letter.used}
              tabIndex={letter.used ? -1 : 0}
            >
              {letter.letter.toUpperCase()}
            </LetterTile>
          ))}
        </LetterPool>

        <ActionButtons>
          <ActionButton variant="clear" onClick={clearAnswer} disabled={disabled}>
            Clear All
          </ActionButton>
          <ActionButton
            variant="hint"
            onClick={giveHint}
            disabled={disabled || hintsUsed >= word.length || userAnswer.length >= word.length}
          >
            Hint ({hintsUsed}/{word.length})
          </ActionButton>
        </ActionButtons>

        <HintContainer>
          💡 Tap letters or type to spell the word
          <br />
          ⌨️ Use keyboard to type • Backspace to delete • Click letters to remove
        </HintContainer>
      </AnswerContainer>

      <ProgressContainer>
        <span>
          Question {currentWord} of {totalWords}
        </span>
        <ProgressBar progress={progress} />
      </ProgressContainer>
    </Container>
  );
};
