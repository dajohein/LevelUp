import React, { useEffect, useCallback, useRef, useReducer, useMemo } from 'react';
import styled from '@emotion/styled';
import { keyframes, css } from '@emotion/react';
import { logger } from '../../services/logger';
import { BrainProgress } from './BrainProgress';

interface GraphemeSegmenter {
  segment(input: string): Iterable<{ segment: string }>;
}

type GraphemeSegmenterConstructor = new (
  locales?: string | string[],
  options?: { granularity: 'grapheme' }
) => GraphemeSegmenter;

const Segmenter = (Intl as typeof Intl & { Segmenter?: GraphemeSegmenterConstructor }).Segmenter;
const graphemeSegmenter = Segmenter ? new Segmenter(undefined, { granularity: 'grapheme' }) : null;

function createUnicodePropertyPattern(source: string): RegExp | null {
  try {
    return new RegExp(source, 'u');
  } catch {
    return null;
  }
}

const combiningMarkPattern = createUnicodePropertyPattern('\\p{M}');
const letterKeyPattern = createUnicodePropertyPattern('^\\p{L}\\p{M}*$');

function isCombiningMark(character: string): boolean {
  if (combiningMarkPattern) return combiningMarkPattern.test(character);
  const codePoint = character.codePointAt(0) ?? 0;
  return (
    (codePoint >= 0x0300 && codePoint <= 0x036f) ||
    (codePoint >= 0x1ab0 && codePoint <= 0x1aff) ||
    (codePoint >= 0x1dc0 && codePoint <= 0x1dff) ||
    (codePoint >= 0x20d0 && codePoint <= 0x20ff) ||
    (codePoint >= 0xfe20 && codePoint <= 0xfe2f)
  );
}

function isLetterKey(key: string): boolean {
  return letterKeyPattern ? letterKeyPattern.test(key) : /^[a-z]$/i.test(key);
}

export function getScrambleLetters(
  word: string,
  segmenter: GraphemeSegmenter | null = graphemeSegmenter
): string[] {
  const normalizedWord = word.normalize('NFC');
  if (segmenter) {
    return Array.from(segmenter.segment(normalizedWord), ({ segment }) => segment);
  }
  return Array.from(normalizedWord).reduce<string[]>((letters, character) => {
    if (isCombiningMark(character) && letters.length > 0) {
      letters[letters.length - 1] += character;
    } else {
      letters.push(character);
    }
    return letters;
  }, []);
}

function normalizeScrambleLetter(letter: string): string {
  return letter.normalize('NFC').toLowerCase();
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest('input, textarea, select, [role="textbox"]')) return true;

  const contentEditable = target.closest('[contenteditable]');
  return contentEditable !== null && contentEditable.getAttribute('contenteditable') !== 'false';
}

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

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1.5rem;
    margin-bottom: ${props => props.theme.spacing.sm};
  }
`;

// Removed unused styled component: ContextSection

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

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    width: ${props => props.theme.touchTarget.minimum};
    height: ${props => props.theme.touchTarget.minimum};
    font-size: 1.1rem;
  }

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

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    gap: ${props => props.theme.spacing.xs};
    padding: ${props => props.theme.spacing.sm};
  }
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

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    width: ${props => props.theme.touchTarget.comfortable};
    height: ${props => props.theme.touchTarget.comfortable};
    font-size: 1.2rem;
  }

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

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    flex-direction: column;
    width: 100%;
    gap: ${props => props.theme.spacing.xs};
  }
`;

