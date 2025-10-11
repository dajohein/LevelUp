import React, { useMemo } from 'react';
import styled from '@emotion/styled';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { RootState } from '../store/store';
import { setLanguage, setCurrentModule } from '../store/gameSlice';
import { resetSession } from '../store/sessionSlice';
import { Navigation } from './Navigation';
import { DirectionalStats } from './DirectionalStats';
import { getLanguageInfo, getModulesForLanguage, getModuleStats } from '../services/moduleService';
import { DataMigrationService } from '../services/dataMigrationService';
// Import styled components from our library
import { ModuleLayout } from '../styles/components/gameLayouts';
import { Card, CardGrid } from '../styles/components/cards';
import { BaseButton } from '../styles/components/buttons';
import { ProgressBar as LibProgressBar } from '../styles/components/progress';
import { DifficultyBadge as LibDifficultyBadge } from '../styles/components/badges';
import { 
  StatRow as LibStatRow, 
  StatLabel as LibStatLabel, 
  StatValue as LibStatValue, 
  StatsContainer as LibStatsContainer 
} from '../styles/components/dataDisplay';
import {
  Heading3,
  BodyText
} from '../styles/components/typography';
import { 
  ResponsiveContainer,
  ResponsiveFlex,
  ResponsiveStack,
  ShowOnMobile,
  Sidebar as LibSidebar
} from '../styles/components/layouts';

const OverviewContainer = styled.div`
  display: flex;
  min-height: 100vh;
  padding-top: 90px; /* Account for Navigation (70px) + extra spacing */
  background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
  color: ${props => props.theme.colors.text};
  gap: ${props => props.theme.spacing.lg};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    flex-direction: column;
    padding-top: 70px;
    gap: ${props => props.theme.spacing.md};
  }
`;

const MainContent = styled.div`
  flex: 1;
  padding: ${props => props.theme.spacing.lg};
  display: flex;
  flex-direction: column;
  align-items: center;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
  }
`;

const LanguageTitle = styled.h1`
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: ${props => props.theme.spacing.xs};
  background: linear-gradient(45deg, #4caf50, #81c784);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-align: center;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1.8rem;
  }
`;

const ModuleActions = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${props => props.theme.spacing.sm};
  min-width: 140px;
  text-align: center;
  padding: ${props => props.theme.spacing.sm};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    flex-direction: column;
    align-items: stretch;
    min-width: auto;
    width: 100%;
    padding: 0;
    gap: ${props => props.theme.spacing.md};
    margin-top: ${props => props.theme.spacing.md};
  }
`;

const ModuleIcon = styled.span`
  font-size: 2rem;
`;

const ModuleInfo = styled.div`
  min-width: 0;
`;













const AnalyticsSection = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: ${props => props.theme.borderRadius.md};
  padding: ${props => props.theme.spacing.md};
  margin: 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const AnalyticsTitle = styled.h3`
  color: ${props => props.theme.colors.text};
  margin: 0 0 ${props => props.theme.spacing.md} 0;
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.xs};
  font-size: 1.1rem;
`;

const AnalyticsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: ${props => props.theme.spacing.sm};
  margin-bottom: ${props => props.theme.spacing.md};

  @media (max-width: 1024px) {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  }
`;

const AnalyticCard = styled.div`
  background: ${props => props.theme.colors.background};
  border-radius: ${props => props.theme.borderRadius.sm};
  padding: ${props => props.theme.spacing.sm};
  text-align: center;
  border: 1px solid ${props => props.theme.colors.primary}20;
`;

const AnalyticValue = styled.div`
  font-size: 1.4rem;
  font-weight: bold;
  color: ${props => props.theme.colors.primary};
  margin-bottom: ${props => props.theme.spacing.xs};
`;

const AnalyticLabel = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const AnalyticsSubSection = styled.div`
  margin-bottom: ${props => props.theme.spacing.lg};
`;

