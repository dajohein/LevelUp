import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { MobileNavigation } from './mobile/MobileNavigation';
import { useViewport } from '../hooks/useViewport';
import { useNavigationProgress } from '../hooks/useNavigationProgress';
import { getBackButtonConfig, calculateProgressState } from '../utils/navigationLogic';
import {
  NavigationBar,
  BackButton,
  LanguageTitle,
  LanguageName,
  FlagEmoji,
  AppTitle,
  UserProfileCompact,
  UserAvatar,
  UserLevelBadge,
  UserStats,
  UserLevel,
  UserXP,
  DropdownMenu,
  DropdownItem,
  DropdownDivider,
  ProfileMenuContainer,
  RightSection,
} from './Navigation.styles';

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
  const { languageCode } = useParams<{ languageCode?: string }>();
  const { isMobile } = useViewport();
  const gameState = useSelector((state: RootState) => state.game);
  const language = languageCode || gameState.language;

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isDropdownOpen]);

  const backButtonConfig = getBackButtonConfig(location.pathname, language, languageCode, navigate);

  // Use mobile navigation on mobile devices
  if (isMobile) {
    return <MobileNavigation showUserProfile={showUserProfile} />;
  }

  // Desktop navigation
  const { isGlobalView, currentLevel, levelInfo, userProgress, totalXP } = useNavigationProgress(
    language,
    languageCode || null
  );
  const { hasProgress, hasNoProgress } = calculateProgressState(
    isGlobalView,
    showUserProfile,
    userProgress,
    languageCode || null
  );

  const handleProfileClick = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleDropdownItemClick = (action: () => void) => {
    action();
    setIsDropdownOpen(false);
  };

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
        {(hasProgress || hasNoProgress) && (
          <ProfileMenuContainer ref={dropdownRef}>
            <UserProfileCompact
              onClick={handleProfileClick}
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
              aria-label="User profile menu"
            >
              <UserAvatar levelColor={hasProgress ? levelInfo.color : '#4caf50'}>
                {hasProgress ? levelInfo.emoji : '👤'}
                {hasProgress && (
                  <UserLevelBadge levelColor={levelInfo.color}>{currentLevel}</UserLevelBadge>
                )}
              </UserAvatar>
              <UserStats>
                <UserLevel>{hasProgress ? levelInfo.title : 'Profile'}</UserLevel>
                <UserXP>{hasProgress ? `${totalXP.toLocaleString()} XP` : 'View Progress'}</UserXP>
              </UserStats>
            </UserProfileCompact>

            <DropdownMenu isOpen={isDropdownOpen} role="menu" aria-label="User navigation menu">
              <DropdownItem
                onClick={() => handleDropdownItemClick(() => navigate('/profile'))}
                role="menuitem"
              >
                👤 Profile
              </DropdownItem>
              <DropdownItem
                onClick={() => handleDropdownItemClick(() => navigate('/settings'))}
                role="menuitem"
              >
                ⚙️ Settings
              </DropdownItem>
              <DropdownDivider role="separator" />
              <DropdownItem
                onClick={() => handleDropdownItemClick(() => navigate('/developer-dashboard'))}
                role="menuitem"
              >
                🛠️ Developer Dashboard
              </DropdownItem>
              <DropdownDivider role="separator" />
              <DropdownItem
                onClick={() => handleDropdownItemClick(() => navigate('/'))}
                role="menuitem"
              >
                🌍 Change Language
              </DropdownItem>
            </DropdownMenu>
          </ProfileMenuContainer>
        )}
      </RightSection>
    </NavigationBar>
  );
};

// Memoize Navigation to prevent re-renders on every route change
export default React.memo(Navigation);
