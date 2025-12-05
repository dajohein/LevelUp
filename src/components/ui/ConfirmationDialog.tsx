/**
 * Confirmation Dialog Component
 * Reusable dialog for destructive actions that require user confirmation
 */

import React from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  isLoading?: boolean;
}

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideIn = keyframes`
  from { 
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.95);
  }
  to { 
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
`;

const Overlay = styled.div<{ isOpen: boolean }>`
  display: ${(props: { isOpen: boolean }) => (props.isOpen ? 'block' : 'none')};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  animation: ${fadeIn} 0.2s ease-out;
`;

const Dialog = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 12px;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 400px;
  width: 90%;
  animation: ${slideIn} 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
`;

const Header = styled.div`
  padding: 20px 20px 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Title = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 18px;
  color: #1f2937;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.2s ease;

  &:hover {
    background-color: #f3f4f6;
    color: #374151;
  }
`;

const Content = styled.div`
  padding: 16px 20px 20px 20px;
`;

const Message = styled.p`
  color: #6b7280;
  line-height: 1.5;
  margin: 0;
`;

const Actions = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 0 20px 20px 20px;
`;

const Button = styled.button<{ variant?: 'primary' | 'destructive' | 'secondary' }>`
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  min-width: 80px;

  ${(props: { variant?: 'primary' | 'destructive' | 'secondary' }) => {
    switch (props.variant) {
      case 'destructive':
        return `
          background-color: #dc2626;
          color: white;
          &:hover:not(:disabled) {
            background-color: #b91c1c;
          }
        `;
      case 'primary':
        return `
          background-color: #3b82f6;
          color: white;
          &:hover:not(:disabled) {
            background-color: #2563eb;
          }
        `;
      default:
        return `
          background-color: #f3f4f6;
          color: #374151;
          &:hover:not(:disabled) {
            background-color: #e5e7eb;
          }
        `;
    }
  }}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const LoadingSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  destructive = false,
  isLoading = false,
}) => {
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm();
    }
  };

  if (!isOpen) return null;

  return (
    <Overlay isOpen={isOpen} onClick={handleOverlayClick}>
      <Dialog>
        <Header>
          <Title>
            {destructive && (
              <FaExclamationTriangle style={{ color: '#dc2626', fontSize: '18px' }} />
            )}
            {title}
          </Title>
          <CloseButton onClick={onClose} disabled={isLoading}>
            <FaTimes />
          </CloseButton>
        </Header>

        <Content>
          <Message>{message}</Message>
        </Content>

        <Actions>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'primary'}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? <LoadingSpinner /> : confirmText}
          </Button>
        </Actions>
      </Dialog>
    </Overlay>
  );
};