const ActionButton = styled.button<{ variant?: 'clear' | 'hint' }>`
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  border-radius: ${props => props.theme.borderRadius.sm};
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    min-height: ${props => props.theme.touchTarget.minimum};
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
    width: 100%;
  }

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

interface LetterTileState {
  letter: string;
  index: number;
  used: boolean;
}

interface ScrambleState {
  userAnswer: string[];
  availableLetters: LetterTileState[];
  showResult: boolean;
  isCorrect: boolean;
  hintsUsed: number;
}

type ScrambleAction =
  | { type: 'RESET'; word: string }
  | { type: 'ADD_LETTER'; letterIndex: number }
  | { type: 'REMOVE_LETTER'; answerIndex: number; removedLetter: string }
  | { type: 'CLEAR' }
  | { type: 'HINT'; letterIndex: number }
  | { type: 'SHOW_RESULT'; isCorrect: boolean };

function buildInitialAvailableLetters(word: string): LetterTileState[] {
  const letters = getScrambleLetters(word).map((letter, index) => ({
    letter: normalizeScrambleLetter(letter),
    index,
    used: false,
  }));
  return [...letters].sort(() => Math.random() - 0.5);
}

function scrambleReducer(state: ScrambleState, action: ScrambleAction): ScrambleState {
  switch (action.type) {
    case 'RESET':
      return {
        userAnswer: [],
        availableLetters: buildInitialAvailableLetters(action.word),
        showResult: false,
        isCorrect: false,
        hintsUsed: 0,
      };

    case 'ADD_LETTER': {
      const letter = state.availableLetters[action.letterIndex];
      if (!letter || letter.used) return state;
      return {
        ...state,
        userAnswer: [...state.userAnswer, letter.letter],
        availableLetters: state.availableLetters.map((l, i) =>
          i === action.letterIndex ? { ...l, used: true } : l
        ),
      };
    }

    case 'REMOVE_LETTER': {
      const updated = [...state.availableLetters];
      const toRestore = updated.find(l => l.letter === action.removedLetter && l.used);
      if (toRestore) toRestore.used = false;
      return {
        ...state,
        userAnswer: state.userAnswer.filter((_, i) => i !== action.answerIndex),
        availableLetters: updated,
      };
    }

    case 'CLEAR':
      return {
        ...state,
        userAnswer: [],
        availableLetters: state.availableLetters.map(l => ({ ...l, used: false })),
      };

    case 'HINT': {
      const letter = state.availableLetters[action.letterIndex];
      if (!letter || letter.used) return state;
      return {
        ...state,
        userAnswer: [...state.userAnswer, letter.letter],
        availableLetters: state.availableLetters.map((l, i) =>
          i === action.letterIndex ? { ...l, used: true } : l
        ),
        hintsUsed: state.hintsUsed + 1,
      };
    }

    case 'SHOW_RESULT':
      return { ...state, showResult: true, isCorrect: action.isCorrect };

    default:
      return state;
  }
}

interface LetterScrambleQuizProps {
  word: string; // The answer the user needs to build
  definition: string; // The question/prompt shown to the user
  context?: {
    sentence: string;
    translation: string;
  };
  currentWord: number;
  totalWords: number;
  level?: number;
  xp?: number;
  onAnswer: (isCorrect: boolean) => void;
  disabled?: boolean;
}

export const LetterScrambleQuiz: React.FC<LetterScrambleQuizProps> = ({
  word,
  definition,
  // context, // Removed unused parameter
  currentWord,
  totalWords,
  level = 0,
  xp = 0,
  onAnswer,
  disabled = false,
}) => {
  const [state, dispatch] = useReducer(scrambleReducer, word, (initialWord): ScrambleState => ({
    userAnswer: [],
    availableLetters: buildInitialAvailableLetters(initialWord),
    showResult: false,
    isCorrect: false,
    hintsUsed: 0,
  }));

  const { userAnswer, availableLetters, showResult, isCorrect, hintsUsed } = state;
  const targetLetters = useMemo(() => getScrambleLetters(word), [word]);
  const inputLocked = disabled || showResult || userAnswer.length >= targetLetters.length;

  // Initialize scrambled letters
  useEffect(() => {
    logger.debug('🔄 LetterScrambleQuiz: Resetting for new word:', word, 'definition:', definition);
    dispatch({ type: 'RESET', word });
    hasCheckedRef.current = false;
    logger.debug('✨ LetterScrambleQuiz: State reset complete');
  }, [word, definition]);

  const addLetter = useCallback(
    (letterIndex: number) => {
      if (inputLocked) return;
      const letter = availableLetters[letterIndex];
      if (!letter || letter.used) return;
      dispatch({ type: 'ADD_LETTER', letterIndex });
    },
    [availableLetters, inputLocked]
  );

  const removeLetter = useCallback(
    (answerIndex: number) => {
      if (inputLocked) return;
      const removedLetter = userAnswer[answerIndex];
      dispatch({ type: 'REMOVE_LETTER', answerIndex, removedLetter });
    },
    [userAnswer, inputLocked]
  );

  const clearAnswer = useCallback(() => {
    if (inputLocked) return;
    dispatch({ type: 'CLEAR' });
  }, [inputLocked]);

  // Check if a letter at a specific position is correct
  const getLetterStatus = useCallback(
    (position: number) => {
      if (position >= userAnswer.length) return 'empty';
      if (showResult) {
        return isCorrect ? 'correct' : 'wrong';
      }

      const userLetter = normalizeScrambleLetter(userAnswer[position] ?? '');
      const targetLetter = normalizeScrambleLetter(targetLetters[position] ?? '');

      if (userLetter === targetLetter) {
        return 'correct-position';
      } else {
        return 'wrong-position';
      }
    },
    [userAnswer, targetLetters, showResult, isCorrect]
  );

  // Keyboard support
  const handleLetterKeyDown = useCallback(
    (e: React.KeyboardEvent, letterIndex: number) => {
      if (inputLocked) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        addLetter(letterIndex);
      }
    },
    [addLetter, inputLocked]
  );

  const handleAnswerKeyDown = useCallback(
    (e: React.KeyboardEvent, answerIndex: number) => {
      if (inputLocked) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (userAnswer[answerIndex]) {
          removeLetter(answerIndex);
        }
      }
    },
    [userAnswer, removeLetter, inputLocked]
  );

  const giveHint = useCallback(() => {
    if (inputLocked || hintsUsed >= targetLetters.length) return;

    const correctLetter = normalizeScrambleLetter(targetLetters[userAnswer.length]);
    const availableLetter = availableLetters.find(l => l.letter === correctLetter && !l.used);

    if (availableLetter) {
      const letterIndex = availableLetters.indexOf(availableLetter);
      dispatch({ type: 'HINT', letterIndex });
    }
  }, [targetLetters, userAnswer, availableLetters, hintsUsed, inputLocked]);

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
      userAnswer.length === targetLetters.length &&
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
        const userWord = userAnswer.map(normalizeScrambleLetter).join('');
        const targetWord = targetLetters.map(normalizeScrambleLetter).join('');
        const correct = userWord === targetWord;

        logger.debug('🎯 LetterScrambleQuiz: Answer check:', { userWord, targetWord, correct });

        dispatch({ type: 'SHOW_RESULT', isCorrect: correct });
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
  }, [userAnswer.length, targetLetters, showResult, disabled, userAnswer, onAnswer]);

  // Keyboard typing support
  useEffect(() => {
    if (inputLocked) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const isAltGraph = event.getModifierState('AltGraph');
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.key === 'Dead' ||
        event.key === 'Process' ||
        event.key === 'Unidentified' ||
        event.metaKey ||
        (event.shiftKey && event.key.length !== 1) ||
        (event.ctrlKey && !isAltGraph) ||
        (event.altKey && !isAltGraph) ||
        isEditableTarget(event.target)
      ) {
        return;
      }

      // Handle backspace to remove last letter
      if (event.key.toLowerCase() === 'backspace') {
        if (userAnswer.length > 0) {
          event.preventDefault();
          const lastIndex = userAnswer.length - 1;
          removeLetter(lastIndex);
        }
        return;
      }

      if (
        (event.key === ' ' || isLetterKey(event.key)) &&
        !(
          event.key === ' ' &&
          event.target instanceof Element &&
          event.target.closest('[role="button"], button')
        )
      ) {
        const typedLetter = normalizeScrambleLetter(event.key);
        const letterIndex = availableLetters.findIndex(
          letter => letter.letter === typedLetter && !letter.used
        );
        if (letterIndex < 0) return;

        event.preventDefault();
        addLetter(letterIndex);
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [availableLetters, userAnswer, inputLocked, addLetter, removeLetter]);

  // Removed unused variable: progress

  return (
    <Container>
      <Word>{definition}</Word>

      <AnswerContainer>
        <AnswerDisplay role="group" aria-label="Answer letters">
          {Array.from({ length: targetLetters.length }, (_, index) => {
            const status = getLetterStatus(index);
            return (
              <AnswerLetter
                key={index}
                isCorrect={status === 'correct' || status === 'correct-position'}
                isWrong={status === 'wrong'}
                isWrongPosition={status === 'wrong-position'}
                onClick={() => !inputLocked && userAnswer[index] && removeLetter(index)}
                onKeyDown={e => handleAnswerKeyDown(e, index)}
                role="button"
                aria-label={
                  userAnswer[index] ? `Remove letter ${userAnswer[index]}` : 'Empty position'
                }
                aria-disabled={inputLocked}
                tabIndex={userAnswer[index] && !inputLocked ? 0 : -1}
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
              isUsed={letter.used || inputLocked}
              onClick={() => {
                addLetter(index);
              }}
              onKeyDown={e => handleLetterKeyDown(e, index)}
              role="button"
              aria-label={
                letter.used
                  ? `Letter ${letter.letter.toUpperCase()} already used`
                  : `Add letter ${letter.letter.toUpperCase()}`
              }
              aria-disabled={letter.used || inputLocked}
              tabIndex={letter.used || inputLocked ? -1 : 0}
            >
              {letter.letter.toUpperCase()}
            </LetterTile>
          ))}
        </LetterPool>

        <ActionButtons>
          <ActionButton variant="clear" onClick={clearAnswer} disabled={inputLocked}>
            Clear All
          </ActionButton>
          <ActionButton
            variant="hint"
            onClick={giveHint}
            disabled={inputLocked || hintsUsed >= targetLetters.length}
          >
            Hint ({hintsUsed}/{targetLetters.length})
          </ActionButton>
        </ActionButtons>

        <HintContainer>
          💡 Tap letters or type to spell the word
          <br />
          ⌨️ Use keyboard to type • Backspace to delete • Click letters to remove
        </HintContainer>
      </AnswerContainer>

      <BrainProgress xp={xp} level={level} />
      <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '0.9rem', color: '#666' }}>
        Question {currentWord} of {totalWords}
      </div>
    </Container>
  );
};
