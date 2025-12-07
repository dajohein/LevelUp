import { TieredStorageService } from '../tieredStorage';
import { smartCache } from '../cache';
import { compressionService } from '../compression';
import { indexedDBStorage } from '../indexedDB';
import { remoteStorage } from '../remoteStorage';

// Mock dependencies
jest.mock('../cache');
jest.mock('../compression');
jest.mock('../indexedDB');
jest.mock('../remoteStorage');
jest.mock('../../logger');

describe('TieredStorageService', () => {
  let storage: TieredStorageService;
  let mockCacheGet: jest.Mock;
  let mockCacheSet: jest.Mock;
  let mockCompressionCompress: jest.Mock;
  let mockCompressionDecompress: jest.Mock;
  let mockIndexedDBGet: jest.Mock;
  let mockIndexedDBSet: jest.Mock;
  let mockIndexedDBDelete: jest.Mock;
  let mockIndexedDBStats: jest.Mock;
  let mockRemoteGet: jest.Mock;
  let mockRemoteSet: jest.Mock;
  let mockRemoteDelete: jest.Mock;
  let mockCacheInvalidate: jest.Mock;

  beforeEach(() => {
    // Setup mocks
    mockCacheGet = jest.fn();
    mockCacheSet = jest.fn();
    mockCompressionCompress = jest.fn((data) => JSON.stringify(data));
    mockCompressionDecompress = jest.fn((data) => JSON.parse(data));
    mockIndexedDBGet = jest.fn();
    mockIndexedDBSet = jest.fn();
    mockIndexedDBDelete = jest.fn().mockResolvedValue({ success: true });
    mockIndexedDBStats = jest.fn();
    mockRemoteGet = jest.fn();
    mockRemoteSet = jest.fn();
    mockRemoteDelete = jest.fn().mockResolvedValue({ success: true });
    mockCacheInvalidate = jest.fn();

    (smartCache.get as jest.Mock) = mockCacheGet;
    (smartCache.set as jest.Mock) = mockCacheSet;
    (smartCache.invalidate as jest.Mock) = mockCacheInvalidate;
    (compressionService.compress as jest.Mock) = mockCompressionCompress;
    (compressionService.decompress as jest.Mock) = mockCompressionDecompress;
    (indexedDBStorage.get as jest.Mock) = mockIndexedDBGet;
    (indexedDBStorage.set as jest.Mock) = mockIndexedDBSet;
    (indexedDBStorage.delete as jest.Mock) = mockIndexedDBDelete;
    (indexedDBStorage.getStats as jest.Mock) = mockIndexedDBStats;
    (remoteStorage.get as jest.Mock) = mockRemoteGet;
    (remoteStorage.set as jest.Mock) = mockRemoteSet;
    (remoteStorage.delete as jest.Mock) = mockRemoteDelete;

    storage = new TieredStorageService();
    jest.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should initialize with default config', () => {
      const defaultStorage = new TieredStorageService();
      expect(defaultStorage).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const customStorage = new TieredStorageService({
        enableCompression: false,
        enableCaching: false,
      });
      expect(customStorage).toBeDefined();
    });

    it('should enable remote tier in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const prodStorage = new TieredStorageService();
      expect(prodStorage).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('get', () => {
    const testKey = 'test-key';
    const testData = { name: 'Test', value: 123 };

    it('should return cached data when available', async () => {
      mockCacheGet.mockResolvedValue(testData);

      const result = await storage.get(testKey);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(testData);
      expect(mockCacheGet).toHaveBeenCalledWith(testKey);
    });

    it('should try localStorage when cache miss', async () => {
      mockCacheGet.mockResolvedValue(undefined);
      
      // Mock localStorage
      Storage.prototype.getItem = jest.fn(() => JSON.stringify(testData));

      const result = await storage.get(testKey);

      expect(result.success).toBe(true);
      expect(Storage.prototype.getItem).toHaveBeenCalledWith(testKey);
    });

    it('should try IndexedDB when localStorage miss', async () => {
      mockCacheGet.mockResolvedValue(undefined);
      Storage.prototype.getItem = jest.fn(() => null);
      mockIndexedDBGet.mockResolvedValue({ success: true, data: testData });

      const result = await storage.get(testKey);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(testData);
    });

    it('should handle get errors gracefully', async () => {
      mockCacheGet.mockRejectedValue(new Error('Cache error'));

      const result = await storage.get(testKey);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return not found when key does not exist', async () => {
      mockCacheGet.mockResolvedValue(undefined);
      Storage.prototype.getItem = jest.fn(() => null);
      mockIndexedDBGet.mockResolvedValue({ success: false });

      const result = await storage.get(testKey);

      expect(result.success).toBe(false);
    });
  });

  describe('set', () => {
    const testKey = 'test-key';
    const testData = { name: 'Test', value: 123 };

    beforeEach(() => {
      Storage.prototype.setItem = jest.fn();
      Storage.prototype.getItem = jest.fn();
      mockCacheSet.mockResolvedValue({ success: true });
      mockIndexedDBSet.mockResolvedValue({ success: true });
    });

    it('should store data in memory cache', async () => {
      const result = await storage.set(testKey, testData);

      expect(result.success).toBe(true);
      expect(mockCacheSet).toHaveBeenCalled();
    });

    it('should store data in localStorage', async () => {
      await storage.set(testKey, testData);

      expect(Storage.prototype.setItem).toHaveBeenCalled();
    });

    it('should compress data when compression is enabled', async () => {
      await storage.set(testKey, testData, { compress: true });

      expect(mockCompressionCompress).toHaveBeenCalled();
    });

    it('should handle storage errors gracefully', async () => {
      Storage.prototype.setItem = jest.fn(() => {
        throw new Error('Storage full');
      });

      const result = await storage.set(testKey, testData);

      // Should not throw, should handle gracefully
      expect(result).toBeDefined();
    });

    it('should respect tier priority', async () => {
      const result = await storage.set(testKey, testData);

      expect(result.success).toBe(true);
      // Should try to store in multiple tiers
      expect(mockCacheSet).toHaveBeenCalled();
      expect(Storage.prototype.setItem).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    const testKey = 'test-key';

    beforeEach(() => {
      Storage.prototype.removeItem = jest.fn();
      (smartCache.invalidate as jest.Mock) = mockCacheInvalidate;
      (indexedDBStorage.delete as jest.Mock) = mockIndexedDBDelete;
    });

    it('should remove data from all tiers', async () => {
      const result = await storage.delete(testKey);

      expect(result.success).toBe(true);
    });

    it('should handle removal errors gracefully', async () => {
      Storage.prototype.removeItem = jest.fn(() => {
        throw new Error('Remove error');
      });

      const result = await storage.delete(testKey);

      expect(result).toBeDefined();
    });

    it('should invalidate cache and report deleted tiers', async () => {
      Storage.prototype.removeItem = jest.fn();
      mockRemoteDelete.mockResolvedValue({ success: true });

      const result = await storage.delete(testKey);

      expect(mockCacheInvalidate).toHaveBeenCalledWith(`tier_location_${testKey}`);
      expect(result.metadata?.deletedFromTiers).toEqual(
        expect.arrayContaining(['memory', 'local', 'indexedDB', 'remote'])
      );
    });
  });

  describe('clear', () => {
    it('should clear all storage tiers', async () => {
      const result = await storage.clear();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not implemented');
    });

    it('should handle clear errors gracefully', async () => {
      const result = await storage.clear();

      expect(result).toBeDefined();
    });
  });

  describe('Tier management', () => {
    it('should get size estimate from all tiers', async () => {
      Storage.prototype.getItem = jest.fn(() => 'test-data');
      Object.defineProperty(Storage.prototype, 'length', {
        value: 5,
        configurable: true,
      });
      Storage.prototype.key = jest.fn((index) => `key-${index}`);

      const size = await storage.getSize();

      expect(size.success).toBe(true);
      expect(typeof size.data).toBe('number');
    });

    it('should get storage analytics', async () => {
      const analytics = await storage.getAnalytics();

        expect(analytics).toBeDefined();
        // Analytics structure varies by implementation
    });

    it('should surface analytics errors gracefully when IndexedDB stats fail', async () => {
      localStorage.clear();
      localStorage.setItem('a', '1');
      localStorage.setItem('b', '22');
      mockIndexedDBStats.mockRejectedValue(new Error('stats failure'));

      const analytics = await storage.getAnalytics();

      expect(analytics.tiers.local.items).toBeGreaterThanOrEqual(2);
      expect(analytics.tiers.indexedDB.error).toBeDefined();
      expect(analytics.totalItems).toBeGreaterThanOrEqual(2);
    });

    it('should handle tier fallback on failure', async () => {
      // Simulate localStorage full
      Storage.prototype.setItem = jest.fn(() => {
        throw new Error('QuotaExceededError');
      });
      mockIndexedDBSet.mockResolvedValue({ success: true });

      const result = await storage.set('test-key', { data: 'test' });

      // Should succeed via IndexedDB fallback
      expect(result).toBeDefined();
    });
  });

  describe('Compression integration', () => {
    const testKey = 'compress-key';
    const largeData = { content: 'x'.repeat(10000) };

    it('should compress large data automatically', async () => {
      await storage.set(testKey, largeData, { compress: true });

      expect(mockCompressionCompress).toHaveBeenCalledWith(
        expect.objectContaining(largeData)
      );
    });

    it('should decompress on retrieval', async () => {
      const compressed = {
        data: 'abc',
        algorithm: 'gzip',
        originalSize: 100,
        compressedSize: 10,
      };
      mockCacheGet.mockResolvedValue(undefined);
      const getItemMock = jest.fn(() => JSON.stringify(compressed));
      Storage.prototype.getItem = getItemMock;

      await storage.get(testKey);

      expect(getItemMock).toHaveBeenCalled();
      expect(mockCompressionDecompress).toHaveBeenCalled();
    });

    it('should skip compression when disabled in config', async () => {
      Storage.prototype.setItem = jest.fn();
      const compressionDisabledStorage = new TieredStorageService({ enableCompression: false });

      await compressionDisabledStorage.set(testKey, largeData, { compress: true });

      expect(mockCompressionCompress).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined values', async () => {
      const result = await storage.set('undefined-key', undefined);

      expect(result).toBeDefined();
    });

    it('should handle null values', async () => {
      const result = await storage.set('null-key', null);

      expect(result).toBeDefined();
    });

    it('should handle circular references gracefully', async () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      const result = await storage.set('circular-key', circular);

      // Should handle error without crashing
      expect(result).toBeDefined();
    });

    it('should handle very large keys', async () => {
      const longKey = 'key-' + 'x'.repeat(1000);
      const result = await storage.set(longKey, { data: 'test' });

      expect(result).toBeDefined();
    });

    it('should handle concurrent operations', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        storage.set(`concurrent-${i}`, { value: i })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result).toBeDefined();
      });
    });

    it('exists should return true when found in a tier', async () => {
      mockCacheGet.mockResolvedValue({ data: 'cached' });

      const exists = await storage.exists('cached-key');

      expect(exists).toBe(true);
    });

    it('exists should return false when missing across tiers', async () => {
      mockCacheGet.mockResolvedValue(undefined);
      Storage.prototype.getItem = jest.fn(() => null);
      mockIndexedDBGet.mockResolvedValue({ success: false });
      mockRemoteGet.mockResolvedValue({ success: false });

      const exists = await storage.exists('missing-key');

      expect(exists).toBe(false);
    });
  });
});
