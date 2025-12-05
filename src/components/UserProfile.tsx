import React, { useState, useEffect, useMemo } from 'react';
import styled from '@emotion/styled';
import { keyframes, css } from '@emotion/react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { logger } from '../services/logger';
import {
  calculateXPForNextLevel,
  getLevelInfo,
  calculateLanguageAchievementStats,
  calculateLanguageXP,
  calculateCurrentLevel,
} from '../services/levelService';
import { wordProgressStorage } from '../services/storageService';
import { getAvailableLanguages } from '../services/moduleService';
import { useUserLearningProfile } from '../hooks/useUserLearningProfile';
import { LearningProfileDisplay } from './LearningProfileSection';
import { testLearningProfileStorage } from '../utils/testLearningProfile';
import { inspectStoredProfile } from '../utils/debugProfileInspector';

// Animations
const xpCountUp = keyframes`
  from { transform: scale(1); }
  to { transform: scale(1.1); }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 15px rgba(59, 130, 246, 0.3); }
  50% { box-shadow: 0 0 25px rgba(59, 130, 246, 0.6); }
`;

const progressFill = keyframes`
  from { width: 0%; }
  to { width: var(--target-width); }
`;

// Styled Components
const ProfileContainer = styled.div<{ compact?: boolean }>`
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.1) 0%,
    rgba(147, 51, 234, 0.1) 50%,
    rgba(236, 72, 153, 0.1) 100%
  );
  border: 2px solid rgba(59, 130, 246, 0.2);
  border-radius: 20px;
  padding: ${props => (props.compact ? props.theme.spacing.md : props.theme.spacing.xl)};
  margin: ${props => props.theme.spacing.md} 0;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(59, 130, 246, 0.2);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    transition: left 0.5s ease;
  }

  &:hover::before {
    left: 100%;
  }
`;

const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.lg};
  margin-bottom: ${props => props.theme.spacing.lg};
`;

const AvatarContainer = styled.div<{ levelColor: string }>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Avatar = styled.div<{ levelColor: string }>`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${props => props.levelColor}, #ffffff20);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  position: relative;
  border: 4px solid ${props => props.levelColor};
  ${css`
    animation: ${pulseGlow} 3s ease-in-out infinite;
  `}

  &::after {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    background: conic-gradient(
      from 0deg,
      ${props => props.levelColor},
      transparent,
      ${props => props.levelColor}
    );
    z-index: -1;
    animation: spin 4s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const LevelBadge = styled.div<{ levelColor: string }>`
  position: absolute;
  bottom: -5px;
  right: -5px;
  background: ${props => props.levelColor};
  color: white;
  border-radius: 15px;
  padding: 4px 8px;
  font-size: 0.8rem;
  font-weight: bold;
  border: 2px solid white;
  min-width: 30px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
`;

const UserInfo = styled.div`
  flex: 1;
`;

const UserTitle = styled.h2<{ levelColor: string }>`
  color: ${props => props.levelColor};
  margin: 0;
  font-size: 1.8rem;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
`;

const UserSubtitle = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  margin: 4px 0 0 0;
  font-size: 1rem;
`;

const StatsGrid = styled.div<{ compact?: boolean }>`
  display: grid;
  grid-template-columns: ${props =>
    props.compact ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(120px, 1fr))'};
  gap: ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.lg};
`;

const StatCard = styled.div<{ highlight?: boolean }>`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: ${props => props.theme.spacing.md};
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;

  ${props =>
    props.highlight &&
    css`
      background: rgba(59, 130, 246, 0.1);
      border-color: rgba(59, 130, 246, 0.3);
      animation: ${xpCountUp} 0.3s ease-out;
    `}

  &:hover {
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.1);
  }
`;

const StatValue = styled.div<{ color?: string }>`
  font-size: 1.5rem;
  font-weight: bold;
  color: ${props => props.color || props.theme.colors.primary};
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const XPProgressSection = styled.div`
  margin-bottom: ${props => props.theme.spacing.lg};
`;

const ProgressLabel = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${props => props.theme.spacing.sm};
  color: ${props => props.theme.colors.text};
  font-weight: 500;
`;

const ProgressBarContainer = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 25px;
  height: 16px;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const ProgressBar = styled.div<{ percentage: number; levelColor: string; animate?: boolean }>`
  height: 100%;
  width: ${props => props.percentage}%;
  background: linear-gradient(90deg, ${props => props.levelColor}, ${props => props.levelColor}aa);
  border-radius: 25px;
  position: relative;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);

  ${props =>
    props.animate &&
    css`
      animation: ${progressFill} 1s ease-out;
      --target-width: ${props.percentage}%;
    `}

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    transform: translateX(-100%);
    animation: shimmer 2s infinite;
  }

  @keyframes shimmer {
    100% {
      transform: translateX(100%);
    }
  }
`;

const AchievementsBadges = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.sm};
  flex-wrap: wrap;
  margin-top: ${props => props.theme.spacing.md};
`;

