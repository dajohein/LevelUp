/**
 * Smart Cache Manager
 *
 * Intelligent caching with dependency-based invalidation and predictive warming
 * Backend-ready: can be extended to work with distributed caches
 */

import { CacheProvider, CacheStats, StorageEventListener } from './interfaces';
import { logger } from '../logger';

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  dependencies: Set<string>;
  accessCount: number;
  lastAccess: number;
  size: number;
}

interface CacheConfig {
  maxSize: number; // Maximum cache size in bytes
  maxEntries: number; // Maximum number of entries
  defaultTtl: number; // Default TTL in milliseconds
  cleanupInterval: number; // Cleanup interval in milliseconds
  enableLRU: boolean; // Enable LRU eviction
  enablePrediction: boolean; // Enable predictive cache warming
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxSize: 50 * 1024 * 1024, // 50MB
  maxEntries: 10000, // 10k entries
  defaultTtl: 60 * 60 * 1000, // 1 hour
  cleanupInterval: 5 * 60 * 1000, // 5 minutes
  enableLRU: true,
  enablePrediction: true,
};

class SmartCacheManager implements CacheProvider {
  private cache = new Map<string, CacheEntry>();
  private dependencies = new Map<string, Set<string>>(); // dependency -> set of keys
  private stats: CacheStats;
  private config: CacheConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private eventListeners = new Set<StorageEventListener>();

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      memoryUsage: 0,
      oldestEntry: Date.now(),
      newestEntry: Date.now(),
    };

    this.startCleanupWorker();
  }

  /**
   * Get cached data
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.emitEvent('onCacheMiss', key);
      return null;
    }

    // Check TTL
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.updateDependencies(key, []);
      this.stats.misses++;
      this.emitEvent('onCacheMiss', key);
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccess = Date.now();
    this.stats.hits++;
    this.emitEvent('onCacheHit', key);

    logger.debug(`🎯 Cache hit for key: ${key}`);
    return entry.data;
  }

  /**
   * Set cached data with dependencies
   */
  async set<T>(key: string, data: T, ttl?: number, dependencies: string[] = []): Promise<void> {
    const now = Date.now();
    const entryTtl = ttl || this.config.defaultTtl;
    const size = this.calculateSize(data);

    // Check cache capacity
    await this.ensureCapacity(size);

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: entryTtl,
      dependencies: new Set(dependencies),
      accessCount: 0,
      lastAccess: now,
      size,
    };

    // Update cache
    const oldEntry = this.cache.get(key);
    this.cache.set(key, entry);

    // Update dependencies
    this.updateDependencies(key, dependencies);

    // Update stats
    this.stats.size += size;
    if (oldEntry) {
      this.stats.size -= oldEntry.size;
    }
    this.stats.newestEntry = now;
    if (this.cache.size === 1) {
      this.stats.oldestEntry = now;
    }

    logger.debug(
      `💾 Cached data for key: ${key} (size: ${size} bytes, deps: ${dependencies.join(', ')})`
    );
  }

  /**
   * Invalidate specific key
   */
  async invalidate(key: string): Promise<void> {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.updateDependencies(key, []);
      this.stats.size -= entry.size;
      logger.debug(`🗑️ Invalidated cache key: ${key}`);
    }
  }

  /**
   * Invalidate all keys that depend on a specific dependency
   */
  async invalidateByDependency(dependency: string): Promise<void> {
    const dependentKeys = this.dependencies.get(dependency);
    if (!dependentKeys) return;

    const keysToInvalidate = Array.from(dependentKeys);

    for (const key of keysToInvalidate) {
      await this.invalidate(key);
    }

    logger.debug(`🔄 Invalidated ${keysToInvalidate.length} keys by dependency: ${dependency}`);
  }

  /**
   * Invalidate keys matching a pattern
   */
  async invalidateByPattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern);
    const keysToInvalidate: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToInvalidate.push(key);
      }
    }

    for (const key of keysToInvalidate) {
      await this.invalidate(key);
    }

    logger.debug(`🔍 Invalidated ${keysToInvalidate.length} keys by pattern: ${pattern}`);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    this.updateMemoryUsage();
    return { ...this.stats };
  }

  /**
   * Get cache hit rate
   */
  async getHitRate(): Promise<number> {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Predictive cache warming based on access patterns
   */
  async warmCache(keys: string[], predictor?: (key: string) => string[]): Promise<void> {
    if (!this.config.enablePrediction) return;

    for (const key of keys) {
      // Use custom predictor or default pattern-based prediction
      const relatedKeys = predictor ? predictor(key) : this.predictRelatedKeys(key);

      // Pre-load related keys that aren't already cached
      for (const relatedKey of relatedKeys) {
        if (!this.cache.has(relatedKey)) {
          // Note: External system should handle loading
          logger.debug(`🔥 Suggested cache warming for: ${relatedKey}`);
        }
      }
    }
  }

  /**
   * Add event listener
   */
  addEventListener(listener: StorageEventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: StorageEventListener): void {
    this.eventListeners.delete(listener);
  }

  /**
   * Ensure cache capacity by evicting entries if necessary
   */
  private async ensureCapacity(newEntrySize: number): Promise<void> {
    // Check size limit
    while (this.stats.size + newEntrySize > this.config.maxSize && this.cache.size > 0) {
      await this.evictLRU();
    }

    // Check entry count limit
    while (this.cache.size >= this.config.maxEntries) {
      await this.evictLRU();
    }
  }

  /**
   * Evict least recently used entry
   */
  private async evictLRU(): Promise<void> {
    if (!this.config.enableLRU || this.cache.size === 0) return;

    let oldestKey: string | null = null;
    let oldestAccess = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      await this.invalidate(oldestKey);
      logger.debug(`🚽 Evicted LRU entry: ${oldestKey}`);
    }
  }

  /**
   * Update dependency tracking
   */
  private updateDependencies(key: string, newDependencies: string[]): void {
    // Remove old dependencies
    for (const [dep, keys] of this.dependencies.entries()) {
      keys.delete(key);
      if (keys.size === 0) {
        this.dependencies.delete(dep);
      }
    }

    // Add new dependencies
    for (const dep of newDependencies) {
      if (!this.dependencies.has(dep)) {
        this.dependencies.set(dep, new Set());
      }
      this.dependencies.get(dep)!.add(key);
    }
  }

  /**
   * Calculate size of data for memory tracking
   */
  private calculateSize(data: any): number {
    try {
      // Rough estimation of memory usage
      const str = JSON.stringify(data);
      return str.length * 2; // Approximate UTF-16 character size
    } catch (error) {
      logger.warn('Failed to calculate data size:', error);
      return 1024; // Default estimate
    }
  }

  /**
   * Update memory usage statistics
   */
  private updateMemoryUsage(): void {
    this.stats.memoryUsage = Array.from(this.cache.values()).reduce(
      (total, entry) => total + entry.size,
      0
    );
  }

  /**
   * Predict related keys based on patterns
   */
  private predictRelatedKeys(key: string): string[] {
    const related: string[] = [];

    // Pattern 1: Language-specific keys (e.g., "progress_de" -> "analytics_de", "cache_de")
    const languageMatch = key.match(/^(.+)_([a-z]{2})$/);
    if (languageMatch) {
      const [, prefix, lang] = languageMatch;
      const relatedPrefixes = ['progress', 'analytics', 'cache', 'session'];

      for (const relatedPrefix of relatedPrefixes) {
        if (relatedPrefix !== prefix) {
          related.push(`${relatedPrefix}_${lang}`);
        }
      }
    }

    // Pattern 2: Module-specific keys (e.g., "module_de_basic" -> "words_de_basic")
    const moduleMatch = key.match(/^(.+)_([a-z]{2})_(.+)$/);
    if (moduleMatch) {
      const [, prefix, lang, module] = moduleMatch;
      const relatedPrefixes = ['module', 'words', 'progress'];

      for (const relatedPrefix of relatedPrefixes) {
        if (relatedPrefix !== prefix) {
          related.push(`${relatedPrefix}_${lang}_${module}`);
        }
      }
    }

    // Pattern 3: User-specific keys (e.g., "user_profile" -> "user_settings", "user_achievements")
    if (key.startsWith('user_')) {
      const userRelated = [
        'user_profile',
        'user_settings',
        'user_achievements',
        'user_preferences',
      ];
      related.push(...userRelated.filter(k => k !== key));
    }

    return related;
  }

  /**
   * Start background cleanup worker
   */
  private startCleanupWorker(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Perform periodic cleanup
   */
  private performCleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    // Find expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        expiredKeys.push(key);
      }
    }

    // Remove expired entries
    for (const key of expiredKeys) {
      this.invalidate(key);
    }

    // Update oldest entry timestamp
    if (this.cache.size > 0) {
      this.stats.oldestEntry = Math.min(
        ...Array.from(this.cache.values()).map(entry => entry.timestamp)
      );
    } else {
      this.stats.oldestEntry = now;
    }

    if (expiredKeys.length > 0) {
      logger.debug(`🧹 Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  /**
   * Emit event to listeners
   */
  private emitEvent(eventName: keyof StorageEventListener, ...args: any[]): void {
    for (const listener of this.eventListeners) {
      const handler = listener[eventName];
      if (handler) {
        try {
          (handler as any)(...args);
        } catch (error) {
          logger.warn(`Error in cache event listener for ${eventName}:`, error);
        }
      }
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    this.cache.clear();
    this.dependencies.clear();
    this.eventListeners.clear();
  }
}

// Export singleton instance with default configuration
export const smartCache = new SmartCacheManager();

// Export the class for custom instances
export { SmartCacheManager };
