import React from 'react';
import styled from '@emotion/styled';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { calculateLanguageXP, calculateCurrentLevel, getLevelInfo } from '../services/levelService';
import { wordProgressStorage } from '../services/storageService';

const NavigationBar = styled.nav`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 70px;
  background: linear-gradient(
    135deg,
    ${props => props.theme.colors.surface} 0%,
    ${props => props.theme.colors.background} 100%
  );
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(76, 175, 80, 0.2);
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 ${props => props.theme.spacing.xl};
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
`;

const BackButton = styled.button`
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid rgba(76, 175, 80, 0.3);
  color: ${props => props.theme.colors.primary};
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  border-radius: 25px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  min-width: 120px;
  justify-content: center;

  &:hover {
    background: rgba(76, 175, 80, 0.2);
    border-color: ${props => props.theme.colors.primary};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`;

const LanguageTitle = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.md};
  background: rgba(76, 175, 80, 0.1);
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
  border-radius: 30px;
  border: 1px solid rgba(76, 175, 80, 0.2);
`;

const LanguageName = styled.span`
  font-size: 1.2rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
`;

const FlagEmoji = styled.span`
  font-size: 1.5rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
`;

const AppTitle = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  font-size: 1.3rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  background: linear-gradient(
    135deg,
    ${props => props.theme.colors.primary} 0%,
    ${props => props.theme.colors.secondary} 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const UserProfileCompact = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.md};
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid rgba(76, 175, 80, 0.2);
  border-radius: 35px;
  padding: 8px 16px;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    background: rgba(76, 175, 80, 0.15);
    border-color: rgba(76, 175, 80, 0.4);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(76, 175, 80, 0.2);
  }
`;

const UserAvatar = styled.div<{ levelColor: string }>`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    ${props => props.levelColor} 0%,
    ${props => props.theme.colors.secondary} 100%
  );
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  position: relative;
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
`;

const UserLevelBadge = styled.div<{ levelColor: string }>`
  position: absolute;
  bottom: -6px;
  right: -6px;
  background: linear-gradient(
    135deg,
    ${props => props.levelColor} 0%,
    ${props => props.theme.colors.secondary} 100%
  );
  color: white;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 0.75rem;
  font-weight: bold;
  border: 2px solid ${props => props.theme.colors.surface};
  min-width: 24px;
  text-align: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
`;

const UserStats = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
`;

const UserLevel = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
`;

const UserXP = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme.colors.textSecondary};
`;

interface NavigationProps {
  languageName?: string;
  languageFlag?: string;
  showUserProfile?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  languageName,
  languageFlag,
  showUserProfile = true,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { language } = useSelector((state: RootState) => state.game);

  // Determine if we should show global or language-specific stats
  const isGlobalView = location.pathname === '/';
  const currentLanguageCode = language;

  let currentLevel = 1;
  let levelInfo = getLevelInfo(1);
  let userProgress = {};
  let totalXP = 0;

  if (isGlobalView) {
    // On languages overview - show global stats across all languages
    const allProgressData = wordProgressStorage.loadAll();

    // Calculate total XP across all languages
    Object.values(allProgressData).forEach(languageProgress => {
      if (languageProgress && typeof languageProgress === 'object') {
        totalXP += Object.values(languageProgress).reduce(
          (sum, progress) => sum + (progress?.xp || 0),
          0
        );
      }
    });

    // Use global XP to determine level
    currentLevel = calculateCurrentLevel(totalXP);
    levelInfo = getLevelInfo(currentLevel);

    // Check if user has any progress at all
    const hasAnyProgress = totalXP > 0;
    userProgress = hasAnyProgress ? { hasProgress: true } : {};
  } else if (currentLanguageCode) {
    // On language-specific pages - show language-specific stats
    userProgress = wordProgressStorage.load(currentLanguageCode);
    const languageXP = calculateLanguageXP(userProgress, currentLanguageCode);
    totalXP = languageXP;
    currentLevel = calculateCurrentLevel(languageXP);
    levelInfo = getLevelInfo(currentLevel);
  }

  // Smart navigation based on current route
  const getBackButtonConfig = () => {
    const path = location.pathname;
    const { languageCode } = params;

    // If we're on the root path (language selection), don't show back button
    if (path === '/') {
      return null;
    }

    // If we're in a specific module progress view (/language/de/grundwortschatz)
    if (path.match(/^\/language\/[^\/]+\/[^\/]+$/)) {
      return {
        label: 'Modules',
        onClick: () => navigate(`/language/${languageCode}`),
      };
    }

    // If we're in a language modules view (/language/de)
    if (path.match(/^\/language\/[^\/]+$/)) {
      return {
        label: 'Languages',
        onClick: () => navigate('/'),
      };
    }

    // If we're in sessions or game views with language context
    if (languageCode && (path.includes('/sessions') || path.includes('/game'))) {
      return {
        label: 'Modules',
        onClick: () => navigate(`/language/${languageCode}`),
      };
    }

    // Default to language selection
    return {
      label: 'Languages',
      onClick: () => navigate('/'),
    };
  };

  const backButtonConfig = getBackButtonConfig();

  return (
    <NavigationBar>
      {backButtonConfig && (
        <BackButton onClick={backButtonConfig.onClick}>
          ← <span>{backButtonConfig.label}</span>
        </BackButton>
      )}

      {languageName && languageFlag && (
        <LanguageTitle>
          <FlagEmoji>{languageFlag}</FlagEmoji>
          <LanguageName>{languageName}</LanguageName>
        </LanguageTitle>
      )}

      {!languageName && !languageFlag && <AppTitle>🚀 LevelUp</AppTitle>}

      {showUserProfile &&
        ((isGlobalView && Object.keys(userProgress).length > 0) ||
          (!isGlobalView && currentLanguageCode && Object.keys(userProgress).length > 0)) && (
          <UserProfileCompact onClick={() => navigate('/profile')}>
            <UserAvatar levelColor={levelInfo.color}>
              {levelInfo.emoji}
              <UserLevelBadge levelColor={levelInfo.color}>{currentLevel}</UserLevelBadge>
            </UserAvatar>
            <UserStats>
              <UserLevel>{levelInfo.title}</UserLevel>
              <UserXP>{totalXP.toLocaleString()} XP</UserXP>
            </UserStats>
          </UserProfileCompact>
        )}

      {showUserProfile &&
        ((isGlobalView && Object.keys(userProgress).length === 0) ||
          (!isGlobalView && (!Object.keys(userProgress).length || !currentLanguageCode))) && (
          <UserProfileCompact onClick={() => navigate('/profile')}>
            <UserAvatar levelColor="#4caf50">👤</UserAvatar>
            <UserStats>
              <UserLevel>Profile</UserLevel>
              <UserXP>View Progress</UserXP>
            </UserStats>
          </UserProfileCompact>
        )}

      {!showUserProfile && <AppTitle>🚀 LevelUp</AppTitle>}
    </NavigationBar>
  );
};