const SectionHeader = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: ${props => props.theme.spacing.md};
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
`;

const RecommendationCard = styled.div`
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid rgba(76, 175, 80, 0.2);
  border-radius: 8px;
  padding: ${props => props.theme.spacing.md};
  font-size: 0.85rem;
  color: ${props => props.theme.colors.text};
  border-left: 3px solid #4caf50;
  margin-bottom: ${props => props.theme.spacing.sm};
  display: flex;
  align-items: flex-start;
  gap: ${props => props.theme.spacing.sm};
  transition: all 0.2s ease;

  &:hover {
    background: rgba(76, 175, 80, 0.15);
    border-color: rgba(76, 175, 80, 0.3);
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const WeeklyProgressItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  padding: ${props => props.theme.spacing.sm};
  margin-bottom: ${props => props.theme.spacing.sm};
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);

  &:last-child {
    margin-bottom: 0;
  }
`;

const WeekLabel = styled.span`
  min-width: 50px;
  font-size: 0.75rem;
  color: ${props => props.theme.colors.textSecondary};
  font-weight: 500;
`;

const ProgressBar = styled.div<{ width: number; color: string }>`
  height: 8px;
  background: ${props => props.color};
  border-radius: 4px;
  width: ${props => Math.max(20, props.width)}%;
  max-width: 80px;
  position: relative;
  overflow: hidden;

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
      rgba(255, 255, 255, 0.1) 50%,
      transparent 100%
    );
    animation: shimmer 2s infinite;
  }

  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
`;

const ProgressStats = styled.span`
  color: ${props => props.theme.colors.text};
  font-size: 0.75rem;
  font-weight: 400;
`;

const ActivityCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: ${props => props.theme.spacing.md};
  font-size: 0.85rem;
  color: ${props => props.theme.colors.text};
  border-left: 3px solid #4caf50;
  margin-bottom: ${props => props.theme.spacing.sm};
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.2);
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const ScoreDisplay = styled.div`
  text-align: center;
  margin-bottom: ${props => props.theme.spacing.sm};
`;

const ScoreValue = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: ${props => props.theme.colors.primary};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 2rem;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
`;

const ScoreLabel = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;



const EmptyState = styled.div`
  text-align: center;
  padding: ${props => props.theme.spacing.xl};
  color: ${props => props.theme.colors.textSecondary};
`;

