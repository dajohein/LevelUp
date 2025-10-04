import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';

const ripple = keyframes`
  0% {
    transform: scale(0);
    opacity: 1;
  }
  100% {
    transform: scale(4);
    opacity: 0;
  }
`;

interface MobileButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
}

export const MobileButton = styled.button<MobileButtonProps>`
  position: relative;
  overflow: hidden;
  border: none;
  border-radius: ${props => props.theme.borderRadius.lg};
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  
  /* Size variants */
  ${props => {
    switch (props.size) {
      case 'small':
        return `
          padding: ${props.theme.spacing.xs} ${props.theme.spacing.sm};
          font-size: 0.875rem;
          min-height: ${props.theme.touchTarget.minimum};
        `;
      case 'large':
        return `
          padding: ${props.theme.spacing.lg} ${props.theme.spacing.xl};
          font-size: 1.125rem;
          min-height: 56px;
        `;
      default:
        return `
          padding: ${props.theme.spacing.sm} ${props.theme.spacing.md};
          font-size: 1rem;
          min-height: ${props.theme.touchTarget.comfortable};
        `;
    }
  }}

  /* Width */
  ${props => props.fullWidth && 'width: 100%;'}

  /* Color variants */
  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: linear-gradient(135deg, ${props.theme.colors.primary}, ${props.theme.colors.secondary});
          color: white;
          box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
          
          &:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
          }
          
          &:active:not(:disabled) {
            transform: translateY(0);
          }
        `;
      case 'secondary':
        return `
          background: ${props.theme.colors.surface};
          color: ${props.theme.colors.text};
          border: 1px solid rgba(255, 255, 255, 0.1);
          
          &:hover:not(:disabled) {
            background: ${props.theme.colors.background};
            border-color: ${props.theme.colors.primary};
          }
        `;
      case 'outline':
        return `
          background: transparent;
          color: ${props.theme.colors.primary};
          border: 2px solid ${props.theme.colors.primary};
          
          &:hover:not(:disabled) {
            background: rgba(76, 175, 80, 0.1);
          }
        `;
      case 'ghost':
        return `
          background: transparent;
          color: ${props.theme.colors.text};
          
          &:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.1);
          }
        `;
      default:
        return `
          background: ${props.theme.colors.primary};
          color: white;
        `;
    }
  }}

  /* Disabled state */
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }

  /* Loading state */
  ${props => props.isLoading && `
    pointer-events: none;
    
    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 20px;
      height: 20px;
      margin: -10px 0 0 -10px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `}

  /* Ripple effect */
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.5);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }

  &:active:not(:disabled)::before {
    width: 300px;
    height: 300px;
    animation: ${ripple} 0.6s ease-out;
  }

  /* Mobile-specific optimizations */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    ${props => {
      switch (props.size) {
        case 'small':
          return `
            padding: ${props.theme.spacing.xs} ${props.theme.spacing.sm};
            font-size: 0.8rem;
          `;
        case 'large':
          return `
            padding: ${props.theme.spacing.md} ${props.theme.spacing.lg};
            font-size: 1rem;
            min-height: 52px;
          `;
        default:
          return `
            padding: ${props.theme.spacing.sm} ${props.theme.spacing.md};
            font-size: 0.95rem;
          `;
      }
    }}
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    border: 2px solid;
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    animation: none;
    
    &:hover {
      transform: none;
    }
    
    &::before {
      display: none;
    }
  }
`;

export const ButtonGroup = styled.div<{ orientation?: 'horizontal' | 'vertical' }>`
  display: flex;
  flex-direction: ${props => props.orientation === 'vertical' ? 'column' : 'row'};
  gap: ${props => props.theme.spacing.sm};
  
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    flex-direction: column;
    gap: ${props => props.theme.spacing.xs};
  }
`;