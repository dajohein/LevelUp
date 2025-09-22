import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { unlockAchievement, clearLatestUnlock } from '@/store/achievementsSlice';
import { AchievementNotification } from './animations/AchievementNotification';

export const AchievementManager: React.FC = () => {
  const dispatch = useDispatch();
  const { score, streak, correctAnswers, currentWord } = useSelector(
    (state: RootState) => state.game
  );
  const { achievements, unlockedAchievements, latestUnlock } = useSelector(
    (state: RootState) => state.achievements
  );

  // Check for achievements
  useEffect(() => {
    achievements.forEach(achievement => {
      if (!unlockedAchievements.includes(achievement.id)) {
        let shouldUnlock = false;

        switch (achievement.condition.type) {
          case 'score':
            shouldUnlock = score >= achievement.condition.threshold;
            break;
          case 'streak':
            shouldUnlock = streak >= achievement.condition.threshold;
            break;
          case 'correctAnswers':
            shouldUnlock = correctAnswers >= achievement.condition.threshold;
            break;
          case 'wordLevel':
            shouldUnlock = (currentWord?.level || 0) >= achievement.condition.threshold;
            break;
        }

        if (shouldUnlock) {
          dispatch(unlockAchievement(achievement.id));
        }
      }
    });
  }, [achievements, unlockedAchievements, score, streak, correctAnswers, currentWord, dispatch]);

  const handleNotificationComplete = () => {
    dispatch(clearLatestUnlock());
  };

  return latestUnlock ? (
    <AchievementNotification achievement={latestUnlock} onComplete={handleNotificationComplete} />
  ) : null;
};
