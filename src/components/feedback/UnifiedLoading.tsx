import React, { Suspense } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';

// Unified loading animations
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const shimmer = keyframes`
  0% { background-position: -800px 0; }
  100% { background-position: 800px 0; }
`;

const dots = keyframes`
  0%, 20% { color: rgba(0,0,0,0); text-shadow: .25em 0 0 rgba(0,0,0,0), .5em 0 0 rgba(0,0,0,0); }
  40% { color: white; text-shadow: .25em 0 0 rgba(0,0,0,0), .5em 0 0 rgba(0,0,0,0); }
  60% { text-shadow: .25em 0 0 white, .5em 0 0 rgba(0,0,0,0); }
  80%, 100% { text-shadow: .25em 0 0 white, .5em 0 0 white; }
`;

// Base container for all loading states
const LoadingContainer = styled.div<{ minHeight?: string; fullScreen?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: ${props => (props.fullScreen ? '100vh' : props.minHeight || '200px')};
  padding: ${props => props.theme.spacing.lg};
  background: ${props => (props.fullScreen ? props.theme.colors.background : 'transparent')};
`;

// Container specifically for skeleton layouts (no centering, natural flow)
const SkeletonContainer = styled.div<{ minHeight?: string }>`
  padding: ${props => props.theme.spacing.md};
  min-height: ${props => props.minHeight || 'auto'};
  max-width: 100%;
`;

// Spinner variants
const SpinnerBase = styled.div<{ size: 'sm' | 'md' | 'lg' }>`
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
  margin-bottom: ${props => props.theme.spacing.md};

  ${props => {
    switch (props.size) {
      case 'sm':
        return `
          width: 24px;
          height: 24px;
          border: 2px solid ${props.theme.colors.surface};
          border-top: 2px solid ${props.theme.colors.primary};
        `;
      case 'lg':
        return `
          width: 48px;
          height: 48px;
          border: 4px solid ${props.theme.colors.surface};
          border-top: 4px solid ${props.theme.colors.primary};
        `;
      default:
        return `
          width: 32px;
          height: 32px;
          border: 3px solid ${props.theme.colors.surface};
          border-top: 3px solid ${props.theme.colors.primary};
        `;
    }
  }}
`;

// Skeleton components
const SkeletonBase = styled.div`
  background: linear-gradient(
    125deg,
    ${props => props.theme.colors.surface} 0%,
    ${props => props.theme.colors.surface} 35%,
    rgba(255, 255, 255, 0.08) 45%,
    rgba(255, 255, 255, 0.12) 50%,
    rgba(255, 255, 255, 0.08) 55%,
    ${props => props.theme.colors.surface} 65%,
    ${props => props.theme.colors.surface} 100%
  );
  background-size: 1200px 100%;
  animation: ${shimmer} 3.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  border-radius: 6px;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    background: ${props => props.theme.colors.surface};
  }
`;

const SkeletonLine = styled(SkeletonBase)<{ width?: string; height?: string }>`
  height: ${props => props.height || '16px'};
  width: ${props => props.width || '100%'};
  margin-bottom: ${props => props.theme.spacing.sm};
`;

const SkeletonCard = styled(SkeletonBase)<{ height?: string }>`
  height: ${props => props.height || '80px'};
  margin-bottom: ${props => props.theme.spacing.sm};
  border-radius: ${props => props.theme.borderRadius.lg};
`;

const SkeletonCircle = styled(SkeletonBase)<{ size?: string }>`
  width: ${props => props.size || '40px'};
  height: ${props => props.size || '40px'};
  border-radius: 50%;
  margin-bottom: ${props => props.theme.spacing.sm};
  flex-shrink: 0;
`;

// Loading text with proper hierarchy
const LoadingText = styled.p<{ variant?: 'primary' | 'secondary' }>`
  color: ${props =>
    props.variant === 'secondary' ? props.theme.colors.textSecondary : props.theme.colors.text};
  font-size: ${props => (props.variant === 'secondary' ? '0.9rem' : '1rem')};
  font-weight: ${props => (props.variant === 'secondary' ? 400 : 500)};
  margin: 0;
  text-align: center;
