import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { Outlet } from 'react-router-dom';
import { MobileBottomNavigation } from './mobile/MobileBottomNavigation';
import { StorageDebug } from './debug/StorageDebug';
import { PWAUpdateNotification } from './PWAUpdateNotification';
import { useViewport } from '../hooks/useViewport';
import { usePerformanceAnalyzer } from '../hooks/usePerformanceAnalyzer';

const LayoutContainer = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background-color: ${props => props.theme.colors.background};
`;

const MainContent = styled.main<{ hasMobileBottomNav: boolean }>`
  flex: 1;
  width: 100%;
  position: relative;

  ${props =>
    props.hasMobileBottomNav &&
    `
    padding-bottom: calc(60px + env(safe-area-inset-bottom));
  `}
`;

interface AppLayoutProps {
  children?: React.ReactNode;
  showBottomNav?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, showBottomNav = true }) => {
  const { isMobile } = useViewport();
  const shouldShowBottomNav = showBottomNav && isMobile;
  const [showStorageDebug, setShowStorageDebug] = useState(false);
  
  // Ensure performance analyzer cleanup on unmount
  usePerformanceAnalyzer();

  // Toggle storage debug with Ctrl+Shift+S
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        setShowStorageDebug(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <LayoutContainer>
      {/* PWA Update notification - always on top */}
      <PWAUpdateNotification />

      <MainContent hasMobileBottomNav={shouldShowBottomNav}>{children || <Outlet />}</MainContent>
      {shouldShowBottomNav && <MobileBottomNavigation />}
      {process.env.NODE_ENV === 'development' && (
        <StorageDebug isVisible={showStorageDebug} onClose={() => setShowStorageDebug(false)} />
      )}
    </LayoutContainer>
  );
};
