import React, { useState, useEffect, useId, useRef } from 'react';
import styled from '@emotion/styled';
import { useNavigate } from 'react-router-dom';
import { Navigation } from './Navigation';
import { MobileButton } from './mobile/MobileButton';
import { AccountLinking } from './AccountLinking';
import { pwaUpdateManager } from '../services/pwaUpdateManager';
import { logger } from '../services/logger';
import { ModalDialog } from './ui/ModalDialog';
import { DataTransfer } from './DataTransfer';

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
  background: linear-gradient(
    135deg,
    ${props => props.theme.colors.primary},
    ${props => props.theme.colors.secondary}
  );
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

const Modal = styled(ModalDialog)`
  background: ${props => props.theme.colors.background};
  border: 0;
  padding: 0;
  border-radius: ${props => props.theme.borderRadius.lg};
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  &::backdrop {
    background: rgba(0, 0, 0, 0.5);
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: ${props => props.theme.colors.textSecondary};
  z-index: 1;

  &:hover {
    color: ${props => props.theme.colors.text};
  }
`;

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [showAccountLinking, setShowAccountLinking] = useState(false);
  const accountTitleId = useId();
  const closeAccountRef = useRef<HTMLButtonElement>(null);
  const [pendingUpdate, setPendingUpdate] = useState<any>(null);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);

  useEffect(() => {
    // Check for pending updates when component mounts
    const pending = pwaUpdateManager.getPendingUpdate();
    setPendingUpdate(pending);
  }, []);

  const handleNavigation = (path: string) => {
    if (path === '/install') {
      // Trigger PWA install
      window.location.reload();
    } else if (path === '/account-linking') {
      setShowAccountLinking(true);
    } else {
      navigate(path);
    }
  };

  const handleApplyPendingUpdate = async () => {
    setIsApplyingUpdate(true);
    try {
      const success = await pwaUpdateManager.applyPendingUpdate();
      if (!success) {
        // Fallback to manual reload
        window.location.reload();
      }
    } catch (error) {
      logger.error('Failed to apply pending update', { error });
      setIsApplyingUpdate(false);
      // Fallback to manual reload
      window.location.reload();
    }
  };

  const handleCheckForUpdates = async () => {
    try {
      await pwaUpdateManager.checkForUpdates();
      // Re-check for pending updates
      const pending = pwaUpdateManager.getPendingUpdate();
      setPendingUpdate(pending);
    } catch (error) {
      logger.error('Failed to check for updates', { error });
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
            <MobileButton variant="secondary" onClick={() => navigate('/profile')} fullWidth>
              View Profile & Progress
            </MobileButton>
          </OptionsGrid>
          <DataTransfer
            exportButtonLabel="Export Learning Data"
            importButtonLabel="Import from Device"
          />
        </SectionCard>

        <SectionCard>
          <SectionTitle>
            <span>🔗</span>
            Remote Sync Status
          </SectionTitle>
          <OptionsGrid>
            <MobileButton
              variant="primary"
              onClick={() => handleNavigation('/account-linking')}
              fullWidth
            >
              Check Sync Availability
            </MobileButton>
          </OptionsGrid>
        </SectionCard>

        <SectionCard>
          <SectionTitle>
            <span>�</span>
            App Updates
          </SectionTitle>
          <OptionsGrid>
            {pendingUpdate ? (
              <MobileButton
                variant="primary"
                onClick={handleApplyPendingUpdate}
                disabled={isApplyingUpdate}
                fullWidth
              >
                {isApplyingUpdate
                  ? 'Applying Update...'
                  : `🚀 Apply Update (v${pendingUpdate.version})`}
              </MobileButton>
            ) : (
              <MobileButton variant="outline" onClick={handleCheckForUpdates} fullWidth>
                🔍 Check for Updates
              </MobileButton>
            )}
            <MobileButton variant="secondary" onClick={() => window.location.reload()} fullWidth>
              🔄 Refresh App
            </MobileButton>
          </OptionsGrid>
        </SectionCard>

        <SectionCard>
          <SectionTitle>
            <span>📱</span>
            App Settings
          </SectionTitle>
          <OptionsGrid>
            <MobileButton variant="outline" onClick={() => handleNavigation('/install')} fullWidth>
              Install as App
            </MobileButton>
          </OptionsGrid>
        </SectionCard>

        <SectionCard>
          <SectionTitle>
            <span>🎯</span>
            Quick Actions
          </SectionTitle>
          <OptionsGrid>
            <MobileButton variant="primary" onClick={() => navigate('/')} fullWidth>
              Start Learning
            </MobileButton>
            <MobileButton variant="secondary" onClick={() => navigate('/profile')} fullWidth>
              View All Progress
            </MobileButton>
          </OptionsGrid>
        </SectionCard>

        <ComingSoon>More settings and customization options coming soon! 🚀</ComingSoon>
      </Content>

      <Modal
        isOpen={showAccountLinking}
        onClose={() => setShowAccountLinking(false)}
        labelledBy={accountTitleId}
        initialFocusRef={closeAccountRef}
      >
        <CloseButton
          ref={closeAccountRef}
          type="button"
          aria-label="Close device linking"
          onClick={() => setShowAccountLinking(false)}
        >
          ×
        </CloseButton>
        <AccountLinking titleId={accountTitleId} />
      </Modal>
    </Container>
  );
};