`;

// Dots animation for inline loading
const LoadingDots = styled.span`
  &::after {
    content: '.';
    animation: ${dots} 1.5s steps(5, end) infinite;
  }
`;

// Progress bar for determinate loading
const ProgressContainer = styled.div`
  width: 100%;
  max-width: 300px;
  height: 4px;
  background: ${props => props.theme.colors.surface};
  border-radius: 2px;
  overflow: hidden;
  margin: ${props => props.theme.spacing.md} 0;
`;

const ProgressBar = styled.div<{ progress: number; indeterminate?: boolean }>`
  height: 100%;
  background: linear-gradient(
    90deg,
    ${props => props.theme.colors.primary},
    ${props => props.theme.colors.secondary}
  );
  border-radius: 2px;
  transition: width 0.3s ease;

  ${props =>
    props.indeterminate
      ? `
      width: 30%;
      animation: ${keyframes`
        0% { transform: translateX(-100%); }
        100% { transform: translateX(400%); }
      `} 1.5s ease-in-out infinite;
    `
      : `width: ${props.progress}%;`}
`;

// Main loading component types
export type LoadingVariant = 'spinner' | 'skeleton' | 'minimal' | 'inline';
export type LoadingSize = 'sm' | 'md' | 'lg';

export interface UnifiedLoadingProps {
  variant?: LoadingVariant;
  size?: LoadingSize;
  text?: string;
  subText?: string;
  fullScreen?: boolean;
  minHeight?: string;
  progress?: number; // 0-100 for determinate progress
  indeterminate?: boolean;
  className?: string;
}

// Skeleton presets for common layouts
export interface SkeletonLayoutProps {
  type: 'card' | 'list' | 'profile' | 'game' | 'form';
  count?: number;
  className?: string;
}

// Main unified loading component
export const UnifiedLoading: React.FC<UnifiedLoadingProps> = ({
  variant = 'spinner',
  size = 'md',
  text = 'Loading',
  subText,
  fullScreen = false,
  minHeight,
  progress,
  indeterminate = true,
  className,
}) => {
  const renderContent = () => {
    switch (variant) {
      case 'minimal':
        return (
          <LoadingText>
            {text}
            <LoadingDots />
          </LoadingText>
        );

      case 'inline':
        return (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <SpinnerBase size="sm" />
            <LoadingText variant="secondary">{text}</LoadingText>
          </div>
        );

      case 'skeleton':
        return null; // Handled by SkeletonLayout component

      default: // spinner
        return (
          <>
            <SpinnerBase size={size} />
            <LoadingText>{text}</LoadingText>
            {subText && <LoadingText variant="secondary">{subText}</LoadingText>}
            {typeof progress === 'number' && (
              <ProgressContainer>
                <ProgressBar progress={progress} indeterminate={indeterminate} />
              </ProgressContainer>
            )}
          </>
        );
    }
  };

  if (variant === 'inline') {
    return <div className={className}>{renderContent()}</div>;
  }

  if (variant === 'minimal') {
    return (
      <div className={className} style={{ padding: '8px' }}>
        {renderContent()}
      </div>
    );
  }

  return (
    <LoadingContainer fullScreen={fullScreen} minHeight={minHeight} className={className}>
      {renderContent()}
    </LoadingContainer>
  );
};

// Skeleton layout component for complex layouts
export const SkeletonLayout: React.FC<SkeletonLayoutProps> = ({ type, count = 1, className }) => {
  // Use a key that changes to force re-sync all animations
  const [syncKey, setSyncKey] = React.useState(0);

  React.useEffect(() => {
    // Force a re-sync every time the component mounts or updates
    setSyncKey(prev => prev + 1);
  }, [type, count]);

  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div style={{ marginBottom: '12px' }}>
            <SkeletonLine height="20px" width="60%" />
            <SkeletonCard height="80px" />
            <SkeletonLine height="14px" width="80%" />
            <SkeletonLine height="14px" width="50%" />
          </div>
        );

      case 'list':
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '12px',
              padding: '8px 0',
            }}
          >
            <SkeletonCircle size="32px" />
            <div style={{ flex: 1, marginLeft: '12px' }}>
              <SkeletonLine height="16px" width="60%" />
              <SkeletonLine height="12px" width="40%" />
            </div>
          </div>
        );

      case 'profile':
        return (
          <div style={{ textAlign: 'center', maxWidth: '300px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <SkeletonCircle size="64px" />
            </div>
            <SkeletonLine height="20px" width="60%" />
            <SkeletonLine height="14px" width="80%" />
            <SkeletonCard height="40px" />
          </div>
        );

      case 'game':
        return (
          <div style={{ maxWidth: '600px' }}>
            <SkeletonLine height="28px" width="50%" />
            <SkeletonCard height="120px" />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginTop: '16px',
              }}
            >
              <SkeletonCard height="40px" />
              <SkeletonCard height="40px" />
            </div>
          </div>
        );

      case 'form':
        return (
          <div style={{ maxWidth: '400px' }}>
            <SkeletonLine height="16px" width="25%" />
            <SkeletonCard height="40px" />
            <div style={{ marginTop: '16px' }}>
              <SkeletonLine height="16px" width="30%" />
              <SkeletonCard height="40px" />
            </div>
            <SkeletonCard height="40px" style={{ marginTop: '16px' }} />
          </div>
        );

      default:
        return <SkeletonCard />;
    }
  };

  const SyncedSkeletonContainer = styled(SkeletonContainer)`
    /* Force all skeleton animations to restart together */
    & * {
      animation-delay: 0s !important;
      animation-duration: 2.5s !important;
      animation-timing-function: ease-in-out !important;
      animation-iteration-count: infinite !important;
      animation-name: ${shimmer} !important;
    }
  `;

  return (
    <SyncedSkeletonContainer key={syncKey} className={className}>
      {Array.from({ length: count }, (_, index) => (
        <div key={`${syncKey}-${index}`}>{renderSkeleton()}</div>
      ))}
    </SyncedSkeletonContainer>
  );
};

// Hook for consistent loading state management
export const useLoadingState = (initialLoading = false) => {
  const [isLoading, setIsLoading] = React.useState(initialLoading);
  const [error, setError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<number | undefined>();

  const startLoading = (resetError = true) => {
    setIsLoading(true);
    if (resetError) setError(null);
    setProgress(undefined);
  };

  const stopLoading = () => {
    setIsLoading(false);
    setProgress(undefined);
  };

  const setLoadingError = (errorMessage: string) => {
    setIsLoading(false);
    setError(errorMessage);
    setProgress(undefined);
  };

  const updateProgress = (value: number) => {
    setProgress(Math.max(0, Math.min(100, value)));
  };

  return {
    isLoading,
    error,
    progress,
    startLoading,
    stopLoading,
    setLoadingError,
    updateProgress,
  };
};

// Button loading state component
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  isLoading = false,
  loadingText,
  children,
  disabled,
  ...props
}) => (
  <button {...props} disabled={disabled || isLoading}>
    {isLoading ? (
      <UnifiedLoading variant="inline" size="sm" text={loadingText || 'Loading'} />
    ) : (
      children
    )}
  </button>
);

// HOC for wrapping lazy components with loading states
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: (props: { text?: string }) => React.ReactElement;
  loadingText?: string;
}

export const LazyWrapper: React.FC<LazyWrapperProps> = ({
  children,
  fallback: Fallback = ({ text = 'Loading...' }) => (
    <LoadingContainer style={{ minHeight: '300px' }}>
      <SpinnerBase size="md" />
      <LoadingText>{text}</LoadingText>
    </LoadingContainer>
  ),
  loadingText = 'Loading component...',
}) => <Suspense fallback={<Fallback text={loadingText} />}>{children}</Suspense>;

export default UnifiedLoading;
