import styled from '@emotion/styled';
import { ButtonVariant, ButtonSize } from '../types';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

// Primary action button with gradient background
export const BaseButton = styled.button<ButtonProps>`
  /* Base styles */
  border: none;
  border-radius: ${props => props.theme.borderRadius.md};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  
  /* Variant styles */
  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: linear-gradient(135deg, ${props.theme.colors.primary} 0%, ${props.theme.colors.secondary} 100%);
          color: white;
          
          &:hover {
            background: linear-gradient(135deg, ${props.theme.colors.secondary} 0%, ${props.theme.colors.primary} 100%);
            transform: translateY(-2px);
          }
        `;
      case 'secondary':
        return `
          background: ${props.theme.colors.surface};
          color: ${props.theme.colors.text};
          border: 1px solid ${props.theme.colors.border};
          
          &:hover {
            background: ${props.theme.colors.surfaceHover};
          }
        `;
      case 'outline':
        return `
          background: transparent;
          color: ${props.theme.colors.primary};
          border: 2px solid ${props.theme.colors.primary};
          
          &:hover {
            background: ${props.theme.colors.primary};
            color: white;
          }
        `;
      case 'ghost':
        return `
          background: transparent;
          color: ${props.theme.colors.text};
          border: none;
          
          &:hover {
            background: ${props.theme.colors.surfaceHover};
          }
        `;
      case 'danger':
        return `
          background: ${props.theme.colors.error};
          color: white;
          
          &:hover {
            background: ${props.theme.colors.errorHover};
          }
        `;
      default:
        return `
          background: ${props.theme.colors.primary};
          color: white;
        `;
    }
  }}
  
  /* Size styles */
  ${props => {
    switch (props.size) {
      case 'sm':
        return `
          padding: ${props.theme.spacing.xs} ${props.theme.spacing.sm};
          font-size: 0.875rem;
          min-height: ${props.theme.touchTarget.minimum};
        `;
      case 'md':
        return `
          padding: ${props.theme.spacing.sm} ${props.theme.spacing.md};
          font-size: 1rem;
          min-height: ${props.theme.touchTarget.comfortable};
        `;
      case 'lg':
        return `
          padding: ${props.theme.spacing.md} ${props.theme.spacing.lg};
          font-size: 1.125rem;
          min-height: ${props.theme.touchTarget.comfortable};
        `;
      case 'xl':
        return `
          padding: ${props.theme.spacing.lg} ${props.theme.spacing.xl};
          font-size: 1.25rem;
          min-height: ${props.theme.touchTarget.comfortable};
        `;
      default:
        return `
          padding: ${props.theme.spacing.sm} ${props.theme.spacing.md};
          font-size: 1rem;
          min-height: ${props.theme.touchTarget.comfortable};
        `;
    }
  }}
  
  /* Full width */
  ${props => props.fullWidth && 'width: 100%;'}
  
  /* Mobile optimizations */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    min-height: ${props => props.theme.touchTarget.comfortable};
    font-size: 1rem;
  }
`;

// Icon button for toolbar actions
export const IconButton = styled.button<ButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: ${props => props.theme.borderRadius.full};
  background: transparent;
  color: ${props => props.theme.colors.text};
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${props => {
    switch (props.size) {
      case 'sm':
        return `
          width: 32px;
          height: 32px;
          font-size: 1rem;
        `;
      case 'lg':
        return `
          width: 48px;
          height: 48px;
          font-size: 1.5rem;
        `;
      default:
        return `
          width: 40px;
          height: 40px;
          font-size: 1.25rem;
        `;
    }
  }}
  
  &:hover {
    background: ${props => props.theme.colors.surfaceHover};
    transform: scale(1.1);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

// Floating Action Button
export const FAB = styled(BaseButton)<ButtonProps>`
  position: fixed;
  bottom: ${props => props.theme.spacing.lg};
  right: ${props => props.theme.spacing.lg};
  width: 56px;
  height: 56px;
  border-radius: ${props => props.theme.borderRadius.full};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
  }
`;

// Button group for related actions
export const ButtonGroup = styled.div`
  display: flex;
  border-radius: ${props => props.theme.borderRadius.md};
  overflow: hidden;
  
  & > button {
    border-radius: 0;
    border-right: 1px solid ${props => props.theme.colors.border};
    
    &:first-of-type {
      border-top-left-radius: ${props => props.theme.borderRadius.md};
      border-bottom-left-radius: ${props => props.theme.borderRadius.md};
    }
    
    &:last-of-type {
      border-top-right-radius: ${props => props.theme.borderRadius.md};
      border-bottom-right-radius: ${props => props.theme.borderRadius.md};
      border-right: none;
    }
  }
`;