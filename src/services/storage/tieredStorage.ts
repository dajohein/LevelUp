/**
 * Tiered Storage Serv  provider: 'localStorage' | 'indexedDB' | 'restAPI' | 'graphQL';
  enableCompression: boolean;
  enableCaching: boolean;
  tiers: {
    memory: TierConfig;
    local: TierConfig;
    indexedDB: TierConfig;
    remote?: TierConfig;
    archive?: TierConfig;
  };* Multi-tier storage system: Memory -> localStorage -> IndexedDB -> Remote (future)
 * Backend-ready: easily extensible to include API calls
 */

import { TieredStorageProvider, StorageTier, StorageOptions, StorageResult } from './interfaces';
import { smartCache } from './cache';
import { compressionService } from './compression';
import { indexedDBStorage } from './indexedDB';
import { remoteStorage } from './remoteStorage';
import { logger } from '../logger';

interface TierConfig {
  maxSize: number; // Maximum size in bytes
  ttl: number; // Time to live in milliseconds
  enabled: boolean; // Whether this tier is enabled
  priority: number; // Priority for storage (higher = preferred)
}

interface TieredStorageConfig {
  provider: 'localStorage' | 'indexedDB' | 'restAPI' | 'graphQL';
  enableCompression: boolean;
  enableCaching: boolean;
  tiers: {
    memory: TierConfig;
    local: TierConfig;
    indexedDB: TierConfig;
    remote?: TierConfig;
    archive?: TierConfig;
    [key: string]: TierConfig | undefined; // Allow dynamic tier access
  };
}

const DEFAULT_TIERED_CONFIG: TieredStorageConfig = {
  provider: 'localStorage',
  enableCompression: true,
  enableCaching: true,
  tiers: {
    memory: {
      maxSize: 50 * 1024 * 1024, // 50MB
      ttl: 60 * 60 * 1000, // 1 hour
      enabled: true,
      priority: 3,
    },
    local: {
      maxSize: 200 * 1024 * 1024, // 200MB
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      enabled: true,
      priority: 2,
    },
    indexedDB: {
      maxSize: 500 * 1024 * 1024, // 500MB
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
      enabled: true, // Enable IndexedDB tier
      priority: 1,
    },
    remote: {
      maxSize: 1024 * 1024 * 1024, // 1GB
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
      enabled: true, // ✅ ENABLED - Vercel backend ready!
      priority: 1,
    },
    archive: {
      maxSize: 10 * 1024 * 1024 * 1024, // 10GB
      ttl: 365 * 24 * 60 * 60 * 1000, // 1 year
      enabled: false, // Disabled until backend is ready
      priority: 0,
    },
  },
};

export class TieredStorageService implements TieredStorageProvider {
  private config: TieredStorageConfig;

  constructor(config: Partial<TieredStorageConfig> = {}) {
    this.config = { ...DEFAULT_TIERED_CONFIG, ...config };

    // Enable remote tier in production or when explicitly enabled
    if (process.env.NODE_ENV === 'production' || config.tiers?.remote?.enabled) {
      this.config.tiers.remote!.enabled = true;
    }
  }

  /**
   * Get data from the most appropriate tier
   */
  async get<T>(key: string, options: StorageOptions = {}): Promise<StorageResult<T>> {
    const startTime = performance.now();

    // Try tiers in order of priority (highest first)
    const tiers = this.getOrderedTiers();

    for (const tier of tiers) {
      const tierConfig = this.config.tiers[tier];
      if (!tierConfig?.enabled) continue;

      try {
        const result = await this.getFromTier<T>(key, tier, options);

        if (result.success && result.data !== undefined) {
          // Promote to higher tiers if beneficial
          if (tier !== 'memory' && this.shouldPromote(key, tier)) {
            await this.promoteToHigherTiers(key, result.data, tier);
          }

          const duration = performance.now() - startTime;
          logger.debug(`📖 Retrieved ${key} from ${tier} tier (${Math.round(duration)}ms)`);

          return {
            ...result,
            metadata: {
              ...result.metadata,
              tier,
              retrievalTime: duration,
            },
          };
        }
      } catch (error) {
        logger.warn(`Failed to retrieve ${key} from ${tier} tier:`, error);
        continue;
      }
    }

    // Not found in any tier
    return {
      success: false,
      error: `Key ${key} not found in any storage tier`,
    };
  }

