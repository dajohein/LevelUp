import React, { useState } from 'react';
import styled from '@emotion/styled';
import { usePWA, useNetworkStatus, usePushNotifications } from '../../hooks/usePWA';

const PWAContainer = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;

  /* Hide PWA button on mobile to avoid overlap with bottom navigation */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    display: none;
  }
`;

const CompactButton = styled.button`
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border: none;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  font-size: 1.2rem;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);

  &:hover {
    background: rgba(0, 0, 0, 0.9);
    transform: scale(1.1);
  }
`;

const PWAMenu = styled.div<{ isOpen: boolean }>`
  display: ${props => (props.isOpen ? 'flex' : 'none')};
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
`;

const InstallButton = styled.button`
  background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 10px 16px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
`;

export const PWAManager: React.FC = () => {
  const { isInstallable, isInstalled, installApp, updateAvailable, updateApp } = usePWA();
  const { isOnline } = useNetworkStatus();
  const { permission, requestPermission, subscribeToPush } = usePushNotifications();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleInstall = async () => {
    await installApp();
    setIsMenuOpen(false);
  };

  const handleUpdate = async () => {
    await updateApp();
    setIsMenuOpen(false);
  };

  const handleEnableNotifications = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      await subscribeToPush(registration);
    }
    setIsMenuOpen(false);
  };

  // Only show if there are actionable items
  const hasActions = isInstallable || updateAvailable || permission === 'default';
  if (!hasActions) {
    return null;
  }

  const getButtonIcon = () => {
    if (!isOnline) return '📴';
    if (updateAvailable) return '🔄';
    if (isInstallable) return '📱';
    if (permission === 'default') return '🔔';
    return '⚙️';
  };

  return (
    <PWAContainer>
      <PWAMenu isOpen={isMenuOpen}>
        {isInstallable && !isInstalled && (
          <InstallButton onClick={handleInstall}>📱 Install App</InstallButton>
        )}

        {updateAvailable && (
          <InstallButton
            onClick={handleUpdate}
            style={{ background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)' }}
          >
            🔄 Update App
          </InstallButton>
        )}

        {permission === 'default' && (
          <InstallButton
            onClick={handleEnableNotifications}
            style={{ background: 'linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)' }}
          >
            🔔 Enable Notifications
          </InstallButton>
        )}
      </PWAMenu>

      <CompactButton
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        title={isMenuOpen ? 'Close PWA Options' : 'PWA Options'}
      >
        {getButtonIcon()}
      </CompactButton>
    </PWAContainer>
  );
};

// Offline indicator component
const OfflineIndicator = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: #f44336;
  color: white;
  padding: 8px;
  text-align: center;
  font-size: 0.9rem;
  z-index: 9999;
  transform: translateY(-100%);
  transition: transform 0.3s ease;

  &.visible {
    transform: translateY(0);
  }
`;

export const OfflineBanner: React.FC = () => {
  const { isOnline } = useNetworkStatus();

  return (
    <OfflineIndicator className={!isOnline ? 'visible' : ''}>
      🔴 You're offline. Some features may be limited, but you can continue learning!
    </OfflineIndicator>
  );
};
