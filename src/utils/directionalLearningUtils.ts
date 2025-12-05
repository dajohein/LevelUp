// Utility functions to determine when directional learning features should be shown
import { getModulesForLanguage } from '../services/moduleService';
import { DirectionalAnalyticsService } from '../services/dataMigrationService';

/**
 * Check if a language uses directional learning
 * Based on whether words in the language have explicit direction properties
 */
export const languageUsesDirectionalLearning = (languageCode: string): boolean => {
  try {
    const modules = getModulesForLanguage(languageCode);

    // Check if any words in any module have explicit direction
    for (const module of modules) {
      if (module.words) {
        const hasDirectionalWords = module.words.some(
          (word: any) =>
            word.direction === 'term-to-definition' || word.direction === 'definition-to-term'
        );
        if (hasDirectionalWords) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.warn(`Error checking directional learning for ${languageCode}:`, error);
    return false;
  }
};

/**
 * Check if a specific module uses directional learning
 */
export const moduleUsesDirectionalLearning = (languageCode: string, moduleId: string): boolean => {
  try {
    const modules = getModulesForLanguage(languageCode);
    const module = modules.find((m: any) => m.id === moduleId);

    if (!module || !module.words) {
      return false;
    }

    return module.words.some(
      (word: any) =>
        word.direction === 'term-to-definition' || word.direction === 'definition-to-term'
    );
  } catch (error) {
    console.warn(`Error checking directional learning for module ${moduleId}:`, error);
    return false;
  }
};

/**
 * Check if a user has meaningful directional progress data
 * (enough practice to make directional analytics useful)
 */
export const userHasMeaningfulDirectionalData = (languageCode: string): boolean => {
  try {
    const analytics =
      DirectionalAnalyticsService.calculateLanguageDirectionalAnalytics(languageCode);

    // Consider meaningful if:
    // 1. Has directional data for multiple words
    // 2. Has enough practice sessions to be statistically relevant
    // 3. Language actually uses directional learning
    return (
      analytics.wordsWithDirectionalData >= 3 &&
      analytics.hasExplicitDirectionalLearning &&
      languageUsesDirectionalLearning(languageCode)
    );
  } catch (error) {
    console.warn(`Error checking meaningful directional data for ${languageCode}:`, error);
    return false;
  }
};

/**
 * Get directional learning status for a language
 */
export const getDirectionalLearningStatus = (
  languageCode: string
): {
  isSupported: boolean;
  hasMeaningfulData: boolean;
  shouldShowAnalytics: boolean;
  shouldShowHints: boolean;
} => {
  const isSupported = languageUsesDirectionalLearning(languageCode);
  const hasMeaningfulData = userHasMeaningfulDirectionalData(languageCode);

  return {
    isSupported,
    hasMeaningfulData,
    shouldShowAnalytics: isSupported && hasMeaningfulData,
    shouldShowHints: isSupported, // Show hints if the language supports it, even without data yet
  };
};

/**
 * Check if a specific word should show directional hints
 */
export const shouldShowDirectionalHint = (word: any): boolean => {
  // Show hint only if word has an explicit direction property
  return !!(
    word?.direction &&
    (word.direction === 'term-to-definition' || word.direction === 'definition-to-term')
  );
};

export default {
  languageUsesDirectionalLearning,
  moduleUsesDirectionalLearning,
  userHasMeaningfulDirectionalData,
  getDirectionalLearningStatus,
  shouldShowDirectionalHint,
};
