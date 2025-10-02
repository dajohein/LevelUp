import React, { Suspense } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';

// Loading spinner animation
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: ${props => props.theme.spacing.xl};
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid ${props => props.theme.colors.surface};
  border-top: 3px solid ${props => props.theme.colors.primary};
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
  margin-bottom: ${props => props.theme.spacing.md};
`;

const LoadingText = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.9rem;
  margin: 0;
`;

interface LoadingFallbackProps {
  text?: string;
  minHeight?: string;
}

export const LoadingFallback: React.FC<LoadingFallbackProps> = ({ 
  text = 'Loading...', 
  minHeight = '200px' 
}) => (
  <LoadingContainer style={{ minHeight }}>
    <Spinner />
    <LoadingText>{text}</LoadingText>
  </LoadingContainer>
);

// Skeleton loading for specific components
const SkeletonAnimation = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
`;

const SkeletonBase = styled.div`
  background: linear-gradient(90deg, ${props => props.theme.colors.surface} 25%, rgba(255,255,255,0.1) 50%, ${props => props.theme.colors.surface} 75%);
  background-size: 200px 100%;
  animation: ${SkeletonAnimation} 1.2s ease-in-out infinite;
  border-radius: 4px;
`;

const SkeletonCard = styled(SkeletonBase)`
  height: 120px;
  margin-bottom: ${props => props.theme.spacing.md};
`;

const SkeletonText = styled(SkeletonBase)`
  height: 20px;
  margin-bottom: ${props => props.theme.spacing.sm};
`;

const SkeletonTitle = styled(SkeletonBase)`
  height: 32px;
  width: 60%;
  margin-bottom: ${props => props.theme.spacing.md};
`;

export const GameSkeleton: React.FC = () => (
  <LoadingContainer style={{ minHeight: '400px' }}>
    <SkeletonTitle />
    <SkeletonCard />
    <SkeletonText />
    <SkeletonText style={{ width: '80%' }} />
  </LoadingContainer>
);

export const ModuleSkeleton: React.FC = () => (
  <LoadingContainer>
    <SkeletonTitle />
    <SkeletonCard />
    <SkeletonCard />
    <SkeletonCard />
  </LoadingContainer>
);

// HOC for wrapping lazy components with loading states
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ComponentType;
  loadingText?: string;
}

export const LazyWrapper: React.FC<LazyWrapperProps> = ({ 
  children, 
  fallback: Fallback = LoadingFallback,
  loadingText = 'Loading component...'
}) => (
  <Suspense fallback={<Fallback text={loadingText} />}>
    {children}
  </Suspense>
);