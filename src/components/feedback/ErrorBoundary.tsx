import { Component, ErrorInfo, ReactNode } from 'react';
import styled from '@emotion/styled';
import { logger } from '../../services/logger';
import { AppError } from '../../utils/errorHandling';

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: ${props => props.theme.spacing.xl};
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
`;

const ErrorMessage = styled.h1`
  margin-bottom: ${props => props.theme.spacing.lg};
  color: ${props => props.theme.colors.error};
`;

const ReloadButton = styled.button`
  padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.xl};
  font-size: ${props => props.theme.typography.body.fontSize};
  border: none;
  border-radius: ${props => props.theme.borderRadius.md};
  background-color: ${props => props.theme.colors.primary};
  color: ${props => props.theme.colors.text};
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background-color: ${props => props.theme.colors.secondary};
    transform: translateY(-2px);
  }
`;

const ErrorDetails = styled.details`
  margin: ${props => props.theme.spacing.md} 0;
  padding: ${props => props.theme.spacing.md};
  background: rgba(255, 255, 255, 0.05);
  border-radius: ${props => props.theme.borderRadius.sm};
  font-family: monospace;
  font-size: 0.9rem;
  max-width: 600px;
`;

const ErrorSummary = styled.summary`
  cursor: pointer;
  margin-bottom: ${props => props.theme.spacing.sm};
  font-weight: bold;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.md};
  margin-top: ${props => props.theme.spacing.lg};
`;

const SecondaryButton = styled.button`
  padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.xl};
  font-size: ${props => props.theme.typography.body.fontSize};
  border: 2px solid ${props => props.theme.colors.primary};
  border-radius: ${props => props.theme.borderRadius.md};
  background-color: transparent;
  color: ${props => props.theme.colors.primary};
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background-color: ${props => props.theme.colors.primary};
    color: ${props => props.theme.colors.background};
  }
`;

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Uncaught error:', error, errorInfo);

    this.setState({ errorInfo });

    // Track error for analytics if AppError
    if (error instanceof AppError) {
      logger.warn(`${error.severity.toUpperCase()} error: ${error.code}`, error.context);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const isAppError = this.state.error instanceof AppError;
      const userMessage = isAppError
        ? (this.state.error as AppError).userMessage
        : 'An unexpected error occurred';

      return (
        <ErrorContainer>
          <ErrorMessage>Oops! Something went wrong</ErrorMessage>
          <p>{userMessage || 'An unexpected error occurred'}</p>

          {this.state.error && (
            <ErrorDetails>
              <ErrorSummary>Technical Details</ErrorSummary>
              <div>
                <strong>Error:</strong> {this.state.error.message}
                <br />
                {isAppError && (
                  <>
                    <strong>Code:</strong> {(this.state.error as AppError).code}
                    <br />
                  </>
                )}
                {this.state.errorInfo && (
                  <>
                    <strong>Component Stack:</strong> {this.state.errorInfo.componentStack}
                  </>
                )}
              </div>
            </ErrorDetails>
          )}

          <ButtonGroup>
            <ReloadButton onClick={this.handleRetry}>Try Again</ReloadButton>
            <SecondaryButton onClick={this.handleGoHome}>Go Home</SecondaryButton>
            <SecondaryButton onClick={this.handleReload}>Reload App</SecondaryButton>
          </ButtonGroup>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}
