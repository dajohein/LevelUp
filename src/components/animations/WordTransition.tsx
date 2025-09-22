import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { Word } from '@/services/wordService';
import { AnimatedWord } from './AnimatedWord';

const TransitionContainer = styled.div`
  position: relative;
  min-height: 120px;
  margin-bottom: ${props => props.theme.spacing.xl};
`;

interface WordTransitionProps {
  word: Word | null;
  onTransitionComplete?: () => void;
}

export const WordTransition: React.FC<WordTransitionProps> = ({ word, onTransitionComplete }) => {
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [previousWord, setPreviousWord] = useState<Word | null>(null);

  useEffect(() => {
    if (word?.definition !== currentWord?.definition) {
      setPreviousWord(currentWord);

      // Start exit animation for current word
      const exitTimer = setTimeout(() => {
        setCurrentWord(word);
        // After exit animation, show new word
        const enterTimer = setTimeout(() => {
          setPreviousWord(null);
          if (onTransitionComplete) {
            onTransitionComplete();
          }
        }, 300); // Match animation duration
        return () => clearTimeout(enterTimer);
      }, 300); // Match animation duration

      return () => clearTimeout(exitTimer);
    }
  }, [word, currentWord, onTransitionComplete]);

  return (
    <TransitionContainer>
      {previousWord && (
        <AnimatedWord word={previousWord.definition} level={previousWord.level} isExiting />
      )}
      {currentWord && (
        <AnimatedWord word={currentWord.definition} level={currentWord.level} isExiting={false} />
      )}
    </TransitionContainer>
  );
};
