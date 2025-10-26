import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { useLocation } from 'react-router-dom';
import { pwaUpdateManager, UpdateInfo } from '../services/pwaUpdateManager';

const UpdateBanner = styled.div<{ visible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transform: translateY(${props => props.visible ? '0' : '-100%'});
  transition: transform 0.3s ease-in-out;
  z-index: 10000;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const UpdateMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;

  span {
    font-weight: 500;
  }

  .version {
    background: rgba(255, 255, 255, 0.2);
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-family: monospace;
  }
`;

const UpdateActions = styled.div`
  display: flex;
  gap: 8px;
`;

const UpdateButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  background: ${props => props.variant === 'secondary' 
    ? 'rgba(255, 255, 255, 0.1)' 
    : 'rgba(255, 255, 255, 0.9)'};
  color: ${props => props.variant === 'secondary' ? 'white' : '#1d4ed8'};
  border: 1px solid ${props => props.variant === 'secondary' 
    ? 'rgba(255, 255, 255, 0.3)' 
    : 'transparent'};
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.variant === 'secondary' 
      ? 'rgba(255, 255, 255, 0.2)' 
      : 'white'};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const UpdateIcon = styled.span`
  font-size: 1.2rem;
  animation: pulse 2s infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
`;

export const PWAUpdateNotification: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15); // 15 seconds to respond
  const location = useLocation();

  // Check if user is in an active learning session
  const isInLearningSession = () => {
    const learningRoutes = ['/game/', '/challenge/', '/practice/', '/boss/', '/streak/'];
    return learningRoutes.some(route => location.pathname.includes(route));
  };

  useEffect(() => {
    // Listen for update notifications
    pwaUpdateManager.onUpdateAvailable((info) => {
      console.log('🔔 Update notification received:', info);
      
      // If user is in a learning session, delay the notification longer
      const delayTime = isInLearningSession() ? 30000 : 2000; // 30s vs 2s delay
      
      setTimeout(() => {
        setUpdateInfo(info);
        setIsVisible(true);
        setShowTimer(true);
        setTimeLeft(15);
      }, delayTime);
    });
  }, [location.pathname]);

  // Auto-dismiss timer
  useEffect(() => {
    if (!isVisible || !showTimer) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Auto-dismiss after 15 seconds
          setIsVisible(false);
          setShowTimer(false);
          setTimeout(() => {
            // Store update info for later access
            if (updateInfo) {
              localStorage.setItem('pending-update', JSON.stringify(updateInfo));
            }
            setUpdateInfo(null);
          }, 300);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, showTimer, updateInfo]);

  const handleUpdate = async () => {
    if (!updateInfo) return;

    setIsUpdating(true);
    setShowTimer(false); // Stop the timer
    console.log('🚀 User initiated update');

    try {
      const success = await pwaUpdateManager.applyUpdate();
      if (!success) {
        console.log('ℹ️ Manual reload required');
        // Fallback: manual reload
        window.location.reload();
      }
    } catch (error) {
      console.error('❌ Update failed:', error);
      setIsUpdating(false);
      // Fallback: manual reload
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    console.log('👋 User dismissed update notification');
    setIsVisible(false);
    setShowTimer(false);
    
    // Store update info for later access
    if (updateInfo) {
      localStorage.setItem('pending-update', JSON.stringify(updateInfo));
    }
    
    setTimeout(() => setUpdateInfo(null), 300);
  };

  const handleRefresh = () => {
    console.log('🔄 User forced refresh');
    window.location.reload();
  };

  if (!updateInfo) return null;

  return (
    <UpdateBanner visible={isVisible}>
      <UpdateMessage>
        <UpdateIcon>🚀</UpdateIcon>
        <span>New version available!</span>
        {updateInfo.version && (
          <span className="version">v{updateInfo.version}</span>
        )}
        <span>
          {isInLearningSession() 
            ? 'Update when you finish this session, or continue later'
            : 'Boss battles & streak challenges now have progressive difficulty!'
          }
        </span>
        {showTimer && timeLeft > 0 && (
          <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
            Auto-dismiss in {timeLeft}s
          </span>
        )}
      </UpdateMessage>
      
      <UpdateActions>
        <UpdateButton 
          variant="secondary"
          onClick={handleDismiss}
          disabled={isUpdating}
        >
          {isInLearningSession() ? 'Continue Learning' : 'Later'}
        </UpdateButton>
        <UpdateButton 
          onClick={handleUpdate}
          disabled={isUpdating}
        >
          {isUpdating ? '🔄 Updating...' : '✨ Update Now'}
        </UpdateButton>
      </UpdateActions>
    </UpdateBanner>
  );
};