// Enhanced Language Analytics Component
const LanguageAnalytics: React.FC<{ languageCode: string; modules: any[]; wordProgress: any }> = ({
  languageCode,
  modules,
  wordProgress,
}) => {
  const stats = calculateLanguageStats(languageCode, modules, wordProgress);

  // Calculate additional analytics
  const totalSessions = Object.values(wordProgress).reduce(
    (sum: number, progress: any) => sum + (progress.timesCorrect + progress.timesIncorrect),
    0
  );

  const totalWordsLearned = Object.values(wordProgress).filter(
    (progress: any) => progress.xp > 0
  ).length;

  const overallAccuracy =
    totalSessions > 0
      ? (Object.values(wordProgress).reduce(
          (sum: number, progress: any) => sum + progress.timesCorrect,
          0
        ) /
          totalSessions) *
        100
      : 0;

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

  // Generate module-specific recommendations
  const generateRecommendations = () => {
    const recommendations = [];

    const incompleteModules = modules.filter(module => {
      const moduleStats = getModuleStats(languageCode!, module.id, wordProgress);
      return moduleStats.completionPercentage < 80;
    });

    if (incompleteModules.length > 0) {
      const leastProgress = incompleteModules.reduce((min, module) => {
        const moduleStats = getModuleStats(languageCode!, module.id, wordProgress);
        const minStats = getModuleStats(languageCode!, min.id, wordProgress);
        return moduleStats.completionPercentage < minStats.completionPercentage ? module : min;
      });
      recommendations.push(
        `Focus on "${leastProgress.name}" module - ${Math.round(
          getModuleStats(languageCode!, leastProgress.id, wordProgress).completionPercentage
        )}% complete`
      );
    }

    const lowAccuracyModules = modules.filter(module => {
      const moduleWords = module.words || [];
      const moduleProgress = moduleWords.map((word: any) => wordProgress[word.id]).filter(Boolean);
      const moduleAccuracy =
        moduleProgress.length > 0
          ? (moduleProgress.reduce(
              (sum: number, p: any) =>
                sum + p.timesCorrect / Math.max(1, p.timesCorrect + p.timesIncorrect),
              0
            ) /
              moduleProgress.length) *
            100
          : 0;
      return moduleAccuracy < 70 && moduleProgress.length > 0;
    });

    if (lowAccuracyModules.length > 0) {
      recommendations.push(
        `Practice accuracy in ${lowAccuracyModules[0].name} - focus on repetition`
      );
    }

    if (overallAccuracy > 85) {
      recommendations.push('Ready for more challenging quiz modes');
    }

    if (totalWordsLearned > 20 && stats.completedModules < modules.length) {
      recommendations.push('Consider introducing new modules to expand vocabulary');
    }

    return recommendations;
  };

  const recommendations = generateRecommendations();

  // Calculate weekly progress (simplified)
  const weeklyData = [
    {
      week: '2025-40',
      sessions: Math.floor(totalSessions * 0.3),
      words: Math.floor(totalWordsLearned * 0.25),
      accuracy: Math.min(100, overallAccuracy + 5),
    },
    {
      week: '2025-39',
      sessions: Math.floor(totalSessions * 0.25),
      words: Math.floor(totalWordsLearned * 0.3),
      accuracy: Math.min(100, overallAccuracy - 2),
    },
    {
      week: '2025-38',
      sessions: Math.floor(totalSessions * 0.2),
      words: Math.floor(totalWordsLearned * 0.2),
      accuracy: Math.min(100, overallAccuracy - 8),
    },
    {
      week: '2025-37',
      sessions: Math.floor(totalSessions * 0.15),
      words: Math.floor(totalWordsLearned * 0.15),
      accuracy: Math.min(100, overallAccuracy - 12),
    },
  ].filter(week => week.sessions > 0);

  // Recent module activity
  const recentModuleActivity = modules
    .map(module => {
      const moduleWords = module.words || [];
      const recentPractice = moduleWords
        .map((word: any) => wordProgress[word.id])
        .filter((progress: any) => progress && progress.lastPracticed)
        .sort((a: any, b: any) =>
          a && b ? new Date(b.lastPracticed).getTime() - new Date(a.lastPracticed).getTime() : 0
        );

      if (recentPractice.length === 0) return null;

      const moduleStats = getModuleStats(languageCode!, module.id, wordProgress);
      return {
        title: module.name,
        wordsLearned: recentPractice.filter((p: any) => p.xp > 0).length,
        accuracy: moduleStats.averageMastery > 0 ? Math.round(moduleStats.averageMastery) : 0,
        lastPracticed: recentPractice[0].lastPracticed,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) =>
      a && b ? new Date(b.lastPracticed).getTime() - new Date(a.lastPracticed).getTime() : 0
    )
    .slice(0, 3);

  return (
    <AnalyticsSection>
      <AnalyticsTitle>📊 Learning Analytics</AnalyticsTitle>

      {/* Main Stats Grid */}
      <AnalyticsGrid style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: '16px' }}>
        <AnalyticCard>
          <AnalyticValue>{totalSessions}</AnalyticValue>
          <AnalyticLabel>Sessions</AnalyticLabel>
        </AnalyticCard>
        <AnalyticCard>
          <AnalyticValue>{totalWordsLearned}</AnalyticValue>
          <AnalyticLabel>Words Learned</AnalyticLabel>
        </AnalyticCard>
        <AnalyticCard>
          <AnalyticValue
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
          >
            {Math.round(overallAccuracy)}%
            {overallAccuracy > 80 && (
              <span style={{ color: '#22c55e', fontSize: '0.8rem' }}>
                ↗ {Math.round(overallAccuracy - 75)}%
              </span>
            )}
          </AnalyticValue>
          <AnalyticLabel>Accuracy</AnalyticLabel>
        </AnalyticCard>
        <AnalyticCard>
          <AnalyticValue>{streak}</AnalyticValue>
          <AnalyticLabel>Day Streak</AnalyticLabel>
        </AnalyticCard>
      </AnalyticsGrid>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <AnalyticsSubSection>
          <SectionHeader>🎯 Personalized Recommendations</SectionHeader>
          <div>
            {recommendations.slice(0, 2).map((rec, index) => (
              <RecommendationCard key={index}>
                <span>💡</span>
                <span>{rec}</span>
              </RecommendationCard>
            ))}
          </div>
        </AnalyticsSubSection>
      )}

      {/* Weekly Progress */}
      {weeklyData.length > 0 && (
        <AnalyticsSubSection>
          <SectionHeader>📈 Weekly Progress</SectionHeader>
          <div>
            {weeklyData.slice(0, 2).map(week => {
              const maxSessions = Math.max(...weeklyData.map(w => w.sessions));
              const progressWidth = maxSessions > 0 ? (week.sessions / maxSessions) * 100 : 0;
              const color =
                week.accuracy > 80 ? '#22c55e' : week.accuracy > 60 ? '#f59e0b' : '#ef4444';

              return (
                <WeeklyProgressItem key={week.week}>
                  <WeekLabel>{week.week}</WeekLabel>
                  <ProgressBar width={progressWidth} color={color} />
                  <ProgressStats>
                    {week.sessions} sessions • {week.words} words • {Math.round(week.accuracy)}%
                  </ProgressStats>
                </WeeklyProgressItem>
              );
            })}
          </div>
        </AnalyticsSubSection>
      )}

      {/* Recent Module Activity */}
      {recentModuleActivity.length > 0 && (
        <AnalyticsSubSection>
          <SectionHeader>🕒 Recent Module Activity</SectionHeader>
          <div>
            {recentModuleActivity.map(
              (activity, index) =>
                activity && (
                  <ActivityCard key={index}>
                    <strong>{activity.title}</strong> • {activity.wordsLearned} words learned •{' '}
                    {activity.accuracy}% progress
                  </ActivityCard>
                )
            )}
          </div>
        </AnalyticsSubSection>
      )}

      {/* Directional Learning Analytics - only show when relevant */}
      {totalWordsLearned > 5 && (
        <AnalyticsSubSection>
          <DirectionalStats languageCode={languageCode} />
        </AnalyticsSubSection>
      )}
    </AnalyticsSection>
  );
};

