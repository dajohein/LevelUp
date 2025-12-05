import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { useNavigate } from 'react-router-dom';
import { Navigation } from './Navigation';

const Container = styled.div`
  min-height: 100vh;
  background-color: ${props => props.theme.colors.background};
  padding-top: 90px;
`;

const Content = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${props => props.theme.spacing.xl};
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: ${props => props.theme.spacing.xl};
`;

const Title = styled.h1`
  color: ${props => props.theme.colors.text};
  font-size: 2.5rem;
  margin-bottom: ${props => props.theme.spacing.md};
`;

const Subtitle = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 1.1rem;
  margin-bottom: ${props => props.theme.spacing.lg};
`;

const Section = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: ${props => props.theme.borderRadius.lg};
  padding: ${props => props.theme.spacing.xl};
  margin-bottom: ${props => props.theme.spacing.lg};
`;

const SectionTitle = styled.h2`
  color: ${props => props.theme.colors.text};
  font-size: 1.5rem;
  margin-bottom: ${props => props.theme.spacing.lg};
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
`;

const ButtonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.lg};
`;

const FeatureButton = styled.button<{ color?: string }>`
  background: ${props => props.color || props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${props => props.theme.borderRadius.md};
  padding: ${props => props.theme.spacing.lg};
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  min-height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    opacity: 0.9;
  }

  &:active {
    transform: translateY(0);
  }
`;

const FeatureTitle = styled.div`
  font-weight: 600;
  margin-bottom: 4px;
`;

const FeatureDescription = styled.div`
  font-size: 0.85rem;
  opacity: 0.9;
`;

const CodeBlock = styled.pre`
  background: #1a1a1a;
  color: #e0e0e0;
  padding: ${props => props.theme.spacing.md};
  border-radius: ${props => props.theme.borderRadius.sm};
  overflow-x: auto;
  font-size: 0.9rem;
  margin: ${props => props.theme.spacing.sm} 0;
`;

const StatusGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${props => props.theme.spacing.md};
`;

const StatusCard = styled.div`
  background: ${props => props.theme.colors.surfaceHover};
  border-radius: ${props => props.theme.borderRadius.sm};
  padding: ${props => props.theme.spacing.md};
  text-align: center;
`;

const StatusValue = styled.div`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${props => props.theme.colors.primary};
  margin-bottom: 4px;
`;

const StatusLabel = styled.div`
  font-size: 0.9rem;
  color: ${props => props.theme.colors.textSecondary};
