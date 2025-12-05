import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { fadeIn } from './animations';

// Alert/Notification
export const Alert = styled.div<{
  variant?: 'info' | 'success' | 'warning' | 'error';
  dismissible?: boolean;
}>`
  padding: ${props => props.theme.spacing.md};
  border-radius: ${props => props.theme.borderRadius.md};
  margin-bottom: ${props => props.theme.spacing.md};
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  position: relative;
  animation: ${fadeIn} 0.3s ease-out;

  ${props => {
    switch (props.variant) {
      case 'success':
        return css`
          background: rgba(76, 175, 80, 0.1);
          border: 1px solid rgba(76, 175, 80, 0.3);
          color: ${props.theme.colors.success};
        `;
      case 'warning':
        return css`
          background: rgba(255, 193, 7, 0.1);
          border: 1px solid rgba(255, 193, 7, 0.3);
          color: #ffc107;
        `;
      case 'error':
        return css`
          background: rgba(207, 102, 121, 0.1);
          border: 1px solid rgba(207, 102, 121, 0.3);
          color: ${props.theme.colors.error};
        `;
      default:
        return css`
          background: rgba(33, 150, 243, 0.1);
          border: 1px solid rgba(33, 150, 243, 0.3);
          color: #2196f3;
        `;
    }
  }}

  ${props =>
    props.dismissible &&
    css`
      padding-right: ${props.theme.spacing.xl};
    `}
`;

// Toast notification
export const Toast = styled(Alert)<{ position?: 'top' | 'bottom' }>`
  position: fixed;
  top: ${props => (props.position === 'bottom' ? 'auto' : props.theme.spacing.lg)};
  bottom: ${props => (props.position === 'bottom' ? props.theme.spacing.lg : 'auto')};
  right: ${props => props.theme.spacing.lg};
  z-index: 1000;
  min-width: 300px;
  max-width: 400px;
  margin-bottom: 0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    left: ${props => props.theme.spacing.md};
    right: ${props => props.theme.spacing.md};
    min-width: auto;
    max-width: none;
  }
`;

// Modal overlay
export const ModalOverlay = styled.div<{ show: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: ${props => props.theme.spacing.lg};

  opacity: ${props => (props.show ? 1 : 0)};
  visibility: ${props => (props.show ? 'visible' : 'hidden')};
  transition:
    opacity 0.3s ease,
    visibility 0.3s ease;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
  }
`;

// Modal content
export const ModalContent = styled.div<{ size?: 'sm' | 'md' | 'lg' | 'xl' }>`
  background: ${props => props.theme.colors.surface};
  border-radius: ${props => props.theme.borderRadius.lg};
  width: 100%;
  max-width: ${props => {
    switch (props.size) {
      case 'sm':
        return '400px';
      case 'lg':
        return '800px';
      case 'xl':
        return '1000px';
      default:
        return '600px';
    }
  }};
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  animation: ${fadeIn} 0.3s ease-out;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    max-height: 85vh;
    margin: ${props => props.theme.spacing.md} 0;
  }
`;

// Modal header
export const ModalHeader = styled.div`
  padding: ${props => props.theme.spacing.lg};
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;

  h2 {
    margin: 0;
    color: ${props => props.theme.colors.text};
  }
`;

// Modal body
export const ModalBody = styled.div`
  padding: ${props => props.theme.spacing.lg};
  color: ${props => props.theme.colors.text};
`;

// Modal footer
export const ModalFooter = styled.div`
  padding: ${props => props.theme.spacing.lg};
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  gap: ${props => props.theme.spacing.sm};
  justify-content: flex-end;
`;

// Loading state overlay
export const LoadingOverlay = styled.div<{ show: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;

  opacity: ${props => (props.show ? 1 : 0)};
  visibility: ${props => (props.show ? 'visible' : 'hidden')};
  transition:
    opacity 0.3s ease,
    visibility 0.3s ease;
`;

