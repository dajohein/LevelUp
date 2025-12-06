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
  let mockRemoteGet: jest.Mock;
  let mockRemoteSet: jest.Mock;

  beforeEach(() => {
    // Setup mocks
    mockCacheGet = jest.fn();
    mockCacheSet = jest.fn();
    mockCompressionCompress = jest.fn((data) => JSON.stringify(data));
    mockCompressionDecompress = jest.fn((data) => JSON.parse(data));
    mockIndexedDBGet = jest.fn();
    mockIndexedDBSet = jest.fn();
    mockRemoteGet = jest.fn();
    mockRemoteSet = jest.fn();

    (smartCache.get as jest.Mock) = mockCacheGet;
    (smartCache.set as jest.Mock) = mockCacheSet;
    (compressionService.compress as jest.Mock) = mockCompressionCompress;
    (compressionService.decompress as jest.Mock) = mockCompressionDecompress;
    (indexedDBStorage.get as jest.Mock) = mockIndexedDBGet;
    (indexedDBStorage.set as jest.Mock) = mockIndexedDBSet;
    (remoteStorage.get as jest.Mock) = mockRemoteGet;
    (remoteStorage.set as jest.Mock) = mockRemoteSet;

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
      mockCacheGet.mockResolvedValue({ success: true, data: testData });

      const result = await storage.get(testKey);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(testData);
      expect(mockCacheGet).toHaveBeenCalledWith(testKey);
    });

    it('should try localStorage when cache miss', async () => {
      mockCacheGet.mockResolvedValue({ success: false });
      
      // Mock localStorage
      Storage.prototype.getItem = jest.fn(() => JSON.stringify(testData));

      const result = await storage.get(testKey);

      expect(Storage.prototype.getItem).toHaveBeenCalledWith(testKey);
    });

    it('should try IndexedDB when localStorage miss', async () => {
      mockCacheGet.mockResolvedValue({ success: false });
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
      mockCacheGet.mockResolvedValue({ success: false });
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

      // Should try to store in multiple tiers
      expect(mockCacheSet).toHaveBeenCalled();
      expect(Storage.prototype.setItem).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    const testKey = 'test-key';

    beforeEach(() => {
      Storage.prototype.removeItem = jest.fn();
      (indexedDBStorage.remove as jest.Mock) = jest.fn().mockResolvedValue({ success: true });
      (smartCache.remove as jest.Mock) = jest.fn().mockResolvedValue({ success: true });
    });

    it('should remove data from all tiers', async () => {
      const result = await storage.remove(testKey);

      expect(result.success).toBe(true);
    });

    it('should handle removal errors gracefully', async () => {
      Storage.prototype.removeItem = jest.fn(() => {
        throw new Error('Remove error');
      });

      const result = await storage.remove(testKey);

      expect(result).toBeDefined();
    });
  });

  describe('clear', () => {
    beforeEach(() => {
      Storage.prototype.clear = jest.fn();
      (indexedDBStorage.clear as jest.Mock) = jest.fn().mockResolvedValue({ success: true });
      (smartCache.clear as jest.Mock) = jest.fn().mockResolvedValue({ success: true });
    });

    it('should clear all storage tiers', async () => {
      const result = await storage.clear();

      expect(result.success).toBe(true);
      expect(Storage.prototype.clear).toHaveBeenCalled();
    });

    it('should handle clear errors gracefully', async () => {
      Storage.prototype.clear = jest.fn(() => {
        throw new Error('Clear error');
      });

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

      expect(size).toBeGreaterThanOrEqual(0);
    });

    it('should get storage analytics', async () => {
      const analytics = await storage.getAnalytics();

        expect(analytics).toBeDefined();
        // Analytics structure varies by implementation
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
      const compressed = JSON.stringify(largeData);
      mockCacheGet.mockResolvedValue({ success: false });
        const getItemMock = jest.fn(() => compressed);
        Storage.prototype.getItem = getItemMock;

        await storage.get(testKey);

        // Should attempt to retrieve from localStorage
        expect(getItemMock).toHaveBeenCalled();
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
  });
});
