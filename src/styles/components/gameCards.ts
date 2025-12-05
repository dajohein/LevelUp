import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { Card } from './cards';
import { hover } from './animations';

// Module Card - matches ModuleOverview.tsx
export const ModuleCard = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: 16px;
  padding: ${props => props.theme.spacing.lg};
  text-align: left;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  border: 2px solid transparent;
  display: flex;
  gap: ${props => props.theme.spacing.md};
  min-height: 200px;
  width: 100%;
  position: relative;
  overflow: hidden;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.lg};
    flex-direction: column;
    min-height: auto;
    gap: ${props => props.theme.spacing.md};
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #4caf50, #81c784);
  }

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }
`;

// Word Card - matches LanguageOverview.tsx
export const WordCard = styled.div<{ masteryLevel: number }>`
  background-color: ${props => props.theme.colors.surface};
  padding: ${props => props.theme.spacing.md};
  border-radius: 8px;
  border-left: 4px solid
    ${props => {
      if (props.masteryLevel >= 80) return props.theme.colors.success;
      if (props.masteryLevel >= 50) return props.theme.colors.primary;
      if (props.masteryLevel >= 20) return '#ff9500'; // orange
      return props.theme.colors.error;
    }};
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

// Language Card - enhanced version matches LanguagesOverview.tsx
export const LanguageCard = styled(Card)<{ selected?: boolean; progress?: number }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-width: 200px;
  max-width: 250px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  border: 2px solid transparent;

  ${props =>
    props.selected &&
    css`
      border-color: ${props.theme.colors.primary};
      transform: scale(1.02);
      box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
    `}

  ${props =>
    !props.selected &&
    css`
      ${hover.scale}
    `}
  
  /* Progress indicator */
  ${props =>
    props.progress !== undefined &&
    css`
      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        height: 4px;
        width: ${props.progress}%;
        background: ${props.progress > 0 ? '#4caf50' : 'rgba(255, 255, 255, 0.3)'};
        transition: width 0.3s ease;
      }
    `}
  
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    min-width: 160px;
    max-width: 200px;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    min-width: 140px;
    max-width: 180px;
  }
`;

// Analytics Card - matches ModuleOverview.tsx AnalyticCard
export const AnalyticCard = styled(Card)`
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05));
  border: 1px solid rgba(59, 130, 246, 0.2);
  padding: ${props => props.theme.spacing.lg};
  text-align: center;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(59, 130, 246, 0.4);
    box-shadow: 0 8px 24px rgba(59, 130, 246, 0.2);
  }
`;

// Activity Card - matches ModuleOverview.tsx ActivityCard
export const ActivityCard = styled(Card)`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.sm};
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

// Recommendation Card - matches ModuleOverview.tsx RecommendationCard
export const RecommendationCard = styled(Card)`
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(76, 175, 80, 0.05));
  border: 2px solid rgba(76, 175, 80, 0.3);
  padding: ${props => props.theme.spacing.lg};
  position: relative;
  overflow: hidden;

  &::before {
    content: '💡';
    position: absolute;
    top: ${props => props.theme.spacing.md};
    right: ${props => props.theme.spacing.md};
    font-size: 1.5rem;
    opacity: 0.7;
  }

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(76, 175, 80, 0.5);
    box-shadow: 0 8px 24px rgba(76, 175, 80, 0.2);
  }
`;

// Section Card - matches SettingsPage.tsx SectionCard
export const SectionCard = styled(Card)`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${props => props.theme.borderRadius.lg};
  padding: ${props => props.theme.spacing.xl};
  margin-bottom: ${props => props.theme.spacing.lg};

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
  }
`;

