import React from 'react';
import styled from '@emotion/styled';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';

const StatisticsContainer = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: ${props => props.theme.spacing.md};
  background-color: ${props => props.theme.colors.surface};
  display: flex;
  justify-content: space-around;
  z-index: 10;
`;

const StatBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${props => props.theme.spacing.md};
  border-radius: ${props => props.theme.borderRadius.md};
  background-color: ${props => props.theme.colors.background};
`;

const StatLabel = styled.span`
  font-size: 0.8rem;
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: ${props => props.theme.spacing.xs};
`;

const StatValue = styled.span`
  font-size: 1.2rem;
  font-weight: bold;
  color: ${props => props.theme.colors.text};
`;

const ProgressBar = styled.div<{ value: number }>`
  width: 100px;
  height: 4px;
  background-color: ${props => props.theme.colors.surface};
  border-radius: 2px;
  margin-top: ${props => props.theme.spacing.xs};
  overflow: hidden;

  &::after {
    content: '';
    display: block;
    width: ${props => props.value}%;
    height: 100%;
    background-color: ${props => props.theme.colors.primary};
    transition: width 0.3s ease;
  }
`;

export const Statistics: React.FC = () => {
  const { score, totalAttempts, correctAnswers } = useSelector((state: RootState) => state.game);

  const accuracy = totalAttempts > 0 ? Math.round((correctAnswers / totalAttempts) * 100) : 0;

  const bestStreak = useSelector((state: RootState) => {
    // This could be stored in the state or calculated
    return Math.max(state.game.streak, state.game.bestStreak || 0);
  });

  return (
    <StatisticsContainer>
      <StatBox>
        <StatLabel>Accuracy</StatLabel>
        <StatValue>{accuracy}%</StatValue>
        <ProgressBar value={accuracy} />
      </StatBox>

      <StatBox>
        <StatLabel>Total Score</StatLabel>
        <StatValue>{score}</StatValue>
      </StatBox>

      <StatBox>
        <StatLabel>Best Streak</StatLabel>
        <StatValue>{bestStreak}</StatValue>
      </StatBox>

      <StatBox>
        <StatLabel>Words Attempted</StatLabel>
        <StatValue>{totalAttempts}</StatValue>
      </StatBox>
    </StatisticsContainer>
  );
};
