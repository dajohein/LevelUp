/**
 * Session Analytics Component
 *
 * Displays detailed analytics from the enhanced learning sessions
 * Shows progress, recommendations, and learning insights
 */

import React, { useEffect } from 'react';
import styled from '@emotion/styled';
import { enhancedWordService } from '../services/enhancedWordService';
import { learningCacheService } from '../services/cacheService';

const Container = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: ${props => props.theme.borderRadius.md};
  padding: ${props => props.theme.spacing.md};
  margin: 0;
  border: 1px solid rgba(255, 255, 255, 0.1);

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.sm};
    border-radius: ${props => props.theme.borderRadius.sm};
  }
`;

const Title = styled.h3`
  color: ${props => props.theme.colors.text};
  margin: 0 0 ${props => props.theme.spacing.md} 0;
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.xs};
  font-size: 1.1rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: ${props => props.theme.spacing.sm};
  margin-bottom: ${props => props.theme.spacing.md};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    grid-template-columns: repeat(2, 1fr);
    gap: ${props => props.theme.spacing.xs};
  }
`;

const StatCard = styled.div`
  background: ${props => props.theme.colors.background};
  border-radius: ${props => props.theme.borderRadius.sm};
  padding: ${props => props.theme.spacing.sm};
  text-align: center;
  border: 1px solid ${props => props.theme.colors.primary}20;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.xs};
  }
`;

const StatValue = styled.div`
  font-size: 1.4rem;
  font-weight: bold;
  color: ${props => props.theme.colors.primary};
  margin-bottom: ${props => props.theme.spacing.xs};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1.2rem;
  }
`;

const StatLabel = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TrendStat = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

const TrendValue = styled.div`
  font-size: 1.4rem;
  font-weight: bold;
  color: ${props => props.theme.colors.primary};
  margin-bottom: ${props => props.theme.spacing.xs};
  display: flex;
  align-items: center;
  gap: 4px;
`;

const TrendIndicator = styled.span<{ trend: 'up' | 'down' | 'neutral' }>`
  font-size: 0.9rem;
  color: ${props => {
    if (props.trend === 'up') return '#22c55e';
    if (props.trend === 'down') return '#ef4444';
    return props.theme.colors.textSecondary;
  }};
`;

const RecommendationsSection = styled.div`
  margin-top: ${props => props.theme.spacing.lg};
`;

const SectionTitle = styled.h4`
  color: ${props => props.theme.colors.text};
  margin: 0 0 ${props => props.theme.spacing.md} 0;
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
`;

const RecommendationList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.sm};
`;

const RecommendationItem = styled.li`
  background: ${props => props.theme.colors.background};
  border-radius: ${props => props.theme.borderRadius.sm};
  padding: ${props => props.theme.spacing.md};
  border-left: 4px solid ${props => props.theme.colors.primary};
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};

  &:before {
    content: '💡';
    font-size: 1.2rem;
  }
`;

const WeeklyProgressChart = styled.div`
  margin-top: ${props => props.theme.spacing.lg};
`;

const WeekBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.sm};
`;

const WeekLabel = styled.div`
  min-width: 80px;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.9rem;
`;

const ProgressBar = styled.div<{ width: number; color: string }>`
  height: 8px;
  background: ${props => props.color};
  border-radius: 4px;
  width: ${props => props.width}%;
  max-width: 200px;
  transition: width 0.3s ease;
`;

const ProgressText = styled.div`
  color: ${props => props.theme.colors.text};
  font-size: 0.8rem;
  min-width: 100px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${props => props.theme.spacing.xl};
  color: ${props => props.theme.colors.textSecondary};
