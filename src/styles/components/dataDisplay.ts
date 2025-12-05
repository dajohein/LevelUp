import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { transitions } from './animations';

// Stat Row - matches ModuleOverview.tsx StatRow
export const StatRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${props => props.theme.spacing.xs};
`;

// Stat Label - matches ModuleOverview.tsx StatLabel
export const StatLabel = styled.span`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

// Stat Value - matches ModuleOverview.tsx StatValue
export const StatValue = styled.span`
  color: ${props => props.theme.colors.text};
  font-weight: 600;
  font-size: 0.9rem;
`;

// Stats Container - matches ModuleOverview.tsx StatsContainer
export const StatsContainer = styled.div`
  padding: ${props => props.theme.spacing.md};
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  margin: ${props => props.theme.spacing.md} 0;
`;

// Progress Stats Grid - matches UserProfilePage.tsx ProgressStats
export const ProgressStats = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.md};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
    gap: ${props => props.theme.spacing.sm};
  }
`;

// Score Display - matches ModuleOverview.tsx ScoreDisplay
export const ScoreDisplay = styled.div`
  text-align: center;
  padding: ${props => props.theme.spacing.md};
  background: rgba(59, 130, 246, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  min-width: 80px;
`;

// Score Value - matches ModuleOverview.tsx ScoreValue
export const ScoreValue = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: ${props => props.theme.colors.primary};
  margin-bottom: 2px;
`;

// Score Label - matches ModuleOverview.tsx ScoreLabel
export const ScoreLabel = styled.div`
  font-size: 0.7rem;
  color: ${props => props.theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

// Data Grid for tabular data
export const DataGrid = styled.div<{ columns?: number; gap?: string }>`
  display: grid;
  grid-template-columns: ${props =>
    props.columns ? `repeat(${props.columns}, 1fr)` : 'repeat(auto-fit, minmax(200px, 1fr))'};
  gap: ${props => props.gap || props.theme.spacing.md};
  margin: ${props => props.theme.spacing.lg} 0;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: ${props => props.theme.spacing.sm};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }
`;

// Data Cell for grid items
export const DataCell = styled.div<{ highlight?: boolean }>`
  padding: ${props => props.theme.spacing.md};
  background: ${props =>
    props.highlight ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
  border: 1px solid
    ${props => (props.highlight ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)')};
  border-radius: ${props => props.theme.borderRadius.md};
  transition: ${transitions.default};

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
  }
`;

// Key-Value Pair display
export const KeyValuePair = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${props => props.theme.spacing.sm} 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  &:last-child {
    border-bottom: none;
  }
`;

export const KeyValueKey = styled.span`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.9rem;
`;

export const KeyValueValue = styled.span`
  color: ${props => props.theme.colors.text};
  font-weight: 600;
  font-size: 0.9rem;
`;

// Analytics Summary Card
export const AnalyticsSummary = styled.div`
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: ${props => props.theme.borderRadius.lg};
  padding: ${props => props.theme.spacing.lg};
  margin-bottom: ${props => props.theme.spacing.lg};
`;

// Progress Metrics Grid
export const ProgressMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: ${props => props.theme.spacing.md};
  margin: ${props => props.theme.spacing.lg} 0;
`;

// Metric Item
export const MetricItem = styled.div<{ color?: string }>`
  text-align: center;
  padding: ${props => props.theme.spacing.md};
  background: rgba(255, 255, 255, 0.05);
  border-radius: ${props => props.theme.borderRadius.md};
  border-left: 4px solid ${props => props.color || props.theme.colors.primary};
  transition: ${transitions.default};

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateY(-1px);
  }
`;

// Metric Value
export const MetricValue = styled.div<{ size?: 'sm' | 'md' | 'lg' }>`
  font-weight: bold;
  color: ${props => props.theme.colors.primary};
  margin-bottom: 4px;

  ${props => {
    switch (props.size || 'md') {
      case 'sm':
        return css`
          font-size: 1.2rem;
        `;
      case 'lg':
        return css`
          font-size: 2rem;
        `;
      default:
        return css`
          font-size: 1.5rem;
        `;
    }
  }}
`;

// Metric Label
export const MetricLabel = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

// Weekly Progress Item - matches ModuleOverview.tsx
export const WeeklyProgressItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.md};
  padding: ${props => props.theme.spacing.sm};
  margin-bottom: ${props => props.theme.spacing.xs};
  background: rgba(255, 255, 255, 0.03);
  border-radius: ${props => props.theme.borderRadius.md};
  transition: ${transitions.default};

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

// Progress Stats - matches ModuleOverview.tsx
export const ProgressStatsLabel = styled.span`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.8rem;
  min-width: 60px;
`;

export const ProgressStatsValue = styled.span`
  color: ${props => props.theme.colors.text};
  font-weight: 600;
  font-size: 0.9rem;
`;

// Table-like data display
export const DataTable = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: ${props => props.theme.borderRadius.lg};
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

export const DataTableHeader = styled.div`
  background: rgba(255, 255, 255, 0.1);
  padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

export const DataTableRow = styled.div<{ interactive?: boolean }>`
  padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: ${transitions.default};

  ${props =>
    props.interactive &&
    css`
      cursor: pointer;

      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }
    `}

  &:last-child {
    border-bottom: none;
  }
`;

// Quick Stats Row
export const QuickStats = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  margin-bottom: ${props => props.theme.spacing.xs};
  color: ${props => props.theme.colors.text};

  span:first-of-type {
    font-size: 1.2rem;
  }

  span:last-child {
    font-weight: 500;
  }
`;

// Trend Indicator
export const TrendIndicator = styled.span<{ trend: 'up' | 'down' | 'neutral' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  font-weight: 600;

  ${props => {
    switch (props.trend) {
      case 'up':
        return css`
          color: #4caf50;
          &::before {
            content: '↗';
          }
        `;
      case 'down':
        return css`
          color: #f44336;
          &::before {
            content: '↘';
          }
        `;
      default:
        return css`
          color: ${props.theme.colors.textSecondary};
          &::before {
            content: '→';
          }
        `;
    }
  }}
`;

// ===== MISSING ANALYTICS COMPONENTS =====
// Matches ModuleOverview.tsx analytics section

export const AnalyticValue = styled.div`
  font-size: 1.4rem;
  font-weight: bold;
  color: ${props => props.theme.colors.primary};
  margin-bottom: ${props => props.theme.spacing.xs};
`;

export const AnalyticLabel = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const WeekLabel = styled.span`
  min-width: 50px;
  font-size: 0.75rem;
  color: ${props => props.theme.colors.textSecondary};
  font-weight: 500;
`;

export const SectionHeader = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: ${props => props.theme.spacing.md};
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
`;

// Progress Bar specifically for weekly/analytics data
export const AnalyticsProgressBar = styled.div<{ width: number; color: string }>`
  height: 8px;
  background: ${props => props.color};
  border-radius: 4px;
  width: ${props => Math.max(20, props.width)}%;
  max-width: 80px;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.2) 50%,
      transparent 100%
    );
    border-radius: 4px;
  }
`;

// Analytics Title - matches ModuleOverview.tsx
export const AnalyticsTitle = styled.h3`
  color: ${props => props.theme.colors.text};
  font-size: 1.2rem;
  margin-bottom: ${props => props.theme.spacing.md};
  font-weight: 600;
`;

// Analytics Sub Section - matches ModuleOverview.tsx
export const AnalyticsSubSection = styled.div`
  margin-bottom: ${props => props.theme.spacing.lg};
`;
