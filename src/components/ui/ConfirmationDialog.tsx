/**
 * Confirmation Dialog Component
 * Reusable dialog for destructive actions that require user confirmation
 */

import React, { useId, useRef } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import { ModalDialog } from './ModalDialog';

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

const slideIn = keyframes`
  from { 
    opacity: 0;
    transform: scale(0.95);
  }
  to { 
    opacity: 1;
    transform: scale(1);
  }
`;

const Dialog = styled(ModalDialog)`
  background: white;
  border: 0;
  padding: 0;
  border-radius: 12px;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 400px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  animation: ${slideIn} 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

  &::backdrop {
    background-color: rgba(0, 0, 0, 0.5);
  }
`;

const Header = styled.div`
  padding: 20px 20px 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Title = styled.h2`
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 18px;
  color: #1f2937;
  margin: 0;
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
  const titleId = useId();
  const messageId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm();
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      labelledBy={titleId}
      describedBy={messageId}
      initialFocusRef={cancelRef}
      dismissDisabled={isLoading}
      closeOnBackdrop
    >
      <Header>
        <Title id={titleId}>
          {destructive && <FaExclamationTriangle style={{ color: '#dc2626', fontSize: '18px' }} />}
          {title}
        </Title>
        <CloseButton type="button" aria-label="Close dialog" onClick={onClose} disabled={isLoading}>
          <FaTimes />
        </CloseButton>
      </Header>

      <Content>
        <Message id={messageId}>{message}</Message>
      </Content>

      <Actions>
        <Button
          ref={cancelRef}
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={isLoading}
        >
          {cancelText}
        </Button>
        <Button
          type="button"
          variant={destructive ? 'destructive' : 'primary'}
          onClick={handleConfirm}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <LoadingSpinner aria-hidden="true" />
              {confirmText}
            </>
          ) : (
            confirmText
          )}
        </Button>
      </Actions>
    </Dialog>
  );
};
