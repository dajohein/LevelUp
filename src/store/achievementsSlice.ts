import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Achievement, AchievementsState } from './types';
import { achievementsStorage } from '../services/storageService';
import { logger } from '../services/logger';

// Re-export type for convenience
export type { Achievement };

const initialAchievements: Achievement[] = [
  {
    id: 'first-correct',
    title: 'First Steps',
    description: 'Get your first word correct',
    icon: '🎯',
    condition: { type: 'correctAnswers', threshold: 1 },
  },
  {
    id: 'streak-3',
    title: 'On a Roll',
    description: 'Get a streak of 3 correct answers',
    icon: '🔥',
    condition: { type: 'streak', threshold: 3 },
  },
  {
    id: 'streak-5',
    title: 'Unstoppable',
    description: 'Get a streak of 5 correct answers',
    icon: '⚡',
    condition: { type: 'streak', threshold: 5 },
  },
  {
    id: 'score-100',
    title: 'Century',
    description: 'Reach a score of 100 points',
    icon: '💯',
    condition: { type: 'score', threshold: 100 },
  },
  {
    id: 'level-3',
    title: 'Advanced Learner',
    description: 'Master words at level 3',
    icon: '📚',
    condition: { type: 'wordLevel', threshold: 3 },
  },
];

// Load persisted achievements
const loadPersistedAchievements = (): Partial<AchievementsState> => {
  try {
    const savedData = achievementsStorage.load();
    
    // Update achievements with unlocked timestamps
    const updatedAchievements = initialAchievements.map(achievement => {
      if (savedData.unlockedAchievements.includes(achievement.id)) {
        return {
          ...achievement,
          unlockedAt: achievement.unlockedAt || new Date().toISOString()
        };
      }
      return achievement;
    });

    return {
      achievements: updatedAchievements,
      unlockedAchievements: savedData.unlockedAchievements,
      latestUnlock: undefined, // Don't restore latest unlock - it's a UI state
    };
  } catch (error) {
    logger.error('Failed to load persisted achievements:', error);
    return {};
  }
};

const persistedAchievements = loadPersistedAchievements();

const initialState: AchievementsState = {
  achievements: initialAchievements,
  unlockedAchievements: [],
  ...persistedAchievements,
};

export const achievementsSlice = createSlice({
  name: 'achievements',
  initialState,
  reducers: {
    unlockAchievement: (state, action: PayloadAction<string>) => {
      const achievementId = action.payload;
      if (!state.unlockedAchievements.includes(achievementId)) {
        state.unlockedAchievements.push(achievementId);
        const achievement = state.achievements.find(a => a.id === achievementId);
        if (achievement) {
          achievement.unlockedAt = new Date().toISOString();
          state.latestUnlock = achievement;
        }
      }
    },
    clearLatestUnlock: state => {
      state.latestUnlock = undefined;
    },
  },
});

export const { unlockAchievement, clearLatestUnlock } = achievementsSlice.actions;

export default achievementsSlice.reducer;