// Feedback Card - matches feedback components
export const FeedbackCard = styled(Card)<{ isCorrect: boolean }>`
  background: ${props =>
    props.isCorrect
      ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(76, 175, 80, 0.1))'
      : 'linear-gradient(135deg, rgba(244, 67, 54, 0.2), rgba(244, 67, 54, 0.1))'};
  border: 2px solid
    ${props => (props.isCorrect ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)')};
  padding: ${props => props.theme.spacing.lg};
  text-align: center;
  animation: feedbackPulse 0.3s ease-out;

  @keyframes feedbackPulse {
    0% {
      transform: scale(0.95);
      opacity: 0.8;
    }
    50% {
      transform: scale(1.05);
      opacity: 1;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
`;

// Skeleton Card for loading states
export const SkeletonCard = styled(Card)<{ height?: string }>`
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05) 25%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
  height: ${props => props.height || '200px'};

  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
`;

// Card Grid variations for specific layouts
export const ModuleGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: ${props => props.theme.spacing.lg};
  margin: ${props => props.theme.spacing.xl} 0;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
    gap: ${props => props.theme.spacing.md};
  }
`;

export const LanguageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${props => props.theme.spacing.lg};
  padding: ${props => props.theme.spacing.lg} 0;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: ${props => props.theme.spacing.md};
  }
`;

export const AnalyticsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.lg};

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

// ===== MODULE CARD CHILD COMPONENTS =====
// Matches ModuleOverview.tsx structure

export const ModuleHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.md};
`;

export const ModuleIcon = styled.span`
  font-size: 2rem;
`;

export const ModuleInfo = styled.div`
  min-width: 0;
`;

export const ModuleName = styled.h3`
  color: ${props => props.theme.colors.text};
  margin: 0;
  font-size: 1.3rem;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1.3;
  }
`;

export const ModuleDescription = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  margin: ${props => props.theme.spacing.xs} 0;
  font-size: 0.9rem;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1rem;
    margin: ${props => props.theme.spacing.sm} 0 ${props => props.theme.spacing.md} 0;
    line-height: 1.4;
  }
`;

export const ModuleContent = styled.div`
  margin-bottom: ${props => props.theme.spacing.md};
`;

export const ModuleActions = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.sm};
  justify-content: space-between;
  align-items: center;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
    align-items: stretch;
  }
`;

// ===== WORD CARD CHILD COMPONENTS =====
// Matches LanguageOverview.tsx structure

export const WordTerm = styled.div`
  font-weight: 600;
  font-size: 1.1rem;
  color: ${props => props.theme.colors.text};
  margin-bottom: ${props => props.theme.spacing.xs};
`;

export const WordDefinition = styled.div`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.9rem;
`;

export const MasteryInfo = styled.div`
  margin-top: ${props => props.theme.spacing.sm};
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
`;

export const MasteryBar = styled.div<{ level: number }>`
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  overflow: hidden;

  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${props => props.level}%;
    background: ${props => {
      if (props.level >= 80) return props.theme.colors.success;
      if (props.level >= 50) return props.theme.colors.primary;
      if (props.level >= 20) return '#ff9500';
      return '#ff4444';
    }};
    border-radius: 2px;
    transition: width 0.3s ease;
  }
`;

export const MasteryLevel = styled.span<{ level: number }>`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${props => {
    if (props.level >= 80) return props.theme.colors.success;
    if (props.level >= 50) return props.theme.colors.primary;
    if (props.level >= 20) return '#ff9500';
    return '#ff4444';
  }};
`;

// ===== LANGUAGE CARD CHILD COMPONENTS =====
// Matches UserProfilePage.tsx and LanguagesOverview.tsx structure

export const LanguageHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  margin-bottom: ${props => props.theme.spacing.sm};
`;

export const LanguageFlag = styled.span`
  font-size: 1.2rem;
`;

export const LanguageInfo = styled.div`
  min-width: 0;
`;

export const LanguageName = styled.h3`
  color: ${props => props.theme.colors.text};
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
`;

export const LanguageFrom = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  margin: 2px 0 0 0;
  font-size: 0.8rem;
`;
