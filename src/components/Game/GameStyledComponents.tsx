/**
 * Game Styled Components Library
 * 
 * Comprehensive collection of all styled components used in the Game component.
 * Extracted to improve maintainability and reduce component file size.
 */

import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';

// Animation keyframes
export const countUp = keyframes`
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
`;

export const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 10px rgba(59, 130, 246, 0.3); }
  50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.6); }
`;

export const streakFire = keyframes`
  0%, 100% { transform: scale(1) rotate(-1deg); }
  50% { transform: scale(1.1) rotate(1deg); }
`;

export const livesWarning = keyframes`
  0%, 100% { 
    box-shadow: 0 0 15px rgba(239, 68, 68, 0.5);
    border-color: rgba(239, 68, 68, 0.7);
  }
  50% { 
    box-shadow: 0 0 25px rgba(239, 68, 68, 0.8);
    border-color: rgba(239, 68, 68, 1);
  }
`;

export const progressShimmer = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

const healthShimmer = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(300%); }
`;

// Main layout containers
export const GameContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: calc(100vh - 120px);
  min-height: calc(100dvh - 120px);
  padding: ${props => props.theme.spacing.xl};
  padding-top: calc(120px + ${props => props.theme.spacing.lg});
  padding-bottom: ${props => props.theme.spacing.xl};
  background-color: ${props => props.theme.colors.background};
  overflow-y: auto;
  overflow-x: hidden;
  box-sizing: border-box;
  position: relative;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.md};
    padding-top: calc(100px + ${props => props.theme.spacing.md});
    padding-bottom: ${props => props.theme.spacing.lg};
    min-height: calc(100dvh - 100px);
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.sm};
    padding-top: calc(90px + ${props => props.theme.spacing.sm});
    padding-bottom: ${props => props.theme.spacing.md};
    min-height: calc(100dvh - 90px);
  }
`;

export const GameContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  width: 100%;
  max-width: 800px;
  gap: ${props => props.theme.spacing.lg};
  min-height: 300px;

  @media (max-height: 600px) {
    min-height: 200px;
    gap: ${props => props.theme.spacing.md};
  }

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    gap: ${props => props.theme.spacing.md};
    min-height: 250px;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    gap: ${props => props.theme.spacing.sm};
    min-height: 200px;
    padding: 0 ${props => props.theme.spacing.xs};
  }

  @media (max-height: 500px) {
    min-height: 150px;
    gap: ${props => props.theme.spacing.xs};
  }
`;

export const SkipButtonContainer = styled.div`
  margin-top: ${props => props.theme.spacing.lg};
  padding: ${props => props.theme.spacing.md} 0;
  flex-shrink: 0;

  @media (max-height: 600px) {
    margin-top: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.sm} 0;
  }
`;

// Session progress components
export const SessionProgressBar = styled.div`
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

  @media (max-width: 768px) {
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.md};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
    margin-bottom: ${props => props.theme.spacing.xs};
    border-radius: 8px;
    border-width: 1px;
    flex-direction: row !important;
    justify-content: space-around;
    gap: ${props => props.theme.spacing.xs};
    min-height: auto;

    &:hover {
      transform: none;
    }
  }
`;

export const ProgressItem = styled.div<{ variant?: 'score' | 'streak' | 'words' | 'time' | 'lives' }>`
  text-align: center;
  color: ${props => props.theme.colors.text};
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  position: relative;
  min-width: 80px;

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

export const ProgressValue = styled.div<{ variant?: 'score' | 'streak' | 'words' | 'time' | 'lives' }>`
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  animation: ${countUp} 0.5s ease-out;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 0.9rem;
    margin-bottom: 1px;
    gap: 1px;
  }

  @media (max-width: 768px) {
    font-size: 1.2rem;
  }
`;

export const ProgressLabel = styled.div`
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

export const Button = styled.button`
  background: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);

  &:hover {
    background: ${props => props.theme.colors.secondary};
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(76, 175, 80, 0.4);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

export const BossIndicator = styled.div`
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
  margin-bottom: ${props => props.theme.spacing.lg};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 0.9rem;
    padding: ${props => props.theme.spacing.sm};
  }
`;

// Session-specific themed containers
export const QuickDashContainer = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: 2px solid #00d4aa;
  border-radius: 16px;
  padding: ${props => props.theme.spacing.lg};
  position: relative;
  overflow: hidden;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
  }
`;

export const DeepDiveContainer = styled.div`
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  border: 2px solid #0099cc;
  border-radius: 16px;
  padding: ${props => props.theme.spacing.lg};
  position: relative;
  box-shadow: 0 8px 32px rgba(79, 172, 254, 0.2);

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
  }
`;