// Error boundary
export const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: ${props => props.theme.spacing.xl};
  text-align: center;
  background: rgba(207, 102, 121, 0.05);
  border: 1px solid rgba(207, 102, 121, 0.2);
  border-radius: ${props => props.theme.borderRadius.lg};
  color: ${props => props.theme.colors.error};
`;

// Empty state
export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: ${props => props.theme.spacing.xl};
  text-align: center;
  color: ${props => props.theme.colors.textSecondary};

  svg {
    font-size: 3rem;
    margin-bottom: ${props => props.theme.spacing.md};
    opacity: 0.5;
  }

  h3 {
    margin: 0 0 ${props => props.theme.spacing.sm} 0;
    color: ${props => props.theme.colors.text};
  }

  p {
    margin: 0;
    max-width: 300px;
  }
`;

// Tooltip
export const Tooltip = styled.div<{
  visible: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
}>`
  position: absolute;
  z-index: 1000;
  padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  background: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text};
  border-radius: ${props => props.theme.borderRadius.sm};
  font-size: ${props => props.theme.typography.small.fontSize};
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);

  opacity: ${props => (props.visible ? 1 : 0)};
  visibility: ${props => (props.visible ? 'visible' : 'hidden')};
  transition:
    opacity 0.2s ease,
    visibility 0.2s ease;

  ${props => {
    switch (props.position) {
      case 'top':
        return css`
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-bottom: 8px;

          &::after {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 4px solid transparent;
            border-top-color: ${props.theme.colors.surface};
          }
        `;
      case 'bottom':
        return css`
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-top: 8px;

          &::after {
            content: '';
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 4px solid transparent;
            border-bottom-color: ${props.theme.colors.surface};
          }
        `;
      case 'left':
        return css`
          right: 100%;
          top: 50%;
          transform: translateY(-50%);
          margin-right: 8px;

          &::after {
            content: '';
            position: absolute;
            left: 100%;
            top: 50%;
            transform: translateY(-50%);
            border: 4px solid transparent;
            border-left-color: ${props.theme.colors.surface};
          }
        `;
      case 'right':
        return css`
          left: 100%;
          top: 50%;
          transform: translateY(-50%);
          margin-left: 8px;

          &::after {
            content: '';
            position: absolute;
            right: 100%;
            top: 50%;
            transform: translateY(-50%);
            border: 4px solid transparent;
            border-right-color: ${props.theme.colors.surface};
          }
        `;
      default:
        return css`
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-bottom: 8px;
        `;
    }
  }}
`;

// Feedback overlay (for correct/incorrect answers)
export const FeedbackOverlay = styled.div<{
  isCorrect: boolean;
  show: boolean;
}>`
  position: fixed;
  ${props =>
    props.isCorrect
      ? css`
          top: 2rem;
          left: 50%;
          transform: translateX(-50%);
          width: auto;
        `
      : css`
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
        `}

  background-color: ${props => (props.isCorrect ? 'transparent' : `${props.theme.colors.error}33`)};

  display: flex;
  justify-content: center;
  align-items: ${props => (props.isCorrect ? 'flex-start' : 'center')};
  z-index: 1000;
  pointer-events: none;

  opacity: ${props => (props.show ? 1 : 0)};
  visibility: ${props => (props.show ? 'visible' : 'hidden')};
  transition:
    opacity 0.3s ease,
    visibility 0.3s ease;
`;

// Close button for modals/alerts
export const CloseButton = styled.button`
  position: absolute;
  top: ${props => props.theme.spacing.md};
  right: ${props => props.theme.spacing.md};
  background: none;
  border: none;
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  padding: ${props => props.theme.spacing.xs};
  border-radius: ${props => props.theme.borderRadius.sm};
  transition:
    color 0.2s ease,
    background-color 0.2s ease;

  &:hover {
    color: ${props => props.theme.colors.text};
    background: rgba(255, 255, 255, 0.1);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.3);
  }
`;
