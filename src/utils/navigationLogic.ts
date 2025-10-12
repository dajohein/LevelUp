/**
 * Navigation logic utilities
 * Extracted from Navigation.tsx for better separation of concerns
 */

import { NavigateFunction } from 'react-router-dom';

interface BackButtonConfig {
  label: string;
  onClick: () => void;
}

/**
 * Determines the back button configuration based on current route
 * @param pathname - Current route pathname
 * @param language - Current selected language
 * @param languageCode - Language code from URL params
 * @param navigate - React Router navigate function
 * @returns Back button configuration or null if no back button needed
 */
export const getBackButtonConfig = (
  pathname: string,
  language: string | null,
  languageCode: string | undefined,
  navigate: NavigateFunction
): BackButtonConfig | null => {
  // No back button on the main languages page
  if (pathname === '/') {
    return null;
  }

  // From profile, always go back to current language or languages
  if (pathname === '/profile') {
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
  if (pathname === '/settings') {
    return {
      label: 'Back',
      onClick: () => navigate(-1),
    };
  }

  // From game or session pages, go back to language modules
  if (pathname.includes('/game') || pathname.includes('/session')) {
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
  if (languageCode && (pathname.includes('/sessions') || pathname.includes('/game'))) {
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

/**
 * Calculates user progress state for navigation display
 * @param isGlobalView - Whether viewing global (all languages) or specific language
 * @param showUserProfile - Whether to show user profile info
 * @param userProgress - User's progress data
 * @param currentLanguageCode - Current language code
 * @returns Object with hasProgress and hasNoProgress flags
 */
export const calculateProgressState = (
  isGlobalView: boolean,
  showUserProfile: boolean,
  userProgress: Record<string, any>,
  currentLanguageCode: string | null
) => {
  const hasProgress = showUserProfile &&
    ((isGlobalView && Object.keys(userProgress).length > 0) ||
      (!isGlobalView && currentLanguageCode && Object.keys(userProgress).length > 0));

  const hasNoProgress = showUserProfile &&
    ((isGlobalView && Object.keys(userProgress).length === 0) ||
      (!isGlobalView && (!Object.keys(userProgress).length || !currentLanguageCode)));

  return { hasProgress, hasNoProgress };
};