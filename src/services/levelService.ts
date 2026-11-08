import { WordProgress } from '../store/types';
import { getModulesForLanguage } from './moduleService';
import { learningCacheService } from './cacheService';
import { calculatePracticeStreak } from './practiceMetrics';

// Level progression constants
export const LEVEL_CONFIG = {
  XP_PER_LEVEL: 1000, // XP needed for each level
  MAX_LEVEL: 100,
  LEVEL_MULTIPLIER: 1.2, // XP requirement increases by 20% each level
};

// Level thresholds and titles
export const LEVEL_TITLES = {
  1: { title: 'Rookie', emoji: '🌱', color: '#10b981' },
  5: { title: 'Student', emoji: '📚', color: '#3b82f6' },
  10: { title: 'Scholar', emoji: '🎓', color: '#8b5cf6' },
  15: { title: 'Linguist', emoji: '🗣️', color: '#f59e0b' },
  20: { title: 'Polyglot', emoji: '🌍', color: '#ef4444' },
  30: { title: 'Expert', emoji: '⭐', color: '#ec4899' },
  40: { title: 'Master', emoji: '🏆', color: '#f97316' },
  50: { title: 'Grandmaster', emoji: '👑', color: '#84cc16' },
  75: { title: 'Legend', emoji: '🔥', color: '#06b6d4' },
  100: { title: 'Transcendent', emoji: '✨', color: '#6366f1' },
} as const;

// Calculate total XP for a specific language
export const calculateLanguageXP = (
  wordProgress: Record<string, WordProgress>,
  languageCode: string
): number => {
  const modules = getModulesForLanguage(languageCode);
  const languageWords = modules.flatMap(module => module.words);

  return languageWords.reduce((total, word) => {
    // Try multiple strategies to find the progress for this word
    let progress: WordProgress | undefined = wordProgress[word.id]; // Strategy 1: Direct match

    if (!progress) {
      // Strategy 2: Find by wordId property
      progress = Object.values(wordProgress).find(p => p.wordId === word.id);
    }

    if (!progress) {
      // Strategy 3: Handle language-prefixed IDs (e.g., "de-0" -> "1")
      progress = Object.values(wordProgress).find(p => {
        if (p.wordId) {
          const strippedId = p.wordId.replace(`${languageCode}-`, '');
          return parseInt(word.id) === parseInt(strippedId) + 1;
        }
        return false;
      });
    }

    return total + (progress ? progress.xp : 0);
  }, 0);
};

// Calculate total XP across all languages (for global stats if needed)
export const calculateTotalXP = (wordProgress: Record<string, WordProgress>): number => {
  return Object.values(wordProgress).reduce((total, progress) => total + progress.xp, 0);
};

// Calculate current level based on total XP
export const calculateCurrentLevel = (totalXP: number): number => {
  let level = 1;
  let xpRequired = LEVEL_CONFIG.XP_PER_LEVEL;
  let accumulatedXP = 0;

  while (totalXP >= accumulatedXP + xpRequired && level < LEVEL_CONFIG.MAX_LEVEL) {
    accumulatedXP += xpRequired;
    level++;
    xpRequired = Math.floor(xpRequired * LEVEL_CONFIG.LEVEL_MULTIPLIER);
  }

  return level;
};

// Calculate XP needed for next level
export const calculateXPForNextLevel = (
  totalXP: number
): { current: number; needed: number; percentage: number } => {
  const currentLevel = calculateCurrentLevel(totalXP);

  if (currentLevel >= LEVEL_CONFIG.MAX_LEVEL) {
    return { current: totalXP, needed: 0, percentage: 100 };
  }

  let xpRequired = LEVEL_CONFIG.XP_PER_LEVEL;
  let accumulatedXP = 0;

  // Calculate accumulated XP for current level
  for (let i = 1; i < currentLevel; i++) {
    accumulatedXP += xpRequired;
    xpRequired = Math.floor(xpRequired * LEVEL_CONFIG.LEVEL_MULTIPLIER);
  }

  const currentLevelXP = totalXP - accumulatedXP;
  const nextLevelXPRequired = Math.floor(xpRequired);
  const percentage = Math.min(100, (currentLevelXP / nextLevelXPRequired) * 100);

  return {
    current: currentLevelXP,
    needed: nextLevelXPRequired,
    percentage,
  };
};

