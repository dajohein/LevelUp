import styled from '@emotion/styled';
import { css } from '@emotion/react';

// Game Container - main game wrapper matching Game.tsx
export const GameContainer = styled.div<{ fullHeight?: boolean }>`
  display: flex;
  flex-direction: column;
  ${props =>
    props.fullHeight &&
    css`
      min-height: 100vh;
      height: 100vh;
    `}
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
`;

// Session Layout - matches SessionCompletion.tsx
export const SessionLayout = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${props => props.theme.spacing.xl};
  max-width: 600px;
  margin: 0 auto;
  text-align: center;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.lg};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
  }
`;

// Analytics Layout - matches SessionAnalytics.tsx and LanguageOverview.tsx
export const AnalyticsLayout = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${props => props.theme.spacing.lg};

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.md};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.sm};
  }
`;

// Module Layout - matches ModuleOverview.tsx
export const ModuleLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.lg};
  max-width: 800px;
  margin: 0 auto;
  padding: ${props => props.theme.spacing.lg};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
    gap: ${props => props.theme.spacing.md};
  }
`;

// Language Overview Layout - matches LanguageOverview.tsx
export const LanguageOverviewLayout = styled.div`
  padding: ${props => props.theme.spacing.lg};
  max-width: 1200px;
  margin: 0 auto;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.md};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.sm};
  }
`;

// Settings Layout - matches SettingsPage.tsx
export const SettingsLayout = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: ${props => props.theme.spacing.lg};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
  }
`;

// Profile Layout - matches UserProfilePage.tsx
export const ProfileLayout = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: ${props => props.theme.spacing.lg};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
  }
`;

// Content Wrapper - matches AppLayout.tsx
export const ContentWrapper = styled.div<{ hasNavigation?: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  ${props =>
    props.hasNavigation &&
    css`
      padding-bottom: 80px; // Account for bottom navigation
    `}
  overflow-y: auto;
`;

// Navigation Layout - matches Navigation.tsx
export const NavigationLayout = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 1000;
`;

// Header Layout - common header pattern
export const HeaderLayout = styled.div<{ centered?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: ${props => (props.centered ? 'center' : 'space-between')};
  padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  }
`;

// Section Layout - for dividing content into sections
export const SectionLayout = styled.section<{ spacing?: 'sm' | 'md' | 'lg' | 'xl' }>`
  margin-bottom: ${props => {
    switch (props.spacing || 'lg') {
      case 'sm':
        return props.theme.spacing.sm;
      case 'md':
        return props.theme.spacing.md;
      case 'xl':
        return props.theme.spacing.xl;
      default:
        return props.theme.spacing.lg;
    }
  }};

  &:last-child {
    margin-bottom: 0;
  }
`;

// Grid Layout - flexible grid system
export const GridLayout = styled.div<{
  columns?: number;
  gap?: string;
  minColumnWidth?: string;
  responsive?: boolean;
}>`
  display: grid;
  gap: ${props => props.gap || props.theme.spacing.md};

  ${props => {
    if (props.responsive) {
      return css`
        grid-template-columns: repeat(auto-fit, minmax(${props.minColumnWidth || '250px'}, 1fr));

        @media (max-width: ${props.theme.breakpoints.tablet}) {
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        }

        @media (max-width: ${props.theme.breakpoints.mobile}) {
          grid-template-columns: 1fr;
        }
      `;
    } else {
      return css`
        grid-template-columns: repeat(${props.columns || 1}, 1fr);

        @media (max-width: ${props.theme.breakpoints.mobile}) {
          grid-template-columns: 1fr;
        }
      `;
    }
  }}
`;

// Flex Layout - flexible flex system
export const FlexLayout = styled.div<{
  direction?: 'row' | 'column';
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  gap?: string;
  wrap?: boolean;
}>`
  display: flex;
  flex-direction: ${props => props.direction || 'row'};
  align-items: ${props => props.align || 'stretch'};
  justify-content: ${props => props.justify || 'flex-start'};
  gap: ${props => props.gap || props.theme.spacing.md};

  ${props =>
    props.wrap &&
    css`
      flex-wrap: wrap;
    `}

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    flex-direction: column;
    align-items: stretch;
  }
`;

// Centered Layout - for centered content
export const CenteredLayout = styled.div<{ maxWidth?: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  max-width: ${props => props.maxWidth || '600px'};
  margin: 0 auto;
  padding: ${props => props.theme.spacing.xl};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.lg};
  }
`;

// Sidebar Layout - for pages with sidebars
export const SidebarLayout = styled.div<{ sidebarWidth?: string }>`
  display: grid;
  grid-template-columns: ${props => props.sidebarWidth || '250px'} 1fr;
  gap: ${props => props.theme.spacing.lg};
  min-height: 100vh;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
    gap: ${props => props.theme.spacing.md};
  }
`;

// Sidebar Content
export const SidebarContent = styled.aside`
  background: rgba(255, 255, 255, 0.05);
  border-radius: ${props => props.theme.borderRadius.lg};
  padding: ${props => props.theme.spacing.lg};
  height: fit-content;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    order: 2;
  }
`;

// Main Content
export const MainContent = styled.main`
  min-width: 0; // Prevents flex overflow

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    order: 1;
  }
`;

// Scrollable Layout - for content that needs scrolling
export const ScrollableLayout = styled.div<{ maxHeight?: string }>`
  max-height: ${props => props.maxHeight || '400px'};
  overflow-y: auto;
  padding-right: ${props => props.theme.spacing.sm};

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;

    &:hover {
      background: rgba(255, 255, 255, 0.5);
    }
  }
`;

// Quiz Layout - specific for quiz components
export const QuizLayout = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: ${props => props.theme.spacing.lg};
  text-align: center;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
  }
`;

// Mobile-First Layout - optimized for mobile
export const MobileFirstLayout = styled.div`
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;

  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    max-width: 768px;
    margin: 0 auto;
  }

  @media (min-width: ${props => props.theme.breakpoints.desktop}) {
    max-width: 1024px;
  }
`;

// PWA Layout - for Progressive Web App specific layouts
export const PWALayout = styled.div<{ hasStatusBar?: boolean }>`
  min-height: 100vh;
  display: flex;
  flex-direction: column;

  ${props =>
    props.hasStatusBar &&
    css`
      padding-top: env(safe-area-inset-top);
      padding-bottom: env(safe-area-inset-bottom);
    `}

  /* iOS safe area handling */
  @supports (padding: max(0px)) {
    padding-left: max(${props => props.theme.spacing.md}, env(safe-area-inset-left));
    padding-right: max(${props => props.theme.spacing.md}, env(safe-area-inset-right));
  }
`;
