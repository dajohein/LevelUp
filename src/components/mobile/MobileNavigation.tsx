import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';

// Animations
const slideInFromTop = keyframes`
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

// Main Navigation Container
const MobileNavigationBar = styled.nav`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: linear-gradient(
    135deg,
    ${props => props.theme.colors.surface} 0%,
    ${props => props.theme.colors.background} 100%
  );
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(76, 175, 80, 0.2);
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 ${props => props.theme.spacing.md};
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  animation: ${slideInFromTop} 0.3s ease-out;

  /* Safe area support */
  padding-top: env(safe-area-inset-top);
  height: calc(60px + env(safe-area-inset-top));

  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    height: 70px;
    height: calc(70px + env(safe-area-inset-top));
    padding: 0 ${props => props.theme.spacing.xl};
  }
`;

// Left Section
const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  flex: 1;
  min-width: 0; /* Allow flex shrinking */
`;

// Hamburger Menu Button
const HamburgerButton = styled.button<{ isOpen: boolean }>`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: ${props => props.theme.touchTarget.comfortable};
  height: ${props => props.theme.touchTarget.comfortable};
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  position: relative;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(76, 175, 80, 0.1);
    border-radius: 8px;
  }

  span {
    display: block;
    width: 20px;
    height: 2px;
    background: ${props => props.theme.colors.text};
    margin: 2px 0;
    transition: all 0.3s ease;
    transform-origin: center;

    &:nth-of-type(1) {
      transform: ${props => props.isOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none'};
    }

    &:nth-of-type(2) {
      opacity: ${props => props.isOpen ? '0' : '1'};
      transform: ${props => props.isOpen ? 'translateX(20px)' : 'none'};
    }

    &:nth-of-type(3) {
      transform: ${props => props.isOpen ? 'rotate(-45deg) translate(7px, -6px)' : 'none'};
    }
  }

  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    display: none;
  }
`;

// Back Button
const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.xs};
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid rgba(76, 175, 80, 0.3);
  color: ${props => props.theme.colors.primary};
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  border-radius: 20px;
  transition: all 0.3s ease;
  min-height: ${props => props.theme.touchTarget.minimum};
  white-space: nowrap;

  &:hover {
    background: rgba(76, 175, 80, 0.2);
    border-color: ${props => props.theme.colors.primary};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
  }

  &:active {
    transform: translateY(0);
  }

  .back-text {
    @media (max-width: ${props => props.theme.breakpoints.mobile}) {
      display: none;
    }
  }

  .back-icon {
    font-size: 1.2rem;
  }
`;

// Center Section
const CenterSection = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 2;
  min-width: 0;
`;

// Language/App Title
const TitleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  background: rgba(76, 175, 80, 0.1);
  padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  border-radius: 20px;
  border: 1px solid rgba(76, 175, 80, 0.2);
  max-width: 100%;
  overflow: hidden;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.xs};
    gap: ${props => props.theme.spacing.xs};
  }
`;

const FlagEmoji = styled.span`
  font-size: 1.3rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  flex-shrink: 0;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1.1rem;
  }
`;

const TitleText = styled.span`
  font-size: 1rem;
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 0.9rem;
    display: none; /* Hide on very small screens */
  }
`;

// Right Section
const RightSection = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex: 1;
  min-width: 0;
`;

// User Profile Button
const UserProfileButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.xs};
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid rgba(76, 175, 80, 0.2);
  border-radius: 25px;
  padding: 4px 8px;
  transition: all 0.3s ease;
  cursor: pointer;
  min-height: ${props => props.theme.touchTarget.minimum};

  &:hover {
    background: rgba(76, 175, 80, 0.15);
    border-color: rgba(76, 175, 80, 0.4);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(76, 175, 80, 0.2);
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 4px;
    border-radius: 50%;
    min-width: ${props => props.theme.touchTarget.minimum};
  }
`;

const UserAvatar = styled.div<{ levelColor: string }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    ${props => props.levelColor} 0%,
    ${props => props.theme.colors.secondary} 100%
  );
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  position: relative;
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    width: 28px;
    height: 28px;
    font-size: 0.8rem;
  }
`;

const UserStats = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    display: none;
  }
`;

const UserLevel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
`;

const UserXP = styled.div`
  font-size: 0.65rem;
  color: ${props => props.theme.colors.textSecondary};
`;

// Mobile Menu Overlay
const MobileMenuOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 999;
  opacity: ${props => props.isOpen ? 1 : 0};
  visibility: ${props => props.isOpen ? 'visible' : 'hidden'};
  transition: all 0.3s ease;

  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    display: none;
  }