// Get level title and styling
export const getLevelInfo = (level: number) => {
  // Find the highest level title that the user has achieved
  const achievedTitles = Object.entries(LEVEL_TITLES)
    .filter(([levelThreshold]) => level >= parseInt(levelThreshold))
    .sort(([a], [b]) => parseInt(b) - parseInt(a));

  if (achievedTitles.length > 0) {
    const [, info] = achievedTitles[0];
    return info;
  }

  // Default for level 1
  return LEVEL_TITLES[1];
};

export const calculateLearningStreak = (practiceDays: readonly string[]): number =>
  calculatePracticeStreak(practiceDays);

// Calculate various achievement metrics for a specific language
export const calculateLanguageAchievementStats = (
  wordProgress: Record<string, WordProgress>,
  languageCode: string
) => {
  const modules = getModulesForLanguage(languageCode);
  const languageWords = modules.flatMap(module => module.words);
  const languageWordIds = languageWords.map(w => w.id);

  // Filter progress to only include words from this language
  const languageProgress: Record<string, WordProgress> = {};
  for (const [key, progress] of Object.entries(wordProgress)) {
    if (languageWordIds.includes(key)) {
      languageProgress[key] = progress;
    }
  }

  const totalWords = languageWordIds.length;
  const studiedWords = Object.keys(languageProgress).length;
  const masteredWords = Object.values(languageProgress).filter(p => p.xp >= 80).length;
  const perfectWords = Object.values(languageProgress).filter(p => p.xp >= 100).length;

  const languageXP = calculateLanguageXP(wordProgress, languageCode);
  const currentLevel = calculateCurrentLevel(languageXP);
  const practiceDays = learningCacheService.getAnalytics(languageCode)?.practiceDays || [];
  const learningStreak = calculateLearningStreak(practiceDays);

  return {
    totalWords,
    studiedWords,
    masteredWords,
    perfectWords,
    totalXP: languageXP,
    currentLevel,
    learningStreak,
    masteryRate: studiedWords > 0 ? Math.round((masteredWords / totalWords) * 100) : 0,
    perfectRate: studiedWords > 0 ? Math.round((perfectWords / totalWords) * 100) : 0,
    studyRate: Math.round((studiedWords / totalWords) * 100),
  };
};

// Calculate various achievement metrics (global - for backward compatibility)
export const calculateAchievementStats = (wordProgress: Record<string, WordProgress>) => {
  const totalWords = Object.keys(wordProgress).length;
  const masteredWords = Object.values(wordProgress).filter(p => p.xp >= 80).length;
  const perfectWords = Object.values(wordProgress).filter(p => p.xp >= 100).length;
  const totalXP = calculateTotalXP(wordProgress);
  const currentLevel = calculateCurrentLevel(totalXP);
  return {
    totalWords,
    masteredWords,
    perfectWords,
    totalXP,
    currentLevel,
    learningStreak: 0,
    masteryRate: totalWords > 0 ? Math.round((masteredWords / totalWords) * 100) : 0,
    perfectRate: totalWords > 0 ? Math.round((perfectWords / totalWords) * 100) : 0,
  };
};

// Check if user leveled up (for animations) - per language
export const checkLanguageLevelUp = (
  oldProgress: Record<string, WordProgress>,
  newProgress: Record<string, WordProgress>,
  languageCode: string
): boolean => {
  const oldXP = calculateLanguageXP(oldProgress, languageCode);
  const newXP = calculateLanguageXP(newProgress, languageCode);
  return calculateCurrentLevel(newXP) > calculateCurrentLevel(oldXP);
};

// Check if user leveled up (for animations) - global
export const checkLevelUp = (oldXP: number, newXP: number): boolean => {
  return calculateCurrentLevel(newXP) > calculateCurrentLevel(oldXP);
};
