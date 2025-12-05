import React, { useState } from 'react';
import styled from '@emotion/styled';
import { FaUser, FaChartLine, FaTrophy, FaClock, FaBrain, FaSync, FaTrash } from 'react-icons/fa';
import { Navigation } from './Navigation';
import { getAvailableLanguages } from '../services/moduleService';
import { getAllLanguageProgress } from '../services/progressService';
import { DirectionalStats } from './DirectionalStats';
import { UserProfile as UserProfileWidget } from './UserProfile';
import { StorageManagement } from './StorageManagement';
import { DataTransfer } from './DataTransfer';
import { useUserLearningProfile } from '../hooks/useUserLearningProfile';
import { LearningProfileDisplay } from './LearningProfileSection';
import { ConfirmationDialog } from './ui/ConfirmationDialog';

// Debug helpers (only in development)
const DebugSection = () => {
  if (process.env.NODE_ENV !== 'development') return null;

  const createSampleData = async () => {
    const { createSampleData } = await import('../utils/debugHelpers');
    createSampleData();
    window.location.reload(); // Reload to see the data
  };

  const debugStorage = async () => {
    const { debugStorage } = await import('../utils/debugHelpers');
    debugStorage();
  };

  return (
    <div
      style={{
        background: 'rgba(255, 0, 0, 0.1)',
        border: '1px solid red',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '20px',
      }}
    >
      <h3 style={{ color: 'red', margin: '0 0 10px 0' }}>🛠️ Development Debug Tools</h3>
      <button onClick={createSampleData} style={{ marginRight: '10px' }}>
        Create Sample Data
      </button>
      <button onClick={debugStorage}>Debug Storage</button>
    </div>
  );
};

const Container = styled.div`
  min-height: 100vh;
  background-color: ${props => props.theme.colors.background};
  padding-top: 90px; /* Account for Navigation (70px) + extra spacing */
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${props => props.theme.spacing.xl};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
  }
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: ${props => props.theme.spacing.xl};
`;

const Title = styled.h1`
  color: ${props => props.theme.colors.text};
  font-size: 2.5rem;
  margin-bottom: ${props => props.theme.spacing.md};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${props => props.theme.spacing.md};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1.8rem;
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
  }
`;

const Subtitle = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 1.1rem;
  margin: 0;
`;

const ProfileGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${props => props.theme.spacing.xl};
  margin-bottom: ${props => props.theme.spacing.xl};
`;

const LanguageProgressSection = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: ${props => props.theme.spacing.xl};
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.lg};
  }
`;

const AIInsightsSection = styled.div`
  background: linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
  border-radius: 16px;
  padding: ${props => props.theme.spacing.xl};
  backdrop-filter: blur(10px);
  border: 1px solid rgba(147, 51, 234, 0.2);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(147, 51, 234, 0.1), transparent);
    animation: shimmer 3s infinite;
  }

  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.lg};
  }
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${props => props.theme.spacing.lg};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
    align-items: flex-start;
  }
`;

const ControlButtons = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.sm};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    width: 100%;
    justify-content: flex-end;
  }
`;

const ControlButton = styled.button<{ variant?: 'refresh' | 'reset' }>`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.xs};
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  ${(props: { variant?: 'refresh' | 'reset'; disabled?: boolean }) => {
    if (props.variant === 'reset') {
      return `
        background: rgba(220, 38, 38, 0.1);
        color: #ef4444;
        border: 1px solid rgba(220, 38, 38, 0.2);
        
        &:hover:not(:disabled) {
          background: rgba(220, 38, 38, 0.2);
          border-color: rgba(220, 38, 38, 0.3);
        }
      `;
    } else {
      return `
        background: rgba(147, 51, 234, 0.1);
        color: #9333ea;
        border: 1px solid rgba(147, 51, 234, 0.2);
        
        &:hover:not(:disabled) {
          background: rgba(147, 51, 234, 0.2);
          border-color: rgba(147, 51, 234, 0.3);
        }
      `;
    }
  }}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 6px 10px;
    font-size: 0.8rem;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const SectionTitle = styled.h2`
  color: ${props => props.theme.colors.text};
  font-size: 1.5rem;
  margin-bottom: ${props => props.theme.spacing.lg};
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.md};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1.3rem;
    gap: ${props => props.theme.spacing.sm};
  }
