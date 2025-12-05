import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { progressGrow } from './animations';

// Progress bar
export const ProgressBar = styled.div<{
  value: number;
  color?: string;
  height?: string;
  animated?: boolean;
}>`
  width: 100%;
  height: ${props => props.height || '8px'};
  background-color: ${props => props.theme.colors.surface};
  border-radius: ${props => props.theme.borderRadius.sm};
  overflow: hidden;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: ${props => Math.min(Math.max(props.value, 0), 100)}%;
    background-color: ${props => props.color || props.theme.colors.primary};
    border-radius: ${props => props.theme.borderRadius.sm};
    transition: width 0.3s ease;

    ${props =>
      props.animated &&
      css`
        animation: ${progressGrow} 1s ease-out;
        --target-width: ${props.value}%;
      `}
  }
`;

// Circular progress
export const CircularProgress = styled.div<{
  size?: string;
  strokeWidth?: string;
  value?: number;
  color?: string;
}>`
  width: ${props => props.size || '40px'};
  height: ${props => props.size || '40px'};
  position: relative;

  svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);

    circle {
      fill: none;
      stroke-width: ${props => props.strokeWidth || '4'};

      &.background {
        stroke: ${props => props.theme.colors.surface};
      }

      &.progress {
        stroke: ${props => props.color || props.theme.colors.primary};
        stroke-dasharray: ${props => {
          const radius = 50 - parseInt(props.strokeWidth || '4') / 2;
          const circumference = 2 * Math.PI * radius;
          return circumference;
        }};
        stroke-dashoffset: ${props => {
          const radius = 50 - parseInt(props.strokeWidth || '4') / 2;
          const circumference = 2 * Math.PI * radius;
          const progress = props.value || 0;
          return circumference - (progress / 100) * circumference;
        }};
        transition: stroke-dashoffset 0.3s ease;
        stroke-linecap: round;
      }
    }
  }
`;

// Loading spinner
export const LoadingSpinner = styled.div<{
  size?: string;
  color?: string;
  thickness?: string;
}>`
  width: ${props => props.size || '24px'};
  height: ${props => props.size || '24px'};
  border: ${props => props.thickness || '2px'} solid ${props => props.theme.colors.surface};
  border-top: ${props => props.thickness || '2px'} solid
    ${props => props.color || props.theme.colors.primary};
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

// Skeleton loader
export const Skeleton = styled.div<{
  width?: string;
  height?: string;
  borderRadius?: string;
  animated?: boolean;
}>`
  width: ${props => props.width || '100%'};
  height: ${props => props.height || '20px'};
  background: linear-gradient(
    90deg,
    ${props => props.theme.colors.surface} 25%,
    rgba(255, 255, 255, 0.1) 50%,
    ${props => props.theme.colors.surface} 75%
  );
  background-size: 200% 100%;
  border-radius: ${props => props.borderRadius || props.theme.borderRadius.sm};

  ${props =>
    props.animated !== false &&
    css`
      animation: shimmer 1.5s infinite ease-in-out;

      @keyframes shimmer {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }
    `}
`;

// Loading dots
export const LoadingDots = styled.div<{ size?: string; color?: string }>`
  display: inline-flex;
  gap: ${props => props.theme.spacing.xs};

  &::before,
  &::after,
  & {
    content: '';
    width: ${props => props.size || '8px'};
    height: ${props => props.size || '8px'};
    border-radius: 50%;
    background: ${props => props.color || props.theme.colors.primary};
    animation: loading-dots 1.4s infinite ease-in-out both;
  }

  &::before {
    animation-delay: -0.32s;
  }

  &::after {
    animation-delay: -0.16s;
  }

  @keyframes loading-dots {
    0%,
    80%,
    100% {
      transform: scale(0.8);
      opacity: 0.5;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }
`;

// Step indicator
export const StepIndicator = styled.div<{
  steps: number;
  currentStep: number;
  variant?: 'dots' | 'numbers';
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${props => props.theme.spacing.sm};
`;

export const Step = styled.div<{
  active?: boolean;
  completed?: boolean;
  variant?: 'dots' | 'numbers';
  index?: number;
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${props => (props.variant === 'numbers' ? '32px' : '12px')};
  height: ${props => (props.variant === 'numbers' ? '32px' : '12px')};
  border-radius: 50%;
  transition: all 0.3s ease;

  ${props => {
    if (props.completed) {
      return css`
        background: ${props.theme.colors.success};
        color: white;
        &::after {
          content: '✓';
          font-size: 12px;
          font-weight: bold;
        }
      `;
    } else if (props.active) {
      return css`
        background: ${props.theme.colors.primary};
        color: white;
        ${props.variant === 'numbers' &&
        css`
          &::after {
            content: '${props.index || 1}';
            font-size: 14px;
            font-weight: bold;
          }
        `}
      `;
    } else {
      return css`
        background: ${props.theme.colors.surface};
        color: ${props.theme.colors.textSecondary};
        ${props.variant === 'numbers' &&
        css`
          &::after {
            content: '${props.index || 1}';
            font-size: 14px;
          }
        `}
      `;
    }
  }}
`;

// Progress ring (like Apple Watch rings)
export const ProgressRing = styled.div<{
  size?: number;
  strokeWidth?: number;
  progress: number;
  color?: string;
}>`
  width: ${props => props.size || 60}px;
  height: ${props => props.size || 60}px;
  position: relative;

  svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);

    circle {
      fill: none;
      stroke-width: ${props => props.strokeWidth || 4};

      &.background {
        stroke: rgba(255, 255, 255, 0.1);
      }

      &.progress {
        stroke: ${props => props.color || props.theme.colors.primary};
        stroke-linecap: round;
        transition: stroke-dashoffset 0.5s ease;
      }
    }
  }
`;

// Mastery gauge (specific to your app)
export const MasteryGauge = styled.div<{
  value: number;
  size?: string;
  showValue?: boolean;
}>`
  position: relative;
  width: ${props => props.size || '80px'};
  height: ${props => props.size || '80px'};

  ${props =>
    props.showValue &&
    css`
      &::after {
        content: '${Math.round(props.value)}%';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 12px;
        font-weight: bold;
        color: ${props.theme.colors.text};
      }
    `}
`;
