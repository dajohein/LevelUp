import React, { useState } from 'react';
import styled from '@emotion/styled';
import { keyframes, css } from '@emotion/react';
import { Navigation } from './Navigation';
import {
  // Layout & Containers
  Container,
  Section,
  FlexContainer,
  GridContainer,
  TwoColumnLayout,
  CenteredContent,

  // Typography
  Heading1,
  Heading2,
  Heading3,
  BodyText,
  SmallText,
  Link,
  GradientText,

  // Buttons
  BaseButton,
  IconButton,
  FAB,
  ButtonGroup,

  // Cards
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,

  // Forms
  Form,
  Input,
  Select,
  Label,
  Checkbox,
  Radio,
  FieldGroup,
  FieldItem,
  HelpText,
  FormActions,

  // Progress components are shown using custom AnimatedProgressBar

  // Feedback
  Alert,
} from '@/components/ui';

// Simple Badge component for demo purposes
const Badge = styled.span<{
  variant?: 'success' | 'warning' | 'error' | 'info';
}>`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;

  ${props => {
    switch (props.variant) {
      case 'success':
        return `
          background: linear-gradient(135deg, #4CAF50, #2E7D32);
          color: white;
        `;
      case 'warning':
        return `
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
        `;
      case 'error':
        return `
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
        `;
      default:
        return `
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
        `;
    }
  }}
`;

// Keyframes used in components
const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 10px rgba(59, 130, 246, 0.3); }
  50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.6); }
`;

const progressShimmer = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

// Enhanced Components with Exact Game Behavior
const AnimatedButton = styled(BaseButton)`
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;

  /* Match SessionCompletion.tsx and ModuleOverview.tsx button styling */
  &:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  &:active:not(:disabled) {
    transform: translateY(0) scale(0.98);
  }

  /* Ripple effect on click - from MobileButton.tsx */
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    transition:
      width 0.6s ease,
      height 0.6s ease;
  }

  &:active::after {
    width: 300px;
    height: 300px;
  }

  /* Reduced motion support from MobileButton.tsx */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    animation: none;

    &:hover {
      transform: none;
    }

    &::after {
      display: none;
    }
  }
`;

// EXACT game button styling - matches ModuleOverview.tsx QuickPracticeButton
const PrimaryButton = styled(AnimatedButton)`
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

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

// EXACT game button styling - matches LanguageOverview.tsx ActionButton secondary variant
const SecondaryButton = styled(AnimatedButton)`
  padding: 16px 32px;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 200px;
  background-color: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text};
  border: 2px solid ${props => props.theme.colors.primary};

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    background-color: ${props => props.theme.colors.primary};
    color: ${props => props.theme.colors.background};
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const OutlineButton = styled(AnimatedButton)`
  background: transparent;
  color: ${props => props.theme.colors.primary};
  border: 2px solid ${props => props.theme.colors.primary};
  border-radius: 8px;
  padding: 16px 32px;
  font-size: 1.1rem;
  font-weight: bold;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    background: ${props => props.theme.colors.primary};
    color: ${props => props.theme.colors.background};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

// EXACT game card styling - matches ModuleOverview.tsx ModuleCard
const AnimatedCard = styled(Card)`
  background: ${props => props.theme.colors.surface};
  border-radius: 16px;
  padding: ${props => props.theme.spacing.lg};
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;

  /* Green top border like ModuleCard */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #4caf50, #81c784);
  }

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }

  /* Shimmer effect on hover */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent);
    transition: left 0.6s ease;
    opacity: 0;
    z-index: 1;
  }

  &:hover::after {
    left: 100%;
    opacity: 1;
  }
`;

// EXACT game progress bar styling - matches LearningProgress.tsx ProgressBar
const AnimatedProgressBar = styled.div<{ value?: number }>`
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.2));
  border-radius: 20px;
  height: 24px;
  overflow: hidden;
  margin: 8px 0;
  position: relative;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: ${props => props.value || 0}%;
    background: linear-gradient(135deg, #4caf50, #4caf50cc);
    transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Enhanced shimmer effect like LearningProgress.tsx */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    ${css`
      animation: ${progressShimmer} 2s infinite;
    `}
  }
`;

const DemoContainer = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.colors.background};
  padding-top: 80px; /* Account for Navigation */
`;

const DemoSection = styled(Section)`
  margin: ${props => props.theme.spacing.xl} 0;
  padding: ${props => props.theme.spacing.lg};
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
  border-radius: ${props => props.theme.borderRadius.xl};
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(76, 175, 80, 0.5) 20%,
      rgba(59, 130, 246, 0.5) 40%,
      rgba(139, 92, 246, 0.5) 60%,
      rgba(245, 158, 11, 0.5) 80%,
      transparent 100%
    );
  }
`;

const SectionTitle = styled(Heading2)`
  margin-bottom: ${props => props.theme.spacing.md};
  color: ${props => props.theme.colors.primary};
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
`;

const ComponentGrid = styled(GridContainer)`
  margin: ${props => props.theme.spacing.lg} 0;
