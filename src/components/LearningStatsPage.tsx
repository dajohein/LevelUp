import React, { useMemo } from 'react';
import styled from '@emotion/styled';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { RootState } from '../store/store';
import { Navigation } from './Navigation';
import { AILearningDashboard } from './AILearningDashboard';
import { DirectionalStats } from './DirectionalStats';
import { getLanguageInfo, getModulesForLanguage, getModuleStats } from '../services/moduleService';
import { DataMigrationService } from '../services/dataMigrationService';

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
  color: ${props => props.theme.colors.text};
  padding-top: 90px;
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${props => props.theme.spacing.lg};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
  }
`;

const PageHeader = styled.div`
  text-align: center;
  margin-bottom: ${props => props.theme.spacing.xl};
`;

const PageTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: ${props => props.theme.spacing.sm};
  background: linear-gradient(45deg, #4caf50, #81c784);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 2rem;
  }
`;

const PageSubtitle = styled.p`
  font-size: 1.1rem;
  color: ${props => props.theme.colors.textSecondary};
  margin: 0;
`;

const StatsSection = styled.section`
  margin-bottom: ${props => props.theme.spacing.xl};
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: ${props => props.theme.spacing.xl};
  border: 1px solid rgba(255, 255, 255, 0.1);

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.lg};
    margin-bottom: ${props => props.theme.spacing.lg};
  }
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: ${props => props.theme.spacing.lg};
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1.3rem;
    margin-bottom: ${props => props.theme.spacing.md};
  }
`;

const AnalyticsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: ${props => props.theme.spacing.lg};
  margin-bottom: ${props => props.theme.spacing.lg};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: ${props => props.theme.spacing.md};
  }

  @media (max-width: 400px) {
    grid-template-columns: repeat(2, 1fr);
    gap: ${props => props.theme.spacing.sm};
  }
`;

const AnalyticCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  padding: ${props => props.theme.spacing.lg};
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
  }
`;

const AnalyticValue = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: #4caf50;
  margin-bottom: ${props => props.theme.spacing.sm};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1.6rem;
  }

  @media (max-width: 400px) {
    font-size: 1.4rem;
  }
`;

const AnalyticLabel = styled.div`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ModuleStatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${props => props.theme.spacing.lg};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
    gap: ${props => props.theme.spacing.md};
  }
`;

const ModuleStatCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  padding: ${props => props.theme.spacing.lg};
  border: 1px solid rgba(255, 255, 255, 0.1);

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
  }
`;

const ModuleName = styled.h3`
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: ${props => props.theme.spacing.sm};
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
`;

const ModuleStatsRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${props => props.theme.spacing.xs};
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.9rem;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-top: ${props => props.theme.spacing.sm};
`;

const ProgressFill = styled.div<{ progress: number }>`
  height: 100%;
  width: ${props => props.progress}%;
  background: linear-gradient(90deg, #4caf50, #81c784);
  border-radius: 4px;
  transition: width 0.3s ease;
`;

// Generate stable user ID for demo
const getDemoUserId = () => {
  let userId = localStorage.getItem('demo_user_id');
  if (!userId) {
    userId = `demo_${Math.random().toString(36).substr(2, 8)}`;
    localStorage.setItem('demo_user_id', userId);
  }
  return userId;
};

interface LearningStatsPageProps {}

export const LearningStatsPage: React.FC<LearningStatsPageProps> = () => {
  const { languageCode } = useParams<{ languageCode: string }>();
  const reduxWordProgress = useSelector((state: RootState) => state.game.wordProgress);
  const currentLanguage = useSelector((state: RootState) => state.game.language);

  // Load word progress for the current language
  const wordProgress = useMemo(() => {
    if (!languageCode) return {};

    // If Redux has progress for the current language, use it
    if (currentLanguage === languageCode && Object.keys(reduxWordProgress).length > 0) {
      return reduxWordProgress;
    }

    // Load directly from storage for this language with automatic migration
    return DataMigrationService.safeLoadWordProgress(languageCode);
  }, [languageCode, reduxWordProgress, currentLanguage]);

  const language = useMemo(() => {
    if (!languageCode) return null;
    return getLanguageInfo(languageCode);
  }, [languageCode]);

  const modules = useMemo(() => {
    if (!languageCode) return [];
    return getModulesForLanguage(languageCode);
  }, [languageCode]);

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    const totalSessions = Object.values(wordProgress).reduce(
      (sum: number, progress: any) =>
        sum + ((progress.timesCorrect || 0) + (progress.timesIncorrect || 0)),
      0
    );

    const totalWordsLearned = Object.values(wordProgress).filter(
      (progress: any) => progress.xp > 0
    ).length;

    const totalXP = Object.values(wordProgress).reduce(
      (sum: number, progress: any) => sum + (progress?.xp || 0),
      0
    );

    const overallAccuracy =
      totalSessions > 0
        ? (Object.values(wordProgress).reduce(
            (sum: number, progress: any) => sum + (progress.timesCorrect || 0),
            0
          ) /
            totalSessions) *
          100
        : 0;

    const totalWords = modules.reduce((sum, module) => sum + (module.words?.length || 0), 0);

    const completedModules = modules.filter(module => {
      const stats = getModuleStats(languageCode!, module.id, wordProgress);
      return stats.completionPercentage >= 80;
    }).length;

    // Calculate streak (simplified - days with any practice)
    const recentPractice = Object.values(wordProgress)
      .filter((progress: any) => progress.lastPracticed)
      .map((progress: any) => new Date(progress.lastPracticed))
      .sort((a, b) => b.getTime() - a.getTime());

    const streak =
      recentPractice.length > 0
        ? Math.min(
            7,
            recentPractice.filter(date => Date.now() - date.getTime() < 7 * 24 * 60 * 60 * 1000)
              .length
          )
        : 0;

    return {
      totalSessions,
      totalWordsLearned,
      totalXP,
      overallAccuracy,
      totalWords,
      completedModules,
      streak,
    };
  }, [wordProgress, modules, languageCode]);

  if (!language || !languageCode) {
    return (
      <Container>
        <Navigation />
        <ContentWrapper>
          <div>Language not found</div>
        </ContentWrapper>
      </Container>
    );
  }

  return (
    <Container>
      <Navigation
        languageName={language.name}
        languageFlag={language.flag}
        showUserProfile={true}
      />
      <ContentWrapper>
        <PageHeader>
          <PageTitle>
            📊 {language.flag} {language.name} Learning Analytics
          </PageTitle>
          <PageSubtitle>Detailed insights into your learning progress and performance</PageSubtitle>
        </PageHeader>

        {/* AI Learning Dashboard */}
        <StatsSection>
          <SectionTitle>🤖 AI Learning Coach</SectionTitle>
          <AILearningDashboard userId={getDemoUserId()} languageCode={languageCode} />
        </StatsSection>

        {/* Overall Statistics */}
        <StatsSection>
          <SectionTitle>📈 Overall Progress</SectionTitle>
          <AnalyticsGrid>
            <AnalyticCard>
              <AnalyticValue>{overallStats.totalWordsLearned}</AnalyticValue>
              <AnalyticLabel>Words Learned</AnalyticLabel>
            </AnalyticCard>
            <AnalyticCard>
              <AnalyticValue>{overallStats.totalSessions}</AnalyticValue>
              <AnalyticLabel>Practice Sessions</AnalyticLabel>
            </AnalyticCard>
            <AnalyticCard>
              <AnalyticValue>{Math.round(overallStats.overallAccuracy)}%</AnalyticValue>
              <AnalyticLabel>Overall Accuracy</AnalyticLabel>
            </AnalyticCard>
            <AnalyticCard>
              <AnalyticValue>{overallStats.totalXP.toLocaleString()}</AnalyticValue>
              <AnalyticLabel>Total XP</AnalyticLabel>
            </AnalyticCard>
            <AnalyticCard>
              <AnalyticValue>{overallStats.completedModules}</AnalyticValue>
              <AnalyticLabel>Modules Completed</AnalyticLabel>
            </AnalyticCard>
            <AnalyticCard>
              <AnalyticValue>{overallStats.streak}</AnalyticValue>
              <AnalyticLabel>Day Streak</AnalyticLabel>
            </AnalyticCard>
          </AnalyticsGrid>
        </StatsSection>

        {/* Module-specific Statistics */}
        <StatsSection>
          <SectionTitle>📚 Module Progress</SectionTitle>
          <ModuleStatsGrid>
            {modules.map(module => {
              const stats = getModuleStats(languageCode, module.id, wordProgress);
              return (
                <ModuleStatCard key={module.id}>
                  <ModuleName>
                    {module.icon} {module.name}
                  </ModuleName>
                  <ModuleStatsRow>
                    <span>Words Learned:</span>
                    <span>
                      {stats.wordsLearned}/{stats.totalWords}
                    </span>
                  </ModuleStatsRow>
                  <ModuleStatsRow>
                    <span>Progress:</span>
                    <span>{stats.completionPercentage}%</span>
                  </ModuleStatsRow>
                  <ModuleStatsRow>
                    <span>Average Mastery:</span>
                    <span>{Math.round(stats.averageMastery)}%</span>
                  </ModuleStatsRow>
                  <ProgressBar>
                    <ProgressFill progress={stats.completionPercentage} />
                  </ProgressBar>
                </ModuleStatCard>
              );
            })}
          </ModuleStatsGrid>
        </StatsSection>

        {/* Directional Learning Analytics */}
        {overallStats.totalWordsLearned > 5 && (
          <StatsSection>
            <SectionTitle>🧭 Directional Learning Insights</SectionTitle>
            <DirectionalStats languageCode={languageCode} />
          </StatsSection>
        )}
      </ContentWrapper>
    </Container>
  );
};

export default LearningStatsPage;