`;

// Mobile Menu Panel
const MobileMenuPanel = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  right: 0;
  width: 280px;
  height: 100vh;
  background: ${props => props.theme.colors.surface};
  border-left: 1px solid rgba(76, 175, 80, 0.2);
  transform: ${props => props.isOpen ? 'translateX(0)' : 'translateX(100%)'};
  transition: transform 0.3s ease;
  z-index: 1001;
  overflow-y: auto;
  padding: ${props => props.theme.spacing.lg};
  padding-top: calc(60px + env(safe-area-inset-top) + ${props => props.theme.spacing.lg});

  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    display: none;
  }
`;

const MenuSection = styled.div`
  margin-bottom: ${props => props.theme.spacing.lg};
`;

const MenuSectionTitle = styled.h3`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 ${props => props.theme.spacing.sm} 0;
  padding: 0 ${props => props.theme.spacing.sm};
`;

const MenuItem = styled.button`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  width: 100%;
  padding: ${props => props.theme.spacing.sm};
  background: transparent;
  border: none;
  border-radius: ${props => props.theme.borderRadius.md};
  color: ${props => props.theme.colors.text};
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  min-height: ${props => props.theme.touchTarget.comfortable};

  &:hover {
    background: rgba(76, 175, 80, 0.1);
    color: ${props => props.theme.colors.primary};
  }

  &:active {
    background: rgba(76, 175, 80, 0.2);
  }
`;

const MenuIcon = styled.span`
  font-size: 1.2rem;
  width: 24px;
  text-align: center;
`;

interface MobileNavigationProps {
  showBackButton?: boolean;
  backButtonLabel?: string;
  onBackClick?: () => void;
  showUserProfile?: boolean;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  showBackButton = false,
  backButtonLabel = 'Back',
  onBackClick,
  showUserProfile = true,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { languageCode } = useParams<{ languageCode: string }>();

  // Get language info
  const languageConfig = {
    es: { name: 'Spanish', flag: '🇪🇸' },
    de: { name: 'German', flag: '🇩🇪' },
  };

  const currentLanguage = languageCode ? languageConfig[languageCode as keyof typeof languageConfig] : null;

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle back button
  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      navigate(-1);
    }
  };

  // Menu items
  const menuItems = [
    { icon: '🏠', label: 'Home', onClick: () => navigate('/') },
  ];

  return (
    <>
      <MobileNavigationBar>
        <LeftSection>
          <HamburgerButton
            isOpen={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span />
            <span />
            <span />
          </HamburgerButton>

          {showBackButton && (
            <BackButton onClick={handleBackClick}>
              <span className="back-icon">←</span>
              <span className="back-text">{backButtonLabel}</span>
            </BackButton>
          )}
        </LeftSection>

        <CenterSection>
          <TitleContainer>
            {currentLanguage ? (
              <>
                <FlagEmoji>{currentLanguage.flag}</FlagEmoji>
                <TitleText>{currentLanguage.name}</TitleText>
              </>
            ) : (
              <>
                <FlagEmoji>🚀</FlagEmoji>
                <TitleText>LevelUp</TitleText>
              </>
            )}
          </TitleContainer>
        </CenterSection>

        <RightSection>
          {showUserProfile && (
            <UserProfileButton onClick={() => navigate('/profile')}>
              <UserAvatar levelColor="#4CAF50">
                🎯
              </UserAvatar>
              <UserStats>
                <UserLevel>Profile</UserLevel>
                <UserXP>View Progress</UserXP>
              </UserStats>
            </UserProfileButton>
          )}
        </RightSection>
      </MobileNavigationBar>

      {/* Mobile Menu */}
      <MobileMenuOverlay
        isOpen={isMobileMenuOpen}
        onClick={() => setIsMobileMenuOpen(false)}
      />
      
      <MobileMenuPanel isOpen={isMobileMenuOpen}>
        <MenuSection>
          <MenuSectionTitle>Navigation</MenuSectionTitle>
          {menuItems.map((item, index) => (
            <MenuItem key={index} onClick={item.onClick}>
              <MenuIcon>{item.icon}</MenuIcon>
              {item.label}
            </MenuItem>
          ))}
        </MenuSection>

        {languageCode && (
          <MenuSection>
            <MenuSectionTitle>Language Actions</MenuSectionTitle>
            <MenuItem onClick={() => navigate(`/language/${languageCode}`)}>
              <MenuIcon>📚</MenuIcon>
              View Modules
            </MenuItem>
            <MenuItem onClick={() => navigate(`/sessions/${languageCode}`)}>
              <MenuIcon>🎯</MenuIcon>
              Quick Practice
            </MenuItem>
          </MenuSection>
        )}

        <MenuSection>
          <MenuSectionTitle>Account</MenuSectionTitle>
          <MenuItem onClick={() => navigate('/profile')}>
            <MenuIcon>👤</MenuIcon>
            View Profile
          </MenuItem>
          <MenuItem onClick={() => navigate('/settings')}>
            <MenuIcon>⚙️</MenuIcon>
            Settings
          </MenuItem>
        </MenuSection>
      </MobileMenuPanel>
    </>
  );
};