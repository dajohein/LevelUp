import React from 'react';
import styled from '@emotion/styled';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';

const ProgressContainer = styled.div`
  position: fixed;
  top: 60px; /* Position below the navigation bar */
  left: 0;
  right: 0;
  padding: ${props => props.theme.spacing.md};
  background-color: ${props => props.theme.colors.surface};
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 10;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  color: ${props => props.theme.colors.text};
`;

const Label = styled.span`
  font-size: 0.8rem;
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: ${props => props.theme.spacing.xs};
`;

const Value = styled.span`
  font-size: 1.2rem;
  font-weight: bold;
`;

const LivesContainer = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.xs};
`;

const Heart = styled.span<{ active: boolean }>`
  color: ${props => (props.active ? props.theme.colors.error : props.theme.colors.textSecondary)};
  font-size: 1.5rem;
`;

const StreakBadge = styled.div<{ active: boolean }>`
  background-color: ${props =>
    props.active ? props.theme.colors.primary : props.theme.colors.surface};
  color: ${props => props.theme.colors.text};
  padding: ${props => `${props.theme.spacing.xs} ${props.theme.spacing.sm}`};
  border-radius: ${props => props.theme.borderRadius.sm};
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.xs};
  transition: all 0.3s ease;
`;

const BonusMultiplier = styled.span`
  font-size: 0.8rem;
  color: ${props => props.theme.colors.success};
`;

export const Progress: React.FC = () => {
  const { score, lives, streak } = useSelector((state: RootState) => state.game);
  const bonusMultiplier = Math.floor(streak / 5);

  return (
    <ProgressContainer>
      <StatItem>
        <Label>Score</Label>
        <Value>{score}</Value>
      </StatItem>

      <StatItem>
        <Label>Lives</Label>
        <LivesContainer>
          {[...Array(3)].map((_, i) => (
            <Heart key={i} active={i < lives}>
              ❤️
            </Heart>
          ))}
        </LivesContainer>
      </StatItem>

      <StatItem>
        <Label>Streak</Label>
        <StreakBadge active={streak > 0}>
          <Value>{streak}</Value>
          {bonusMultiplier > 0 && <BonusMultiplier>×{bonusMultiplier + 1}</BonusMultiplier>}
        </StreakBadge>
      </StatItem>
    </ProgressContainer>
  );
};