`;

const LanguageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${props => props.theme.spacing.lg};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
    gap: ${props => props.theme.spacing.md};
  }
`;

const LanguageCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: ${props => props.theme.spacing.lg};
  transition: all 0.3s ease;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
  }

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateY(-2px);
  }
`;

const LanguageHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.md};
`;

const LanguageFlag = styled.span`
  font-size: 2rem;
`;

const LanguageInfo = styled.div`
  flex: 1;
`;

const LanguageName = styled.h3`
  color: ${props => props.theme.colors.text};
  font-size: 1.2rem;
  margin: 0 0 4px 0;
`;

const LanguageFrom = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.9rem;
  margin: 0;
`;

const ProgressStats = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.md};
`;

const StatCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: ${props => props.theme.spacing.md};
  text-align: center;
`;

const StatValue = styled.div`
  color: ${props => props.theme.colors.primary};
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: ${props => props.theme.spacing.sm};
`;

const ProgressFill = styled.div<{ width: number; color?: string }>`
  height: 100%;
  width: ${props => props.width}%;
  background: ${props => props.color || 'linear-gradient(90deg, #4caf50 0%, #81c784 100%)'};
  transition: width 0.3s ease;
  border-radius: 4px;
`;

const ProgressLabel = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  color: ${props => props.theme.colors.textSecondary};
`;

const ActivityIndicator = styled.div<{ active: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => (props.active ? '#4caf50' : 'rgba(255, 255, 255, 0.3)')};
  box-shadow: ${props => (props.active ? '0 0 8px rgba(76, 175, 80, 0.6)' : 'none')};
