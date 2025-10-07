import React from 'react';
import styled from '@emotion/styled';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { calculateLanguageXP, calculateCurrentLevel, getLevelInfo } from '../services/levelService';
import { wordProgressStorage } from '../services/storageService';
import { MobileNavigation } from './mobile/MobileNavigation';
import { useViewport } from '../hooks/useViewport';

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

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    height: 60px;
    padding: 0 ${props => props.theme.spacing.md};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    height: 56px;
    padding: 0 ${props => props.theme.spacing.sm};
  }
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
  min-height: ${props => props.theme.touchTarget.minimum};
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

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    min-width: 100px;
    padding: ${props => props.theme.spacing.sm};
    font-size: 0.85rem;
    
    span {
      display: none;
    }
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    min-width: 40px;
    padding: ${props => props.theme.spacing.xs};
    border-radius: 50%;
    
    &::before {
      content: '←';
      font-size: 1.2rem;
    }
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

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    gap: ${props => props.theme.spacing.sm};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  }
`;

const LanguageName = styled.span`
  font-size: 1.2rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text};

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: 1rem;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 0.9rem;
    display: none; /* Show only flag on very small screens */
  }
`;

const FlagEmoji = styled.span`
  font-size: 1.5rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1.3rem;
  }
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

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: 1.1rem;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1rem;
    /* Show only emoji on very small screens */
    &::after {
      content: '';
    }
    span {
      display: none;
    }
  }
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
  min-height: ${props => props.theme.touchTarget.minimum};

  &:hover {
    background: rgba(76, 175, 80, 0.15);
    border-color: rgba(76, 175, 80, 0.4);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(76, 175, 80, 0.2);
  }

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: 6px 12px;
    gap: ${props => props.theme.spacing.sm};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 4px 8px;
    border-radius: 50%;
    min-width: ${props => props.theme.touchTarget.minimum};
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

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    width: 32px;
    height: 32px;
    font-size: 1rem;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    width: 28px;
    height: 28px;
    font-size: 0.9rem;
  }
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

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    bottom: -4px;
    right: -4px;
    padding: 1px 6px;
    font-size: 0.7rem;
    min-width: 20px;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    bottom: -3px;
    right: -3px;
    padding: 1px 4px;
    font-size: 0.65rem;
    min-width: 18px;
  }
`;

const UserStats = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    display: none;
  }
`;

const UserLevel = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text};

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: 0.8rem;
  }
`;

const UserXP = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.colors.textSecondary};
  font-weight: 500;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: 0.7rem;
  }
`;

const SettingsButton = styled.button`
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid rgba(76, 175, 80, 0.3);
  color: ${props => props.theme.colors.primary};
  width: 40px;
  height: 40px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  transition: all 0.2s ease;
  margin-left: ${props => props.theme.spacing.sm};

  &:hover {
    background: rgba(76, 175, 80, 0.2);
    border-color: rgba(76, 175, 80, 0.5);
    transform: translateY(-1px);
  }

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    width: 36px;
    height: 36px;
    font-size: 1.1rem;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    display: none; /* Hide on mobile since mobile navigation has settings */
  }
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
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
  const { isMobile } = useViewport();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { language } = useSelector((state: RootState) => state.game);

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

  // Use mobile navigation on mobile devices
  if (isMobile) {
    return (
      <MobileNavigation
        showUserProfile={showUserProfile}
      />
    );
  }

  // Desktop navigation (existing code)
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

      <RightSection>
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

        <SettingsButton onClick={() => navigate('/settings')} title="Settings">
          ⚙️
        </SettingsButton>
      </RightSection>
    </NavigationBar>
  );
};
