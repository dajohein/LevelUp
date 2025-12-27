import { enhancedStorage } from '../enhancedStorage';
import type { WordProgress } from '../../../store/types';

const makeProgress = (ids: string[]): Record<string, WordProgress> => {
  const now = new Date().toISOString();
  return ids.reduce((acc, id) => {
    acc[id] = {
      wordId: id,
      xp: 20,
      lastPracticed: now,
      timesCorrect: 2,
      timesIncorrect: 0,
      version: 2,
      totalXp: 20,
      firstLearned: now,
      directions: {
        'term-to-definition': { timesCorrect: 2, timesIncorrect: 0, xp: 10, lastPracticed: now, consecutiveCorrect: 2, longestStreak: 2 },
        'definition-to-term': { timesCorrect: 0, timesIncorrect: 0, xp: 10, lastPracticed: now, consecutiveCorrect: 0, longestStreak: 0 },
      },
      learningPhase: 'practice',
      tags: [],
    };
    return acc;
  }, {} as Record<string, WordProgress>);
};

describe('Storage analytics baseline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear localStorage and smart cache via enhancedStorage API
    localStorage.clear();
  });

  it('achieves healthy cache hit rate and health score', async () => {
    const progress = makeProgress(['w1', 'w2', 'w3']);

    // Save word progress which should populate the cache
    const saveResult = await enhancedStorage.saveWordProgress('de', progress);
    expect(saveResult.success).toBe(true);

    // Multiple reads to drive cache hit rate up
    for (let i = 0; i < 10; i++) {
      const load = await enhancedStorage.loadWordProgress('de');
      expect(load.success).toBe(true);
      expect(load.data).toBeDefined();
    }

    // Verify storage health reflects strong cache performance
    const health = await enhancedStorage.getStorageHealth();
    expect(health.status).toBe('healthy');
    expect(health.details.cache.hitRate).toBeGreaterThanOrEqual(0.85);

    // Force fresh analytics computation and check health score baseline
    enhancedStorage.invalidateAnalyticsCache();
    const analytics = await enhancedStorage.getStorageAnalytics();
    expect(analytics.success).toBe(true);
    expect(analytics.data.health.score).toBeGreaterThanOrEqual(80);
  });
});
