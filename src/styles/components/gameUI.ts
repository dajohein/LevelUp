import styled from '@emotion/styled';
import { css } from '@emotion/react';

// ===== GAME PROGRESS COMPONENTS =====
// Matches Game.tsx progress tracking components

export const SessionProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
  margin: ${props => props.theme.spacing.md} 0;
  
  &::after {
    content: '';
    display: block;
    height: 100%;
    background: linear-gradient(90deg, #4caf50, #81c784);
    border-radius: 4px;
    transition: width 0.3s ease;
  }
`;

export const ProgressItem = styled.div<{ variant?: 'score' | 'streak' | 'words' | 'time' | 'lives' }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${props => props.theme.spacing.xs};
  padding: ${props => props.theme.spacing.sm};
  background: rgba(255, 255, 255, 0.05);
  border-radius: ${props => props.theme.borderRadius.md};
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-width: 80px;
  
  ${props => {
    switch (props.variant) {
      case 'score':
        return css`
          border-color: rgba(76, 175, 80, 0.3);
          background: rgba(76, 175, 80, 0.1);
        `;
      case 'streak':
        return css`
          border-color: rgba(255, 152, 0, 0.3);
          background: rgba(255, 152, 0, 0.1);
        `;
      case 'lives':
        return css`
          border-color: rgba(244, 67, 54, 0.3);
          background: rgba(244, 67, 54, 0.1);
        `;
      case 'time':
        return css`
          border-color: rgba(59, 130, 246, 0.3);
          background: rgba(59, 130, 246, 0.1);
        `;
      default:
        return css`
          border-color: rgba(255, 255, 255, 0.1);
        `;
    }
  }}
`;

export const ProgressValue = styled.div<{ variant?: 'score' | 'streak' | 'words' | 'time' | 'lives' }>`
  font-size: 1.2rem;
  font-weight: bold;
  
  ${props => {
    switch (props.variant) {
      case 'score':
        return css`color: #4caf50;`;
      case 'streak':
        return css`color: #ff9800;`;
      case 'lives':
        return css`color: #f44336;`;
      case 'time':
        return css`color: #3b82f6;`;
      default:
        return css`color: ${props.theme.colors.text};`;
    }
  }}
`;

export const ProgressLabel = styled.div`
  font-size: 0.7rem;
  color: ${props => props.theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-align: center;
`;

// ===== GAME MODE CONTAINERS =====
// Matches Game.tsx specialized mode containers

export const QuickDashContainer = styled.div`
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.2), rgba(33, 150, 243, 0.1));
  border: 2px solid rgba(33, 150, 243, 0.3);
  border-radius: ${props => props.theme.borderRadius.lg};
  padding: ${props => props.theme.spacing.lg};
  position: relative;
  
  &::before {
    content: '⚡';
    position: absolute;
    top: 12px;
    right: 12px;
    font-size: 1.2rem;
  }
`;

export const DeepDiveContainer = styled.div`
  background: linear-gradient(135deg, rgba(156, 39, 176, 0.2), rgba(156, 39, 176, 0.1));
  border: 2px solid rgba(156, 39, 176, 0.3);
  border-radius: ${props => props.theme.borderRadius.lg};
  padding: ${props => props.theme.spacing.lg};
  position: relative;
  
  &::before {
    content: '🧠';
    position: absolute;
    top: 12px;
    right: 12px;
    font-size: 1.2rem;
  }
`;

export const StreakChallengeContainer = styled.div<{ streak: number }>`
  background: linear-gradient(135deg, rgba(255, 152, 0, 0.2), rgba(255, 152, 0, 0.1));
  border: 2px solid rgba(255, 152, 0, 0.3);
  border-radius: ${props => props.theme.borderRadius.lg};
  padding: ${props => props.theme.spacing.lg};
  position: relative;
  
  ${props => props.streak > 5 && css`
    box-shadow: 0 0 20px rgba(255, 152, 0, 0.4);
    animation: streakGlow 2s infinite alternate;
  `}
  
  &::before {
    content: '🔥';
    position: absolute;
    top: 12px;
    right: 12px;
    font-size: 1.2rem;
  }
  
  @keyframes streakGlow {
    from { box-shadow: 0 0 20px rgba(255, 152, 0, 0.4); }
    to { box-shadow: 0 0 30px rgba(255, 152, 0, 0.6); }
  }
`;

export const PrecisionModeContainer = styled.div`
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(76, 175, 80, 0.1));
  border: 2px solid rgba(76, 175, 80, 0.3);
  border-radius: ${props => props.theme.borderRadius.lg};
  padding: ${props => props.theme.spacing.lg};
  position: relative;
  
  &::before {
    content: '🎯';
    position: absolute;
    top: 12px;
    right: 12px;
    font-size: 1.2rem;
  }
`;

export const BossBattleContainer = styled.div<{ damage?: boolean }>`
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.2), rgba(244, 67, 54, 0.1));
  border: 2px solid rgba(244, 67, 54, 0.3);
  border-radius: ${props => props.theme.borderRadius.lg};
  padding: ${props => props.theme.spacing.lg};
  position: relative;
  
  ${props => props.damage && css`
    animation: damageShake 0.5s ease-in-out;
  `}
  
  &::before {
    content: '👹';
    position: absolute;
    top: 12px;
    right: 12px;
    font-size: 1.2rem;
  }
  
  @keyframes damageShake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