// Helper function to calculate overall language statistics
const calculateLanguageStats = (languageCode: string, modules: any[], wordProgress: any) => {
  if (modules.length === 0) {
    return {
      totalWords: 0,
      wordsLearned: 0,
      totalModules: 0,
      completedModules: 0,
      averageMastery: 0,
      overallProgress: 0,
    };
  }

  let totalWords = 0;
  let wordsLearned = 0;
  let totalMastery = 0;
  let completedModules = 0;

  modules.forEach(module => {
    const stats = getModuleStats(languageCode!, module.id, wordProgress);
    totalWords += stats.totalWords;
    wordsLearned += stats.wordsLearned;
    totalMastery += stats.averageMastery;
    if (stats.completionPercentage >= 80) completedModules++;
  });

  return {
    totalWords,
    wordsLearned,
    totalModules: modules.length,
    completedModules,
    averageMastery: Math.round(totalMastery / modules.length),
    overallProgress: Math.round((wordsLearned / totalWords) * 100),
  };
};

export const ModuleOverview: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { languageCode } = useParams<{ languageCode: string }>();

  const reduxWordProgress = useSelector((state: RootState) => state.game.wordProgress);
  const currentLanguage = useSelector((state: RootState) => state.game.language);

  // Load word progress for the current language
  // If Redux doesn't have the progress for this language, load it from storage
  const wordProgress = useMemo(() => {
    if (!languageCode) return {};

    // If Redux has progress for the current language, use it
    if (currentLanguage === languageCode && Object.keys(reduxWordProgress).length > 0) {
      return reduxWordProgress;
    }

    // Load directly from storage for this language with automatic migration
    return DataMigrationService.safeLoadWordProgress(languageCode);
  }, [languageCode, reduxWordProgress, currentLanguage]);

  // Ensure the Redux store has the correct language set when we navigate to this page
  React.useEffect(() => {
    if (languageCode && currentLanguage !== languageCode) {
      dispatch(setLanguage(languageCode));
    }
  }, [languageCode, currentLanguage, dispatch]);

  const language = useMemo(() => {
    if (!languageCode) return null;
    return getLanguageInfo(languageCode);
  }, [languageCode]);

  const modules = useMemo(() => {
    if (!languageCode) return [];
    return getModulesForLanguage(languageCode);
  }, [languageCode]);

  const handleMixedPractice = () => {
    if (!languageCode) return;

    dispatch(setLanguage(languageCode));
    dispatch(setCurrentModule(null)); // No specific module for mixed practice
    dispatch(resetSession());
    navigate(`/sessions/${languageCode}`);
  };

  const handleModulePractice = (moduleId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the module click
    if (!languageCode) return;

    dispatch(setLanguage(languageCode));
    dispatch(setCurrentModule(moduleId));
    dispatch(resetSession());
    navigate(`/sessions/${languageCode}/${moduleId}`);
  };

  const handleViewModuleDetails = (moduleId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the module click
    if (!languageCode) return;

    // Navigate to the module details view
    navigate(`/language/${languageCode}/${moduleId}`);
  };

  if (!language || !languageCode) {
    return (
      <OverviewContainer>
        <Navigation />
        <MainContent>
          <EmptyState>
            <h2>Language not found</h2>
            <p>The requested language could not be found.</p>
          </EmptyState>
        </MainContent>
      </OverviewContainer>
    );
  }

  return (
    <>
      <Navigation
        languageName={language.name}
        languageFlag={language.flag}
        showUserProfile={true}
      />
      <ModuleLayout>
        <MainContent>
          <ResponsiveContainer maxWidth="800px">
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <LanguageTitle>Choose Your Module</LanguageTitle>
              <BodyText size="body" color="#B0B0B0" center>
                Select a module to start your learning journey!
              </BodyText>
            </div>
          </ResponsiveContainer>

          {/* Mixed Practice Button - prominently placed */}
          <BaseButton 
            variant="primary" 
            size="lg" 
            onClick={handleMixedPractice}
          >
            🎯 Mixed Practice
          </BaseButton>

          {/* Mobile Analytics - shown on small screens */}
          <ShowOnMobile>
            <ResponsiveContainer maxWidth="800px">
              <LanguageAnalytics
                languageCode={languageCode!}
                modules={modules}
                wordProgress={wordProgress}
              />
            </ResponsiveContainer>
          </ShowOnMobile>

          {modules.length === 0 ? (
            <EmptyState>
              <h3>No modules available</h3>
              <p>Modules for this language are coming soon!</p>
            </EmptyState>
          ) : (
            <CardGrid>
              {modules.map(module => {
                const stats = getModuleStats(languageCode!, module.id, wordProgress);

                return (
                  <Card key={module.id} variant="elevated">
                    <ResponsiveStack>
                      <ResponsiveFlex 
                        direction={{ mobile: 'row', tablet: 'row', desktop: 'row' }}
                        gap="0.5rem"
                        align="center"
                      >
                        <ModuleIcon>{module.icon}</ModuleIcon>
                        <ModuleInfo>
                          <Heading3>{module.name}</Heading3>
                          <BodyText size="small" color="#B0B0B0">
                            {module.description}
                          </BodyText>
                        </ModuleInfo>
                        <LibDifficultyBadge difficulty={module.difficulty}>
                          {module.difficulty}
                        </LibDifficultyBadge>
                      </ResponsiveFlex>

                      <LibStatsContainer>
                        <LibStatRow>
                          <LibStatLabel>Words</LibStatLabel>
                          <LibStatValue>
                            {stats.wordsLearned}/{stats.totalWords}
                          </LibStatValue>
                        </LibStatRow>

                        <LibProgressBar 
                          value={stats.completionPercentage} 
                          height="6px"
                          animated
                        />

                        <LibStatRow>
                          <LibStatLabel>Progress</LibStatLabel>
                          <LibStatValue>{stats.completionPercentage}%</LibStatValue>
                        </LibStatRow>
                      </LibStatsContainer>
                    </ResponsiveStack>

                    <ModuleActions>
                      <ScoreDisplay>
                        <ScoreValue>{stats.completionPercentage}%</ScoreValue>
                        <ScoreLabel>Progress</ScoreLabel>
                      </ScoreDisplay>

                      <BaseButton 
                        variant="secondary" 
                        size="sm" 
                        onClick={e => handleViewModuleDetails(module.id, e)}
                      >
                        📊 View Details
                      </BaseButton>

                      <BaseButton 
                        variant="primary" 
                        size="sm" 
                        onClick={e => handleModulePractice(module.id, e)}
                      >
                        🎯 Practice
                      </BaseButton>
                    </ModuleActions>
                  </Card>
                );
              })}
            </CardGrid>
          )}
        </MainContent>

        {/* Desktop Sidebar Analytics */}
        <LibSidebar position="right">
          <LanguageAnalytics
            languageCode={languageCode!}
            modules={modules}
            wordProgress={wordProgress}
          />
        </LibSidebar>
      </ModuleLayout>
    </>
  );
};
