import React from 'react';
import styled from '@emotion/styled';
import { css, keyframes } from '@emotion/react';
import { LearningProgress } from './LearningProgress';
import { StorageManagement } from './StorageManagement';

// Session Progress Animations
const countUp = keyframes`
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 10px rgba(59, 130, 246, 0.3); }
  50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.6); }
`;

const streakFire = keyframes`
  0%, 100% { transform: scale(1) rotate(-1deg); }
  50% { transform: scale(1.05) rotate(1deg); }
`;

const livesWarning = keyframes`
  0%, 100% { box-shadow: 0 0 5px rgba(239, 68, 68, 0.3); }
  50% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.7); }
`;

const SessionProgressBar = styled.div`
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.1) 0%,
    rgba(147, 51, 234, 0.1) 50%,
    rgba(236, 72, 153, 0.1) 100%
  );
  border: 2px solid rgba(59, 130, 246, 0.2);
  border-radius: 20px;
  padding: ${props => props.theme.spacing.lg};
  margin-bottom: ${props => props.theme.spacing.lg};
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(59, 130, 246, 0.2);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    animation: shine 3s infinite;
  }

  @keyframes shine {
    0% {
      left: -100%;
    }
    100% {
      left: 100%;
    }
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.sm};
    margin-bottom: ${props => props.theme.spacing.sm};
    flex-wrap: wrap;
    gap: ${props => props.theme.spacing.xs};
    border-radius: 8px;
    border-width: 1px;

    &:hover {
      transform: none;
    }
  }

  @media (max-height: 600px) {
    margin-bottom: ${props => props.theme.spacing.sm};
    padding: ${props => props.theme.spacing.sm};
  }
`;

const ProgressItem = styled.div<{ variant?: 'score' | 'streak' | 'words' | 'time' | 'lives' }>`
  text-align: center;
  color: ${props => props.theme.colors.text};
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  position: relative;
  min-width: 80px;

  ${props =>
    props.variant === 'score' &&
    css`
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05));
      border-color: rgba(16, 185, 129, 0.3);
      animation: ${pulseGlow} 2s infinite;
    `}

  ${props =>
    props.variant === 'streak' &&
    css`
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05));
      border-color: rgba(245, 158, 11, 0.3);
      animation: ${streakFire} 1s ease-in-out infinite;
    `}

  ${props =>
    props.variant === 'words' &&
    `
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05));
    border-color: rgba(59, 130, 246, 0.3);
  `}

  ${props =>
    props.variant === 'time' &&
    `
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05));
    border-color: rgba(139, 92, 246, 0.3);
  `}

  ${props =>
    props.variant === 'lives' &&
    css`
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05));
      border-color: rgba(239, 68, 68, 0.3);
      animation: ${livesWarning} 2s ease-in-out infinite;
    `}

  &:hover {
    transform: translateY(-2px) scale(1.05);
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    min-width: 45px;
    padding: ${props => props.theme.spacing.xs} 2px;
    border-radius: 6px;
    flex: 1;
    border-width: 1px;
    background: rgba(255, 255, 255, 0.03);

    &:hover {
      transform: none;
      background: rgba(255, 255, 255, 0.05);
    }
  }

  @media (max-width: 768px) {
    min-width: 60px;
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  }
`;

const ProgressValue = styled.div<{ variant?: 'score' | 'streak' | 'words' | 'time' | 'lives' }>`
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  ${css`
    animation: ${countUp} 0.5s ease-out;
  `}

  ${props =>
    props.variant === 'score' &&
    `
    color: #10b981;
    text-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
  `}

  ${props =>
    props.variant === 'streak' &&
    `
    color: #f59e0b;
    text-shadow: 0 0 10px rgba(245, 158, 11, 0.3);
  `}

  ${props =>
    props.variant === 'words' &&
    `
    color: #3b82f6;
    text-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
  `}

  ${props =>
    props.variant === 'time' &&
    `
    color: #8b5cf6;
    text-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
  `}

  ${props =>
    props.variant === 'lives' &&
    `
    color: #ef4444;
    text-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
  `}

  &::before {
    content: ${props => {
      switch (props.variant) {
        case 'score':
          return "'🏆'";
        case 'streak':
          return "'🔥'";
        case 'words':
          return "'📝'";
        case 'time':
          return "'⏱️'";
        case 'lives':
          return "'❤️'";
        default:
          return "''";
      }
    }};
    font-size: 1rem;
    margin-right: 4px;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 0.9rem;
    margin-bottom: 1px;
    gap: 1px;

    &::before {
      font-size: 0.6rem;
      margin-right: 1px;
    }
  }

  @media (max-width: 768px) {
    font-size: 1.2rem;

    &::before {
      font-size: 0.8rem;
    }
  }
`;