`;

const ComponentExample = styled.div`
  padding: ${props => props.theme.spacing.md};
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01));
  border-radius: ${props => props.theme.borderRadius.md};
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(5px);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  }
`;

const CodeBlock = styled.pre`
  background: rgba(0, 0, 0, 0.3);
  padding: ${props => props.theme.spacing.md};
  border-radius: ${props => props.theme.borderRadius.sm};
  overflow-x: auto;
  margin: ${props => props.theme.spacing.sm} 0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  color: ${props => props.theme.colors.textSecondary};
  border-left: 4px solid ${props => props.theme.colors.primary};
`;

// Game-authentic Stats Grid - matches LanguageOverview.tsx exactly
const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${props => props.theme.spacing.lg};
  margin: ${props => props.theme.spacing.xl} 0;
`;

// Game-authentic StatCard - matches LanguageOverview.tsx exactly
const StatCard = styled.div`
  background-color: ${props => props.theme.colors.surface};
  padding: ${props => props.theme.spacing.lg};
  border-radius: 12px;
  text-align: center;
  border: 2px solid transparent;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    transform: translateY(-2px);
  }
`;

// Enhanced StatCard with EXACT game hover effects (LanguageOverview.tsx)
const AnimatedStatCard = styled(StatCard)`
  position: relative;
  overflow: hidden;

  /* EXACT hover match from LanguageOverview.tsx */
  &:hover {
    border-color: ${props => props.theme.colors.primary};
    transform: translateY(-2px);
  }

  /* Subtle shimmer effect on hover only */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent);
    transition: left 0.6s ease;
    opacity: 0;
  }

  &:hover::before {
    left: 100%;
    opacity: 1;
  }
`;

const PulsingBadge = styled(Badge)`
  ${css`
    animation: ${pulseGlow} 2s ease-in-out infinite;
  `}
`;

// Game-authentic StatValue - matches LanguageOverview.tsx exactly
const StatValue = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: ${props => props.theme.colors.primary};
  margin-bottom: ${props => props.theme.spacing.sm};
`;

// Game-authentic StatLabel - matches UserProfile.tsx exactly (with uppercase)
const StatDescription = styled.div`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const VariantShowcase = styled(FlexContainer)`
  gap: ${props => props.theme.spacing.sm};
  flex-wrap: wrap;
  margin: ${props => props.theme.spacing.md} 0;
`;

