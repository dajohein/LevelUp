import React from 'react';
import styled from '@emotion/styled';
import { useNavigate } from 'react-router-dom';
import { Navigation } from './Navigation';
import { MobileButton } from './mobile/MobileButton';

const Container = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  background-color: ${props => props.theme.colors.background};
  padding-top: 80px;
`;

const Content = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: ${props => props.theme.spacing.lg};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
  }
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: ${props => props.theme.spacing.xl};
`;

const Title = styled.h1`
  color: ${props => props.theme.colors.text};
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: ${props => props.theme.spacing.sm};
  background: linear-gradient(135deg, ${props => props.theme.colors.primary}, ${props => props.theme.colors.secondary});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1.5rem;
  }
`;

const Subtitle = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 1rem;
  margin: 0;
`;

const SectionCard = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: ${props => props.theme.borderRadius.lg};
  padding: ${props => props.theme.spacing.lg};
  margin-bottom: ${props => props.theme.spacing.lg};
  border: 1px solid rgba(76, 175, 80, 0.1);

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
    margin-bottom: ${props => props.theme.spacing.md};
  }
`;

const SectionTitle = styled.h2`
  color: ${props => props.theme.colors.text};
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0 0 ${props => props.theme.spacing.md} 0;
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1.1rem;
  }
`;

const OptionsGrid = styled.div`
  display: grid;
  gap: ${props => props.theme.spacing.sm};
  grid-template-columns: 1fr;

  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const ComingSoon = styled.div`
  text-align: center;
  padding: ${props => props.theme.spacing.xl};
  color: ${props => props.theme.colors.textSecondary};
  font-style: italic;
`;

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    if (path === '/export') {
      // Trigger data export
      console.log('Export data functionality coming soon');
    } else if (path === '/import') {
      // Trigger data import
      console.log('Import data functionality coming soon');
    } else if (path === '/install') {
      // Trigger PWA install
      window.location.reload();
    } else {
      navigate(path);
    }
  };

  return (
    <Container>
      <Navigation showUserProfile={true} />
      <Content>
        <Header>
          <Title>⚙️ Settings & More</Title>
          <Subtitle>Customize your learning experience</Subtitle>
        </Header>

        <SectionCard>
          <SectionTitle>
            <span>📊</span>
            Your Data
          </SectionTitle>
          <OptionsGrid>
            <MobileButton
              variant="secondary"
              onClick={() => navigate('/profile')}
              fullWidth
            >
              View Profile & Progress
            </MobileButton>
            <MobileButton
              variant="outline"
              onClick={() => handleNavigation('/export')}
              fullWidth
            >
              Export Learning Data
            </MobileButton>
          </OptionsGrid>
        </SectionCard>

        <SectionCard>
          <SectionTitle>
            <span>📱</span>
            App Settings
          </SectionTitle>
          <OptionsGrid>
            <MobileButton
              variant="outline"
              onClick={() => handleNavigation('/install')}
              fullWidth
            >
              Install as App
            </MobileButton>
            <MobileButton
              variant="secondary"
              onClick={() => window.location.reload()}
              fullWidth
            >
              Refresh App
            </MobileButton>
          </OptionsGrid>
        </SectionCard>

        <SectionCard>
          <SectionTitle>
            <span>🎯</span>
            Quick Actions
          </SectionTitle>
          <OptionsGrid>
            <MobileButton
              variant="primary"
              onClick={() => navigate('/')}
              fullWidth
            >
              Start Learning
            </MobileButton>
            <MobileButton
              variant="secondary"
              onClick={() => navigate('/profile')}
              fullWidth
            >
              View All Progress
            </MobileButton>
          </OptionsGrid>
        </SectionCard>

        <ComingSoon>
          More settings and customization options coming soon! 🚀
        </ComingSoon>
      </Content>
    </Container>
  );
};