import React from 'react';
import styled from '@emotion/styled';
import { Outlet } from 'react-router-dom';
import { MobileBottomNavigation } from './mobile/MobileBottomNavigation';
import { useViewport } from '../hooks/useViewport';

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
  
  ${props => props.hasMobileBottomNav && `
    padding-bottom: calc(60px + env(safe-area-inset-bottom));
  `}
`;

interface AppLayoutProps {
  children?: React.ReactNode;
  showBottomNav?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ 
  children, 
  showBottomNav = true 
}) => {
  const { isMobile } = useViewport();
  const shouldShowBottomNav = showBottomNav && isMobile;

  return (
    <LayoutContainer>
      <MainContent hasMobileBottomNav={shouldShowBottomNav}>
        {children || <Outlet />}
      </MainContent>
      {shouldShowBottomNav && <MobileBottomNavigation />}
    </LayoutContainer>
  );
};