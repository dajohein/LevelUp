import React from 'react';
import styled from '@emotion/styled';
import { useNavigate, useLocation } from 'react-router-dom';
import { useViewport } from '../../hooks/useViewport';

const BottomNavContainer = styled.nav`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: linear-gradient(
    135deg,
    ${props => props.theme.colors.surface} 0%,
    ${props => props.theme.colors.background} 100%
  );
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(76, 175, 80, 0.2);
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0 ${props => props.theme.spacing.sm};
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  
  /* Safe area support */
  padding-bottom: env(safe-area-inset-bottom);
  height: calc(60px + env(safe-area-inset-bottom));

  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    display: none;
  }
`;

const NavItem = styled.button<{ isActive: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: ${props => props.theme.spacing.xs};
  border-radius: ${props => props.theme.borderRadius.md};
  transition: all 0.2s ease;
  min-width: 50px;
  min-height: ${props => props.theme.touchTarget.minimum};
  position: relative;

  color: ${props => props.isActive 
    ? props.theme.colors.primary 
    : props.theme.colors.textSecondary
  };

  &:hover {
    background: rgba(76, 175, 80, 0.1);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  ${props => props.isActive && `
    background: rgba(76, 175, 80, 0.1);
    
    &::before {
      content: '';
      position: absolute;
      top: -1px;
      left: 50%;
      transform: translateX(-50%);
      width: 20px;
      height: 3px;
      background: ${props.theme.colors.primary};
      border-radius: 0 0 3px 3px;
    }
  `}
`;

const NavIcon = styled.span<{ isActive: boolean }>`
  font-size: 1.2rem;
  transition: all 0.2s ease;
  
  ${props => props.isActive && `
    transform: scale(1.1);
  `}
`;

const NavLabel = styled.span<{ isActive: boolean }>`
  font-size: 0.7rem;
  font-weight: ${props => props.isActive ? '600' : '400'};
  white-space: nowrap;
  transition: all 0.2s ease;
`;

const NotificationBadge = styled.div`
  position: absolute;
  top: 2px;
  right: 8px;
  width: 8px;
  height: 8px;
  background: ${props => props.theme.colors.error};
  border-radius: 50%;
  border: 2px solid ${props => props.theme.colors.surface};
`;

interface BottomNavItem {
  icon: string;
  label: string;
  path: string;
  matchPaths?: string[];
  badge?: boolean;
}

interface MobileBottomNavigationProps {
  items?: BottomNavItem[];
}

const defaultItems: BottomNavItem[] = [
  {
    icon: '🏠',
    label: 'Home',
    path: '/',
    matchPaths: ['/'],
  },
  {
    icon: '📚',
    label: 'Learn',
    path: '/learn',
    matchPaths: ['/language'],
  },
  {
    icon: '🎯',
    label: 'Practice',
    path: '/practice',
    matchPaths: ['/sessions', '/game'],
  },
  {
    icon: '�',
    label: 'Profile',
    path: '/profile',
    matchPaths: ['/profile'],
  },
  {
    icon: '⚙️',
    label: 'More',
    path: '/settings',
    matchPaths: ['/settings'],
  },
];

export const MobileBottomNavigation: React.FC<MobileBottomNavigationProps> = ({
  items = defaultItems,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useViewport();

  if (!isMobile) {
    return null;
  }

  const isItemActive = (item: BottomNavItem): boolean => {
    const currentPath = location.pathname;
    
    // Exact match first
    if (currentPath === item.path) {
      return true;
    }
    
    // Check match paths
    if (item.matchPaths) {
      return item.matchPaths.some(matchPath => {
        if (matchPath === '/') {
          return currentPath === '/';
        }
        return currentPath.startsWith(matchPath);
      });
    }
    
    return false;
  };

  const handleNavigation = (item: BottomNavItem) => {
    // Smart navigation logic
    if (item.path === '/learn') {
      // Go to language selection to choose what to learn
      navigate('/');
    } else if (item.path === '/practice') {
      // Look for available sessions or go to language selection
      const currentPath = location.pathname;
      if (currentPath.includes('/language/')) {
        // Extract language code and go to sessions
        const languageMatch = currentPath.match(/\/language\/([^\/]+)/);
        if (languageMatch) {
          navigate(`/sessions/${languageMatch[1]}`);
        } else {
          navigate('/');
        }
      } else {
        navigate('/');
      }
    } else if (item.path === '/progress') {
      navigate('/profile');
    } else {
      navigate(item.path);
    }
  };

  return (
    <BottomNavContainer>
      {items.map((item, index) => {
        const isActive = isItemActive(item);
        return (
          <NavItem
            key={index}
            isActive={isActive}
            onClick={() => handleNavigation(item)}
          >
            <NavIcon isActive={isActive}>{item.icon}</NavIcon>
            <NavLabel isActive={isActive}>{item.label}</NavLabel>
            {item.badge && <NotificationBadge />}
          </NavItem>
        );
      })}
    </BottomNavContainer>
  );
};