`;

export const UserProfilePage: React.FC = () => {
  const languages = getAvailableLanguages();
  const progressData = getAllLanguageProgress();

  // State for confirmation dialog
  const [showResetDialog, setShowResetDialog] = useState(false);

  // Get learning profile for AI insights section
  const {
    profile: learningProfile,
    isLoading: profileLoading,
    error: profileError,
    refreshProfile,
    resetProfile,
    isRefreshing,
    isResetting,
  } = useUserLearningProfile('default-user'); // TODO: Get from auth context when available

  const formatLastPracticed = (lastPracticed?: string) => {
    if (!lastPracticed) return 'Never';
    const date = new Date(lastPracticed);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  // Calculate overall stats
  const totalStats = languages.reduce(
    (acc, { code }) => {
      const progress = progressData[code];
      if (progress) {
        acc.totalWords += progress.totalWords;
        acc.practicedWords += progress.practicedWords;
        acc.totalModules += progress.totalModules;
        acc.completedModules += progress.completedModules;
        if (progress.recentActivity) acc.activeLanguages += 1;
      } else {
        const language = languages.find(l => l.code === code);
        if (language) {
          acc.totalModules += language.info.modules.length;
        }
      }
      return acc;
    },
    {
      totalWords: 0,
      practicedWords: 0,
      totalModules: 0,
      completedModules: 0,
      activeLanguages: 0,
    }
  );

  const overallProgress =
    totalStats.totalWords > 0 ? (totalStats.practicedWords / totalStats.totalWords) * 100 : 0;

  // Handler functions for profile controls
  const handleRefreshProfile = async () => {
    try {
      await refreshProfile();
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  };

  const handleResetProfile = async () => {
    try {
      await resetProfile();
      setShowResetDialog(false);
    } catch (error) {
      console.error('Failed to reset profile:', error);
    }
  };

  return (
    <Container>
      <Navigation />

      <ContentWrapper>
        <Header>
          <Title>
            <FaUser />
            Your Profile
          </Title>
          <Subtitle>Track your learning progress across all languages</Subtitle>
        </Header>

        {/* Only show debug tools in development */}
        {process.env.NODE_ENV === 'development' && <DebugSection />}

        <ProfileGrid>
          {/* Overall User Profile Widget - Show stats for the language with most progress */}
          <UserProfileWidget
            compact={false}
            userId="default-user" // TODO: Get from auth context when available
            showLearningProfile={false} // Don't show learning profile here, we'll have a dedicated section
            languageCode={
              // Find the language with the most progress, or default to first available
              Object.entries(progressData).length > 0
                ? Object.entries(progressData).reduce(
                    (mostActive, [code, progress]) =>
                      progress &&
                      progress.practicedWords > (progressData[mostActive]?.practicedWords || 0)
                        ? code
                        : mostActive,
                    Object.keys(progressData)[0] || languages[0]?.code
                  )
                : languages[0]?.code
            }
          />

          {/* Language Progress Section */}
          <LanguageProgressSection>
            <SectionTitle>
              <FaChartLine />
              Language Progress
            </SectionTitle>

            {/* Overall Stats */}
            <LanguageCard style={{ marginBottom: '24px', background: 'rgba(76, 175, 80, 0.1)' }}>
              <LanguageHeader>
                <LanguageFlag>🌍</LanguageFlag>
                <LanguageInfo>
                  <LanguageName>Overall Progress</LanguageName>
                  <LanguageFrom>across all languages</LanguageFrom>
                </LanguageInfo>
                <ActivityIndicator active={totalStats.activeLanguages > 0} />
              </LanguageHeader>

              <ProgressStats>
                <StatCard>
                  <StatValue>{totalStats.practicedWords}</StatValue>
                  <StatLabel>Words Practiced</StatLabel>
                </StatCard>
                <StatCard>
                  <StatValue>{totalStats.completedModules}</StatValue>
                  <StatLabel>Modules Completed</StatLabel>
                </StatCard>
                <StatCard>
                  <StatValue>{totalStats.activeLanguages}</StatValue>
                  <StatLabel>Active Languages</StatLabel>
                </StatCard>
                <StatCard>
                  <StatValue>{Math.round(overallProgress)}%</StatValue>
                  <StatLabel>Total Progress</StatLabel>
                </StatCard>
              </ProgressStats>

              <ProgressBar>
                <ProgressFill
                  width={overallProgress}
                  color="linear-gradient(90deg, #4caf50 0%, #81c784 100%)"
                />
              </ProgressBar>
              <ProgressLabel>
                <span>Progress</span>
                <span>
                  {totalStats.practicedWords} / {totalStats.totalWords} words
                </span>
              </ProgressLabel>
            </LanguageCard>

            {/* Individual Language Progress */}
            <LanguageGrid>
              {languages.map(({ code, info }) => {
                const progress = progressData[code] || {
                  totalWords: 0,
                  practicedWords: 0,
                  averageMastery: 0,
                  completedModules: 0,
                  totalModules: info.modules.length,
                  recentActivity: false,
                };

                const languageProgress =
                  progress.totalWords > 0
                    ? (progress.practicedWords / progress.totalWords) * 100
                    : 0;

                return (
                  <LanguageCard key={code}>
                    <LanguageHeader>
                      <LanguageFlag>{info.flag}</LanguageFlag>
                      <LanguageInfo>
                        <LanguageName>{info.name}</LanguageName>
                        <LanguageFrom>from {info.from}</LanguageFrom>
                      </LanguageInfo>
                      <ActivityIndicator active={progress.recentActivity} />
                    </LanguageHeader>

                    <ProgressStats>
                      <StatCard>
                        <StatValue>{Math.round(progress.averageMastery)}%</StatValue>
                        <StatLabel>
                          <FaTrophy size={10} style={{ marginRight: 4 }} />
                          Mastery
                        </StatLabel>
                      </StatCard>
                      <StatCard>
                        <StatValue>{progress.practicedWords}</StatValue>
                        <StatLabel>Words Learned</StatLabel>
                      </StatCard>
                      <StatCard>
                        <StatValue>{progress.completedModules}</StatValue>
                        <StatLabel>Modules Done</StatLabel>
                      </StatCard>
                      <StatCard>
                        <StatValue>
                          <FaClock size={12} />
                        </StatValue>
                        <StatLabel>{formatLastPracticed(progress.lastPracticed)}</StatLabel>
                      </StatCard>
                    </ProgressStats>

                    <ProgressBar>
                      <ProgressFill
                        width={languageProgress}
                        color={
                          progress.averageMastery > 70
                            ? 'linear-gradient(90deg, #4caf50 0%, #81c784 100%)'
                            : progress.averageMastery > 40
                              ? 'linear-gradient(90deg, #ff9800 0%, #ffb74d 100%)'
                              : 'linear-gradient(90deg, #2196f3 0%, #64b5f6 100%)'
                        }
                      />
                    </ProgressBar>
                    <ProgressLabel>
                      <span>Progress</span>
                      <span>
                        {progress.practicedWords} / {progress.totalWords} words
                      </span>
                    </ProgressLabel>

                    {/* Add directional analytics only for languages with substantial practice data and explicit directional learning */}
                    {progress.practicedWords > 5 && <DirectionalStats languageCode={code} />}
                  </LanguageCard>
                );
              })}
            </LanguageGrid>
          </LanguageProgressSection>

          {/* AI Learning Insights Section */}
          <AIInsightsSection>
            <SectionHeader>
              <SectionTitle>
                <FaBrain />
                AI Learning Insights
              </SectionTitle>

              <ControlButtons>
                <ControlButton
                  variant="refresh"
                  onClick={handleRefreshProfile}
                  disabled={isRefreshing || isResetting || profileLoading}
                  title="Refresh your learning profile analysis"
                >
                  <FaSync
                    style={{
                      animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                    }}
                  />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </ControlButton>

                <ControlButton
                  variant="reset"
                  onClick={() => setShowResetDialog(true)}
                  disabled={isRefreshing || isResetting || profileLoading}
                  title="Reset your learning profile (this will clear all AI insights)"
                >
                  <FaTrash />
                  Reset
                </ControlButton>
              </ControlButtons>
            </SectionHeader>

            {profileLoading && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#9333ea',
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🧠</div>
                <div>Analyzing your learning patterns...</div>
              </div>
            )}

            {profileError && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#ef4444',
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '16px' }}>⚠️</div>
                <div>Error loading AI insights: {profileError}</div>
              </div>
            )}

            {learningProfile && !profileLoading && (
              <LearningProfileDisplay profile={learningProfile} compact={false} />
            )}

            {!learningProfile && !profileLoading && !profileError && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#9333ea',
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🤖</div>
                <div style={{ marginBottom: '16px' }}>
                  The AI Learning Coach will create your personalized insights after completing a
                  few learning sessions.
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                  Your learning style, cognitive patterns, and motivation levels will be analyzed
                  automatically.
                </div>
              </div>
            )}
          </AIInsightsSection>

          <DataTransfer />

          <StorageManagement />
        </ProfileGrid>
      </ContentWrapper>

      {/* Confirmation Dialog for Reset */}
      <ConfirmationDialog
        isOpen={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        onConfirm={handleResetProfile}
        title="Reset Learning Profile"
        message="Are you sure you want to reset your AI learning profile? This will permanently delete all your personalized insights, learning patterns, and AI coaching data. This action cannot be undone."
        confirmText={isResetting ? 'Resetting...' : 'Reset Profile'}
        cancelText="Cancel"
        destructive={true}
        isLoading={isResetting}
      />
    </Container>
  );
};
