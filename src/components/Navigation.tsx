import React, { useState, useRef, useEffect } from 'react';
import styled from '@emotion/styled';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { calculateLanguageXP, calculateCurrentLevel, getLevelInfo } from '../services/levelService';
import { wordProgressStorage } from '../services/storageService';
import { MobileNavigation } from './mobile/MobileNavigation';
import { useViewport } from '../hooks/useViewport';

// Constants for better maintainability
const Z_INDEX = {
  NAVIGATION: 1000,
  DROPDOWN: 1001,
} as const;

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
  z-index: ${Z_INDEX.NAVIGATION};

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
  border-radius: ${props => props.theme.borderRadius.md};
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  text-decoration: none;
  line-height: 1;

  &:hover {
    background: rgba(76, 175, 80, 0.2);
    border-color: rgba(76, 175, 80, 0.5);
    transform: translateY(-1px);
  }

  span {
    font-size: 0.85rem;

    @media (max-width: ${props => props.theme.breakpoints.tablet}) {
      display: none;
    }
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
    font-size: 0.8rem;
    min-width: ${props => props.theme.touchTarget.minimum};
    justify-content: center;
    
    &::before {
      content: '';
    }
    span {
      display: none;
    }
  }
`;

const LanguageTitle = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.md};
  font-size: 1.2rem;
  font-weight: 600;
  color: ${props => props.theme.colors.primary};

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: 1.1rem;
    gap: ${props => props.theme.spacing.sm};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1rem;
  }
`;

const LanguageName = styled.span`
  background: linear-gradient(
    135deg,
    ${props => props.theme.colors.primary} 0%,
    ${props => props.theme.colors.secondary} 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 700;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 0.9rem;
  }
`;

const FlagEmoji = styled.span`
  font-size: 1.5rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1.3rem;
  }
`;

const AppTitle = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(
    135deg,
    ${props => props.theme.colors.primary} 0%,
    ${props => props.theme.colors.secondary} 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: 1.3rem;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1.2rem;
  }
`;

const UserProfileCompact = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  border-radius: ${props => props.theme.borderRadius.md};
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(76, 175, 80, 0.05);
  border: 1px solid rgba(76, 175, 80, 0.2);

  &:hover {
    background: rgba(76, 175, 80, 0.1);
    transform: translateY(-1px);
  }

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    gap: ${props => props.theme.spacing.sm};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
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
  font-size: 0.7rem;
  font-weight: 700;
  border: 2px solid white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  line-height: 1;
  min-width: 20px;
  text-align: center;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    bottom: -4px;
    right: -4px;
    padding: 1px 6px;
    font-size: 0.65rem;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    bottom: -3px;
    right: -3px;
    padding: 1px 4px;
    font-size: 0.6rem;
  }
`;

const UserStats = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    gap: 1px;
  }
`;

const UserLevel = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  line-height: 1.2;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: 0.85rem;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
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

const DropdownMenu = styled.div<{ isOpen: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: ${props => props.theme.colors.surface};
  border: 1px solid rgba(76, 175, 80, 0.2);
  border-radius: ${props => props.theme.borderRadius.lg};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(12px);
  min-width: 200px;
  z-index: ${Z_INDEX.DROPDOWN};
  transform: ${props => props.isOpen ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.95)'};
  opacity: ${props => props.isOpen ? 1 : 0};
  visibility: ${props => props.isOpen ? 'visible' : 'hidden'};
  transition: all 0.2s ease;
  
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    display: none; /* Use mobile navigation instead */
  }
`;

const DropdownItem = styled.button`
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: ${props => props.theme.colors.text};
  font-size: 0.9rem;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: background 0.2s ease;
  
  &:first-of-type {
    border-radius: ${props => props.theme.borderRadius.lg} ${props => props.theme.borderRadius.lg} 0 0;
  }
  
  &:last-of-type {
    border-radius: 0 0 ${props => props.theme.borderRadius.lg} ${props => props.theme.borderRadius.lg};
  }
  
  &:hover,
  &:focus-visible {
    background: rgba(76, 175, 80, 0.1);
    outline: none;
  }
  
  &:focus-visible {
    box-shadow: inset 0 0 0 2px rgba(76, 175, 80, 0.3);
  }
`;

const DropdownDivider = styled.div`
  height: 1px;
  background: rgba(76, 175, 80, 0.2);
  margin: 4px 0;
`;

const ProfileMenuContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
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
  showUserProfile = true 
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

  const getBackButtonConfig = () => {
    const path = location.pathname;
    
    // No back button on the main languages page
    if (path === '/') {
      return null;
    }

    // From profile, always go back to current language or languages
    if (path === '/profile') {
      if (language) {
        return {
          label: 'Back',
          onClick: () => navigate(`/language/${language}`),
        };
      }
      return {
        label: 'Languages',
        onClick: () => navigate('/'),
      };
    }

    // From settings, go back to where we came from
    if (path === '/settings') {
      return {
        label: 'Back',
        onClick: () => navigate(-1),
      };
    }

    // From game or session pages, go back to language modules
    if (path.includes('/game') || path.includes('/session')) {
      if (languageCode) {
        return {
          label: 'Modules',
          onClick: () => navigate(`/language/${languageCode}`),
        };
      }
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

  // Desktop navigation
  const isGlobalView = location.pathname === '/';
  const currentLanguageCode = language;

  let currentLevel = 1;
  let levelInfo = getLevelInfo(1);
  let userProgress = {};
  let totalXP = 0;

  try {
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
      userProgress = wordProgressStorage.load(currentLanguageCode) || {};
      const languageXP = calculateLanguageXP(userProgress, currentLanguageCode);
      totalXP = languageXP;
      currentLevel = calculateCurrentLevel(languageXP);
      levelInfo = getLevelInfo(currentLevel);
    }
  } catch (error) {
    console.warn('Failed to load user progress data:', error);
    // Fallback to defaults already set above
  }

  const handleProfileClick = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleDropdownItemClick = (action: () => void) => {
    action();
    setIsDropdownOpen(false);
  };

  const hasProgress = showUserProfile &&
    ((isGlobalView && Object.keys(userProgress).length > 0) ||
      (!isGlobalView && currentLanguageCode && Object.keys(userProgress).length > 0));

  const hasNoProgress = showUserProfile &&
    ((isGlobalView && Object.keys(userProgress).length === 0) ||
      (!isGlobalView && (!Object.keys(userProgress).length || !currentLanguageCode)));

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
              <UserAvatar levelColor={hasProgress ? levelInfo.color : "#4caf50"}>
                {hasProgress ? levelInfo.emoji : "👤"}
                {hasProgress && (
                  <UserLevelBadge levelColor={levelInfo.color}>{currentLevel}</UserLevelBadge>
                )}
              </UserAvatar>
              <UserStats>
                <UserLevel>{hasProgress ? levelInfo.title : "Profile"}</UserLevel>
                <UserXP>{hasProgress ? `${totalXP.toLocaleString()} XP` : "View Progress"}</UserXP>
              </UserStats>
            </UserProfileCompact>
            
            <DropdownMenu 
              isOpen={isDropdownOpen}
              role="menu"
              aria-label="User navigation menu"
            >
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