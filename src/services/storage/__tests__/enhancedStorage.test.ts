import { enhancedStorage } from '../enhancedStorage';
import { smartCache } from '../cache';
import { asyncStorage } from '../asyncStorage';
import { remoteStorage } from '../remoteStorage';
import { WordProgress } from '../../../store/types';

// Mock dependencies
jest.mock('../cache');
jest.mock('../asyncStorage');
jest.mock('../remoteStorage');

describe('EnhancedStorageService', () => {
  const mockWordProgress: Record<string, WordProgress> = {
    'word-1': {
      wordId: 'word-1',
      xp: 50,
      lastPracticed: new Date().toISOString(),
      timesCorrect: 2,
      timesIncorrect: 1,
    },
    'word-2': {
      wordId: 'word-2',
      xp: 30,
      lastPracticed: new Date().toISOString(),
      timesCorrect: 1,
      timesIncorrect: 1,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    (asyncStorage.set as jest.Mock).mockResolvedValue({ success: true });
    (asyncStorage.get as jest.Mock).mockResolvedValue({ success: true, data: mockWordProgress });
    (asyncStorage.delete as jest.Mock).mockResolvedValue({ success: true });
    (asyncStorage.setBatch as jest.Mock).mockResolvedValue({ success: true });
    (asyncStorage.getBatch as jest.Mock).mockResolvedValue({ success: true, data: {} });
    (asyncStorage.healthCheck as jest.Mock).mockResolvedValue({ success: true, data: { status: 'healthy' } });
    (asyncStorage.getPendingCount as jest.Mock).mockReturnValue(0);
    (asyncStorage.getKeys as jest.Mock).mockResolvedValue({ success: true, data: [] });
    (asyncStorage.flush as jest.Mock).mockResolvedValue(undefined);

    (smartCache.set as jest.Mock).mockResolvedValue(undefined);
    (smartCache.get as jest.Mock).mockResolvedValue(undefined);
    (smartCache.invalidate as jest.Mock).mockResolvedValue(undefined);
    (smartCache.invalidateByPattern as jest.Mock).mockResolvedValue(undefined);
    (smartCache.warmCache as jest.Mock).mockResolvedValue(undefined);
    (smartCache.getStats as jest.Mock).mockResolvedValue({ size: 0, memoryUsage: 0 });
    (smartCache.getHitRate as jest.Mock).mockResolvedValue(0.85);

    (remoteStorage.setCurrentLanguage as jest.Mock).mockReturnValue(undefined);
  });

  describe('Word Progress Operations', () => {
    it('should save word progress with language code', async () => {
      const result = await enhancedStorage.saveWordProgress('de', mockWordProgress);

      expect(result.success).toBe(true);
      expect(asyncStorage.set).toHaveBeenCalledWith(
        'word_progress_de',
        mockWordProgress,
        expect.objectContaining({
          ttl: 24 * 60 * 60 * 1000,
        })
      );
    });

    it('should set remote storage language context before save', async () => {
      await enhancedStorage.saveWordProgress('de', mockWordProgress);

      expect(remoteStorage.setCurrentLanguage).toHaveBeenCalledWith('de');
    });

    it('should cache word progress after successful save', async () => {
      (smartCache.set as jest.Mock).mockResolvedValue(undefined);

      await enhancedStorage.saveWordProgress('de', mockWordProgress);

      expect(smartCache.set).toHaveBeenCalledWith(
        'word_progress_de',
        mockWordProgress,
        expect.any(Number),
        expect.arrayContaining(['word_progress_de'])
      );
    });

    it('should load word progress from cache first', async () => {
      (smartCache.get as jest.Mock).mockResolvedValue(mockWordProgress);

      const result = await enhancedStorage.loadWordProgress('de');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockWordProgress);
      expect(smartCache.get).toHaveBeenCalledWith('word_progress_de');
      // Should not call asyncStorage if cache hit
      expect(asyncStorage.get).not.toHaveBeenCalled();
    });

    it('should load from storage on cache miss', async () => {
      (smartCache.get as jest.Mock).mockResolvedValue(undefined);
      (asyncStorage.get as jest.Mock).mockResolvedValue({ success: true, data: mockWordProgress });

      const result = await enhancedStorage.loadWordProgress('de');

      expect(result.success).toBe(true);
      expect(asyncStorage.get).toHaveBeenCalledWith('word_progress_de');
    });

    it('should populate cache after loading from storage', async () => {
      (smartCache.get as jest.Mock).mockResolvedValue(undefined);
      (asyncStorage.get as jest.Mock).mockResolvedValue({ success: true, data: mockWordProgress });

      await enhancedStorage.loadWordProgress('de');

      expect(smartCache.set).toHaveBeenCalledWith(
        'word_progress_de',
        mockWordProgress,
        expect.any(Number),
        expect.any(Array)
      );
    });

    it('should handle failed saves gracefully', async () => {
      (asyncStorage.set as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Storage quota exceeded',
      });

      const result = await enhancedStorage.saveWordProgress('de', mockWordProgress);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle failed loads gracefully', async () => {
      (smartCache.get as jest.Mock).mockResolvedValue(undefined);
      (asyncStorage.get as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Data corrupted',
      });

      const result = await enhancedStorage.loadWordProgress('de');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should clear word progress for language', async () => {
      await enhancedStorage.clearWordProgress('de');

      expect(asyncStorage.delete).toHaveBeenCalledWith('word_progress_de');
      expect(smartCache.invalidate).toHaveBeenCalledWith('word_progress_de');
    });
  });

  describe('Language Isolation', () => {
    it('should maintain separate progress for different languages', async () => {
      (smartCache.get as jest.Mock).mockResolvedValue(undefined);
      (asyncStorage.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: mockWordProgress,
      });

      const deLang = 'de';
      const esLang = 'es';

      await enhancedStorage.saveWordProgress(deLang, mockWordProgress);
      await enhancedStorage.saveWordProgress(esLang, mockWordProgress);

      expect(asyncStorage.set).toHaveBeenCalledWith(
        'word_progress_de',
        expect.any(Object),
        expect.any(Object)
      );
      expect(asyncStorage.set).toHaveBeenCalledWith(
        'word_progress_es',
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should set correct language context for remote storage', async () => {
      await enhancedStorage.saveWordProgress('de', mockWordProgress);
      await enhancedStorage.saveWordProgress('es', mockWordProgress);

      expect(remoteStorage.setCurrentLanguage).toHaveBeenCalledWith('de');
      expect(remoteStorage.setCurrentLanguage).toHaveBeenCalledWith('es');
    });

    it('should not mix progress between languages', async () => {
      // Test that different language keys are used
      await enhancedStorage.saveWordProgress('de', mockWordProgress);
      await enhancedStorage.saveWordProgress('es', mockWordProgress);

      expect(asyncStorage.set).toHaveBeenCalledWith('word_progress_de', expect.any(Object), expect.any(Object));
      expect(asyncStorage.set).toHaveBeenCalledWith('word_progress_es', expect.any(Object), expect.any(Object));

      // Verify the keys are different (even though the data is the same in this test)
      const calls = (asyncStorage.set as jest.Mock).mock.calls;
      const deKey = calls[0][0];
      const esKey = calls[1][0];
      
      expect(deKey).not.toBe(esKey);
      expect(deKey).toContain('de');
      expect(esKey).toContain('es');
    });
  });

  describe('Batch Operations', () => {
    it('should save multiple language progress in one batch', async () => {
      const batchData = {
        de: mockWordProgress,
        es: mockWordProgress,
      };

      await enhancedStorage.saveMultipleLanguageProgress(batchData);

      expect(asyncStorage.setBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          'word_progress_de': mockWordProgress,
          'word_progress_es': mockWordProgress,
        }),
        expect.any(Object)
      );
    });

    it('should load multiple language progress in one batch', async () => {
      const mockBatchData = {
        'word_progress_de': mockWordProgress,
        'word_progress_es': mockWordProgress,
      };

      (asyncStorage.getBatch as jest.Mock).mockResolvedValue({
        success: true,
        data: mockBatchData,
      });

      const result = await enhancedStorage.loadMultipleLanguageProgress(['de', 'es']);

      expect(result.success).toBe(true);
      expect(asyncStorage.getBatch).toHaveBeenCalledWith(
        expect.arrayContaining(['word_progress_de', 'word_progress_es'])
      );
    });

    it('should transform batch response keys back to language codes', async () => {
      const mockBatchData = {
        'word_progress_de': mockWordProgress,
        'word_progress_es': mockWordProgress,
      };

      (asyncStorage.getBatch as jest.Mock).mockResolvedValue({
        success: true,
        data: mockBatchData,
      });

      const result = await enhancedStorage.loadMultipleLanguageProgress(['de', 'es']);

      expect(result.data?.de).toEqual(mockWordProgress);
      expect(result.data?.es).toEqual(mockWordProgress);
    });
  });

  describe('Cache Management', () => {
    it('should warm cache for language', async () => {
      await enhancedStorage.warmCache('de');

      expect(smartCache.warmCache).toHaveBeenCalledWith(
        expect.arrayContaining(['word_progress_de', 'analytics_de', 'module_progress_de'])
      );
    });

    it('should invalidate language-scoped cache', async () => {
      await enhancedStorage.invalidateLanguageCache('de');

      expect(smartCache.invalidateByPattern).toHaveBeenCalledWith(
        expect.stringContaining('de')
      );
    });

    it('should cache language summary after saving progress', async () => {
      await enhancedStorage.saveWordProgress('de', mockWordProgress);

      // Check that summary caching was called
      const calls = (smartCache.set as jest.Mock).mock.calls;
      const summaryCall = calls.find(c => c[0].includes('summary'));
      expect(summaryCall).toBeDefined();
    });
  });

  describe('Game State Operations', () => {
    it('should save game state with high priority', async () => {
      const gameState = { currentModule: 'grundwortschatz', score: 100 };

      await enhancedStorage.saveGameState(gameState);

      expect(asyncStorage.set).toHaveBeenCalledWith(
        'game_state',
        gameState,
        expect.objectContaining({
          priority: 'high',
          compress: false,
        })
      );
    });

    it('should load game state', async () => {
      (asyncStorage.get as jest.Mock).mockResolvedValue({
        success: true,
        data: { currentModule: 'grundwortschatz' },
      });

      const result = await enhancedStorage.loadGameState();

      expect(result.success).toBe(true);
      expect(asyncStorage.get).toHaveBeenCalledWith('game_state');
    });
  });

  describe('Session State Operations', () => {
    it('should save session state with appropriate TTL', async () => {
      const sessionState = { sessionId: '123', started: Date.now() };

      await enhancedStorage.saveSessionState(sessionState);

      expect(asyncStorage.set).toHaveBeenCalledWith(
        'session_state',
        sessionState,
        expect.objectContaining({
          ttl: 30 * 60 * 1000, // 30 minutes
        })
      );
    });

    it('should load session state', async () => {
      (asyncStorage.get as jest.Mock).mockResolvedValue({
        success: true,
        data: { sessionId: '123' },
      });

      const result = await enhancedStorage.loadSessionState();

      expect(result.success).toBe(true);
      expect(asyncStorage.get).toHaveBeenCalledWith('session_state');
    });
  });

  describe('Analytics Operations', () => {
    it('should save analytics data with compression', async () => {
      const analyticsData = { sessionsCompleted: 5, totalXP: 1000 };

      await enhancedStorage.saveAnalytics('de', analyticsData);

      expect(asyncStorage.set).toHaveBeenCalledWith(
        'analytics_de',
        analyticsData,
        expect.objectContaining({
          compress: true,
          priority: 'low',
        })
      );
    });

    it('should load analytics data', async () => {
      (asyncStorage.get as jest.Mock).mockResolvedValue({
        success: true,
        data: { sessionsCompleted: 5 },
      });

      const result = await enhancedStorage.loadAnalytics('de');

      expect(result.success).toBe(true);
      expect(asyncStorage.get).toHaveBeenCalledWith('analytics_de');
    });
  });

  describe('Storage Health and Monitoring', () => {
    it('should report healthy status', async () => {
      (asyncStorage.healthCheck as jest.Mock).mockResolvedValue({
        success: true,
        data: { status: 'healthy' },
      });
      (asyncStorage.getPendingCount as jest.Mock).mockReturnValue(10);
      (smartCache.getHitRate as jest.Mock).mockResolvedValue(0.9);

      const health = await enhancedStorage.getStorageHealth();

      expect(health.status).toBe('healthy');
      expect(health.details).toBeDefined();
      expect(health.details.storage).toBe('healthy');
    });

    it('should report degraded status when cache hit rate low', async () => {
      (asyncStorage.healthCheck as jest.Mock).mockResolvedValue({
        success: true,
        data: { status: 'healthy' },
      });
      (asyncStorage.getPendingCount as jest.Mock).mockReturnValue(10);
      (smartCache.getHitRate as jest.Mock).mockResolvedValue(0.6);

      const health = await enhancedStorage.getStorageHealth();

      expect(health.status).toBe('degraded');
    });

    it('should report unhealthy status when too many pending operations', async () => {
      (asyncStorage.healthCheck as jest.Mock).mockResolvedValue({
        success: true,
        data: { status: 'healthy' },
      });
      (asyncStorage.getPendingCount as jest.Mock).mockReturnValue(600);

      const health = await enhancedStorage.getStorageHealth();

      expect(health.status).toBe('unhealthy');
    });

    it('should provide storage statistics', async () => {
      const stats = await enhancedStorage.getStorageStats();

      expect(stats).toHaveProperty('totalOperations');
      expect(stats).toHaveProperty('averageResponseTime');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('compressionSavings');
      expect(stats).toHaveProperty('cacheStats');
    });
  });

  describe('Data Export', () => {
    it('should export all data with metadata', async () => {
      (asyncStorage.getKeys as jest.Mock).mockResolvedValue({
        success: true,
        data: ['word_progress_de', 'word_progress_es'],
      });
      (asyncStorage.getBatch as jest.Mock).mockResolvedValue({
        success: true,
        data: { word_progress_de: mockWordProgress, word_progress_es: mockWordProgress },
      });

      const result = await enhancedStorage.exportAllData();

      expect(result.success).toBe(true);
      expect(result.data?.version).toBeDefined();
      expect(result.data?.timestamp).toBeDefined();
      expect(result.data?.data).toBeDefined();
    });

    it('should handle export failure gracefully', async () => {
      (asyncStorage.getKeys as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Failed to get keys',
      });

      const result = await enhancedStorage.exportAllData();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Maintenance Operations', () => {
    it('should perform maintenance and flush pending operations', async () => {
      await enhancedStorage.performMaintenance();

      expect(asyncStorage.flush).toHaveBeenCalled();
    });
  });

  describe('Generic Data Storage', () => {
    it('should store generic data with custom key', async () => {
      const customData = { customField: 'value' };

      const result = await enhancedStorage.setData('custom_key', customData);

      expect(result.success).toBe(true);
      expect(asyncStorage.set).toHaveBeenCalledWith('custom_key', customData, undefined);
    });

    it('should retrieve generic data with custom key', async () => {
      (asyncStorage.get as jest.Mock).mockResolvedValue({
        success: true,
        data: { customField: 'value' },
      });

      const result = await enhancedStorage.getData('custom_key');

      expect(result.success).toBe(true);
      expect(asyncStorage.get).toHaveBeenCalledWith('custom_key');
    });
  });

  describe('Tiered Storage Integration', () => {
    it('should pass options to asyncStorage for tier selection', async () => {
      const options = { priority: 'high' as const, compress: true, ttl: 3600000 };

      await enhancedStorage.setData('test_key', { data: 'test' }, options);

      expect(asyncStorage.set).toHaveBeenCalledWith('test_key', expect.any(Object), options);
    });

    it('should respect cache configuration in saves', async () => {
      const storageWithCache = new (enhancedStorage as any).constructor({
        cacheLanguageData: true,
      });

      (asyncStorage.set as jest.Mock).mockResolvedValue({ success: true });
      (smartCache.set as jest.Mock).mockResolvedValue(undefined);

      await storageWithCache.saveWordProgress('de', mockWordProgress);

      expect(smartCache.set).toHaveBeenCalled();
    });
  });
});
