import React, { useState } from 'react';
import styled from '@emotion/styled';
import { usePWA, useNetworkStatus, usePushNotifications, useBackgroundSync } from '../../hooks/usePWA';

const PWAContainer = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
`;

const InstallButton = styled.button`
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 12px 20px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(76, 175, 80, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
`;

const UpdateButton = styled(InstallButton)`
  background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);

  &:hover {
    box-shadow: 0 6px 16px rgba(255, 152, 0, 0.4);
  }
`;

const StatusBadge = styled.div<{ status: 'online' | 'offline' | 'slow' }>`
  background: ${props => 
    props.status === 'online' ? '#4CAF50' : 
    props.status === 'slow' ? '#FF9800' : '#f44336'
  };
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  opacity: 0.9;
`;

const NotificationPanel = styled.div`
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 10px;
  max-width: 300px;
  backdrop-filter: blur(10px);
`;

const NotificationTitle = styled.h4`
  margin: 0 0 8px 0;
  font-size: 1rem;
`;

const NotificationText = styled.p`
  margin: 0 0 12px 0;
  font-size: 0.9rem;
  opacity: 0.9;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 8px;
`;

const NotificationButton = styled.button`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  &.primary {
    background: #4CAF50;
    border-color: #4CAF50;
  }
`;

export const PWAManager: React.FC = () => {
  const { isInstallable, isInstalled, installApp, updateAvailable, updateApp } = usePWA();
  const { isOnline, connectionType } = useNetworkStatus();
  const { permission, requestPermission, subscribeToPush } = usePushNotifications();
  const { syncProgress } = useBackgroundSync();
  
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  // Reset notification prompt when permission is granted
  React.useEffect(() => {
    if (permission === 'granted') {
      setShowNotificationPrompt(false);
    }
  }, [permission]);

  const handleInstall = async () => {
    await installApp();
  };

  const handleUpdate = async () => {
    await updateApp();
  };

  const handleEnableNotifications = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      setShowNotificationPrompt(false);
      
      // Subscribe to push notifications
      const registration = await navigator.serviceWorker.ready;
      await subscribeToPush(registration);
    }
  };

  const getConnectionStatus = () => {
    if (!isOnline) return 'offline';
    if (connectionType === 'slow-2g' || connectionType === '2g') return 'slow';
    return 'online';
  };

  const getStatusIcon = () => {
    const status = getConnectionStatus();
    switch (status) {
      case 'online': return '🟢';
      case 'slow': return '🟡';
      case 'offline': return '🔴';
      default: return '🟢';
    }
  };

  const getStatusText = () => {
    const status = getConnectionStatus();
    switch (status) {
      case 'online': return `Online (${connectionType})`;
      case 'slow': return 'Slow Connection';
      case 'offline': return 'Offline Mode';
      default: return 'Online';
    }
  };

  return (
    <PWAContainer>
      {/* Network Status */}
      <StatusBadge status={getConnectionStatus()}>
        <span>{getStatusIcon()}</span>
        <span>{getStatusText()}</span>
      </StatusBadge>

      {/* Notification Permission Prompt */}
      {permission === 'default' && !showNotificationPrompt && !isInstalled && (
        <NotificationPanel>
          <NotificationTitle>📱 Stay on Track!</NotificationTitle>
          <NotificationText>
            Get gentle reminders to practice your languages daily.
          </NotificationText>
          <ButtonRow>
            <NotificationButton 
              className="primary" 
              onClick={() => setShowNotificationPrompt(true)}
            >
              Enable
            </NotificationButton>
            <NotificationButton onClick={() => setShowNotificationPrompt(false)}>
              Later
            </NotificationButton>
          </ButtonRow>
        </NotificationPanel>
      )}

      {/* Detailed Notification Prompt */}
      {showNotificationPrompt && permission === 'default' && (
        <NotificationPanel>
          <NotificationTitle>🔔 Learning Reminders</NotificationTitle>
          <NotificationText>
            We'll send you helpful reminders to practice:
            <br />• Daily practice streaks
            <br />• Review sessions for words you're learning
            <br />• Weekly progress summaries
          </NotificationText>
          <ButtonRow>
            <NotificationButton className="primary" onClick={handleEnableNotifications}>
              Allow Notifications
            </NotificationButton>
            <NotificationButton onClick={() => setShowNotificationPrompt(false)}>
              No Thanks
            </NotificationButton>
          </ButtonRow>
        </NotificationPanel>
      )}

      {/* Update Available */}
      {updateAvailable && (
        <UpdateButton onClick={handleUpdate}>
          <span>⚡</span>
          Update Available
        </UpdateButton>
      )}

      {/* Install App */}
      {isInstallable && !isInstalled && (
        <InstallButton onClick={handleInstall}>
          <span>📱</span>
          Install App
        </InstallButton>
      )}

      {/* Offline Sync Status */}
      {!isOnline && (
        <InstallButton onClick={syncProgress}>
          <span>🔄</span>
          Sync When Online
        </InstallButton>
      )}
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