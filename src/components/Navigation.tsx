import React from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { MobileNavigation } from './mobile/MobileNavigation';
import { useViewport } from '../hooks/useViewport';
import { useNavigationProgress } from '../hooks/useNavigationProgress';
import { useNavigationDisclosure } from '../hooks/useNavigationDisclosure';
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

  const { isOpen, setIsOpen, close, panelId, containerRef, triggerRef, panelRef } =
    useNavigationDisclosure(`${location.key}:${isMobile}`);

  const backButtonConfig = getBackButtonConfig(location.pathname, language, languageCode, navigate);

  const { isGlobalView, currentLevel, levelInfo, userProgress, totalXP } = useNavigationProgress(
    language,
    languageCode || null
  );

  // Use mobile navigation on mobile devices
  if (isMobile) {
    return <MobileNavigation showUserProfile={showUserProfile} />;
  }
  const { hasProgress, hasNoProgress } = calculateProgressState(
    isGlobalView,
    showUserProfile,
    userProgress,
    languageCode || null
  );

  return (
    <NavigationBar aria-label="Main navigation">
      {backButtonConfig && (
        <BackButton onClick={backButtonConfig.onClick} aria-label={backButtonConfig.label}>
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
          <ProfileMenuContainer ref={containerRef}>
            <UserProfileCompact
              ref={triggerRef}
              type="button"
              onClick={() => setIsOpen(open => !open)}
              aria-expanded={isOpen}
              aria-controls={panelId}
              aria-label="User navigation"
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

            <DropdownMenu ref={panelRef} id={panelId} isOpen={isOpen} hidden={!isOpen}>
              <DropdownItem to="/profile" onClick={close}>
                👤 Profile
              </DropdownItem>
              <DropdownItem to="/settings" onClick={close}>
                ⚙️ Settings
              </DropdownItem>
              <DropdownDivider aria-hidden="true" />
              <DropdownItem to="/developer-dashboard" onClick={close}>
                🛠️ Developer Dashboard
              </DropdownItem>
              <DropdownDivider aria-hidden="true" />
              <DropdownItem to="/" onClick={close}>
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
