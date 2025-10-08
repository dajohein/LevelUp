import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { transitions } from './animations';

// Tooltip - matches DirectionalHint.tsx
export const Tooltip = styled.div<{ visible: boolean; position?: 'top' | 'bottom' | 'left' | 'right' }>`
  position: absolute;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 8px 12px;
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: 0.8rem;
  white-space: nowrap;
  z-index: 1000;
  opacity: ${props => props.visible ? 1 : 0};
  transform: ${props => props.visible ? 'scale(1)' : 'scale(0.8)'};
  transition: all 0.2s ease;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  
  /* Position variants */
  ${props => {
    switch (props.position || 'top') {
      case 'bottom':
        return css`
          top: 100%;
          left: 50%;
          transform: translateX(-50%) ${props.visible ? 'translateY(8px) scale(1)' : 'translateY(0) scale(0.8)'};
          
          &::before {
            content: '';
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 6px solid transparent;
            border-bottom-color: rgba(0, 0, 0, 0.9);
          }
        `;
      case 'left':
        return css`
          right: 100%;
          top: 50%;
          transform: translateY(-50%) ${props.visible ? 'translateX(-8px) scale(1)' : 'translateX(0) scale(0.8)'};
          
          &::before {
            content: '';
            position: absolute;
            left: 100%;
            top: 50%;
            transform: translateY(-50%);
            border: 6px solid transparent;
            border-left-color: rgba(0, 0, 0, 0.9);
          }
        `;
      case 'right':
        return css`
          left: 100%;
          top: 50%;
          transform: translateY(-50%) ${props.visible ? 'translateX(8px) scale(1)' : 'translateX(0) scale(0.8)'};
          
          &::before {
            content: '';
            position: absolute;
            right: 100%;
            top: 50%;
            transform: translateY(-50%);
            border: 6px solid transparent;
            border-right-color: rgba(0, 0, 0, 0.9);
          }
        `;
      default: // top
        return css`
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%) ${props.visible ? 'translateY(-8px) scale(1)' : 'translateY(0) scale(0.8)'};
          
          &::before {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 6px solid transparent;
            border-top-color: rgba(0, 0, 0, 0.9);
          }
        `;
    }
  }}
`;

// Tooltip Wrapper for easy tooltip implementation
export const TooltipWrapper = styled.div`
  position: relative;
  display: inline-block;
`;

// Action Button - matches LanguageOverview.tsx ActionButton
export const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.xl};
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 200px;

  background-color: ${props =>
    props.variant === 'secondary' ? props.theme.colors.surface : props.theme.colors.primary};
  color: ${props =>
    props.variant === 'secondary' ? props.theme.colors.text : props.theme.colors.background};
  border: 2px solid
    ${props => (props.variant === 'secondary' ? props.theme.colors.primary : 'transparent')};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    background-color: ${props =>
      props.variant === 'secondary' ? props.theme.colors.primary : props.theme.colors.secondary};
    color: ${props => props.theme.colors.background};
  }

  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

// Filter Button - matches LanguageOverview.tsx FilterButton
export const FilterButton = styled.button<{ active: boolean }>`
  padding: 8px 16px;
  border: 2px solid ${props => props.active ? props.theme.colors.primary : 'rgba(255, 255, 255, 0.3)'};
  background: ${props => props.active ? props.theme.colors.primary : 'transparent'};
  color: ${props => props.active ? props.theme.colors.background : props.theme.colors.text};
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${props => props.theme.colors.primary};
    background: ${props => props.active ? props.theme.colors.secondary : 'rgba(59, 130, 246, 0.1)'};
  }
  
  &:active {
    transform: scale(0.98);
  }
`;

// Quick Practice Button - matches ModuleOverview.tsx QuickPracticeButton
export const QuickPracticeButton = styled.button`
  background: linear-gradient(45deg, #4caf50, #66bb6a);
  border: none;
  border-radius: 12px;
  padding: 12px 20px;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  width: 100%;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 16px 24px;
    font-size: 1.1rem;
    font-weight: 700;
    border-radius: 14px;
    box-shadow: 0 6px 20px rgba(76, 175, 80, 0.3);
    
    &:hover {
      transform: none;
      background: linear-gradient(45deg, #43a047, #5cb860);
    }
    
    &:active {
      transform: scale(0.98);
    }
  }
`;

// View Details Button - matches ModuleOverview.tsx ViewDetailsButton
export const ViewDetailsButton = styled.button`
  background: linear-gradient(45deg, #3b82f6, #6366f1);
  border: none;
  border-radius: 12px;
  padding: 12px 20px;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  width: 100%;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
    background: linear-gradient(45deg, #2563eb, #4f46e5);
  }

  &:active {
    transform: translateY(0);
  }
`;

// Directional Icon Button - matches DirectionalHint.tsx
export const DirectionalIcon = styled.button<{ direction: string }>`
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  
  /* Direction-specific styling */
  ${props => {
    const directions: Record<string, string> = {
      'up': '↑',
      'down': '↓',
      'left': '←',
      'right': '→',
      'north': '↑',
      'south': '↓',
      'east': '→',
      'west': '←'
    };
    
    return css`
      &::before {
        content: '${directions[props.direction] || '•'}';
      }
    `;
  }}
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.5);
    transform: scale(1.1);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

// Close Button - matches DirectionalHint.tsx CloseButton
export const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.7);
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &::before {
    content: '×';
  }
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    transform: scale(1.1);
  }
  
  &:active {
    transform: scale(0.9);
  }
`;

// Navigation Hint component
export const NavigationHint = styled.div<{ visible: boolean }>`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: ${props => props.theme.spacing.lg};
  border-radius: ${props => props.theme.borderRadius.xl};
  text-align: center;
  z-index: 1000;
  opacity: ${props => props.visible ? 1 : 0};
  transform: translate(-50%, -50%) scale(${props => props.visible ? 1 : 0.8});
  transition: all 0.3s ease;
  pointer-events: ${props => props.visible ? 'auto' : 'none'};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  
  h3 {
    margin: 0 0 ${props => props.theme.spacing.md} 0;
    color: ${props => props.theme.colors.primary};
  }
  
  p {
    margin: 0 0 ${props => props.theme.spacing.lg} 0;
    color: rgba(255, 255, 255, 0.8);
  }
`;

// Toggle Button - matches debug components
export const ToggleButton = styled.button<{ active?: boolean }>`
  background: ${props => props.active ? props.theme.colors.primary : 'rgba(255, 255, 255, 0.1)'};
  color: ${props => props.active ? props.theme.colors.background : props.theme.colors.text};
  border: 2px solid ${props => props.active ? props.theme.colors.primary : 'rgba(255, 255, 255, 0.3)'};
  border-radius: ${props => props.theme.borderRadius.md};
  padding: 8px 16px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${props => props.theme.colors.primary};
    background: ${props => props.active ? props.theme.colors.secondary : 'rgba(59, 130, 246, 0.1)'};
  }
  
  &:active {
    transform: scale(0.98);
  }
`;

// Floating Action Group for multiple floating actions
export const FloatingActionGroup = styled.div`
  position: fixed;
  bottom: ${props => props.theme.spacing.xl};
  right: ${props => props.theme.spacing.xl};
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.md};
  z-index: 100;
`;

// Interactive Container for hover effects
export const InteractiveContainer = styled.div<{ disabled?: boolean }>`
  transition: ${transitions.default};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.5 : 1};
  
  ${props => !props.disabled && css`
    &:hover {
      transform: translateY(-1px);
    }
    
    &:active {
      transform: translateY(0) scale(0.98);
    }
  `}
`;