`;

export const DeveloperDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [systemStats, setSystemStats] = useState<any>(null);

  useEffect(() => {
    // Get system stats if available
    if (typeof window !== 'undefined' && (window as any).LevelUpDev) {
      const stats = {
        environment: process.env.NODE_ENV || 'unknown',
        buildTime: new Date().toLocaleDateString(),
        toolsVersion: '1.0.0',
        reactVersion: React.version,
      };
      setSystemStats(stats);
    }
  }, []);

  const runTest = async (testName: string, testFunc: () => Promise<any>) => {
    try {
      console.log(`🧪 Running ${testName}...`);
      const result = await testFunc();
      console.log(`✅ ${testName} completed:`, result);
      alert(`✅ ${testName} completed successfully! Check console for details.`);
    } catch (error) {
      console.error(`❌ ${testName} failed:`, error);
      alert(`❌ ${testName} failed! Check console for details.`);
    }
  };

  return (
    <>
      <Navigation showUserProfile={true} />
      <Container>
        <Content>
          <Header>
            <Title>🛠️ Developer Dashboard</Title>
            <Subtitle>
              Comprehensive development tools, testing utilities, and system demos
            </Subtitle>
          </Header>

          {/* System Status */}
          <Section>
            <SectionTitle>📊 System Status</SectionTitle>
            <StatusGrid>
              <StatusCard>
                <StatusValue>{systemStats?.environment || 'Unknown'}</StatusValue>
                <StatusLabel>Environment</StatusLabel>
              </StatusCard>
              <StatusCard>
                <StatusValue>{systemStats?.reactVersion || 'Unknown'}</StatusValue>
                <StatusLabel>React Version</StatusLabel>
              </StatusCard>
              <StatusCard>
                <StatusValue>{systemStats?.toolsVersion || 'Unknown'}</StatusValue>
                <StatusLabel>Dev Tools Version</StatusLabel>
              </StatusCard>
              <StatusCard>
                <StatusValue>{systemStats?.buildTime || 'Unknown'}</StatusValue>
                <StatusLabel>Build Date</StatusLabel>
              </StatusCard>
            </StatusGrid>
          </Section>

          {/* UI Demos */}
          <Section>
            <SectionTitle>🎨 UI Components & Demos</SectionTitle>
            <ButtonGrid>
              <FeatureButton color="#6c5ce7" onClick={() => navigate('/components-demo')}>
                <FeatureTitle>🎨 Component Library</FeatureTitle>
                <FeatureDescription>
                  Complete showcase of all UI components, buttons, forms, and layouts
                </FeatureDescription>
              </FeatureButton>

              <FeatureButton color="#fd79a8" onClick={() => navigate('/loading-demo')}>
                <FeatureTitle>📱 Loading States Demo</FeatureTitle>
                <FeatureDescription>
                  Interactive demo of all loading states, skeletons, and transitions
                </FeatureDescription>
              </FeatureButton>

              <FeatureButton color="#4a90e2" onClick={() => navigate('/simple-ai-demo')}>
                <FeatureTitle>🤖 Simple AI Demo</FeatureTitle>
                <FeatureDescription>
                  AI learning coach demonstration with analytics and insights
                </FeatureDescription>
              </FeatureButton>
            </ButtonGrid>
          </Section>

          {/* Testing Tools */}
          <Section>
            <SectionTitle>🧪 Testing & Validation</SectionTitle>
            <ButtonGrid>
              <FeatureButton
                color="#00b894"
                onClick={() =>
                  runTest(
                    'All Tests',
                    () =>
                      (window as any).LevelUpDev?.testing?.runAllTests?.() ||
                      Promise.resolve('Tools not loaded')
                  )
                }
              >
                <FeatureTitle>🚀 Run All Tests</FeatureTitle>
                <FeatureDescription>
                  Execute comprehensive test suite including storage, performance, and services
                </FeatureDescription>
              </FeatureButton>

              <FeatureButton
                color="#e17055"
                onClick={() =>
                  runTest(
                    'Storage Optimization',
                    () =>
                      (window as any).LevelUpDev?.testing?.saveOptimization?.() ||
                      Promise.resolve('Tools not loaded')
                  )
                }
              >
                <FeatureTitle>💾 Storage Tests</FeatureTitle>
                <FeatureDescription>
                  Test storage optimization, save frequency, and data integrity
                </FeatureDescription>
              </FeatureButton>

              <FeatureButton
                color="#a29bfe"
                onClick={() =>
                  runTest(
                    'Performance Analysis',
                    () =>
                      (window as any).LevelUpDev?.testing?.gameServicesPerformance?.() ||
                      Promise.resolve('Tools not loaded')
                  )
                }
              >
                <FeatureTitle>⚡ Performance Tests</FeatureTitle>
                <FeatureDescription>
                  Benchmark all game services and analyze performance metrics
                </FeatureDescription>
              </FeatureButton>

              <FeatureButton
                color="#fdcb6e"
                onClick={() =>
                  runTest(
                    'Migration Tests',
                    () =>
                      (window as any).LevelUpDev?.testing?.migration?.runAllTests?.() ||
                      Promise.resolve('Tools not loaded')
                  )
                }
              >
                <FeatureTitle>🔄 Migration Tests</FeatureTitle>
                <FeatureDescription>
                  Validate data migration, backwards compatibility, and upgrades
                </FeatureDescription>
              </FeatureButton>
            </ButtonGrid>
          </Section>

          {/* Performance & Monitoring */}
          <Section>
            <SectionTitle>📈 Performance & Monitoring</SectionTitle>
            <ButtonGrid>
              <FeatureButton
                color="#6c5ce7"
                onClick={() => {
                  if ((window as any).LevelUpDev?.performance?.enable) {
                    (window as any).LevelUpDev.performance.enable();
                    alert(
                      '✅ Performance monitoring enabled! Use the app and check console for reports.'
                    );
                  } else {
                    alert('❌ Developer tools not loaded');
                  }
                }}
              >
                <FeatureTitle>📊 Enable Performance Monitoring</FeatureTitle>
                <FeatureDescription>
                  Start real-time performance tracking and memory analysis
                </FeatureDescription>
              </FeatureButton>

              <FeatureButton
                color="#00cec9"
                onClick={() => {
                  if ((window as any).LevelUpDev?.storage?.checkHealth) {
                    (window as any).LevelUpDev.storage.checkHealth().then((result: any) => {
                      console.log('Storage Health Report:', result);
                      alert(`Storage Health Score: ${result.score || 'Unknown'}`);
                    });
                  } else {
                    alert('❌ Developer tools not loaded');
                  }
                }}
              >
                <FeatureTitle>🏥 Storage Health Check</FeatureTitle>
                <FeatureDescription>
                  Analyze storage performance, cache efficiency, and data integrity
                </FeatureDescription>
              </FeatureButton>

              <FeatureButton
                color="#e17055"
                onClick={() => {
                  if ((window as any).LevelUpDev?.performance?.analyzeMemory) {
                    const memInfo = (window as any).LevelUpDev.performance.analyzeMemory();
                    console.log('Memory Analysis:', memInfo);
                    alert(`Memory Usage: ${memInfo.usage || 'Unknown'}`);
                  } else {
                    alert('❌ Developer tools not loaded');
                  }
                }}
              >
                <FeatureTitle>🧠 Memory Analysis</FeatureTitle>
                <FeatureDescription>
                  Check current memory usage, heap size, and potential leaks
                </FeatureDescription>
              </FeatureButton>
            </ButtonGrid>
          </Section>

          {/* Console Commands */}
          <Section>
            <SectionTitle>💻 Console Commands</SectionTitle>
            <p style={{ color: '#b0b0b0', marginBottom: '1rem' }}>
              Open browser console (F12) and try these commands:
            </p>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <strong style={{ color: '#4CAF50' }}>Quick Start:</strong>
                <CodeBlock>LevelUpDev.help.quickStart()</CodeBlock>
              </div>

              <div>
                <strong style={{ color: '#4CAF50' }}>List All Functions:</strong>
                <CodeBlock>LevelUpDev.help.list()</CodeBlock>
              </div>

              <div>
                <strong style={{ color: '#4CAF50' }}>Run Complete Test Suite:</strong>
                <CodeBlock>await LevelUpDev.testing.runAllTests()</CodeBlock>
              </div>

              <div>
                <strong style={{ color: '#4CAF50' }}>Export User Data:</strong>
                <CodeBlock>await LevelUpDev.storage.exportUserData('de')</CodeBlock>
              </div>
            </div>
          </Section>

          {/* Quick Actions */}
          <Section>
            <SectionTitle>⚡ Quick Actions</SectionTitle>
            <ButtonGrid>
              <FeatureButton color="#2d3436" onClick={() => navigate('/')}>
                <FeatureTitle>🏠 Back to Main App</FeatureTitle>
                <FeatureDescription>Return to the language learning interface</FeatureDescription>
              </FeatureButton>

              <FeatureButton color="#636e72" onClick={() => navigate('/profile')}>
                <FeatureTitle>👤 User Profile</FeatureTitle>
                <FeatureDescription>
                  View user profile with additional debug tools
                </FeatureDescription>
              </FeatureButton>

              <FeatureButton
                color="#74b9ff"
                onClick={() => {
                  console.log('🛠️ LevelUp Developer Tools loaded');
                  console.log('📖 Use LevelUpDev.help.quickStart() for usage guide');
                  alert('Check console for developer tools help!');
                }}
              >
                <FeatureTitle>ℹ️ Console Help</FeatureTitle>
                <FeatureDescription>Print help information to browser console</FeatureDescription>
              </FeatureButton>
            </ButtonGrid>
          </Section>
        </Content>
      </Container>
    </>
  );
};

export default DeveloperDashboard;
