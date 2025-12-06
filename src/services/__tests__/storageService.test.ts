import { enhancedStorage } from '../storage/enhancedStorage';

describe('enhancedStorage', () => {
  beforeEach(() => {
    // Clear storage before each test
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('saveWordProgress', () => {
    it('should save word progress for a language', async () => {
      const progress = {
        'basic-nouns:1': {
          wordId: 'basic-nouns:1',
          xp: 15,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 3,
          timesIncorrect: 2
        }
      };

      const result = await enhancedStorage.saveWordProgress('de', progress);
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle empty progress data', async () => {
      const result = await enhancedStorage.saveWordProgress('es', {});
      
      expect(result.success).toBe(true);
    });

    it('should enforce language isolation', async () => {
      const germanProgress = {
        'basic-nouns:1': {
          wordId: 'basic-nouns:1',
          xp: 15,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 3,
          timesIncorrect: 2
        }
      };
      
      const spanishProgress = {
        'comida:1': {
          wordId: 'comida:1',
          xp: 10,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 2,
          timesIncorrect: 2
        }
      };

      await enhancedStorage.saveWordProgress('de', germanProgress);
      await enhancedStorage.saveWordProgress('es', spanishProgress);

      const loadedGerman = await enhancedStorage.loadWordProgress('de');
      const loadedSpanish = await enhancedStorage.loadWordProgress('es');

      expect(loadedGerman.data).toHaveProperty('basic-nouns:1');
      expect(loadedSpanish.data).toHaveProperty('comida:1');
      expect(loadedGerman.data).not.toHaveProperty('comida:1');
      expect(loadedSpanish.data).not.toHaveProperty('basic-nouns:1');
    });
  });

  describe('loadWordProgress', () => {
    it('should load saved word progress', async () => {
      const progress = {
        'basic-nouns:1': {
          wordId: 'basic-nouns:1',
          xp: 15,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 3,
          timesIncorrect: 2
        }
      };

      await enhancedStorage.saveWordProgress('de', progress);
      const result = await enhancedStorage.loadWordProgress('de');

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('basic-nouns:1');
    });

    it('should return empty object for non-existent language', async () => {
      const result = await enhancedStorage.loadWordProgress('fr');

      // Service may return success:false for non-existent data, that's OK
      expect(result.data || {}).toEqual({});
    });

    it('should not mix data from different languages', async () => {
      await enhancedStorage.saveWordProgress('de', {
        'test:1': {
          wordId: 'test:1',
          xp: 5,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 1,
          timesIncorrect: 1
        }
      });
      
      await enhancedStorage.saveWordProgress('es', {
        'test:2': {
          wordId: 'test:2',
          xp: 10,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 2,
          timesIncorrect: 1
        }
      });

      const germanResult = await enhancedStorage.loadWordProgress('de');
      const spanishResult = await enhancedStorage.loadWordProgress('es');

      expect(germanResult.data).not.toEqual(spanishResult.data);
      expect(Object.keys(germanResult.data || {})).toHaveLength(1);
      expect(Object.keys(spanishResult.data || {})).toHaveLength(1);
      expect(germanResult.data).toHaveProperty('test:1');
      expect(spanishResult.data).toHaveProperty('test:2');
    });
  });

  describe('getStorageAnalytics', () => {
    it('should return storage analytics', async () => {
      const analytics = await enhancedStorage.getStorageAnalytics();

      expect(analytics.success).toBe(true);
      expect(analytics.data).toHaveProperty('health');
      expect(analytics.data).toHaveProperty('cache');
      expect(analytics.data.health).toHaveProperty('score');
      expect(typeof analytics.data.health.score).toBe('number');
    });

    it('should have health score between 0 and 100', async () => {
      const analytics = await enhancedStorage.getStorageAnalytics();

      expect(analytics.data.health.score).toBeGreaterThanOrEqual(0);
      expect(analytics.data.health.score).toBeLessThanOrEqual(100);
    });

    it('should cache analytics results for performance', async () => {
      // First call computes analytics
      const start1 = performance.now();
      const result1 = await enhancedStorage.getStorageAnalytics();
      const duration1 = performance.now() - start1;

      // Second call should use cache and be faster
      const start2 = performance.now();
      const result2 = await enhancedStorage.getStorageAnalytics();
      const duration2 = performance.now() - start2;

      // Both should succeed
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Results should be identical (cached)
      expect(result1.data.lastAnalyzed).toBe(result2.data.lastAnalyzed);

      // Second call should be significantly faster (cached)
      expect(duration2).toBeLessThan(duration1 * 0.5);
    });

    it('should invalidate cache after write operations', async () => {
      // Get initial analytics
      const analytics1 = await enhancedStorage.getStorageAnalytics();
      const timestamp1 = analytics1.data.lastAnalyzed;

      // Wait a bit to ensure timestamp would differ
      await new Promise(resolve => setTimeout(resolve, 10));

      // Perform write operation (should invalidate cache)
      await enhancedStorage.saveWordProgress('de', {
        'test:1': {
          wordId: 'test:1',
          xp: 5,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 1,
          timesIncorrect: 0
        }
      });

      // Get analytics again (should be fresh, not cached)
      const analytics2 = await enhancedStorage.getStorageAnalytics();
      const timestamp2 = analytics2.data.lastAnalyzed;

      // Timestamps should differ (new computation after cache invalidation)
      expect(timestamp2).toBeGreaterThan(timestamp1);
    });
  });
});
