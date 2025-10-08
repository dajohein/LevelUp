import styled from '@emotion/styled';
import { css } from '@emotion/react';

// Base layout component
export const Layout = styled.div<{
  variant?: 'default' | 'centered' | 'sidebar';
}>`
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background-color: ${props => props.theme.colors.background};
  
  ${props => props.variant === 'centered' && css`
    align-items: center;
    justify-content: center;
  `}
  
  ${props => props.variant === 'sidebar' && css`
    flex-direction: row;
    
    @media (max-width: ${props.theme.breakpoints.tablet}) {
      flex-direction: column;
    }
  `}
`;

// Header/Navigation area
export const Header = styled.header<{
  fixed?: boolean;
  height?: string;
}>`
  background: linear-gradient(
    135deg,
    ${props => props.theme.colors.surface} 0%,
    ${props => props.theme.colors.background} 100%
  );
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 1000;
  
  ${props => props.fixed && css`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
  `}
  
  height: ${props => props.height || '70px'};
  display: flex;
  align-items: center;
  padding: 0 ${props => props.theme.spacing.lg};
  
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 0 ${props => props.theme.spacing.md};
    height: 60px;
  }
`;

// Main content area
export const Main = styled.main<{
  hasHeader?: boolean;
  hasFooter?: boolean;
  padding?: boolean;
}>`
  flex: 1;
  width: 100%;
  position: relative;
  
  ${props => props.hasHeader && css`
    padding-top: 70px;
    
    @media (max-width: ${props.theme.breakpoints.mobile}) {
      padding-top: 60px;
    }
  `}
  
  ${props => props.hasFooter && css`
    padding-bottom: 60px;
  `}
  
  ${props => props.padding && css`
    padding-left: ${props.theme.spacing.lg};
    padding-right: ${props.theme.spacing.lg};
    
    @media (max-width: ${props.theme.breakpoints.mobile}) {
      padding-left: ${props.theme.spacing.md};
      padding-right: ${props.theme.spacing.md};
    }
  `}
`;

// Footer area
export const Footer = styled.footer<{
  fixed?: boolean;
  variant?: 'default' | 'mobile-nav';
}>`
  background: ${props => props.theme.colors.surface};
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: ${props => props.theme.spacing.lg};
  
  ${props => props.fixed && css`
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1000;
  `}
  
  ${props => props.variant === 'mobile-nav' && css`
    padding: ${props.theme.spacing.sm} 0;
    background: rgba(30, 30, 30, 0.95);
    backdrop-filter: blur(10px);
    
    @media (min-width: ${props.theme.breakpoints.tablet}) {
      display: none;
    }
  `}
  
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
  }
`;

// Navigation bar
export const NavBar = styled.nav<{
  variant?: 'horizontal' | 'vertical';
  position?: 'top' | 'bottom' | 'left' | 'right';
}>`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.md};
  
  ${props => props.variant === 'vertical' && css`
    flex-direction: column;
    align-items: stretch;
  `}
  
  ${props => props.position === 'bottom' && css`
    justify-content: space-around;
    padding: ${props.theme.spacing.sm} ${props.theme.spacing.md};
  `}
`;

// Navigation item
export const NavItem = styled.a<{
  active?: boolean;
  variant?: 'default' | 'mobile';
}>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${props => props.theme.spacing.xs};
  padding: ${props => props.theme.spacing.sm};
  text-decoration: none;
  color: ${props => 
    props.active 
      ? props.theme.colors.primary 
      : props.theme.colors.textSecondary
  };
  transition: color 0.2s ease;
  border-radius: ${props => props.theme.borderRadius.md};
  min-height: ${props => props.theme.touchTarget.minimum};
  justify-content: center;
  
  &:hover {
    color: ${props => props.theme.colors.primary};
    background: rgba(255, 255, 255, 0.05);
  }
  
  ${props => props.variant === 'mobile' && css`
    min-width: 60px;
    font-size: 0.75rem;
    
    svg {
      font-size: 1.2rem;
    }
  `}
  
  ${props => props.active && css`
    background: rgba(76, 175, 80, 0.1);
    
    &:hover {
      background: rgba(76, 175, 80, 0.15);
    }
  `}
`;

// Breadcrumb navigation
export const Breadcrumb = styled.nav`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.xs};
  margin-bottom: ${props => props.theme.spacing.md};
  font-size: ${props => props.theme.typography.small.fontSize};
  
  a {
    color: ${props => props.theme.colors.textSecondary};
    text-decoration: none;
    
    &:hover {
      color: ${props => props.theme.colors.primary};
    }
  }
  
  &::after {
    content: '/';
    color: ${props => props.theme.colors.textSecondary};
    margin: 0 ${props => props.theme.spacing.xs};
  }
  
  &:last-child::after {
    display: none;
  }
`;

// Tab navigation
export const TabList = styled.div<{
  variant?: 'default' | 'pills' | 'underline';
}>`
  display: flex;
  border-bottom: ${props => 
    props.variant === 'underline' 
      ? `1px solid rgba(255, 255, 255, 0.1)` 
      : 'none'
  };
  gap: ${props => props.variant === 'pills' ? props.theme.spacing.xs : '0'};
  margin-bottom: ${props => props.theme.spacing.md};
`;

export const Tab = styled.button<{
  active?: boolean;
  variant?: 'default' | 'pills' | 'underline';
}>`
  background: none;
  border: none;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  color: ${props => 
    props.active 
      ? props.theme.colors.primary 
      : props.theme.colors.textSecondary
  };
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  
  ${props => props.variant === 'pills' && css`
    border-radius: ${props.theme.borderRadius.md};
    background: ${props.active 
      ? `rgba(76, 175, 80, 0.1)` 
      : 'transparent'
    };
    
    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }
  `}
  
  ${props => props.variant === 'underline' && css`
    border-bottom: 2px solid transparent;
    
    ${props.active && css`
      border-bottom-color: ${props.theme.colors.primary};
    `}
    
    &:hover {
      color: ${props.theme.colors.primary};
    }
  `}
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.3);
  }
`;

// Sidebar layout
export const Sidebar = styled.aside<{
  position?: 'left' | 'right';
  width?: string;
  collapsible?: boolean;
  collapsed?: boolean;
}>`
  flex: 0 0 ${props => props.width || '280px'};
  background: ${props => props.theme.colors.surface};
  border-right: ${props => 
    props.position === 'left' 
      ? '1px solid rgba(255, 255, 255, 0.1)' 
      : 'none'
  };
  border-left: ${props => 
    props.position === 'right' 
      ? '1px solid rgba(255, 255, 255, 0.1)' 
      : 'none'
  };
  padding: ${props => props.theme.spacing.lg};
  
  ${props => props.collapsible && props.collapsed && css`
    flex-basis: 60px;
    padding: ${props.theme.spacing.md};
  `}
  
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    position: fixed;
    top: 70px;
    left: ${props => props.position === 'left' ? '0' : 'auto'};
    right: ${props => props.position === 'right' ? '0' : 'auto'};
    bottom: 0;
    z-index: 999;
    transform: translateX(${props => 
      props.position === 'left' ? '-100%' : '100%'
    });
    transition: transform 0.3s ease;
    
    &.open {
      transform: translateX(0);
    }
  }
`;

// Mobile-specific layouts
export const MobileContainer = styled.div`
  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    display: none;
  }
`;

export const DesktopContainer = styled.div`
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    display: none;
  }
`;