export const ComponentLibraryDemo: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    size: 'md',
    notifications: false,
    plan: 'basic',
  });

  return (
    <>
      <Navigation />
      <DemoContainer>
        <Container maxWidth="1200px">
          <CenteredContent>
            <GradientText>
              <Heading1>🎨 Component Library Showcase</Heading1>
            </GradientText>
            <BodyText>
              Comprehensive demonstration of our unified design system with 40+ components
            </BodyText>
          </CenteredContent>

          {/* Overview Stats - Game-authentic layout matching LanguageOverview.tsx */}
          <DemoSection>
            <SectionTitle>📊 System Overview</SectionTitle>
            <Stats>
              <AnimatedStatCard>
                <StatValue>40+</StatValue>
                <StatDescription>Components</StatDescription>
              </AnimatedStatCard>
              <AnimatedStatCard>
                <StatValue>9</StatValue>
                <StatDescription>Categories</StatDescription>
              </AnimatedStatCard>
              <AnimatedStatCard>
                <StatValue>25+</StatValue>
                <StatDescription>Variants</StatDescription>
              </AnimatedStatCard>
              <AnimatedStatCard>
                <StatValue>23KB</StatValue>
                <StatDescription>Bundle Size</StatDescription>
              </AnimatedStatCard>
            </Stats>
            <CodeBlock>{`// Game-style StatCard with depth and effects
const StatCard = styled.div\`
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 2px solid transparent;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(76, 175, 80, 0.2);
    border-color: #4CAF50;
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    transition: left 0.5s ease;
  }

  &:hover::before {
    left: 100%;
  }
\`;`}</CodeBlock>
          </DemoSection>

          {/* Typography Section */}
          <DemoSection>
            <SectionTitle>✏️ Typography</SectionTitle>
            <ComponentExample>
              <Heading1>Heading 1 - Main Titles</Heading1>
              <Heading2>Heading 2 - Section Headers</Heading2>
              <Heading3>Heading 3 - Subsections</Heading3>
              <BodyText>
                Body text for regular content and descriptions. Optimized for readability across all
                devices.
              </BodyText>
              <SmallText>Small text for captions, hints, and secondary information.</SmallText>
              <GradientText>Gradient text for special emphasis and branding.</GradientText>
              <Link href="#demo">Interactive links with hover effects</Link>
            </ComponentExample>
            <CodeBlock>{`import { Heading1, BodyText, GradientText } from '@/components/ui';

<Heading1>Main Title</Heading1>
<BodyText>Regular content</BodyText>
<GradientText>Special emphasis</GradientText>`}</CodeBlock>
          </DemoSection>

          {/* Buttons Section */}
          <DemoSection>
            <SectionTitle>🔘 Buttons</SectionTitle>

            <Heading3>Button Variants</Heading3>
            <VariantShowcase>
              <PrimaryButton>Primary</PrimaryButton>
              <SecondaryButton>Secondary</SecondaryButton>
              <OutlineButton>Outline</OutlineButton>
              <BaseButton
                variant="ghost"
                style={{
                  background: 'transparent',
                  color: '#FFFFFF',
                  border: 'none',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                Ghost
              </BaseButton>
              <BaseButton
                variant="danger"
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.4)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                }}
              >
                Danger
              </BaseButton>
            </VariantShowcase>

            <Heading3>Button Sizes</Heading3>
            <VariantShowcase>
              <BaseButton variant="primary" size="sm">
                Small
              </BaseButton>
              <BaseButton variant="primary" size="md">
                Medium
              </BaseButton>
              <BaseButton variant="primary" size="lg">
                Large
              </BaseButton>
              <BaseButton variant="primary" size="xl">
                Extra Large
              </BaseButton>
            </VariantShowcase>

            <Heading3>Special Buttons</Heading3>
            <VariantShowcase>
              <IconButton size="md" title="Settings">
                ⚙️
              </IconButton>
              <ButtonGroup>
                <BaseButton variant="outline">Left</BaseButton>
                <BaseButton variant="outline">Center</BaseButton>
                <BaseButton variant="outline">Right</BaseButton>
              </ButtonGroup>
            </VariantShowcase>

            <CodeBlock>{`// Authentic game-style buttons with exact hover behavior
const PrimaryButton = styled(BaseButton)\`
  background: linear-gradient(135deg, #4CAF50, #2E7D32);
  color: white;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    background: linear-gradient(135deg, #66BB6A, #4CAF50);
    box-shadow: 0 6px 16px rgba(76, 175, 80, 0.4);
  }

  &:active:not(:disabled) {
    transform: translateY(0) scale(0.98);
  }

  // Ripple effect from MobileButton.tsx
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    transition: width 0.6s ease, height 0.6s ease;
  }

  &:active::after {
    width: 300px;
    height: 300px;
  }
\`;

// Matches SessionCompletion.tsx and ModuleOverview.tsx`}</CodeBlock>
          </DemoSection>

          {/* Cards Section */}
          <DemoSection>
            <SectionTitle>🃏 Cards</SectionTitle>
            <ComponentGrid columns={2} gap="lg">
              <AnimatedCard
                variant="default"
                style={{
                  background: 'linear-gradient(135deg, #1E1E1E, #2A2A2A)',
                  border: '2px solid transparent',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                }}
              >
                <CardHeader>
                  <CardTitle>Game-style Card</CardTitle>
                </CardHeader>
                <CardContent>
                  <BodyText>
                    Features shimmer animation on hover and authentic game styling with depth.
                  </BodyText>
                </CardContent>
                <CardFooter>
                  <AnimatedButton
                    variant="outline"
                    size="sm"
                    style={{
                      background: 'transparent',
                      color: '#4CAF50',
                      border: '2px solid #4CAF50',
                    }}
                  >
                    Learn More
                  </AnimatedButton>
                </CardFooter>
              </AnimatedCard>

              <Card
                variant="elevated"
                style={{
                  background: '#1E1E1E',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#1E1E1E';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)';
                }}
              >
                <CardHeader>
                  <CardTitle>Module Card Style</CardTitle>
                </CardHeader>
                <CardContent>
                  <BodyText>
                    Enhanced card with shadow effects matching ModuleOverview components.
                  </BodyText>
                </CardContent>
                <CardFooter>
                  <BaseButton
                    variant="primary"
                    size="sm"
                    style={{
                      background: 'linear-gradient(135deg, #4CAF50, #2E7D32)',
                      boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
                    }}
                  >
                    Get Started
                  </BaseButton>
                </CardFooter>
              </Card>
            </ComponentGrid>

            <CodeBlock>{`// Game-accurate card styling
const Card = styled.div\`
  background: \${props => props.theme.colors.surface}; // #1E1E1E
  border: 2px solid transparent;
  border-radius: 16px;
  padding: \${props => props.theme.spacing.lg};
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);

  &:hover {
    border-color: \${props => props.theme.colors.primary};
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(76, 175, 80, 0.2);
  }
\`;`}</CodeBlock>
          </DemoSection>

          {/* Forms Section */}
          <DemoSection>
            <SectionTitle>📝 Forms</SectionTitle>
            <TwoColumnLayout>
              <div>
                <Form>
                  <div>
                    <Label required>Full Name</Label>
                    <Input
                      placeholder="Enter your name"
                      value={formData.name}
                      onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      style={{
                        background: '#1E1E1E',
                        border: '2px solid #4CAF50',
                        borderRadius: '8px',
                        padding: '1rem',
                        color: '#FFFFFF',
                        fontSize: '1rem',
                        fontWeight: '500',
                        textAlign: 'center',
                        transition: 'all 0.3s ease',
                      }}
                      onFocus={e => {
                        e.target.style.borderColor = '#2E7D32';
                        e.target.style.boxShadow = '0 0 0 3px rgba(76, 175, 80, 0.2)';
                      }}
                      onBlur={e => {
                        e.target.style.borderColor = '#4CAF50';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <HelpText>Your display name for the application</HelpText>
                  </div>

                  <div>
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      style={{
                        background: '#1E1E1E',
                        border: '2px solid #4CAF50',
                        borderRadius: '8px',
                        padding: '1rem',
                        color: '#FFFFFF',
                        fontSize: '1rem',
                        fontWeight: '500',
                        textAlign: 'center',
                        transition: 'all 0.3s ease',
                      }}
                    />
                  </div>

                  <div>
                    <Label>Preferred Size</Label>
                    <Select
                      value={formData.size}
                      onChange={e => setFormData(prev => ({ ...prev, size: e.target.value }))}
                      style={{
                        background: '#1E1E1E',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        color: '#FFFFFF',
                        fontSize: '1rem',
                      }}
                    >
                      <option value="sm" style={{ background: '#1E1E1E', color: '#FFFFFF' }}>
                        Small
                      </option>
                      <option value="md" style={{ background: '#1E1E1E', color: '#FFFFFF' }}>
                        Medium
                      </option>
                      <option value="lg" style={{ background: '#1E1E1E', color: '#FFFFFF' }}>
                        Large
                      </option>
                    </Select>
                  </div>

                  <FieldGroup>
                    <FieldItem>
                      <Checkbox
                        checked={formData.notifications}
                        onChange={e =>
                          setFormData(prev => ({ ...prev, notifications: e.target.checked }))
                        }
                        style={{ accentColor: '#4CAF50' }}
                      />
                      <Label>Enable notifications</Label>
                    </FieldItem>
                  </FieldGroup>

                  <FieldGroup direction="row">
                    <FieldItem>
                      <Radio
                        name="plan"
                        checked={formData.plan === 'basic'}
                        onChange={() => setFormData(prev => ({ ...prev, plan: 'basic' }))}
                        style={{ accentColor: '#4CAF50' }}
                      />
                      <Label>Basic Plan</Label>
                    </FieldItem>
                    <FieldItem>
                      <Radio
                        name="plan"
                        checked={formData.plan === 'premium'}
                        onChange={() => setFormData(prev => ({ ...prev, plan: 'premium' }))}
                        style={{ accentColor: '#4CAF50' }}
                      />
                      <Label>Premium Plan</Label>
                    </FieldItem>
                  </FieldGroup>

                  <FormActions align="right">
                    <BaseButton
                      variant="ghost"
                      style={{
                        background: 'transparent',
                        color: '#FFFFFF',
                      }}
                    >
                      Cancel
                    </BaseButton>
                    <BaseButton
                      variant="primary"
                      style={{
                        background: 'linear-gradient(135deg, #4CAF50, #2E7D32)',
                        boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
                      }}
                    >
                      Save Settings
                    </BaseButton>
                  </FormActions>
                </Form>
              </div>

              <div>
                <CodeBlock>{`// Game-style input with focus effects
const StyledInput = styled.input\`
  background: \${props => props.theme.colors.surface}; // #1E1E1E
  border: 2px solid \${props => props.theme.colors.primary};
  border-radius: \${props => props.theme.borderRadius.md};
  padding: \${props => props.theme.spacing.md};
  color: \${props => props.theme.colors.text};
  font-weight: 500;
  text-align: center;
  transition: all 0.3s ease;

  &:focus {
    border-color: \${props => props.theme.colors.secondary};
    box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.2);
  }
\`;

// Form elements use surface background
// with primary green accent colors`}</CodeBlock>
              </div>
            </TwoColumnLayout>
          </DemoSection>

          {/* Progress Section */}
          <DemoSection>
            <SectionTitle>📈 Progress Indicators</SectionTitle>
            <ComponentGrid columns={2} gap="md">
              <ComponentExample>
                <Heading3>Progress Bar</Heading3>
                <AnimatedProgressBar value={75} />
                <SmallText style={{ marginTop: '0.5rem' }}>75% Complete</SmallText>
              </ComponentExample>

              <ComponentExample>
                <Heading3>Circular Progress</Heading3>
                <FlexContainer justify="center">
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: `conic-gradient(#4CAF50 ${60 * 3.6}deg, rgba(255, 255, 255, 0.1) 0deg)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      marginBottom: '1rem',
                    }}
                  >
                    <div
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: '#121212',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        color: '#4CAF50',
                      }}
                    >
                      60%
                    </div>
                  </div>
                </FlexContainer>
                <SmallText style={{ textAlign: 'center' }}>60% Mastery</SmallText>
              </ComponentExample>
            </ComponentGrid>

            <CodeBlock>{`// Game-style progress with enhanced effects
const ProgressBar = styled.div\`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 25px;
  height: 20px;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
\`;

const ProgressFill = styled.div\`
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #4CAF50aa);
  border-radius: 25px;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
\`;

// Matches the actual UserProfile progress styling`}</CodeBlock>
          </DemoSection>

          {/* Feedback Section */}
          <DemoSection>
            <SectionTitle>💬 Feedback</SectionTitle>
            <ComponentGrid columns={2} gap="md">
              <Alert
                variant="success"
                dismissible
                style={{
                  background: 'rgba(76, 175, 80, 0.2)',
                  border: '1px solid rgba(76, 175, 80, 0.3)',
                  borderLeft: '4px solid #4CAF50',
                  borderRadius: '8px',
                  padding: '1rem',
                  color: '#FFFFFF',
                }}
              >
                <strong>Success!</strong> Your settings have been saved successfully.
              </Alert>

              <Alert
                variant="warning"
                style={{
                  background: 'rgba(255, 152, 0, 0.2)',
                  border: '1px solid rgba(255, 152, 0, 0.3)',
                  borderLeft: '4px solid #FF9800',
                  borderRadius: '8px',
                  padding: '1rem',
                  color: '#FFFFFF',
                }}
              >
                <strong>Warning:</strong> This action cannot be undone.
              </Alert>

              <Alert
                variant="error"
                dismissible
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderLeft: '4px solid #ef4444',
                  borderRadius: '8px',
                  padding: '1rem',
                  color: '#FFFFFF',
                }}
              >
                <strong>Error!</strong> Failed to connect to the server.
              </Alert>

              <Alert
                variant="info"
                style={{
                  background: 'rgba(59, 130, 246, 0.2)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderLeft: '4px solid #3b82f6',
                  borderRadius: '8px',
                  padding: '1rem',
                  color: '#FFFFFF',
                }}
              >
                <strong>Info:</strong> New features are now available in the latest update.
              </Alert>
            </ComponentGrid>

            <ComponentExample>
              <Heading3>Status Badges</Heading3>
              <FlexContainer gap="sm" wrap>
                <PulsingBadge
                  variant="success"
                  style={{
                    background: 'linear-gradient(135deg, #4CAF50, #2E7D32)',
                    color: 'white',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                  }}
                >
                  🟢 Online
                </PulsingBadge>
                <Badge
                  variant="warning"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: 'white',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                  }}
                >
                  ⚠️ Pending
                </Badge>
                <Badge
                  variant="error"
                  style={{
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: 'white',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                  }}
                >
                  🔴 Offline
                </Badge>
                <Badge
                  variant="info"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: 'white',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                  }}
                >
                  ℹ️ Beta
                </Badge>
              </FlexContainer>
            </ComponentExample>

            <CodeBlock>{`// Game-style alerts with proper theming
const Alert = styled.div\`
  background: rgba(76, 175, 80, 0.2); // Success variant
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-left: 4px solid #4CAF50;
  border-radius: 8px;
  padding: 1rem;
  color: #FFFFFF;
  
  // Uses theme colors with transparency
  // Matches RecommendationCard styling
\`;`}</CodeBlock>
          </DemoSection>

          {/* Layout Section */}
          <DemoSection>
            <SectionTitle>📐 Layout System</SectionTitle>
            <BodyText>
              Responsive containers and layout utilities matching game components:
            </BodyText>

            <ComponentExample>
              <Heading3>Flex Container (Navigation Style)</Heading3>
              <FlexContainer
                gap="md"
                justify="space-between"
                align="center"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <BaseButton
                  variant="primary"
                  style={{
                    background: 'linear-gradient(135deg, #4CAF50, #2E7D32)',
                    boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
                  }}
                >
                  Left
                </BaseButton>
                <BodyText>Flexible spacing</BodyText>
                <BaseButton
                  variant="secondary"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                >
                  Right
                </BaseButton>
              </FlexContainer>
            </ComponentExample>

            <ComponentExample>
              <Heading3>Grid Container (Module Overview Style)</Heading3>
              <GridContainer
                columns={4}
                gap="sm"
                style={{
                  maxWidth: '800px',
                  margin: '0 auto',
                }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <Card
                    key={i}
                    variant="default"
                    style={{
                      background: '#1E1E1E',
                      border: '2px solid transparent',
                      borderRadius: '16px',
                      padding: '1rem',
                      textAlign: 'center',
                      transition: 'all 0.3s ease',
                      minHeight: '100px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = '#4CAF50';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(76, 175, 80, 0.2)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'transparent';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <CardContent>
                      <SmallText>Grid {i}</SmallText>
                    </CardContent>
                  </Card>
                ))}
              </GridContainer>
            </ComponentExample>

            <CodeBlock>{`// Game-accurate layout with hover effects
const FlexContainer = styled.div\`
  display: flex;
  gap: \${props => props.theme.spacing.md};
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1rem;
\`;

const GridContainer = styled.div\`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: \${props => props.theme.spacing.lg};
  max-width: 800px;
  
  // Matches ModuleOverview grid layout
\`;`}</CodeBlock>
          </DemoSection>

          {/* Best Practices */}
          <DemoSection>
            <SectionTitle>✅ Best Practices</SectionTitle>
            <ComponentGrid columns={2} gap="lg">
              <Card
                variant="elevated"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(76, 175, 80, 0.05))',
                  border: '1px solid rgba(76, 175, 80, 0.2)',
                  borderLeft: '3px solid #4CAF50',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(76, 175, 80, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(76, 175, 80, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(76, 175, 80, 0.2)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background =
                    'linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(76, 175, 80, 0.05))';
                  e.currentTarget.style.borderColor = 'rgba(76, 175, 80, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.1)';
                }}
              >
                <CardHeader>
                  <CardTitle>🎨 Design Consistency</CardTitle>
                </CardHeader>
                <CardContent>
                  <BodyText>
                    Use the unified theme system and stick to predefined variants for consistent
                    visual language.
                  </BodyText>
                </CardContent>
              </Card>

              <Card
                variant="elevated"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05))',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderLeft: '3px solid #3b82f6',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(59, 130, 246, 0.2)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background =
                    'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05))';
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.1)';
                }}
              >
                <CardHeader>
                  <CardTitle>📱 Mobile First</CardTitle>
                </CardHeader>
                <CardContent>
                  <BodyText>
                    All components are designed mobile-first with touch-friendly interactions and
                    responsive breakpoints.
                  </BodyText>
                </CardContent>
              </Card>

              <Card
                variant="elevated"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05))',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  borderLeft: '3px solid #8b5cf6',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(139, 92, 246, 0.2)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background =
                    'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05))';
                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.1)';
                }}
              >
                <CardHeader>
                  <CardTitle>♿ Accessibility</CardTitle>
                </CardHeader>
                <CardContent>
                  <BodyText>
                    Components follow WCAG guidelines with proper ARIA labels, keyboard navigation,
                    and color contrast.
                  </BodyText>
                </CardContent>
              </Card>

              <Card
                variant="elevated"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05))',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  borderLeft: '3px solid #f59e0b',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(245, 158, 11, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(245, 158, 11, 0.2)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background =
                    'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05))';
                  e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.1)';
                }}
              >
                <CardHeader>
                  <CardTitle>⚡ Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <BodyText>
                    Optimized with Emotion's compile-time CSS generation and tree-shaking for
                    minimal bundle size.
                  </BodyText>
                </CardContent>
              </Card>
            </ComponentGrid>
          </DemoSection>

          {/* Game-Specific Components */}
          <DemoSection id="game-components">
            <SectionTitle>🎮 Game-Specific Components</SectionTitle>
            <BodyText>
              Specialized components for the LevelUp language learning game (100% Complete)
            </BodyText>

            <ComponentGrid>
              {/* Badges Section */}
              <Card>
                <CardHeader>
                  <CardTitle>🏆 Badge System</CardTitle>
                </CardHeader>
                <CardContent>
                  <FlexContainer direction="column" gap="md">
                    <FlexContainer gap="sm" wrap>
                      <Badge variant="success">Completed</Badge>
                      <Badge variant="warning">In Progress</Badge>
                      <Badge variant="error">Locked</Badge>
                      <Badge variant="info">New</Badge>
                    </FlexContainer>

                    {/* Activity Indicator Demo */}
                    <div style={{ marginTop: '1rem' }}>
                      <BodyText
                        style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#888' }}
                      >
                        Activity Indicator (as seen on language cards):
                      </BodyText>
                      <div
                        style={{
                          position: 'relative',
                          background: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: '8px',
                          padding: '1rem',
                          minHeight: '60px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {/* Active Activity Indicator */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#4caf50',
                            boxShadow: '0 0 8px rgba(76, 175, 80, 0.6)',
                          }}
                        />
                        <BodyText style={{ margin: 0, fontSize: '0.9rem' }}>
                          Recent Activity (Green dot indicates practice within 7 days)
                        </BodyText>
                      </div>
                    </div>

                    <BodyText>
                      Achievement, difficulty, level, and status badges with animations, visual
                      feedback, and activity indicators.
                    </BodyText>
                  </FlexContainer>
                </CardContent>
              </Card>

              {/* Game Cards */}
              <Card>
                <CardHeader>
                  <CardTitle>📱 Game Cards</CardTitle>
                </CardHeader>
                <CardContent>
                  <FlexContainer direction="column" gap="md">
                    <div
                      style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '8px',
                        padding: '1rem',
                        textAlign: 'center',
                      }}
                    >
                      <div
                        style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}
                      >
                        German Module
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#888' }}>
                        Progress: 75% • 120 words learned
                      </div>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#aaa', marginTop: '0.5rem' }}>
                      <strong>Child Components Added:</strong> ModuleHeader, ModuleIcon, ModuleInfo,
                      ModuleName, ModuleDescription, ModuleContent, ModuleActions
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#aaa' }}>
                      <strong>Word Card Children:</strong> WordTerm, WordDefinition, MasteryInfo,
                      MasteryBar, MasteryLevel
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#aaa' }}>
                      <strong>Language Card Children:</strong> LanguageHeader, LanguageFlag,
                      LanguageInfo, LanguageName, LanguageFrom
                    </div>
                    <BodyText>
                      Complete card system with ModuleCard, WordCard, LanguageCard, AnalyticCard and
                      all child components for authentic game structure.
                    </BodyText>
                  </FlexContainer>
                </CardContent>
              </Card>

              {/* Data Display */}
              <Card>
                <CardHeader>
                  <CardTitle>📊 Data Display</CardTitle>
                </CardHeader>
                <CardContent>
                  <FlexContainer direction="column" gap="md">
                    <div
                      style={{
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '8px',
                        padding: '1rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '0.5rem',
                        }}
                      >
                        <span
                          style={{
                            color: '#888',
                            fontSize: '0.8rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          WORDS LEARNED
                        </span>
                        <span
                          style={{
                            color: '#fff',
                            fontWeight: '600',
                            fontSize: '0.9rem',
                          }}
                        >
                          245
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span
                          style={{
                            color: '#888',
                            fontSize: '0.8rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          ACCURACY
                        </span>
                        <span
                          style={{
                            color: '#fff',
                            fontWeight: '600',
                            fontSize: '0.9rem',
                          }}
                        >
                          87%
                        </span>
                      </div>
                    </div>
                    <BodyText>
                      StatRow, MetricItem, ScoreDisplay, TrendIndicator, and analytics components.
                    </BodyText>
                  </FlexContainer>
                </CardContent>
              </Card>

              {/* Interactive Components */}
              <Card>
                <CardHeader>
                  <CardTitle>🎯 Interactive Elements</CardTitle>
                </CardHeader>
                <CardContent>
                  <FlexContainer direction="column" gap="md">
                    <FlexContainer gap="sm" wrap>
                      <BaseButton variant="primary" size="sm" style={{ fontSize: '0.8rem' }}>
                        Practice Now
                      </BaseButton>
                      <BaseButton variant="ghost" size="sm" style={{ fontSize: '0.8rem' }}>
                        View Details
                      </BaseButton>
                      <BaseButton variant="secondary" size="sm" style={{ fontSize: '0.8rem' }}>
                        Filter
                      </BaseButton>
                    </FlexContainer>
                    <BodyText>
                      ActionButton, FilterButton, QuickPracticeButton, Tooltip, DirectionalIcon, and
                      NavigationHint.
                    </BodyText>
                  </FlexContainer>
                </CardContent>
              </Card>

              {/* Game Layouts */}
              <Card>
                <CardHeader>
                  <CardTitle>🏗️ Game Layouts</CardTitle>
                </CardHeader>
                <CardContent>
                  <FlexContainer direction="column" gap="md">
                    <div
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.3))',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        padding: '1rem',
                        textAlign: 'center',
                        minHeight: '80px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <BodyText style={{ margin: 0 }}>Game Container Preview</BodyText>
                    </div>
                    <BodyText>
                      GameContainer, SessionLayout, AnalyticsLayout, ModuleLayout, PWALayout, and
                      responsive grid systems.
                    </BodyText>
                  </FlexContainer>
                </CardContent>
              </Card>

              {/* Game UI Components */}
              <Card>
                <CardHeader>
                  <CardTitle>🎮 Game UI Elements</CardTitle>
                </CardHeader>
                <CardContent>
                  <FlexContainer direction="column" gap="md">
                    {/* Game Mode Containers */}
                    <div>
                      <BodyText
                        style={{ marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600' }}
                      >
                        Game Mode Containers:
                      </BodyText>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                          gap: '0.5rem',
                          marginBottom: '1rem',
                        }}
                      >
                        <div
                          style={{
                            background:
                              'linear-gradient(135deg, rgba(33, 150, 243, 0.2), rgba(33, 150, 243, 0.1))',
                            border: '1px solid rgba(33, 150, 243, 0.3)',
                            borderRadius: '8px',
                            padding: '0.5rem',
                            textAlign: 'center',
                            fontSize: '0.8rem',
                            position: 'relative',
                          }}
                        >
                          <span style={{ position: 'absolute', top: '2px', right: '4px' }}>⚡</span>
                          Quick Dash
                        </div>
                        <div
                          style={{
                            background:
                              'linear-gradient(135deg, rgba(156, 39, 176, 0.2), rgba(156, 39, 176, 0.1))',
                            border: '1px solid rgba(156, 39, 176, 0.3)',
                            borderRadius: '8px',
                            padding: '0.5rem',
                            textAlign: 'center',
                            fontSize: '0.8rem',
                            position: 'relative',
                          }}
                        >
                          <span style={{ position: 'absolute', top: '2px', right: '4px' }}>🧠</span>
                          Deep Dive
                        </div>
                        <div
                          style={{
                            background:
                              'linear-gradient(135deg, rgba(255, 152, 0, 0.2), rgba(255, 152, 0, 0.1))',
                            border: '1px solid rgba(255, 152, 0, 0.3)',
                            borderRadius: '8px',
                            padding: '0.5rem',
                            textAlign: 'center',
                            fontSize: '0.8rem',
                            position: 'relative',
                          }}
                        >
                          <span style={{ position: 'absolute', top: '2px', right: '4px' }}>🔥</span>
                          Streak
                        </div>
                        <div
                          style={{
                            background:
                              'linear-gradient(135deg, rgba(244, 67, 54, 0.2), rgba(244, 67, 54, 0.1))',
                            border: '1px solid rgba(244, 67, 54, 0.3)',
                            borderRadius: '8px',
                            padding: '0.5rem',
                            textAlign: 'center',
                            fontSize: '0.8rem',
                            position: 'relative',
                          }}
                        >
                          <span style={{ position: 'absolute', top: '2px', right: '4px' }}>👹</span>
                          Boss Battle
                        </div>
                      </div>
                    </div>

                    {/* Game Meters */}
                    <div>
                      <BodyText
                        style={{ marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600' }}
                      >
                        Performance Meters:
                      </BodyText>
                      <div
                        style={{
                          display: 'flex',
                          gap: '0.5rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div
                          style={{
                            background: 'rgba(33, 150, 243, 0.1)',
                            border: '1px solid rgba(33, 150, 243, 0.3)',
                            borderRadius: '6px',
                            padding: '0.5rem',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          ⚡ 2.3/s
                        </div>
                        <div
                          style={{
                            background: 'rgba(255, 152, 0, 0.1)',
                            border: '1px solid rgba(255, 152, 0, 0.3)',
                            borderRadius: '6px',
                            padding: '0.5rem',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          🔥 8x
                        </div>
                        <div
                          style={{
                            background: 'rgba(76, 175, 80, 0.1)',
                            border: '1px solid rgba(76, 175, 80, 0.3)',
                            borderRadius: '6px',
                            padding: '0.5rem',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          🎯 94%
                        </div>
                        <div
                          style={{
                            background: 'rgba(156, 39, 176, 0.1)',
                            border: '1px solid rgba(156, 39, 176, 0.3)',
                            borderRadius: '6px',
                            padding: '0.5rem',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          🧠 87%
                        </div>
                      </div>
                    </div>

                    <BodyText>
                      Complete game UI including mode containers, progress meters, boss battle
                      components, and action buttons with animations.
                    </BodyText>
                  </FlexContainer>
                </CardContent>
              </Card>

              {/* Component Coverage */}
              <Card>
                <CardHeader>
                  <CardTitle>✅ Coverage Complete</CardTitle>
                </CardHeader>
                <CardContent>
                  <FlexContainer direction="column" gap="md">
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '1rem',
                      }}
                    >
                      <div style={{ textAlign: 'center' }}>
                        <div
                          style={{
                            fontSize: '2rem',
                            fontWeight: 'bold',
                            color: '#4CAF50',
                            marginBottom: '4px',
                          }}
                        >
                          100%
                        </div>
                        <div
                          style={{
                            fontSize: '0.8rem',
                            color: '#888',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          COMPLETE
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div
                          style={{
                            fontSize: '2rem',
                            fontWeight: 'bold',
                            color: '#3b82f6',
                            marginBottom: '4px',
                          }}
                        >
                          95+
                        </div>
                        <div
                          style={{
                            fontSize: '0.8rem',
                            color: '#888',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          COMPONENTS
                        </div>
                      </div>
                    </div>
                    <BodyText>
                      Complete game-specific component library including badges, specialized cards,
                      data display, interactive elements, responsive layouts, and game UI
                      components. All components extracted from actual game implementations with
                      perfect styling consistency plus comprehensive child components for modular
                      composition.
                    </BodyText>
                  </FlexContainer>
                </CardContent>
              </Card>
            </ComponentGrid>
          </DemoSection>

          {/* Footer */}
          <CenteredContent style={{ marginTop: '4rem', paddingBottom: '2rem' }}>
            <BodyText>
              🎯 This component library provides a solid foundation for consistent, maintainable,
              and scalable UI development
            </BodyText>
            <FlexContainer gap="md" style={{ marginTop: '1rem' }}>
              <Link href="/docs">Documentation</Link>
              <Link href="/github">GitHub Repository</Link>
              <Link href="/storybook">Storybook</Link>
            </FlexContainer>
          </CenteredContent>
        </Container>

        {/* FAB for quick access */}
        <FAB onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>↑</FAB>
      </DemoContainer>
    </>
  );
};

export default ComponentLibraryDemo;
