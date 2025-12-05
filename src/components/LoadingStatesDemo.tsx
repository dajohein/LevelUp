import React, { useState } from 'react';
import styled from '@emotion/styled';
import {
  UnifiedLoading,
  SkeletonLayout,
  LoadingButton,
  useLoadingState,
} from '../components/feedback/UnifiedLoading';

const Container = styled.div`
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
  background: ${props => props.theme.colors.background};
  min-height: 100vh;
`;

const Section = styled.div`
  margin: 2rem 0;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const SectionTitle = styled.h2`
  color: ${props => props.theme.colors.text};
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
`;

const Description = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  margin: 0 0 1.5rem 0;
  line-height: 1.6;
`;

const ButtonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
`;

const DemoButton = styled.button`
  padding: 0.75rem 1rem;
  background: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.theme.colors.secondary};
    transform: translateY(-1px);
  }
`;

const ProgressContainer = styled.div`
  margin: 1rem 0;
`;

export const LoadingStatesDemo: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const { isLoading, progress, startLoading, stopLoading, updateProgress } = useLoadingState();

  const simulateProgress = async () => {
    startLoading();
    setActiveDemo('progress');

    for (let i = 0; i <= 100; i += 10) {
      updateProgress(i);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    setTimeout(() => {
      stopLoading();
      setActiveDemo(null);
    }, 500);
  };

  const simulateLoadingState = (demo: string, duration = 3000) => {
    setActiveDemo(demo);
    setTimeout(() => setActiveDemo(null), duration);
  };

  return (
    <Container>
      <h1 style={{ color: 'white', textAlign: 'center', marginBottom: '2rem' }}>
        🔄 Unified Loading States Demo
      </h1>

      {/* Basic Spinner Variants */}
      <Section>
        <SectionTitle>🌀 Spinner Variants</SectionTitle>
        <Description>Consistent spinners in different sizes for various use cases.</Description>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '2rem',
            textAlign: 'center',
          }}
        >
          <div>
            <h4 style={{ color: 'white', marginBottom: '1rem' }}>Small</h4>
            <UnifiedLoading size="sm" text="Loading..." />
          </div>
          <div>
            <h4 style={{ color: 'white', marginBottom: '1rem' }}>Medium</h4>
            <UnifiedLoading size="md" text="Loading..." />
          </div>
          <div>
            <h4 style={{ color: 'white', marginBottom: '1rem' }}>Large</h4>
            <UnifiedLoading size="lg" text="Loading..." />
          </div>
        </div>
      </Section>

      {/* Skeleton Layouts */}
      <Section>
        <SectionTitle>💀 Skeleton Layouts</SectionTitle>
        <Description>
          Synchronized skeleton layouts where the shimmer effect flows through each skeleton element
          simultaneously. All elements animate in perfect sync for a cohesive, professional loading
          experience.
        </Description>

        <ButtonGrid>
          <DemoButton onClick={() => simulateLoadingState('card')}>Show Card Skeleton</DemoButton>
          <DemoButton onClick={() => simulateLoadingState('list')}>Show List Skeleton</DemoButton>
          <DemoButton onClick={() => simulateLoadingState('profile')}>
            Show Profile Skeleton
          </DemoButton>
          <DemoButton onClick={() => simulateLoadingState('game')}>Show Game Skeleton</DemoButton>
          <DemoButton onClick={() => simulateLoadingState('form')}>Show Form Skeleton</DemoButton>
        </ButtonGrid>

        <div
          style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
            margin: '1rem 0',
            minHeight: '200px',
          }}
        >
          {activeDemo === 'card' && <SkeletonLayout type="card" count={2} />}
          {activeDemo === 'list' && <SkeletonLayout type="list" count={3} />}
          {activeDemo === 'profile' && <SkeletonLayout type="profile" />}
          {activeDemo === 'game' && <SkeletonLayout type="game" />}
          {activeDemo === 'form' && <SkeletonLayout type="form" />}
          {!activeDemo && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '200px',
                color: '#666',
                fontStyle: 'italic',
              }}
            >
              Click a button above to see skeleton examples
            </div>
          )}
        </div>
      </Section>

      {/* Loading Variants */}
      <Section>
        <SectionTitle>🎯 Loading Variants</SectionTitle>
        <Description>
          Different loading styles for different contexts and space constraints.
        </Description>

        <div style={{ display: 'grid', gap: '2rem' }}>
          <div>
            <h4 style={{ color: 'white', marginBottom: '1rem' }}>Minimal Loading</h4>
            <UnifiedLoading variant="minimal" text="Processing" />
          </div>

          <div>
            <h4 style={{ color: 'white', marginBottom: '1rem' }}>Inline Loading</h4>
            <div
              style={{ padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
            >
              Saving your progress <UnifiedLoading variant="inline" text="saving" />
            </div>
          </div>

          <div>
            <h4 style={{ color: 'white', marginBottom: '1rem' }}>With Subtitle</h4>
            <UnifiedLoading
              text="Loading your game data"
              subText="This may take a few moments..."
            />
          </div>
        </div>
      </Section>

      {/* Progress Loading */}
      <Section>
        <SectionTitle>📊 Progress Loading</SectionTitle>
        <Description>Show determinate progress for operations with known duration.</Description>

        <ProgressContainer>
          <DemoButton onClick={simulateProgress}>Start Progress Demo</DemoButton>

          {activeDemo === 'progress' && (
            <UnifiedLoading
              text="Uploading your data..."
              progress={progress}
              indeterminate={false}
            />
          )}
        </ProgressContainer>
      </Section>

      {/* Loading Buttons */}
      <Section>
        <SectionTitle>🔘 Loading Buttons</SectionTitle>
        <Description>Buttons with integrated loading states for better UX.</Description>

        <ButtonGrid>
          <LoadingButton
            isLoading={activeDemo === 'button1'}
            loadingText="Saving..."
            onClick={() => simulateLoadingState('button1', 2000)}
            style={{
              padding: '12px 24px',
              background: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '500',
            }}
          >
            Save Progress
          </LoadingButton>

          <LoadingButton
            isLoading={activeDemo === 'button2'}
            loadingText="Connecting..."
            onClick={() => simulateLoadingState('button2', 3000)}
            style={{
              padding: '12px 24px',
              background: '#27ae60',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '500',
            }}
          >
            Connect Account
          </LoadingButton>

          <LoadingButton
            isLoading={activeDemo === 'button3'}
            loadingText="Generating..."
            onClick={() => simulateLoadingState('button3', 2500)}
            style={{
              padding: '12px 24px',
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '500',
            }}
          >
            Generate Code
          </LoadingButton>
        </ButtonGrid>
      </Section>

      {/* Loading State Hook Demo */}
      <Section>
        <SectionTitle>🎣 useLoadingState Hook</SectionTitle>
        <Description>
          Unified hook for managing loading states consistently across components.
        </Description>

        <div style={{ display: 'grid', gap: '1rem' }}>
          <div
            style={{
              padding: '1rem',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
            }}
          >
            <div>isLoading: {isLoading.toString()}</div>
            <div>progress: {progress || 'undefined'}</div>
          </div>

          <DemoButton onClick={() => (isLoading ? stopLoading() : startLoading())}>
            {isLoading ? 'Stop Loading' : 'Start Loading'}
          </DemoButton>
        </div>
      </Section>

      {/* Full Screen Demo */}
      <Section>
        <SectionTitle>🖥️ Full Screen Loading</SectionTitle>
        <Description>For app initialization and major transitions.</Description>

        <DemoButton onClick={() => simulateLoadingState('fullscreen', 4000)}>
          Show Full Screen Loading
        </DemoButton>

        {activeDemo === 'fullscreen' && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
            }}
          >
            <UnifiedLoading
              fullScreen
              text="Loading LevelUp..."
              subText="Preparing your learning experience"
            />
          </div>
        )}
      </Section>

      {/* Best Practices */}
      <Section>
        <SectionTitle>✅ Best Practices</SectionTitle>
        <Description>Guidelines for choosing the right loading pattern:</Description>

        <ul style={{ color: 'white', lineHeight: '1.8' }}>
          <li>
            <strong>Skeleton loaders</strong> for content-heavy sections (better perceived
            performance)
          </li>
          <li>
            <strong>Spinners</strong> for general operations and quick loading
          </li>
          <li>
            <strong>Progress bars</strong> for operations with known duration
          </li>
          <li>
            <strong>Inline loading</strong> for buttons and small components
          </li>
          <li>
            <strong>Minimal loading</strong> for tight spaces or quick operations
          </li>
          <li>
            <strong>Meaningful text</strong> that describes what's happening
          </li>
          <li>
            <strong>Consistent timing</strong> - avoid flash of loading for very quick operations
          </li>
          <li>
            <strong>Synchronized animations</strong> - unified shimmer creates cohesive wave effect
          </li>
          <li>
            <strong>Accessibility</strong> - respects prefers-reduced-motion settings
          </li>
        </ul>
      </Section>
    </Container>
  );
};

export default LoadingStatesDemo;
