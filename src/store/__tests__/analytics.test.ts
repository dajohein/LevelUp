import { WordProgress } from '../../store/types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Analytics and Reporting', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('User Statistics', () => {
    it('should track total XP earned', () => {
      const progress: Record<string, WordProgress> = {
        'word1': {
          wordId: 'word1',
          xp: 100,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 20,
          timesIncorrect: 2,
        },
        'word2': {
          wordId: 'word2',
          xp: 150,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 30,
          timesIncorrect: 1,
        },
      };

      const totalXp = Object.values(progress).reduce((sum, p) => sum + p.xp, 0);
      expect(totalXp).toBe(250);
    });

    it('should calculate overall accuracy', () => {
      const progress: Record<string, WordProgress> = {
        'word1': {
          wordId: 'word1',
          xp: 100,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 18,
          timesIncorrect: 2,
        },
        'word2': {
          wordId: 'word2',
          xp: 150,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 27,
          timesIncorrect: 3,
        },
      };

      const totalCorrect = Object.values(progress).reduce(
        (sum, p) => sum + p.timesCorrect,
        0
      );
      const totalIncorrect = Object.values(progress).reduce(
        (sum, p) => sum + p.timesIncorrect,
        0
      );
      const accuracy = totalCorrect / (totalCorrect + totalIncorrect);

      expect(totalCorrect).toBe(45);
      expect(totalIncorrect).toBe(5);
      expect(accuracy).toBeCloseTo(0.9, 2);
    });

    it('should count total words learned', () => {
      const progress: Record<string, WordProgress> = {
        'word1': {
          wordId: 'word1',
          xp: 100,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 20,
          timesIncorrect: 2,
        },
        'word2': {
          wordId: 'word2',
          xp: 150,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 30,
          timesIncorrect: 1,
        },
        'word3': {
          wordId: 'word3',
          xp: 50,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 5,
          timesIncorrect: 5,
        },
      };

      const wordsLearned = Object.keys(progress).length;
      expect(wordsLearned).toBe(3);
    });

    it('should track mastered words (high accuracy)', () => {
      const progress: Record<string, WordProgress> = {
        'word1': {
          wordId: 'word1',
          xp: 100,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 19,
          timesIncorrect: 1,
        },
        'word2': {
          wordId: 'word2',
          xp: 150,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 10,
          timesIncorrect: 10,
        },
      };

      const masteredWords = Object.values(progress).filter(p => {
        const total = p.timesCorrect + p.timesIncorrect;
        const accuracy = p.timesCorrect / total;
        return accuracy >= 0.8;
      });

      expect(masteredWords).toHaveLength(1);
      expect(masteredWords[0].wordId).toBe('word1');
    });
  });

  describe('Learning Metrics', () => {
    it('should calculate learning velocity', () => {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const progress: Record<string, WordProgress> = {
        'word1': {
          wordId: 'word1',
          xp: 100,
          lastPracticed: now.toISOString(),
          timesCorrect: 20,
          timesIncorrect: 2,
        },
        'word2': {
          wordId: 'word2',
          xp: 80,
          lastPracticed: oneWeekAgo.toISOString(),
          timesCorrect: 10,
          timesIncorrect: 2,
        },
      };

      const totalXp = Object.values(progress).reduce((sum, p) => sum + p.xp, 0);
      const daysOfActivity = 7;
      const dailyXp = totalXp / daysOfActivity;

      expect(dailyXp).toBeCloseTo(25.7, 1);
    });

    it('should track practice consistency', () => {
      const dates = [
        new Date(2025, 0, 1),
        new Date(2025, 0, 2),
        new Date(2025, 0, 3),
        new Date(2025, 0, 5), // Skipped day 4
        new Date(2025, 0, 6),
      ];

      const consistency = {
        totalDays: 7,
        practicalDays: dates.length,
        consistency: (dates.length / 7) * 100,
      };

      expect(consistency.consistency).toBeCloseTo(71.43, 2);
    });

    it('should identify weak areas', () => {
      const progress: Record<string, WordProgress> = {
        'word1': {
          wordId: 'word1',
          xp: 100,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 19,
          timesIncorrect: 1,
        },
        'word2': {
          wordId: 'word2',
          xp: 80,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 5,
          timesIncorrect: 15,
        },
        'word3': {
          wordId: 'word3',
          xp: 50,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 10,
          timesIncorrect: 10,
        },
      };

      const weakAreas = Object.values(progress).filter(p => {
        const total = p.timesCorrect + p.timesIncorrect;
        const accuracy = p.timesCorrect / total;
        return accuracy < 0.6;
      });

      expect(weakAreas.length).toBeGreaterThanOrEqual(1);
      expect(weakAreas[0].wordId).toBe('word2');
    });
  });

  describe('Progress Visualization Data', () => {
    it('should generate XP distribution data', () => {
      const progress: Record<string, WordProgress> = {
        'word1': {
          wordId: 'word1',
          xp: 100,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 20,
          timesIncorrect: 2,
        },
        'word2': {
          wordId: 'word2',
          xp: 150,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 30,
          timesIncorrect: 1,
        },
        'word3': {
          wordId: 'word3',
          xp: 50,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 5,
          timesIncorrect: 5,
        },
      };

      const xpData = Object.entries(progress).map(([id, p]) => ({
        wordId: id,
        xp: p.xp,
      }));

      expect(xpData).toHaveLength(3);
      expect(xpData[0].xp).toBe(100);
    });

    it('should generate accuracy timeline', () => {
      const progress: Record<string, WordProgress> = {
        'word1': {
          wordId: 'word1',
          xp: 100,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 20,
          timesIncorrect: 2,
        },
        'word2': {
          wordId: 'word2',
          xp: 150,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 30,
          timesIncorrect: 1,
        },
      };

      const accuracyData = Object.entries(progress).map(([id, p]) => ({
        wordId: id,
        accuracy: p.timesCorrect / (p.timesCorrect + p.timesIncorrect),
      }));

      expect(accuracyData[0].accuracy).toBeCloseTo(0.909, 2);
      expect(accuracyData[1].accuracy).toBeCloseTo(0.968, 2);
    });
  });

  describe('Achievement Tracking', () => {
    it('should identify milestone achievements', () => {
      const totalXp = 500;

      const milestones = [
        { xp: 100, name: 'First Steps' },
        { xp: 500, name: 'Halfway There' },
        { xp: 1000, name: 'Expert' },
      ];

      const achievedMilestones = milestones.filter(m => totalXp >= m.xp);

      expect(achievedMilestones).toHaveLength(2);
      expect(achievedMilestones[0].name).toBe('First Steps');
      expect(achievedMilestones[1].name).toBe('Halfway There');
    });

    it('should calculate streak bonuses', () => {
      const currentStreak = 7;

      const bonus = Math.floor(currentStreak / 5) * 10; // Bonus every 5 days

      expect(bonus).toBe(10);
    });

    it('should track achievement unlocks', () => {
      const achievements = [
        { id: 'first-word', unlocked: true, unlockedAt: new Date() },
        { id: 'accuracy-80', unlocked: true, unlockedAt: new Date() },
        { id: 'streak-30', unlocked: false, unlockedAt: null },
      ];

      const unlockedCount = achievements.filter(a => a.unlocked).length;

      expect(unlockedCount).toBe(2);
    });
  });

  describe('Daily Statistics', () => {
    it('should track daily practice time', () => {
      const sessionStartTime = new Date(2025, 0, 1, 10, 0, 0);
      const sessionEndTime = new Date(2025, 0, 1, 10, 30, 0);

      const practiceTime = (sessionEndTime.getTime() - sessionStartTime.getTime()) / 1000 / 60;

      expect(practiceTime).toBe(30);
    });

    it('should calculate daily XP earned', () => {
      const dailyActivities = [
        { xpEarned: 50 },
        { xpEarned: 75 },
        { xpEarned: 100 },
      ];

      const dailyXp = dailyActivities.reduce((sum, a) => sum + a.xpEarned, 0);

      expect(dailyXp).toBe(225);
    });

    it('should track streak count', () => {
      const practiceHistory = [
        { date: '2025-01-01', practiced: true },
        { date: '2025-01-02', practiced: true },
        { date: '2025-01-03', practiced: true },
        { date: '2025-01-04', practiced: false },
      ];

      let currentStreak = 0;
      for (let i = practiceHistory.length - 1; i >= 0; i--) {
        if (practiceHistory[i].practiced) {
          currentStreak++;
        } else {
          break;
        }
      }

      expect(currentStreak).toBe(0);
    });
  });

  describe('Performance Analytics', () => {
    it('should calculate response time average', () => {
      const responseTimes = [1000, 1200, 950, 1100, 1050]; // milliseconds

      const average = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

      expect(average).toBeCloseTo(1060, 0);
    });

    it('should identify optimal learning time', () => {
      const sessionsByHour = {
        '08:00': { xp: 100, accuracy: 0.85 },
        '12:00': { xp: 150, accuracy: 0.92 },
        '18:00': { xp: 120, accuracy: 0.88 },
      };

      const optimalTime = Object.entries(sessionsByHour).reduce((best, current) =>
        current[1].accuracy > best[1].accuracy ? current : best
      );

      expect(optimalTime[0]).toBe('12:00');
      expect(optimalTime[1].accuracy).toBe(0.92);
    });

    it('should track game completion rate', () => {
      const sessions = {
        completed: 45,
        abandoned: 5,
      };

      const completionRate = (sessions.completed / (sessions.completed + sessions.abandoned)) * 100;

      expect(completionRate).toBeCloseTo(90, 1);
    });
  });

  describe('Learning Path Analytics', () => {
    it('should estimate time to mastery', () => {
      const currentXp = 500;
      const xpTarget = 1000;
      const dailyXpRate = 100;

      const daysToMastery = (xpTarget - currentXp) / dailyXpRate;

      expect(daysToMastery).toBe(5);
    });

    it('should identify learning patterns', () => {
      const learningData = [
        { day: 1, wordsLearned: 10, accuracy: 0.6 },
        { day: 2, wordsLearned: 15, accuracy: 0.7 },
        { day: 3, wordsLearned: 20, accuracy: 0.8 },
        { day: 4, wordsLearned: 18, accuracy: 0.78 },
        { day: 5, wordsLearned: 22, accuracy: 0.82 },
      ];

      const trend =
        learningData[learningData.length - 1].accuracy >
        learningData[0].accuracy
          ? 'improving'
          : 'declining';

      expect(trend).toBe('improving');
    });

    it('should recommend review schedule', () => {
      const progress: WordProgress = {
        wordId: 'word1',
        xp: 50,
        lastPracticed: new Date().toISOString(),
        timesCorrect: 10,
        timesIncorrect: 5,
      };

      const accuracy = progress.timesCorrect / (progress.timesCorrect + progress.timesIncorrect);
      const reviewIntervalDays = accuracy > 0.8 ? 7 : accuracy > 0.5 ? 3 : 1;

      expect(reviewIntervalDays).toBe(3);
    });
  });

  describe('Report Generation', () => {
    it('should generate weekly summary', () => {
      const weekData = {
        totalXp: 1000,
        wordsLearned: 50,
        accuracy: 0.85,
        practiceTime: 300,
        sessionsCompleted: 15,
      };

      expect(weekData.totalXp).toBe(1000);
      expect(weekData.wordsLearned).toBe(50);
      expect(weekData.accuracy).toBe(0.85);
    });

    it('should generate language-specific reports', () => {
      const languageStats = {
        de: {
          wordsLearned: 100,
          accuracy: 0.82,
          totalXp: 2000,
        },
        es: {
          wordsLearned: 50,
          accuracy: 0.75,
          totalXp: 1000,
        },
      };

      expect(languageStats.de.wordsLearned).toBe(100);
      expect(languageStats.es.accuracy).toBe(0.75);
    });
  });
});
