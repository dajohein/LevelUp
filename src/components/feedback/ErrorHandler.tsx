import React from 'react';
import styled from '@emotion/styled';
import { useErrorBoundary } from '../../utils/errorHandling';

const ErrorAlert = styled.div`
  background-color: ${props => props.theme.colors.error};
  color: white;
  padding: ${props => props.theme.spacing.md};
  border-radius: ${props => props.theme.borderRadius.md};
  margin: ${props => props.theme.spacing.md} 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 1.2rem;
  padding: ${props => props.theme.spacing.xs};

  &:hover {
    opacity: 0.8;
  }
`;

interface ErrorHandlerProps {
  children: React.ReactNode;
}

export const ErrorHandler: React.FC<ErrorHandlerProps> = ({ children }) => {
  const { error, resetError } = useErrorBoundary();

  if (error) {
    return (
      <ErrorAlert>
        <span>{error.message}</span>
        <CloseButton onClick={resetError} aria-label="Dismiss error">
          ×
        </CloseButton>
      </ErrorAlert>
    );
  }

  return <>{children}</>;
};

// Hook for manual error reporting
export const useErrorReporting = () => {
  const { captureError } = useErrorBoundary();

  const reportError = (error: Error | string, context?: any) => {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    captureError(errorObj, context);
  };

  return { reportError };
};
