import React from 'react';
import styled from '@emotion/styled';

const BrainProgressContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${props => props.theme.spacing.sm};
  padding: ${props => props.theme.spacing.sm};
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
`;

const BrainIcon = styled.span<{ filled: boolean; partial: boolean }>`
  font-size: 18px;
  opacity: ${props => (props.filled ? 1 : props.partial ? 0.7 : 0.3)};
  filter: ${props =>
    props.filled
      ? 'saturate(1.2) brightness(1.1)'
      : props.partial
        ? 'saturate(0.8) brightness(0.9)'
        : 'grayscale(0.8) brightness(0.5)'};
  transform: ${props => (props.filled ? 'scale(1.15)' : props.partial ? 'scale(1.05)' : 'scale(0.95)')};
`;

const ProgressText = styled.span`
  font-size: 0.9rem;
  color: ${props => props.theme.colors.textSecondary};
  font-weight: 500;
`;

export const getWordMasteryPercent = (xp: number): number =>
  Math.min(100, Math.max(0, Number.isFinite(xp) ? xp : 0));

export const getWordMasteryLabel = (xp: number, level: number): string => {
  const mastery = getWordMasteryPercent(xp);
  if (level === 0 && mastery < 25) return 'Rookie';
  if (mastery > 75) return 'Expert';
  if (mastery > 50) return 'Learning';
  if (mastery > 25) return 'Started';
  return 'Beginner';
};

interface BrainProgressProps {
  xp: number;
  level: number;
}

export const BrainProgress: React.FC<BrainProgressProps> = ({ xp, level }) => {
  const mastery = getWordMasteryPercent(xp);
  const label = getWordMasteryLabel(xp, level);
  const normalizedLevel = Math.max(0, level);
  const fillStates = [33, 66, 99].map((threshold, index) => {
    const lowerThreshold = index === 0 ? 0 : [33, 66, 99][index - 1];
    return {
      filled: mastery >= threshold,
      partial: mastery > lowerThreshold && mastery < threshold,
    };
  });

  return (
    <BrainProgressContainer
      role="img"
      aria-label={`Word mastery: ${label}, ${mastery}%, level ${normalizedLevel}, ${xp} XP`}
    >
      {fillStates.map((state, index) => (
        <BrainIcon
          key={index}
          filled={state.filled}
          partial={state.partial}
          aria-hidden="true"
        >
          🧠
        </BrainIcon>
      ))}
      <ProgressText>
        {label} • {mastery}% mastery • Level {normalizedLevel} • {xp} XP
      </ProgressText>
    </BrainProgressContainer>
  );
};
