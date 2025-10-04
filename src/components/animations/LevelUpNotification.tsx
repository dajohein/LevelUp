import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { keyframes, css } from '@emotion/react';
import { getLevelInfo } from '../../services/levelService';

// Animations
const levelUpEntrance = keyframes`
  0% {
    opacity: 0;
    transform: scale(0.3) translateY(100px);
  }
  50% {
    opacity: 1;
    transform: scale(1.1) translateY(-20px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
`;

const levelUpExit = keyframes`
  0% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  100% {
    opacity: 0;
    transform: scale(0.8) translateY(-50px);
  }
`;

const confettiDrop = keyframes`
  0% {
    transform: translateY(-100vh) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
`;

const glowPulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
  }
  50% {
    box-shadow: 0 0 40px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 215, 0, 0.6);
  }
`;

const bounceIn = keyframes`
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
`;

// Styled Components
const Overlay = styled.div<{ isExiting: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  ${props =>
    css`
      animation: ${props.isExiting ? levelUpExit : levelUpEntrance} 0.8s ease-out;
    `}
`;

const LevelUpCard = styled.div<{ levelColor: string }>`
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  border: 3px solid ${props => props.levelColor};
  border-radius: 20px;
  padding: 3rem;
  text-align: center;
  position: relative;
  min-width: 350px;
  ${css`
    animation: ${glowPulse} 2s ease-in-out infinite;
  `}
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    min-width: 280px;
    padding: 2rem;
    margin: 0 1rem;
  }

  &::before {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 20px;
    background: conic-gradient(
      from 0deg,
      ${props => props.levelColor},
      transparent,
      ${props => props.levelColor}
    );
    z-index: -1;
    animation: spin 3s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const LevelUpTitle = styled.h1`
  color: #ffd700;
  font-size: 2.5rem;
  font-weight: bold;
  margin: 0 0 1rem 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  ${css`
    animation: ${bounceIn} 0.6s ease-out 0.3s both;
  `}
`;

const NewLevelInfo = styled.div<{ levelColor: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin: 1.5rem 0;
  ${css`
    animation: ${bounceIn} 0.6s ease-out 0.5s both;
  `}
`;

const LevelAvatar = styled.div<{ levelColor: string }>`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${props => props.levelColor}, #ffffff20);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  border: 4px solid ${props => props.levelColor};
  position: relative;
  ${css`
    animation: ${bounceIn} 0.6s ease-out 0.4s both;
  `}

  &::after {
    content: '';
    position: absolute;
    inset: -8px;
    border-radius: 50%;
    background: conic-gradient(
      from 0deg,
      ${props => props.levelColor},
      transparent,
      ${props => props.levelColor}
    );
    z-index: -1;
    animation: spin 4s linear infinite;
  }
`;

const LevelNumber = styled.div<{ levelColor: string }>`
  position: absolute;
  bottom: -10px;
  right: -10px;
  background: ${props => props.levelColor};
  color: white;
  border-radius: 20px;
  padding: 8px 12px;
  font-size: 1.2rem;
  font-weight: bold;
  border: 3px solid white;
  min-width: 40px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
`;

const LevelTitleName = styled.div<{ levelColor: string }>`
  color: ${props => props.levelColor};
  font-size: 2rem;
  font-weight: bold;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
`;

const LevelDescription = styled.p`
  color: #ccc;
  font-size: 1.1rem;
  margin: 1rem 0;
  ${css`
    animation: ${bounceIn} 0.6s ease-out 0.7s both;
  `}
`;

const ContinueButton = styled.button<{ levelColor: string }>`
  background: linear-gradient(135deg, ${props => props.levelColor}, ${props => props.levelColor}aa);
  color: white;
  border: none;
  border-radius: 25px;
  padding: 1rem 2rem;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 1.5rem;
  ${css`
    animation: ${bounceIn} 0.6s ease-out 0.9s both;
  `}

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px ${props => props.levelColor}40;
  }
`;

const ConfettiContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
`;

const ConfettiPiece = styled.div<{ color: string; delay: number; left: number }>`
  position: absolute;
  width: 10px;
  height: 10px;
  background: ${props => props.color};
  left: ${props => props.left}%;
  top: -10px;
  ${props =>
    css`
      animation: ${confettiDrop} 3s linear ${props.delay}s infinite;
    `}
`;

interface LevelUpNotificationProps {
  newLevel: number;
  totalXP: number;
  onClose: () => void;
}

export const LevelUpNotification: React.FC<LevelUpNotificationProps> = ({
  newLevel,
  totalXP,
  onClose,
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const levelInfo = getLevelInfo(newLevel);

  // Auto-close after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 800);
  };

  // Generate confetti pieces
  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    color: ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b'][i % 6],
    delay: Math.random() * 2,
    left: Math.random() * 100,
  }));

  const levelMessages = {
    5: "You're getting the hang of this!",
    10: 'Your dedication is paying off!',
    15: 'Impressive language skills!',
    20: "You're becoming a true polyglot!",
    30: 'Expert level achieved!',
    40: 'Language mastery in progress!',
    50: 'Grandmaster status unlocked!',
  };

  const message =
    levelMessages[newLevel as keyof typeof levelMessages] ||
    `Amazing progress! Level ${newLevel} achieved!`;

  return (
    <Overlay isExiting={isExiting} onClick={handleClose}>
      <LevelUpCard levelColor={levelInfo.color} onClick={e => e.stopPropagation()}>
        <ConfettiContainer>
          {confettiPieces.map(piece => (
            <ConfettiPiece
              key={piece.id}
              color={piece.color}
              delay={piece.delay}
              left={piece.left}
            />
          ))}
        </ConfettiContainer>

        <LevelUpTitle>🎉 LEVEL UP! 🎉</LevelUpTitle>

        <NewLevelInfo levelColor={levelInfo.color}>
          <LevelAvatar levelColor={levelInfo.color}>
            {levelInfo.emoji}
            <LevelNumber levelColor={levelInfo.color}>{newLevel}</LevelNumber>
          </LevelAvatar>
          <LevelTitleName levelColor={levelInfo.color}>{levelInfo.title}</LevelTitleName>
        </NewLevelInfo>

        <LevelDescription>{message}</LevelDescription>

        <LevelDescription>
          <strong>{totalXP.toLocaleString()} Total XP</strong>
        </LevelDescription>

        <ContinueButton levelColor={levelInfo.color} onClick={handleClose}>
          Continue Learning! 🚀
        </ContinueButton>
      </LevelUpCard>
    </Overlay>
  );
};
