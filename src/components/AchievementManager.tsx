import React, { useEffect, useRef } from 'react';
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

  // Track previous values to only trigger achievements on actual changes
  const previousValuesRef = useRef({
    score: 0,
    streak: 0,
    correctAnswers: 0,
    wordLevel: 0,
  });
  const isInitializedRef = useRef(false);

  // Check for achievements
  useEffect(() => {
    // On first run, just store the current values without checking achievements
    if (!isInitializedRef.current) {
      previousValuesRef.current = {
        score,
        streak,
        correctAnswers,
        wordLevel: currentWord?.level || 0,
      };
      isInitializedRef.current = true;
      return;
    }

    const previousValues = previousValuesRef.current;
    const currentWordLevel = currentWord?.level || 0;

    // Only check achievements if values have actually increased
    const hasScoreIncreased = score > previousValues.score;
    const hasStreakIncreased = streak > previousValues.streak;
    const hasCorrectAnswersIncreased = correctAnswers > previousValues.correctAnswers;
    const hasWordLevelIncreased = currentWordLevel > previousValues.wordLevel;

    if (
      hasScoreIncreased ||
      hasStreakIncreased ||
      hasCorrectAnswersIncreased ||
      hasWordLevelIncreased
    ) {
      achievements.forEach(achievement => {
        if (!unlockedAchievements.includes(achievement.id)) {
          let shouldUnlock = false;

          switch (achievement.condition.type) {
            case 'score':
              shouldUnlock = score >= achievement.condition.threshold && hasScoreIncreased;
              break;
            case 'streak':
              shouldUnlock = streak >= achievement.condition.threshold && hasStreakIncreased;
              break;
            case 'correctAnswers':
              shouldUnlock =
                correctAnswers >= achievement.condition.threshold && hasCorrectAnswersIncreased;
              break;
            case 'wordLevel':
              shouldUnlock =
                currentWordLevel >= achievement.condition.threshold && hasWordLevelIncreased;
              break;
          }

          if (shouldUnlock) {
            dispatch(unlockAchievement(achievement.id));
          }
        }
      });
    }

    // Update previous values
    previousValuesRef.current = {
      score,
      streak,
      correctAnswers,
      wordLevel: currentWordLevel,
    };
  }, [achievements, unlockedAchievements, score, streak, correctAnswers, currentWord, dispatch]);

  const handleNotificationComplete = () => {
    dispatch(clearLatestUnlock());
  };

  return latestUnlock ? (
    <AchievementNotification achievement={latestUnlock} onComplete={handleNotificationComplete} />
  ) : null;
};

// Memoize to prevent unnecessary re-renders
export default React.memo(AchievementManager);
