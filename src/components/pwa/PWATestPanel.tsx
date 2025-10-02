import React, { useState } from 'react';
import styled from '@emotion/styled';
import { 
  showNotification, 
  setBadge, 
  clearBadge, 
  shareContent,
  isRunningAsPWA,
  getPWADisplayMode 
} from '../../services/pwaService';

const TestContainer = styled.div`
  position: fixed;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 16px;
  border-radius: 12px;
  z-index: 10000;
  max-width: 300px;
`;

const TestTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 1.1rem;
`;

const TestButton = styled.button`
  background: #4CAF50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  margin: 4px;
  cursor: pointer;
  font-size: 0.9rem;

  &:hover {
    background: #45a049;
  }
`;

const StatusText = styled.div`
  font-size: 0.8rem;
  opacity: 0.8;
  margin: 8px 0;
`;

export const PWATestPanel: React.FC = () => {
  const [status, setStatus] = useState<string>('Ready');
  const [badgeCount, setBadgeCount] = useState(0);

  const testNotification = async () => {
    setStatus('Testing notification...');
    try {
      await showNotification('🎉 PWA Test', {
        body: 'Your PWA is working correctly!',
        tag: 'pwa-test',
        requireInteraction: false,
      });
      setStatus('✅ Notification sent');
    } catch (error) {
      setStatus('❌ Notification failed');
      console.error('Notification error:', error);
    }
  };

  const testBadge = async () => {
    const newCount = badgeCount + 1;
    setBadgeCount(newCount);
    try {
      await setBadge(newCount);
      setStatus(`🔴 Badge set to ${newCount}`);
    } catch (error) {
      setStatus('❌ Badge failed');
      console.error('Badge error:', error);
    }
  };

  const clearAppBadge = async () => {
    setBadgeCount(0);
    try {
      await clearBadge();
      setStatus('🟢 Badge cleared');
    } catch (error) {
      setStatus('❌ Clear badge failed');
      console.error('Clear badge error:', error);
    }
  };

  const testShare = async () => {
    setStatus('Testing share...');
    try {
      const shared = await shareContent({
        title: 'LevelUp Language Learning',
        text: 'Check out this amazing language learning app!',
        url: window.location.href,
      });
      setStatus(shared ? '✅ Share dialog opened' : '📋 Share not available');
    } catch (error) {
      setStatus('❌ Share failed');
      console.error('Share error:', error);
    }
  };

  const displayMode = getPWADisplayMode();
  const isPWA = isRunningAsPWA();

  return (
    <TestContainer>
      <TestTitle>🧪 PWA Test Panel</TestTitle>
      
      <StatusText>
        Mode: {displayMode} {isPWA ? '(PWA)' : '(Browser)'}
      </StatusText>
      
      <StatusText>
        SW: {'serviceWorker' in navigator ? '✅' : '❌'} | 
        Push: {'PushManager' in window ? '✅' : '❌'} | 
        Notifications: {'Notification' in window ? '✅' : '❌'}
      </StatusText>
      
      <div>
        <TestButton onClick={testNotification}>
          📱 Test Notification
        </TestButton>
        
        <TestButton onClick={testBadge}>
          🔴 Set Badge ({badgeCount})
        </TestButton>
        
        <TestButton onClick={clearAppBadge}>
          🟢 Clear Badge
        </TestButton>
        
        <TestButton onClick={testShare}>
          📤 Test Share
        </TestButton>
      </div>
      
      <StatusText>{status}</StatusText>
    </TestContainer>
  );
};

// Development only component
export const PWADebugPanel: React.FC = () => {
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return <PWATestPanel />;
};