`;

interface SessionAnalyticsProps {
  languageCode: string;
  showRecommendations?: boolean;
  showWeeklyProgress?: boolean;
}

export const SessionAnalytics: React.FC<SessionAnalyticsProps> = ({
  languageCode,
  showRecommendations = true,
  showWeeklyProgress = true,
}) => {
  // Force refresh analytics data after a brief delay to ensure it's loaded
  useEffect(() => {
    // Immediately reload analytics from localStorage
    learningCacheService.reloadAnalytics();

    const timer = setTimeout(() => {
      learningCacheService.reloadAnalytics();
    }, 500); // 500ms delay to ensure session data is saved

    return () => clearTimeout(timer);
  }, [languageCode]);

  const analytics = enhancedWordService.getLearningAnalytics(languageCode);
  const recentSessions = enhancedWordService.getSessionHistory(languageCode, 5);

  if (!analytics && recentSessions.length === 0) {
    return (
      <Container>
        <Title>📊 Learning Analytics</Title>
        <EmptyState>
          <div>🌱</div>
          <p>Start learning to see your progress analytics and insights!</p>
        </EmptyState>
      </Container>
    );
  }

  // Calculate recent performance and trends
  const recentRecommendations =
    recentSessions.length > 0 ? recentSessions[0].performance.recommendations : [];

  const averageRecentAccuracy =
    recentSessions.length > 0
      ? recentSessions.reduce((sum, session) => sum + session.performance.averageAccuracy, 0) /
        recentSessions.length
      : 0;

  // Calculate accuracy trend
  const getAccuracyTrend = () => {
    if (!analytics || recentSessions.length < 2) {
      return { change: 0, trend: 'neutral' as const };
    }

    const overallAccuracy = analytics.averageAccuracy * 100;
    const recentAccuracy = averageRecentAccuracy * 100;
    const change = recentAccuracy - overallAccuracy;

    return {
      change: Math.abs(change),
      trend: change > 2 ? ('up' as const) : change < -2 ? ('down' as const) : ('neutral' as const),
    };
  };

  const accuracyTrend = getAccuracyTrend();
  const displayAccuracy =
    averageRecentAccuracy > 0
      ? averageRecentAccuracy * 100
      : (analytics?.averageAccuracy || 0) * 100;

  return (
    <Container>
      <Title>📊 Learning Analytics</Title>

      {analytics && (
        <StatsGrid>
          <StatCard>
            <StatValue>{analytics.totalSessions}</StatValue>
            <StatLabel>Sessions</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>{analytics.totalWordsLearned}</StatValue>
            <StatLabel>Words Learned</StatLabel>
          </StatCard>
          <TrendStat>
            <TrendValue>
              {Math.round(displayAccuracy)}%
              {accuracyTrend.trend !== 'neutral' && (
                <TrendIndicator trend={accuracyTrend.trend}>
                  {accuracyTrend.trend === 'up' ? '↗' : '↘'} {Math.round(accuracyTrend.change)}%
                </TrendIndicator>
              )}
            </TrendValue>
            <StatLabel>Accuracy</StatLabel>
          </TrendStat>
          <StatCard>
            <StatValue>{analytics.learningStreak}</StatValue>
            <StatLabel>Day Streak</StatLabel>
          </StatCard>
        </StatsGrid>
      )}

      {showRecommendations && recentRecommendations.length > 0 && (
        <RecommendationsSection>
          <SectionTitle>🎯 Personalized Recommendations</SectionTitle>
          <RecommendationList>
            {recentRecommendations.slice(0, 3).map((recommendation, index) => (
              <RecommendationItem key={index}>{recommendation}</RecommendationItem>
            ))}
          </RecommendationList>
        </RecommendationsSection>
      )}

      {showWeeklyProgress && analytics?.weeklyProgress && analytics.weeklyProgress.length > 0 && (
        <WeeklyProgressChart>
          <SectionTitle>📈 Weekly Progress</SectionTitle>
          {analytics.weeklyProgress.slice(0, 4).map(week => {
            const maxSessions = Math.max(...analytics.weeklyProgress.map(w => w.sessionsCompleted));
            const progressWidth =
              maxSessions > 0 ? (week.sessionsCompleted / maxSessions) * 100 : 0;
            const accuracyColor =
              week.accuracyRate > 0.8 ? '#22c55e' : week.accuracyRate > 0.6 ? '#f59e0b' : '#ef4444';

            return (
              <WeekBar key={week.week}>
                <WeekLabel>{week.week}</WeekLabel>
                <ProgressBar width={progressWidth} color={accuracyColor} />
                <ProgressText>
                  {week.sessionsCompleted} sessions • {week.wordsLearned} words •{' '}
                  {Math.round(week.accuracyRate * 100)}%
                </ProgressText>
              </WeekBar>
            );
          })}
        </WeeklyProgressChart>
      )}

      {recentSessions.length > 0 && (
        <RecommendationsSection>
          <SectionTitle>🕒 Recent Sessions</SectionTitle>
          <RecommendationList>
            {recentSessions.slice(0, 3).map(session => (
              <RecommendationItem key={session.id}>
                <div>
                  <strong>Practice Session</strong> •{session.performance.wordsLearned} words
                  learned •{Math.round(session.performance.averageAccuracy * 100)}% accuracy
                </div>
              </RecommendationItem>
            ))}
          </RecommendationList>
        </RecommendationsSection>
      )}
    </Container>
  );
};
