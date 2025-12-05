import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { wordProgressStorage } from '../services/storageService';
import { calculateCurrentLevel, getLevelInfo, calculateLanguageXP } from '../services/levelService';

/**
 * Custom hook for navigation progress and level calculations
 * Extracted from Navigation.tsx for better separation of concerns
 */
export const useNavigationProgress = (
  language: string | null,
  currentLanguageCode: string | null
) => {
  const location = useLocation();

  const progressData = useMemo(() => {
    const isGlobalView = location.pathname === '/';
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

    return {
      isGlobalView,
      currentLevel,
      levelInfo,
      userProgress,
      totalXP,
    };
  }, [location.pathname, language, currentLanguageCode]);

  return progressData;
};
