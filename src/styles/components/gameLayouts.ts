import styled from '@emotion/styled';
import { css } from '@emotion/react';

// Game Container - main game wrapper matching Game.tsx
export const GameContainer = styled.div<{ fullHeight?: boolean }>`
  display: flex;
  flex-direction: column;
  ${props => props.fullHeight && css`
    min-height: 100vh;
    height: 100vh;
  `}
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
`;

// Game Content Container - main content area for quiz components
export const GameContentContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  width: 100%;
  max-width: 800px;
  gap: ${props => props.theme.spacing.lg};
  min-height: 300px;

  @media (max-height: 600px) {
    min-height: 200px;
    gap: ${props => props.theme.spacing.md};
  }

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    gap: ${props => props.theme.spacing.md};
    min-height: 250px;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    gap: ${props => props.theme.spacing.sm};
    min-height: 200px;
    padding: 0 ${props => props.theme.spacing.xs};
  }

  @media (max-height: 500px) {
    min-height: 150px;
    gap: ${props => props.theme.spacing.xs};
  }
`;

// Skip Button Container - positioned at bottom of game area
export const SkipButtonContainer = styled.div`
  margin-top: ${props => props.theme.spacing.lg};
  padding: ${props => props.theme.spacing.md} 0;
  flex-shrink: 0; /* Ensure skip button is always visible */

  @media (max-height: 600px) {
    margin-top: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.sm} 0;
  }
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
  ${props => props.hasNavigation && css`
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
  justify-content: ${props => props.centered ? 'center' : 'space-between'};
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
      case 'sm': return props.theme.spacing.sm;
      case 'md': return props.theme.spacing.md;
      case 'xl': return props.theme.spacing.xl;
      default: return props.theme.spacing.lg;
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
  
  ${props => props.wrap && css`
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
  
  ${props => props.hasStatusBar && css`
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
  `}
  
  /* iOS safe area handling */
  @supports (padding: max(0px)) {
    padding-left: max(${props => props.theme.spacing.md}, env(safe-area-inset-left));
    padding-right: max(${props => props.theme.spacing.md}, env(safe-area-inset-right));
  }
`;

// Game Mode Containers - themed containers for different game modes
export const QuickDashContainer = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: 2px solid #00d4aa;
  border-radius: 16px;
  padding: ${props => props.theme.spacing.lg};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(45deg, transparent, rgba(0, 212, 170, 0.1), transparent);
    animation: lightning 3s linear infinite;
  }

  @keyframes lightning {
    0% {
      transform: translateX(-100%) translateY(-100%) rotate(45deg);
    }
    100% {
      transform: translateX(100%) translateY(100%) rotate(45deg);
    }
  }
`;

export const DeepDiveContainer = styled.div`
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  border: 2px solid #0099cc;
  border-radius: 16px;
  padding: ${props => props.theme.spacing.lg};
  position: relative;
  box-shadow: 0 8px 32px rgba(79, 172, 254, 0.2);

  &::after {
    content: '🧠';
    position: absolute;
    top: 10px;
    right: 10px;
    font-size: 2rem;
    opacity: 0.3;
  }
`;

export const StreakChallengeContainer = styled.div<{ streak: number }>`
  background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
  border: 2px solid #ff6b6b;
  border-radius: 16px;
  padding: ${props => props.theme.spacing.lg};
  position: relative;
  animation: ${props => (props.streak > 5 ? 'fireGlow 1s ease-in-out infinite alternate' : 'none')};

  &::before {
    content: '🔥';
    position: absolute;
    top: 10px;
    right: 10px;
    font-size: 2rem;
    animation: ${props => (props.streak > 0 ? 'flameDance 2s ease-in-out infinite' : 'none')};
  }

  @keyframes fireGlow {
    0% {
      box-shadow: 0 0 20px rgba(255, 107, 107, 0.3);
    }
    100% {
      box-shadow: 0 0 40px rgba(255, 107, 107, 0.6);
    }
  }

  @keyframes flameDance {
    0%,
    100% {
      transform: rotate(-5deg) scale(1);
    }
    50% {
      transform: rotate(5deg) scale(1.1);
    }
  }
`;

export const PrecisionModeContainer = styled.div`
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
  border: 2px solid #00b4db;
  border-radius: 16px;
  padding: ${props => props.theme.spacing.lg};
  position: relative;

  &::before {
    content: '🎯';
    position: absolute;
    top: 50%;
    left: 10px;
    transform: translateY(-50%);
    font-size: 1.5rem;
    opacity: 0.4;
  }

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    right: 10px;
    transform: translateY(-50%);
    width: 30px;
    height: 30px;
    border: 2px solid #00b4db;
    border-radius: 50%;
    opacity: 0.3;
  }
`;

export const BossBattleContainer = styled.div<{ damage?: boolean }>`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f1e 100%);
  border: 3px solid #8b0000;
  border-radius: 20px;
  padding: ${props => props.theme.spacing.lg};
  position: relative;
  animation: ${props => (props.damage ? 'bossShake 0.5s ease-in-out' : 'none')};
  box-shadow: 0 0 30px rgba(139, 0, 0, 0.4), inset 0 0 50px rgba(0, 0, 0, 0.6);
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(
      ellipse at center,
      transparent 0%,
      rgba(139, 0, 0, 0.1) 50%,
      rgba(0, 0, 0, 0.4) 100%
    );
    pointer-events: none;
  }

  &::after {
    content: '⚔️';
    position: absolute;
    top: 15px;
    right: 20px;
    font-size: 2rem;
    animation: swordGlow 3s ease-in-out infinite;
    z-index: 1;
  }

  @keyframes bossShake {
    0%,
    100% {
      transform: translateX(0);
    }
    10% {
      transform: translateX(-5px) rotate(-0.5deg);
    }
    20% {
      transform: translateX(5px) rotate(0.5deg);
    }
    30% {
      transform: translateX(-3px) rotate(-0.3deg);
    }
    40% {
      transform: translateX(3px) rotate(0.3deg);
    }
    50% {
      transform: translateX(-2px);
    }
    60% {
      transform: translateX(2px);
    }
    70% {
      transform: translateX(-1px);
    }
    80% {
      transform: translateX(1px);
    }
    90% {
      transform: translateX(0);
    }
  }

  @keyframes swordGlow {
    0%,
    100% {
      filter: drop-shadow(0 0 5px #8b0000);
      transform: rotate(-10deg);
    }
    50% {
      filter: drop-shadow(0 0 20px #dc143c);
      transform: rotate(10deg);
    }
  }
`;