const AchievementBadge = styled.div<{ earned: boolean; color: string }>`
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: bold;
  border: 2px solid ${props => props.color};
  color: ${props => (props.earned ? 'white' : props.color)};
  background: ${props => (props.earned ? props.color : 'transparent')};
  opacity: ${props => (props.earned ? 1 : 0.5)};
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  ${props =>
    props.earned &&
    `
    box-shadow: 0 0 15px ${props.color}40;
  `}

  &:hover {
    transform: scale(1.05);
  }
`;

interface UserProfileProps {
  compact?: boolean;
  showAchievements?: boolean;
  languageCode?: string;
  userId?: string;
  showLearningProfile?: boolean;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  compact = false,
  showAchievements = true,
  languageCode,
  userId = 'default-user', // TODO: Get from auth context when available
  showLearningProfile = true,
}) => {
  // Optimize Redux selector to only update when relevant data changes
  const gameData = useSelector(
    (state: RootState) => ({
      wordProgress: state.game.wordProgress,
      language: state.game.language,
    }),
    (left, right) =>
      left.language === right.language &&
      Object.keys(left.wordProgress).length === Object.keys(right.wordProgress).length
  );

  const [animateProgress, setAnimateProgress] = useState(false);

  // Load user learning profile
  const {
    profile: learningProfile,
    isLoading: profileLoading,
    error: profileError,
    refreshProfile,
  } = useUserLearningProfile(userId);

  // Debug logging
  useEffect(() => {
    logger.debug('UserProfile learning profile state:', {
      userId,
      hasProfile: !!learningProfile,
      isLoading: profileLoading,
      error: profileError,
    });
  }, [userId, learningProfile, profileLoading, profileError]);

  // Use provided languageCode, current language from store, or default to first available language
  const availableLanguages = getAvailableLanguages();
  const currentLanguage =
    languageCode ||
    gameData.language ||
    (availableLanguages.length > 0 ? availableLanguages[0].code : null);

  if (!currentLanguage) {
    return null; // Don't render if no languages are available
  }

  // Get word progress data - prefer localStorage for language-specific data
  const wordProgress = useMemo(() => {
    // Always prefer localStorage for language-specific data to avoid mixing languages
    // The Redux store might contain data for a different language than what we're displaying
    try {
      const localData = wordProgressStorage.load(currentLanguage);

      // If localStorage has data, use it (it's language-specific and reliable)
      if (Object.keys(localData).length > 0) {
        return localData;
      }
    } catch (error) {
      logger.warn('Failed to load word progress from localStorage:', error);
    }

    // Only fall back to Redux if localStorage is empty
    const hasReduxData = Object.keys(gameData.wordProgress).length > 0;
    if (hasReduxData) {
      return gameData.wordProgress;
    }

    return {};
  }, [currentLanguage]); // Remove reduxWordProgress dependency to prevent frequent updates

  // Memoize expensive calculations
  const profileData = useMemo(() => {
    const languageXP = calculateLanguageXP(wordProgress, currentLanguage);
    const currentLevel = calculateCurrentLevel(languageXP);
    const stats = calculateLanguageAchievementStats(wordProgress, currentLanguage);
    const xpProgress = calculateXPForNextLevel(languageXP);
    const levelInfo = getLevelInfo(currentLevel);

    return { languageXP, currentLevel, stats, xpProgress, levelInfo };
  }, [wordProgress, currentLanguage]);

  const { languageXP, currentLevel, stats, xpProgress, levelInfo } = profileData;

  useEffect(() => {
    // Trigger progress animation on mount or language change
    const timer = setTimeout(() => setAnimateProgress(true), 100);
    return () => clearTimeout(timer);
  }, [currentLanguage]);

  // Achievement thresholds based on language-specific progress
  const achievements = [
    {
      id: 'first-steps',
      label: '🌱 First Steps',
      threshold: 1,
      color: '#10b981',
      achieved: stats.studiedWords >= 1,
    },
    {
      id: 'dedicated',
      label: '🔥 Dedicated',
      threshold: 7,
      color: '#f59e0b',
      achieved: stats.learningStreak >= 7,
    },
    {
      id: 'scholar',
      label: '📚 Scholar',
      threshold: 20,
      color: '#3b82f6',
      achieved: stats.studiedWords >= 20,
    },
    {
      id: 'master',
      label: '🎯 Master',
      threshold: 10,
      color: '#8b5cf6',
      achieved: stats.masteredWords >= 10,
    },
    {
      id: 'perfectionist',
      label: '✨ Perfectionist',
      threshold: 5,
      color: '#ec4899',
      achieved: stats.perfectWords >= 5,
    },
  ];

  if (compact) {
    return (
      <ProfileContainer compact>
        <ProfileHeader>
          <AvatarContainer levelColor={levelInfo.color}>
            <Avatar levelColor={levelInfo.color}>
              {levelInfo.emoji}
              <LevelBadge levelColor={levelInfo.color}>{currentLevel}</LevelBadge>
            </Avatar>
          </AvatarContainer>
          <UserInfo>
            <UserTitle levelColor={levelInfo.color}>{levelInfo.title}</UserTitle>
            <UserSubtitle>{languageXP.toLocaleString()} XP</UserSubtitle>
          </UserInfo>
        </ProfileHeader>

        <ProgressBarContainer>
          <ProgressBar
            percentage={xpProgress.percentage}
            levelColor={levelInfo.color}
            animate={animateProgress}
          />
        </ProgressBarContainer>
      </ProfileContainer>
    );
  }

  return (
    <ProfileContainer>
      <ProfileHeader>
        <AvatarContainer levelColor={levelInfo.color}>
          <Avatar levelColor={levelInfo.color}>
            {levelInfo.emoji}
            <LevelBadge levelColor={levelInfo.color}>{currentLevel}</LevelBadge>
          </Avatar>
        </AvatarContainer>
        <UserInfo>
          <UserTitle levelColor={levelInfo.color}>
            {levelInfo.title} {levelInfo.emoji}
          </UserTitle>
          <UserSubtitle>
            Level {currentLevel} • {languageXP.toLocaleString()} XP
          </UserSubtitle>
        </UserInfo>
      </ProfileHeader>

      <XPProgressSection>
        <ProgressLabel>
          <span>Progress to Level {currentLevel + 1}</span>
          <span>
            {xpProgress.current.toLocaleString()} / {xpProgress.needed.toLocaleString()} XP
          </span>
        </ProgressLabel>
        <ProgressBarContainer>
          <ProgressBar
            percentage={xpProgress.percentage}
            levelColor={levelInfo.color}
            animate={animateProgress}
          />
        </ProgressBarContainer>
      </XPProgressSection>

      <StatsGrid>
        <StatCard highlight={stats.learningStreak > 0}>
          <StatValue color="#f59e0b">{stats.learningStreak}</StatValue>
          <StatLabel>Day Streak</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue color="#10b981">{stats.masteredWords}</StatValue>
          <StatLabel>Mastered</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue color="#8b5cf6">{stats.perfectWords}</StatValue>
          <StatLabel>Perfect</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue color="#3b82f6">{stats.masteryRate}%</StatValue>
          <StatLabel>Mastery Rate</StatLabel>
        </StatCard>
      </StatsGrid>

      {showAchievements && (
        <AchievementsBadges>
          {achievements.map(achievement => (
            <AchievementBadge
              key={achievement.id}
              earned={achievement.achieved}
              color={achievement.color}
            >
              {achievement.label}
            </AchievementBadge>
          ))}
        </AchievementsBadges>
      )}

      {/* Learning Profile Section - Only show if requested */}
      {showLearningProfile && (
        <>
          {profileLoading && (
            <div
              style={{
                padding: '16px',
                marginTop: '16px',
                background: 'rgba(147, 51, 234, 0.1)',
                borderRadius: '12px',
                textAlign: 'center',
                color: '#9333ea',
              }}
            >
              🧠 Loading learning profile...
            </div>
          )}

          {profileError && (
            <div
              style={{
                padding: '16px',
                marginTop: '16px',
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '12px',
                textAlign: 'center',
                color: '#ef4444',
              }}
            >
              ⚠️ Error loading profile: {profileError}
            </div>
          )}

          {learningProfile && !profileLoading && (
            <LearningProfileDisplay profile={learningProfile} compact={compact} />
          )}

          {!learningProfile && !profileLoading && !profileError && (
            <div
              style={{
                padding: '16px',
                marginTop: '16px',
                background: 'rgba(147, 51, 234, 0.1)',
                borderRadius: '12px',
                textAlign: 'center',
                color: '#9333ea',
              }}
            >
              🤖 AI Learning Coach will create your profile after a few learning sessions
              <br />
              <small style={{ opacity: 0.7 }}>
                Debug: userId="{userId}", profileLoading={String(profileLoading)}
              </small>
              <br />
              <div
                style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}
              >
                <button
                  style={{
                    marginTop: '8px',
                    padding: '6px 12px',
                    background: '#9333ea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                  onClick={async () => {
                    console.log('Manually creating fresh profile...');
                    // Clear any existing incomplete profile first
                    const storage = new (
                      await import('../services/storage/userLearningProfile')
                    ).UserLearningProfileStorage();
                    try {
                      await storage.deleteProfile(userId);
                      console.log('Old profile cleared');
                    } catch (e) {
                      console.log('No old profile to clear or error clearing:', e);
                    }
                    // Trigger refresh to create new profile
                    refreshProfile();
                  }}
                >
                  🔄 Create New
                </button>
                <button
                  style={{
                    marginTop: '8px',
                    padding: '6px 12px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                  onClick={() => {
                    console.log('Running storage test...');
                    testLearningProfileStorage();
                  }}
                >
                  🧪 Test
                </button>
                <button
                  style={{
                    marginTop: '8px',
                    padding: '6px 12px',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                  onClick={() => {
                    console.log('Inspecting stored profile...');
                    inspectStoredProfile(userId);
                  }}
                >
                  🔍 Inspect
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </ProfileContainer>
  );
};

// Memoize to prevent expensive recalculations on every parent update
export default React.memo(UserProfile);