const ProgressLabel = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 0.6rem;
    letter-spacing: 0.2px;
    margin-top: 1px;
  }
`;

const BossIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${props => props.theme.spacing.sm};
  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
  color: white;
  padding: ${props => props.theme.spacing.md};
  border-radius: 12px;
  font-weight: bold;
  font-size: 1.1rem;
  box-shadow: 0 4px 15px rgba(238, 90, 36, 0.3);
  animation: pulse 2s infinite;
  margin-bottom: ${props => props.theme.spacing.lg};

  @keyframes pulse {
    0% {
      transform: scale(1);
      box-shadow: 0 4px 15px rgba(238, 90, 36, 0.3);
    }
    50% {
      transform: scale(1.02);
      box-shadow: 0 6px 25px rgba(238, 90, 36, 0.5);
    }
    100% {
      transform: scale(1);
      box-shadow: 0 4px 15px rgba(238, 90, 36, 0.3);
    }
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 0.9rem;
    padding: ${props => props.theme.spacing.sm};
    margin-bottom: ${props => props.theme.spacing.sm};
  }
`;

export interface SessionManagerProps {
  // Session state
  isSessionActive: boolean;
  currentSession: any;
  sessionProgress: {
    score: number;
    wordsCompleted: number;
    currentStreak: number;
    correctAnswers: number;
    incorrectAnswers: number;
  };
  sessionTimer: number;

  // Format utility
  formatTime: (seconds: number) => string;
}

export const SessionManager: React.FC<SessionManagerProps> = ({
  isSessionActive,
  currentSession,
  sessionProgress,
  sessionTimer,
  formatTime,
}) => {
  return (
    <>
      {/* Session Progress Bar for active sessions */}
      {isSessionActive && currentSession && (
        <SessionProgressBar>
          <ProgressItem variant="score">
            <ProgressValue variant="score">{sessionProgress.score}</ProgressValue>
            <ProgressLabel>Score</ProgressLabel>
          </ProgressItem>
          <ProgressItem variant="words">
            <ProgressValue variant="words">
              {currentSession.targetWords === -1
                ? sessionProgress.wordsCompleted
                : `${sessionProgress.wordsCompleted}/${currentSession.targetWords}`}
            </ProgressValue>
            <ProgressLabel>Words</ProgressLabel>
          </ProgressItem>
          <ProgressItem variant="streak">
            <ProgressValue variant="streak">{sessionProgress.currentStreak}</ProgressValue>
            <ProgressLabel>Streak</ProgressLabel>
          </ProgressItem>
          {currentSession.timeLimit && (
            <ProgressItem variant="time">
              <ProgressValue variant="time">{formatTime(sessionTimer)}</ProgressValue>
              <ProgressLabel>Time</ProgressLabel>
            </ProgressItem>
          )}
          {currentSession.allowedMistakes !== undefined && (
            <ProgressItem variant="lives">
              <ProgressValue variant="lives">
                {currentSession.allowedMistakes - sessionProgress.incorrectAnswers}
              </ProgressValue>
              <ProgressLabel>Lives</ProgressLabel>
            </ProgressItem>
          )}
        </SessionProgressBar>
      )}

      {/* Show learning progress when not in session mode */}
      {!isSessionActive && (
        <>
          <LearningProgress enhanced />
          <StorageManagement compact />
        </>
      )}

      {/* Boss Battle Indicator for final word */}
      {isSessionActive &&
        currentSession?.id === 'boss-battle' &&
        sessionProgress.wordsCompleted >= currentSession.targetWords - 1 && (
          <BossIndicator>⚔️ BOSS WORD - FINAL CHALLENGE! ⚔️</BossIndicator>
        )}
    </>
  );
};

export default SessionManager;
