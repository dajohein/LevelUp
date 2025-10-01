import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { keyframes, css } from '@emotion/react';
import { Achievement } from '@/store/achievementsSlice';
import { Confetti } from './Confetti';

const slideIn = keyframes`
  from {
    transform: translateX(120%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const slideOut = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(120%);
    opacity: 0;
  }
`;

const Container = styled.div<{ isExiting: boolean }>`
  position: fixed;
  bottom: 90px;
  right: 20px;
  padding: ${props => props.theme.spacing.md};
  background-color: ${props => props.theme.colors.surface};
  border-left: 4px solid ${props => props.theme.colors.primary};
  border-radius: ${props => props.theme.borderRadius.md};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.md};
  min-width: 300px;
  z-index: 1000;
  ${props =>
    css`
      animation: ${props.isExiting ? slideOut : slideIn} 0.5s ease-in-out forwards;
    `}
`;

const Icon = styled.div`
  font-size: 2rem;
  line-height: 1;
`;

const Content = styled.div`
  flex: 1;
`;

const Title = styled.h3`
  margin: 0;
  color: ${props => props.theme.colors.text};
  font-size: 1.1rem;
  font-weight: 600;
`;

const Description = styled.p`
  margin: ${props => props.theme.spacing.xs} 0 0;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.9rem;
`;

interface AchievementNotificationProps {
  achievement: Achievement;
  onComplete: () => void;
}

export const AchievementNotification: React.FC<AchievementNotificationProps> = ({
  achievement,
  onComplete,
}) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      // Wait for exit animation before removing
      setTimeout(onComplete, 500);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <>
      <Confetti count={30} duration={2000} />
      <Container isExiting={isExiting}>
        <Icon>{achievement.icon}</Icon>
        <Content>
          <Title>Achievement Unlocked!</Title>
          <Description>{achievement.description}</Description>
        </Content>
      </Container>
    </>
  );
};
