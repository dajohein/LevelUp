import React from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';

const slideUp = keyframes`
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideDown = keyframes`
  0% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(-20px);
  }
`;

const WordWrapper = styled.div<{ isExiting?: boolean }>`
  position: absolute;
  animation: ${props => (props.isExiting ? slideDown : slideUp)} 0.3s ease-out forwards;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${props => props.theme.spacing.md};
`;

const Word = styled.h1`
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.h1.fontSize};
  margin: 0;
  text-align: center;
`;

const LevelIndicator = styled.div`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.9rem;
  padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  border-radius: ${props => props.theme.borderRadius.sm};
  background-color: ${props => props.theme.colors.surface};
`;

interface AnimatedWordProps {
  word: string;
  level?: number;
  isExiting?: boolean;
}

export const AnimatedWord: React.FC<AnimatedWordProps> = ({ word, level, isExiting = false }) => {
  return (
    <WordWrapper isExiting={isExiting}>
      <Word>{word}</Word>
      {level !== undefined && <LevelIndicator>Level {level}</LevelIndicator>}
    </WordWrapper>
  );
};
