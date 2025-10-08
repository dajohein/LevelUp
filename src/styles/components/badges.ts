import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { hover, transitions } from './animations';
import { theme } from '../theme';

// Base Badge Component
export const Badge = styled.span<{
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${props => props.theme.borderRadius.full};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: ${transitions.default};
  
  /* Size variants */
  ${props => {
    switch (props.size || 'md') {
      case 'sm':
        return css`
          font-size: 0.7rem;
          padding: 4px 8px;
          min-width: 20px;
          height: 20px;
        `;
      case 'lg':
        return css`
          font-size: 0.9rem;
          padding: 8px 16px;
          min-width: 32px;
          height: 32px;
        `;
      default: // md
        return css`
          font-size: 0.8rem;
          padding: 6px 12px;
          min-width: 24px;
          height: 24px;
        `;
    }
  }}
  
  /* Color variants */
  ${props => {
    const variant = props.variant || 'default';
    switch (variant) {
      case 'primary':
        return css`
          background: ${props.theme.colors.primary};
          color: ${props.theme.colors.background};
        `;
      case 'secondary':
        return css`
          background: ${props.theme.colors.secondary};
          color: ${props.theme.colors.background};
        `;
      case 'success':
        return css`
          background: #4caf50;
          color: white;
        `;
      case 'warning':
        return css`
          background: #ff9800;
          color: white;
        `;
      case 'error':
        return css`
          background: #f44336;
          color: white;
        `;
      default:
        return css`
          background: rgba(255, 255, 255, 0.1);
          color: ${props.theme.colors.text};
          border: 1px solid rgba(255, 255, 255, 0.2);
        `;
    }
  }}
  
  /* Interactive states */
  ${props => props.interactive && css`
    cursor: pointer;
    ${hover.scale}
    
    &:active {
      transform: scale(0.95);
    }
  `}
`;

// Difficulty Badge - matches ModuleOverview.tsx
export const DifficultyBadge = styled(Badge)<{ difficulty: string }>`
  background: ${props => {
    switch (props.difficulty.toLowerCase()) {
      case 'beginner':
        return '#4caf50';
      case 'intermediate':
        return '#ff9800';
      case 'advanced':
        return '#f44336';
      default:
        return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  color: white;
  font-weight: 600;
  font-size: 0.7rem;
  padding: 4px 8px;
`;

// Level Badge - matches UserProfile.tsx
export const LevelBadge = styled.div<{ levelColor: string }>`
  background: ${props => props.levelColor};
  color: white;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: ${transitions.default};

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
`;

// Achievement Badge - matches UserProfile.tsx
export const AchievementBadge = styled.div<{ earned: boolean; color: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  border: 2px solid currentColor;
  color: ${props => (props.earned ? 'white' : props.color)};
  background: ${props => (props.earned ? props.color : 'transparent')};
  opacity: ${props => (props.earned ? 1 : 0.5)};
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  cursor: pointer;

  ${props =>
    props.earned &&
    css`
      box-shadow: 0 0 15px ${props.color}40;
    `}

  &:hover {
    transform: scale(1.05);
  }
`;

// Status Badge with pulse animation
export const StatusBadge = styled(Badge)<{ active?: boolean }>`
  ${props => props.active && css`
    background: #4caf50;
    color: white;
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border-radius: inherit;
      animation: pulse 2s infinite;
      background: inherit;
      z-index: -1;
    }
    
    @keyframes pulse {
      0% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.2);
        opacity: 0.7;
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }
  `}
`;

// Pulsing Badge with glow effect
export const PulsingBadge = styled(Badge)`
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: inherit;
    background: inherit;
    animation: pulseGlow 2s ease-in-out infinite;
    z-index: -1;
  }
  
  @keyframes pulseGlow {
    0%, 100% { 
      box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
      transform: scale(1);
    }
    50% { 
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.6);
      transform: scale(1.05);
    }
  }
`;

// Activity Indicator - matches LanguagesOverview.tsx and UserProfilePage.tsx
export const ActivityIndicator = styled.div<{ active: boolean; positioned?: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => (props.active ? '#4caf50' : 'rgba(255, 255, 255, 0.3)')};
  box-shadow: ${props => (props.active ? '0 0 8px rgba(76, 175, 80, 0.6)' : 'none')};
  transition: all 0.3s ease;
  
  ${props => props.positioned && css`
    position: absolute;
    top: 12px;
    right: 12px;
  `}
  
  ${props => props.active && css`
    animation: activityPulse 2s infinite;
  `}
  
  @keyframes activityPulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.7;
      transform: scale(1.2);
    }
  }
`;

// Badge Group container
export const BadgeGroup = styled.div<{ 
  spacing?: keyof typeof theme.spacing;
  wrap?: boolean;
}>`
  display: flex;
  gap: ${props => {
    const spacingKey = props.spacing || 'sm';
    return props.theme.spacing[spacingKey];
  }};
  align-items: center;
  flex-wrap: ${props => props.wrap ? 'wrap' : 'nowrap'};
`;