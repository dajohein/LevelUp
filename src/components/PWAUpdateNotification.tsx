import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { useLocation } from 'react-router-dom';
import { pwaUpdateManager, UpdateInfo } from '../services/pwaUpdateManager';
import { reloadPage } from '../services/pageReload';

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
  transform: translateY(${props => (props.visible ? '0' : '-100%')});
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
  background: ${props =>
    props.variant === 'secondary' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.9)'};
  color: ${props => (props.variant === 'secondary' ? 'white' : '#1d4ed8')};
  border: 1px solid
    ${props => (props.variant === 'secondary' ? 'rgba(255, 255, 255, 0.3)' : 'transparent')};
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => (props.variant === 'secondary' ? 'rgba(255, 255, 255, 0.2)' : 'white')};
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
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.6;
    }
  }
`;

/**
 * Routes where an answer may be in progress. The update banner waits until the learner leaves them,
 * so an update is never offered (let alone applied) in the middle of a quiz.
 */
const LEARNING_ROUTES = ['/game/', '/challenge/', '/practice/', '/boss/', '/streak/'];
export const isLearningRoute = (pathname: string): boolean =>
  LEARNING_ROUTES.some(route => pathname.includes(route));

export const PWAUpdateNotification: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const location = useLocation();

  // Subscribe once and unsubscribe on unmount. (It used to re-subscribe on every route change and
  // never unsubscribed, so callbacks piled up.) The manager replays an update found before this
  // component mounted, so a fast update announcement is not lost.
  useEffect(() => pwaUpdateManager.onUpdateAvailable(info => setUpdateInfo(info)), []);

  const visible = updateInfo !== null && !dismissed && !isLearningRoute(location.pathname);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const applied = await pwaUpdateManager.applyUpdate();
      if (!applied) {
        // Nothing could be applied through the worker: a plain reload still loads the new version
        reloadPage();
      }
    } catch (error) {
      console.error('❌ Update failed:', error);
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    // Settings shows a pending update the user chose to postpone
    try {
      if (updateInfo) localStorage.setItem('pending-update', JSON.stringify(updateInfo));
    } catch {
      /* storage unavailable: the banner is simply gone for this visit */
    }
  };

  // Not rendered while hidden: an off-screen banner would still be reachable by keyboard focus
  if (!visible) return null;

  return (
    <UpdateBanner visible role="status" aria-live="polite">
      <UpdateMessage>
        <UpdateIcon aria-hidden="true">🚀</UpdateIcon>
        <span>A new version of LevelUp is ready.</span>
        {updateInfo?.version && updateInfo.version !== 'unknown' && (
          <span className="version">v{updateInfo.version}</span>
        )}
        <span>Reload to get it.</span>
      </UpdateMessage>

      <UpdateActions>
        <UpdateButton variant="secondary" onClick={handleDismiss} disabled={isUpdating}>
          Later
        </UpdateButton>
        <UpdateButton onClick={handleUpdate} disabled={isUpdating}>
          {isUpdating ? '🔄 Updating...' : '✨ Update now'}
        </UpdateButton>
      </UpdateActions>
    </UpdateBanner>
  );
};
