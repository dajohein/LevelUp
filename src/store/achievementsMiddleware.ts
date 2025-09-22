import { Middleware, AnyAction } from '@reduxjs/toolkit';
import { RootState } from './store';
import { unlockAchievement } from './achievementsSlice';
import { Achievement } from './types';

export const achievementsMiddleware: Middleware<{}, RootState> =
  store => next => (action: AnyAction) => {
    const result = next(action);

    // Get updated state after the action
    const state = store.getState();
    const { game, achievements } = state;

    // Check for achievement conditions
    achievements.achievements.forEach((achievement: Achievement) => {
      if (achievements.unlockedAchievements.includes(achievement.id)) {
        return; // Skip already unlocked achievements
      }

      let shouldUnlock = false;
      switch (achievement.condition.type) {
        case 'score':
          shouldUnlock = game.score >= achievement.condition.threshold;
          break;
        case 'streak':
          shouldUnlock = game.streak >= achievement.condition.threshold;
          break;
        case 'correctAnswers':
          shouldUnlock = game.correctAnswers >= achievement.condition.threshold;
          break;
        case 'wordLevel':
          if (game.currentWord) {
            shouldUnlock = (game.currentWord?.level || 0) >= achievement.condition.threshold;
          }
          break;
      }

      if (shouldUnlock) {
        store.dispatch(unlockAchievement(achievement.id));
      }
    });

    return result;
  };