  /**
   * Set data to appropriate tier(s)
   */
  async set<T>(key: string, data: T, options: StorageOptions = {}): Promise<StorageResult<void>> {
    const startTime = performance.now();

    try {
      // Determine target tier based on data characteristics
      const targetTier = await this.determineOptimalTier(key, data, options);

      // Store in target tier
      const result = await this.setToTier(key, data, targetTier, options);

      if (result.success) {
        // Also store in higher priority tiers if they have space
        await this.cascadeToHigherTiers(key, data, targetTier, options);

        // Update cache dependencies
        if (options.priority !== 'low') {
          await smartCache.set(
            `tier_location_${key}`,
            targetTier,
            60000, // 1 minute TTL
            [key]
          );
        }
      }

      const duration = performance.now() - startTime;
      logger.debug(`💾 Stored ${key} in ${targetTier} tier (${Math.round(duration)}ms)`);

      return result;
    } catch (error) {
      logger.error(`Failed to store ${key}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to store key ${key}: ${errorMessage}`,
      };
    }
  }

  /**
   * Delete from all tiers
   */
  async delete(key: string, _options: StorageOptions = {}): Promise<StorageResult<void>> {
    const results: Array<{ tier: StorageTier; success: boolean }> = [];

    // Delete from all tiers
    for (const tier of this.getOrderedTiers()) {
      const tierConfig = this.config.tiers[tier];
      if (!tierConfig?.enabled) continue;

      try {
        const result = await this.deleteFromTier(key, tier);
        results.push({ tier, success: result.success });
      } catch (error) {
        logger.warn(`Failed to delete ${key} from ${tier} tier:`, error);
        results.push({ tier, success: false });
      }
    }

    // Clear cache
    await smartCache.invalidate(`tier_location_${key}`);

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    return {
      success: successCount > 0,
      metadata: {
        deletedFromTiers: results.filter(r => r.success).map(r => r.tier),
        totalTiers: totalCount,
        successfulDeletions: successCount,
      },
    };
  }

  /**
   * Check if key exists in any tier
   */
  async exists(key: string): Promise<boolean> {
    for (const tier of this.getOrderedTiers()) {
      const tierConfig = this.config.tiers[tier];
      if (!tierConfig?.enabled) continue;

      try {
        const result = await this.getFromTier(key, tier);
        if (result.success) return true;
      } catch (error) {
        continue;
      }
    }

    return false;
  }

  /**
   * Get data specifically from a tier
   */
  async getFromTier<T>(
    key: string,
    tier: StorageTier,
    options: StorageOptions = {}
  ): Promise<StorageResult<T>> {
    switch (tier) {
      case 'memory':
        return this.getFromMemory<T>(key);
      case 'local':
        return this.getFromLocalStorage<T>(key, options);
      case 'indexedDB':
        return this.getFromIndexedDB<T>(key, options);
      case 'remote':
        return this.getFromRemote<T>(key, options);
      case 'archive':
        return this.getFromArchive<T>(key, options);
      default:
        throw new Error(`Unsupported storage tier: ${tier}`);
    }
  }

  /**
   * Set data specifically to a tier
   */
  async setToTier<T>(
    key: string,
    data: T,
    tier: StorageTier,
    options: StorageOptions = {}
  ): Promise<StorageResult<void>> {
    switch (tier) {
      case 'memory':
        return this.setToMemory(key, data, options);
      case 'local':
        return this.setToLocalStorage(key, data, options);
      case 'indexedDB':
        return this.setToIndexedDB(key, data, options);
      case 'remote':
        return this.setToRemote(key, data, options);
      case 'archive':
        return this.setToArchive(key, data, options);
      default:
        throw new Error(`Unsupported storage tier: ${tier}`);
    }
  }

