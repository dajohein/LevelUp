import { WordProgress } from '../store/types';
import { words } from './wordService';

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
  const languageWords = words[languageCode]?.words || [];
  return languageWords.reduce((total, word) => {
    const progress = wordProgress[word.id];
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
export const calculateXPForNextLevel = (totalXP: number): { current: number; needed: number; percentage: number } => {
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
    percentage
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

// Calculate learning streak (consecutive days with progress)
export const calculateLearningStreak = (wordProgress: Record<string, WordProgress>): number => {
  const progressDates = Object.values(wordProgress)
    .map(progress => progress.lastPracticed)
    .filter(Boolean)
    .map(date => new Date(date!).toDateString())
    .filter((date, index, array) => array.indexOf(date) === index) // Remove duplicates
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime()); // Sort by date descending

  if (progressDates.length === 0) return 0;

  let streak = 1;
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

  // Check if user practiced today or yesterday (to allow for timezone differences)
  if (progressDates[0] !== today && progressDates[0] !== yesterday) {
    return 0;
  }

  // Count consecutive days
  for (let i = 1; i < progressDates.length; i++) {
    const currentDate = new Date(progressDates[i - 1]);
    const previousDate = new Date(progressDates[i]);
    const dayDifference = Math.floor((currentDate.getTime() - previousDate.getTime()) / (24 * 60 * 60 * 1000));

    if (dayDifference === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

// Calculate various achievement metrics for a specific language
export const calculateLanguageAchievementStats = (
  wordProgress: Record<string, WordProgress>,
  languageCode: string
) => {
  const languageWords = words[languageCode]?.words || [];
  const languageWordIds = languageWords.map(w => w.id);
  
  // Filter progress to only include words from this language
  const languageProgress: Record<string, WordProgress> = Object.entries(wordProgress)
    .filter(([wordId]) => languageWordIds.includes(wordId))
    .reduce((acc, [wordId, progress]) => ({ ...acc, [wordId]: progress }), {});

  const totalWords = languageWordIds.length;
  const studiedWords = Object.keys(languageProgress).length;
  const masteredWords = Object.values(languageProgress).filter(p => p.xp >= 80).length;
  const perfectWords = Object.values(languageProgress).filter(p => p.xp >= 100).length;
  const languageXP = calculateLanguageXP(wordProgress, languageCode);
  const currentLevel = calculateCurrentLevel(languageXP);
  const learningStreak = calculateLearningStreak(languageProgress);

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
  const learningStreak = calculateLearningStreak(wordProgress);

  return {
    totalWords,
    masteredWords,
    perfectWords,
    totalXP,
    currentLevel,
    learningStreak,
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