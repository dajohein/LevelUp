import styled from '@emotion/styled';

// Constants for better maintainability
export const Z_INDEX = {
  NAVIGATION: 1000,
  DROPDOWN: 1001,
} as const;

export const NavigationBar = styled.nav`
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

export const BackButton = styled.button`
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

export const LanguageTitle = styled.div`
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

export const LanguageName = styled.span`
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

export const FlagEmoji = styled.span`
  font-size: 1.5rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1.3rem;
  }
`;

export const AppTitle = styled.div`
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

export const UserProfileCompact = styled.div`
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

export const UserAvatar = styled.div<{ levelColor: string }>`
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

export const UserLevelBadge = styled.div<{ levelColor: string }>`
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

export const UserStats = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    gap: 1px;
  }
`;

export const UserLevel = styled.div`
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

export const UserXP = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.colors.textSecondary};
  font-weight: 500;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: 0.7rem;
  }
`;

export const DropdownMenu = styled.div<{ isOpen: boolean }>`
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
  transform: ${props =>
    props.isOpen ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.95)'};
  opacity: ${props => (props.isOpen ? 1 : 0)};
  visibility: ${props => (props.isOpen ? 'visible' : 'hidden')};
  transition: all 0.2s ease;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    display: none; /* Use mobile navigation instead */
  }
`;

export const DropdownItem = styled.button`
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
    border-radius: ${props => props.theme.borderRadius.lg} ${props => props.theme.borderRadius.lg} 0
      0;
  }

  &:last-of-type {
    border-radius: 0 0 ${props => props.theme.borderRadius.lg}
      ${props => props.theme.borderRadius.lg};
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

export const DropdownDivider = styled.div`
  height: 1px;
  background: rgba(76, 175, 80, 0.2);
  margin: 4px 0;
`;

export const ProfileMenuContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

export const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
`;