  /**
   * Promote data to higher priority tier
   */
  async promote(key: string, tier: StorageTier): Promise<StorageResult<void>> {
    try {
      // Get data from current tier
      const result = await this.getFromTier(key, tier);
      if (!result.success || !result.data) {
        return { success: false, error: 'Key not found in source tier' };
      }

      // Find next higher tier
      const higherTier = this.getNextHigherTier(tier);
      if (!higherTier) {
        return { success: false, error: 'Already at highest tier' };
      }

      // Store in higher tier
      const setResult = await this.setToTier(key, result.data, higherTier);

      if (setResult.success) {
        logger.debug(`⬆️ Promoted ${key} from ${tier} to ${higherTier}`);
      }

      return setResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Demote data to lower priority tier
   */
  async demote(key: string, tier: StorageTier): Promise<StorageResult<void>> {
    try {
      // Get data from current tier
      const result = await this.getFromTier(key, tier);
      if (!result.success || !result.data) {
        return { success: false, error: 'Key not found in source tier' };
      }

      // Find next lower tier
      const lowerTier = this.getNextLowerTier(tier);
      if (!lowerTier) {
        return { success: false, error: 'Already at lowest tier' };
      }

      // Store in lower tier
      const setResult = await this.setToTier(key, result.data, lowerTier);

      if (setResult.success) {
        // Remove from current tier
        await this.deleteFromTier(key, tier);
        logger.debug(`⬇️ Demoted ${key} from ${tier} to ${lowerTier}`);
      }

      return setResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get which tier contains the key
   */
  async getTier(key: string): Promise<StorageResult<StorageTier>> {
    // Check cache first
    const cachedTier = await smartCache.get<StorageTier>(`tier_location_${key}`);
    if (cachedTier) {
      return { success: true, data: cachedTier };
    }

    // Check each tier
    for (const tier of this.getOrderedTiers()) {
      const tierConfig = this.config.tiers[tier];
      if (!tierConfig?.enabled) continue;

      try {
        const result = await this.getFromTier(key, tier);
        if (result.success) {
          // Cache the result
          await smartCache.set(`tier_location_${key}`, tier, 60000, [key]);
          return { success: true, data: tier };
        }
      } catch (error) {
        continue;
      }
    }

    return { success: false, error: 'Key not found in any tier' };
  }

  // Additional interface methods (simplified implementations)
  async getBatch<T>(
    keys: string[],
    options: StorageOptions = {}
  ): Promise<StorageResult<Record<string, T>>> {
    const results: Record<string, T> = {};

    for (const key of keys) {
      const result = await this.get<T>(key, options);
      if (result.success && result.data !== undefined) {
        results[key] = result.data;
      }
    }

    return { success: true, data: results };
  }

  async setBatch<T>(
    data: Record<string, T>,
    options: StorageOptions = {}
  ): Promise<StorageResult<void>> {
    const promises = Object.entries(data).map(([key, value]) => this.set(key, value, options));

    await Promise.all(promises);
    return { success: true };
  }

  async clear(_pattern?: string): Promise<StorageResult<void>> {
    // Implementation depends on specific requirements
    logger.warn('Clear operation not yet implemented');
    return { success: false, error: 'Not implemented' };
  }

  async getSize(): Promise<StorageResult<number>> {
    // Implementation depends on specific requirements
    return { success: true, data: 0 };
  }

  async getKeys(_pattern?: string): Promise<StorageResult<string[]>> {
    // Implementation depends on specific requirements
    return { success: true, data: [] };
  }

  async healthCheck(): Promise<StorageResult<{ status: 'healthy' | 'degraded' | 'unhealthy' }>> {
    return { success: true, data: { status: 'healthy' } };
  }

  async warmCache(keys: string[]): Promise<StorageResult<void>> {
    await smartCache.warmCache(keys);
    return { success: true };
  }

  async evictFromTier(_tier: StorageTier, _count: number = 10): Promise<StorageResult<string[]>> {
    // Implementation depends on tier-specific eviction logic
    return { success: true, data: [] };
  }

  // Private implementation methods

  private async getFromMemory<T>(key: string): Promise<StorageResult<T>> {
    const data = await smartCache.get<T>(key);
    return data ? { success: true, data } : { success: false };
  }

  private async setToMemory<T>(
    key: string,
    data: T,
    options: StorageOptions
  ): Promise<StorageResult<void>> {
    const ttl = options.ttl || this.config.tiers.memory.ttl;
    await smartCache.set(key, data, ttl);
    return { success: true };
  }

  private async getFromLocalStorage<T>(
    key: string,
    _options: StorageOptions
  ): Promise<StorageResult<T>> {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return { success: false };

      const parsed = JSON.parse(stored);

      // Handle compressed data - check if it has the CompressedData structure
      if (
        parsed &&
        typeof parsed === 'object' &&
        'data' in parsed &&
        'algorithm' in parsed &&
        'originalSize' in parsed &&
        'compressedSize' in parsed
      ) {
        const data = await compressionService.decompress<T>(parsed);
        return { success: true, data, metadata: { compressed: true } };
      }

      // Return non-compressed data
      return { success: true, data: parsed };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  private async setToLocalStorage<T>(
    key: string,
    data: T,
    options: StorageOptions
  ): Promise<StorageResult<void>> {
    try {
      let toStore: string;

      if (options.compress !== false && this.config.enableCompression) {
        const compressed = await compressionService.compress(data);
        toStore = JSON.stringify(compressed);
      } else {
        toStore = JSON.stringify(data);
      }

      localStorage.setItem(key, toStore);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  // IndexedDB tier methods
  private async getFromIndexedDB<T>(
    key: string,
    _options: StorageOptions
  ): Promise<StorageResult<T>> {
    try {
      const result = await indexedDBStorage.get<any>(key);

      if (!result.success || !result.data) {
        return { success: false, error: result.error || 'Not found in IndexedDB' };
      }

      let data: T;

      // Check if data has the CompressedData structure
      if (
        result.data &&
        typeof result.data === 'object' &&
        'data' in result.data &&
        'algorithm' in result.data &&
        'originalSize' in result.data &&
        'compressedSize' in result.data
      ) {
        data = await compressionService.decompress(result.data);
      } else {
        data = result.data;
      }

      return { success: true, data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  private async setToIndexedDB<T>(
    key: string,
    data: T,
    options: StorageOptions
  ): Promise<StorageResult<void>> {
    try {
      let toStore: any;

      if (options.compress !== false && this.config.enableCompression) {
        toStore = await compressionService.compress(data);
      } else {
        toStore = data;
      }

      // Determine category for organization
      let category = 'default';
      if (key.includes('word_progress')) category = 'progress';
      else if (key.includes('analytics')) category = 'analytics';
      else if (key.includes('session')) category = 'session';
      else if (key.includes('cache')) category = 'cache';

      const result = await indexedDBStorage.set(key, toStore, category);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  private async getFromRemote<T>(key: string, options: StorageOptions): Promise<StorageResult<T>> {
    try {
      return await remoteStorage.get<T>(key, options);
    } catch (error) {
      logger.warn('Remote storage get failed:', error);
      return {
        success: false,
        error: `Remote storage unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async setToRemote<T>(
    key: string,
    data: T,
    options: StorageOptions
  ): Promise<StorageResult<void>> {
    try {
      return await remoteStorage.set(key, data, options);
    } catch (error) {
      logger.warn('Remote storage set failed:', error);
      return {
        success: false,
        error: `Remote storage unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async getFromArchive<T>(
    _key: string,
    _options: StorageOptions
  ): Promise<StorageResult<T>> {
    // Archive storage pending backend integration
    return { success: false, error: 'Archive storage not yet implemented' };
  }

  private async setToArchive<T>(
    _key: string,
    _data: T,
    _options: StorageOptions
  ): Promise<StorageResult<void>> {
    // Archive storage pending backend integration
    return { success: false, error: 'Archive storage not yet implemented' };
  }

  private async deleteFromTier(key: string, tier: StorageTier): Promise<StorageResult<void>> {
    switch (tier) {
      case 'memory':
        await smartCache.invalidate(key);
        return { success: true };
      case 'local':
        localStorage.removeItem(key);
        return { success: true };
      case 'indexedDB':
        const result = await indexedDBStorage.delete(key);
        return result;
      case 'remote':
        return await remoteStorage.delete(key);
      case 'archive':
        return { success: false, error: 'Not implemented' };
      default:
        return { success: false, error: 'Unknown tier' };
    }
  }

  private getOrderedTiers(): StorageTier[] {
    return Object.entries(this.config.tiers)
      .filter(([, config]) => config && config.enabled)
      .sort(([, a], [, b]) => (b?.priority || 0) - (a?.priority || 0))
      .map(([tier]) => tier as StorageTier);
  }

  /**
   * Get analytics for the tiered storage system
   */
  async getAnalytics(): Promise<any> {
    try {
      const analytics: any = {
        tiers: {},
        totalItems: 0,
        totalSize: 0,
        enabled: this.config.tiers,
      };

      // Memory tier analytics (basic stats)
      analytics.tiers.memory = {
        items: 0, // Would need cache implementation update
        hitRate: 0, // Would need cache implementation update
        enabled: this.config.tiers.memory.enabled,
      };

      // Local storage analytics
      analytics.tiers.local = {
        items: localStorage.length,
        size: this.estimateLocalStorageSize(),
        enabled: this.config.tiers.local.enabled,
      };

      // IndexedDB analytics
      const indexedDBConfig = (this.config.tiers as any).indexedDB;
      if (indexedDBConfig && indexedDBConfig.enabled) {
        try {
          const idbStats = await indexedDBStorage.getStats();
          analytics.tiers.indexedDB = {
            items: idbStats.success ? idbStats.data?.itemCount || 0 : 0,
            size: idbStats.success ? idbStats.data?.totalSize || 0 : 0,
            categories: idbStats.success ? idbStats.data?.categories || {} : {},
            enabled: true,
          };
        } catch (error) {
          analytics.tiers.indexedDB = {
            items: 0,
            size: 0,
            categories: {},
            enabled: true,
            error: 'Failed to get IndexedDB stats',
          };
        }
      }

      // Calculate totals
      analytics.totalItems =
        (analytics.tiers.memory?.items || 0) +
        (analytics.tiers.local?.items || 0) +
        (analytics.tiers.indexedDB?.items || 0);

      analytics.totalSize =
        (analytics.tiers.local?.size || 0) + (analytics.tiers.indexedDB?.size || 0);

      return analytics;
    } catch (error) {
      logger.error('Failed to get tiered storage analytics', error);
      return { error: 'Analytics failed' };
    }
  }

  private estimateLocalStorageSize(): number {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        total += key.length + (value?.length || 0);
      }
    }
    return total;
  }

  private getNextHigherTier(currentTier: StorageTier): StorageTier | null {
    const tiers = this.getOrderedTiers();
    const currentIndex = tiers.indexOf(currentTier);
    return currentIndex > 0 ? tiers[currentIndex - 1] : null;
  }

  private getNextLowerTier(currentTier: StorageTier): StorageTier | null {
    const tiers = this.getOrderedTiers();
    const currentIndex = tiers.indexOf(currentTier);
    return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
  }

  private async determineOptimalTier<T>(
    _key: string,
    data: T,
    options: StorageOptions
  ): Promise<StorageTier> {
    // Default to memory for small, frequently accessed data
    const size = JSON.stringify(data).length;

    if (size < 10 * 1024 && options.priority === 'high') {
      return 'memory';
    }

    // Use local storage for most data
    return 'local';
  }

  private shouldPromote(_key: string, currentTier: StorageTier): boolean {
    // Simple heuristic: promote if accessed recently
    return currentTier !== 'memory';
  }

  private async promoteToHigherTiers<T>(
    key: string,
    data: T,
    currentTier: StorageTier
  ): Promise<void> {
    const higherTier = this.getNextHigherTier(currentTier);
    if (higherTier) {
      await this.setToTier(key, data, higherTier);
    }
  }

  private async cascadeToHigherTiers<T>(
    key: string,
    data: T,
    targetTier: StorageTier,
    options: StorageOptions
  ): Promise<void> {
    // Store in memory if not the target and data is small
    if (targetTier !== 'memory' && JSON.stringify(data).length < 50 * 1024) {
      await this.setToMemory(key, data, options);
    }
  }
}

// Export singleton instance
export const tieredStorage = new TieredStorageService();