export const StreakChallengeContainer = styled.div<{ streak?: number }>`
  background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
  border: 2px solid #ff6b6b;
  border-radius: 16px;
  padding: ${props => props.theme.spacing.lg};
  position: relative;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
  }
`;

export const PrecisionModeContainer = styled.div`
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
  border: 2px solid #00b4db;
  border-radius: 16px;
  padding: ${props => props.theme.spacing.lg};
  position: relative;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
  }
`;

export const FillInTheBlankContainer = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: 2px solid #6c5ce7;
  border-radius: 16px;
  padding: ${props => props.theme.spacing.lg};
  position: relative;
  box-shadow: 0 8px 32px rgba(108, 92, 231, 0.2);

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
  }
`;

export const BossBattleContainer = styled.div<{ damage?: boolean }>`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f1e 100%);
  border: 3px solid #8b0000;
  border-radius: 20px;
  padding: ${props => props.theme.spacing.lg};
  position: relative;
  box-shadow: 0 0 30px rgba(139, 0, 0, 0.4), inset 0 0 50px rgba(0, 0, 0, 0.6);
  overflow: hidden;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
  }
`;

// Interactive meters
export const SpeedMeter = styled.div<{ speed?: number }>`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  background: rgba(0, 212, 170, 0.1);
  border: 1px solid #00d4aa;
  border-radius: 20px;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.md};
`;

export const StreakMultiplier = styled.div<{ streak?: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(45deg, #ff6b6b, #ee5a24);
  color: white;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  font-weight: bold;
  font-size: 1.2rem;
  position: absolute;
  top: -10px;
  right: -10px;
  transition: transform 0.3s ease;
`;

export const AccuracyMeter = styled.div<{ accuracy?: number }>`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  background: rgba(0, 180, 219, 0.1);
  border: 1px solid #00b4db;
  border-radius: 20px;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.md};
`;

export const BrainMeter = styled.div<{ knowledge?: number }>`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  background: rgba(79, 172, 254, 0.1);
  border: 1px solid #4facfe;
  border-radius: 20px;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.md};
`;

export const ContextMeter = styled.div<{ contextualWords?: number }>`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  background: rgba(108, 92, 231, 0.1);
  border: 1px solid #6c5ce7;
  border-radius: 20px;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.md};
`;

export const BossAvatar = styled.div<{ health?: number }>`
  position: absolute;
  left: -30px;
  top: 50%;
  transform: translateY(-50%);
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #8b0000, #dc143c);
  border-radius: 50%;
  border: 4px solid #ffd700;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  box-shadow: 0 0 30px rgba(255, 215, 0, 0.6), inset 0 0 20px rgba(0, 0, 0, 0.3);
  z-index: 2;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    width: 60px;
    height: 60px;
    font-size: 2rem;
  }
`;

// Boss name and title components
export const BossNamePlate = styled.div`
  margin-left: 60px;
  margin-bottom: ${props => props.theme.spacing.xs};
`;

export const BossName = styled.div`
  font-size: 1.2rem;
  font-weight: bold;
  color: #ffd700;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
  margin-bottom: 4px;
`;

export const BossTitle = styled.div`
  font-size: 0.9rem;
  color: #dc143c;
  font-style: italic;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
`;

// Health bar components
export const HealthBarContainer = styled.div`
  margin-left: 60px;
  position: relative;
`;

export const HealthBarBackground = styled.div`
  width: 100%;
  height: 24px;
  background: linear-gradient(90deg, rgba(139, 0, 0, 0.3), rgba(0, 0, 0, 0.6));
  border-radius: 12px;
  border: 2px solid #8b0000;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
`;

export const HealthBarFill = styled.div<{ health?: number }>`
  width: ${props => props.health || 100}%;
  height: 100%;
  background: linear-gradient(90deg, #dc143c 0%, #ff4500 30%, #ffd700 70%, #32cd32 100%);
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.3) 50%,
      transparent 100%
    );
    animation: ${healthShimmer} 2s linear infinite;
  }
`;

export const HealthText = styled.div<{ health?: number }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-weight: bold;
  font-size: 0.9rem;
  color: ${props => (props.health && props.health > 30) ? '#FFFFFF' : '#FFD700'};
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.9);
  pointer-events: none;
  z-index: 1;
`;

export const BossHealthBar = styled.div<{ health?: number }>`
  position: relative;
  width: 100%;
  margin-bottom: ${props => props.theme.spacing.lg};
  padding: ${props => props.theme.spacing.md};
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.8), rgba(139, 0, 0, 0.6));
  border-radius: 20px;
  border: 3px solid #8b0000;
  box-shadow: 0 0 20px rgba(139, 0, 0, 0.5), inset 0 0 20px rgba(0, 0, 0, 0.5);
`;