`;

// ===== GAME METERS =====
// Matches Game.tsx specialized meter components

export const SpeedMeter = styled.div<{ speed: number }>`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  padding: ${props => props.theme.spacing.sm};
  background: rgba(33, 150, 243, 0.1);
  border-radius: ${props => props.theme.borderRadius.md};
  border: 1px solid rgba(33, 150, 243, 0.3);
  
  &::before {
    content: '⚡';
    font-size: 1rem;
  }
  
  &::after {
    content: '${props => props.speed.toFixed(1)}/s';
    font-size: 0.8rem;
    color: #2196f3;
    font-weight: 600;
  }
`;

export const StreakMultiplier = styled.div<{ streak: number }>`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  padding: ${props => props.theme.spacing.sm};
  background: rgba(255, 152, 0, 0.1);
  border-radius: ${props => props.theme.borderRadius.md};
  border: 1px solid rgba(255, 152, 0, 0.3);
  
  ${props => props.streak > 5 && css`
    animation: streakPulse 1s infinite alternate;
  `}
  
  &::before {
    content: '🔥';
    font-size: 1rem;
  }
  
  &::after {
    content: '${props => props.streak}x';
    font-size: 0.8rem;
    color: #ff9800;
    font-weight: 600;
  }
  
  @keyframes streakPulse {
    from { transform: scale(1); }
    to { transform: scale(1.05); }
  }
`;

export const AccuracyMeter = styled.div<{ accuracy: number }>`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  padding: ${props => props.theme.spacing.sm};
  background: rgba(76, 175, 80, 0.1);
  border-radius: ${props => props.theme.borderRadius.md};
  border: 1px solid rgba(76, 175, 80, 0.3);
  
  &::before {
    content: '🎯';
    font-size: 1rem;
  }
  
  &::after {
    content: '${props => props.accuracy.toFixed(0)}%';
    font-size: 0.8rem;
    color: #4caf50;
    font-weight: 600;
  }
`;

export const BrainMeter = styled.div<{ knowledge: number }>`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  padding: ${props => props.theme.spacing.sm};
  background: rgba(156, 39, 176, 0.1);
  border-radius: ${props => props.theme.borderRadius.md};
  border: 1px solid rgba(156, 39, 176, 0.3);
  
  &::before {
    content: '🧠';
    font-size: 1rem;
  }
  
  &::after {
    content: '${props => props.knowledge.toFixed(0)}%';
    font-size: 0.8rem;
    color: #9c27b0;
    font-weight: 600;
  }
`;

// ===== BOSS BATTLE COMPONENTS =====
// Matches Game.tsx boss battle UI

export const BossAvatar = styled.div<{ health: number }>`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff4444, #cc0000);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  border: 4px solid rgba(244, 67, 54, 0.5);
  position: relative;
  
  ${props => props.health < 30 && css`
    animation: lowHealthPulse 1s infinite alternate;
  `}
  
  &::before {
    content: '👹';
  }
  
  &::after {
    content: '';
    position: absolute;
    top: -4px;
    left: -4px;
    right: -4px;
    bottom: -4px;
    border-radius: 50%;
    border: 2px solid transparent;
    background: conic-gradient(#4caf50 0deg, #4caf50 ${props => props.health * 3.6}deg, transparent ${props => props.health * 3.6}deg);
    mask: radial-gradient(circle, transparent 60px, black 62px);
  }
  
  @keyframes lowHealthPulse {
    from { border-color: rgba(244, 67, 54, 0.5); }
    to { border-color: rgba(244, 67, 54, 1); }
  }
`;

export const BossNamePlate = styled.div`
  text-align: center;
  margin-top: ${props => props.theme.spacing.md};
`;

export const BossName = styled.div`
  font-size: 1.2rem;
  font-weight: bold;
  color: #ff4444;
  text-shadow: 0 0 10px rgba(255, 68, 68, 0.5);
`;

// ===== SKIP AND ACTION BUTTONS =====
// Matches Game.tsx action containers

export const SkipButtonContainer = styled.div`
  position: absolute;
  top: ${props => props.theme.spacing.lg};
  right: ${props => props.theme.spacing.lg};
  z-index: 10;
`;

export const GameActionButton = styled.button<{ disabled?: boolean }>`
  background: ${props => props.disabled ? 'rgba(255, 255, 255, 0.1)' : 'rgba(59, 130, 246, 0.8)'};
  color: ${props => props.disabled ? props.theme.colors.textSecondary : 'white'};
  border: none;
  border-radius: ${props => props.theme.borderRadius.md};
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  font-size: 0.9rem;
  font-weight: 600;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: rgba(59, 130, 246, 1);
    transform: translateY(-1px);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

// ===== BOSS INDICATOR =====
// Matches Game.tsx boss indicator

export const BossIndicator = styled.div`
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.8), rgba(198, 40, 40, 0.8));
  color: white;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  border-radius: ${props => props.theme.borderRadius.lg};
  font-weight: bold;
  text-align: center;
  box-shadow: 0 4px 16px rgba(244, 67, 54, 0.3);
  border: 2px solid rgba(244, 67, 54, 0.5);
  animation: bossGlow 2s infinite alternate;
  
  &::before {
    content: '👹 ';
  }
  
  @keyframes bossGlow {
    from { box-shadow: 0 4px 16px rgba(244, 67, 54, 0.3); }
    to { box-shadow: 0 4px 24px rgba(244, 67, 54, 0.5); }
  }
`;