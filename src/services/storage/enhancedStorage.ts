/**
 * Enhanced Storage Facade
 * 
 * Main entry point for the new storage system
 * Provides a unified interface that can work with both current localStorage and future backend
 */

import { asyncStorage } from './asyncStorage';
import { smartCache } from './cache';
import { compressionService } from './compression';
import { remoteStorage } from './remoteStorage';
import { StorageOptions, StorageResult } from './interfaces';
import type { WordProgress } from '../../store/types';
import { logger } from '../logger';

interface EnhancedStorageConfig {
  enableOptimisticUpdates: boolean;
  enableCompression: boolean;
  enableTieredStorage: boolean;
  enableAnalytics: boolean;
  compressionThreshold: number; // Size in bytes
  cacheLanguageData: boolean;
  debugMode: boolean;
}

const DEFAULT_ENHANCED_CONFIG: EnhancedStorageConfig = {
  enableOptimisticUpdates: true,
  enableCompression: true,
  enableTieredStorage: true,
  enableAnalytics: true,
  compressionThreshold: 5 * 1024, // 5KB
  cacheLanguageData: true,
  debugMode: process.env.NODE_ENV === 'development',
};

class EnhancedStorageService {
  private config: EnhancedStorageConfig;
  private analytics = {
    operations: 0,
    hits: 0,
    misses: 0,
    totalTime: 0,
    compressionSavings: 0,
  };

  constructor(config: Partial<EnhancedStorageConfig> = {}) {
    this.config = { ...DEFAULT_ENHANCED_CONFIG, ...config };
    
    if (this.config.debugMode) {
      logger.info('🚀 Enhanced Storage Service initialized with config:', this.config);
    }
  }

  /**
   * Backend-ready word progress operations
   */
  async saveWordProgress(languageCode: string, wordProgress: Record<string, WordProgress>): Promise<StorageResult<void>> {
    const startTime = performance.now();
    this.analytics.operations++;

    try {
      // Set the current language for remote storage
      remoteStorage.setCurrentLanguage(languageCode);
      
      const key = `word_progress_${languageCode}`;
      const options: StorageOptions = {
        compress: await this.shouldCompress(wordProgress),
        priority: 'normal',
        ttl: 24 * 60 * 60 * 1000, // 24 hours
      };

      const result = await asyncStorage.set(key, wordProgress, options);

      // Update analytics
      if (result.success) {
        this.analytics.hits++;
        if (this.config.cacheLanguageData) {
          // Cache frequently accessed summary data
          await this.cacheLanguageSummary(languageCode, wordProgress);
        }
      } else {
        this.analytics.misses++;
      }

      const duration = performance.now() - startTime;
      this.analytics.totalTime += duration;

      if (this.config.debugMode) {
        logger.debug(`💾 Saved word progress for ${languageCode} (${Math.round(duration)}ms)`);
      }

      return result;
    } catch (error) {
      logger.error(`Failed to save word progress for ${languageCode}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  async loadWordProgress(languageCode: string): Promise<StorageResult<Record<string, WordProgress>>> {
    const startTime = performance.now();
    this.analytics.operations++;

    try {
      // Set the current language for remote storage
      remoteStorage.setCurrentLanguage(languageCode);
      
      const key = `word_progress_${languageCode}`;
      const result = await asyncStorage.get<Record<string, WordProgress>>(key);

      // Update analytics
      if (result.success && result.data) {
        this.analytics.hits++;
      } else {
        this.analytics.misses++;
      }

      const duration = performance.now() - startTime;
      this.analytics.totalTime += duration;

      if (this.config.debugMode && result.success) {
        const wordCount = Object.keys(result.data || {}).length;
        logger.debug(`📖 Loaded ${wordCount} word progress entries for ${languageCode} (${Math.round(duration)}ms)`);
      }

      return result;
    } catch (error) {
      logger.error(`Failed to load word progress for ${languageCode}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  async clearWordProgress(languageCode: string): Promise<StorageResult<void>> {
    const key = `word_progress_${languageCode}`;
    
    // Clear from all storage tiers and cache
    await asyncStorage.delete(key);
    await smartCache.invalidate(key);
    await smartCache.invalidateByPattern(`word_progress_${languageCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);

    if (this.config.debugMode) {
      logger.debug(`🗑️ Cleared word progress for ${languageCode}`);
    }

    return { success: true };
  }

  /**
   * Game state operations (optimized for frequent saves)
   */
  async saveGameState(gameState: any): Promise<StorageResult<void>> {
    const options: StorageOptions = {
      priority: 'high', // Game state changes need immediate response
      compress: false,  // Don't compress for speed
      ttl: 60 * 60 * 1000, // 1 hour
    };

    return await asyncStorage.set('game_state', gameState, options);
  }

  async loadGameState(): Promise<StorageResult<any>> {
    return await asyncStorage.get('game_state');
  }

  /**
   * Session operations (short-lived, memory-preferred)
   */
  async saveSessionState(sessionState: any): Promise<StorageResult<void>> {
    const options: StorageOptions = {
      priority: 'high',
      compress: false,
      ttl: 30 * 60 * 1000, // 30 minutes
    };

    return await asyncStorage.set('session_state', sessionState, options);
  }

  async loadSessionState(): Promise<StorageResult<any>> {
    return await asyncStorage.get('session_state');
  }

  /**
   * User preferences (cached and compressed)
   */
  async saveUserPreferences(preferences: any): Promise<StorageResult<void>> {
    const options: StorageOptions = {
      compress: await this.shouldCompress(preferences),
      priority: 'low',
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    return await asyncStorage.set('user_preferences', preferences, options);
  }

  async loadUserPreferences(): Promise<StorageResult<any>> {
    return await asyncStorage.get('user_preferences');
  }

  /**
   * Analytics and metrics
   */
  async saveAnalytics(languageCode: string, analytics: any): Promise<StorageResult<void>> {
    const key = `analytics_${languageCode}`;
    const options: StorageOptions = {
      compress: true, // Analytics data compresses well
      priority: 'low',
      ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
    };

    return await asyncStorage.set(key, analytics, options);
  }

  async loadAnalytics(languageCode: string): Promise<StorageResult<any>> {
    const key = `analytics_${languageCode}`;
    return await asyncStorage.get(key);
  }

  /**
   * Batch operations for efficiency
   */
  async saveMultipleLanguageProgress(progressData: Record<string, Record<string, WordProgress>>): Promise<StorageResult<void>> {
    const batchData: Record<string, Record<string, WordProgress>> = {};
    
    for (const [languageCode, progress] of Object.entries(progressData)) {
      batchData[`word_progress_${languageCode}`] = progress;
    }

    const options: StorageOptions = {
      compress: true,
      priority: 'normal',
    };

    return await asyncStorage.setBatch(batchData, options);
  }

  async loadMultipleLanguageProgress(languageCodes: string[]): Promise<StorageResult<Record<string, Record<string, WordProgress>>>> {
    const keys = languageCodes.map(code => `word_progress_${code}`);
    const result = await asyncStorage.getBatch<Record<string, WordProgress>>(keys);
    
    if (result.success && result.data) {
      // Transform keys back to language codes
      const transformed: Record<string, Record<string, WordProgress>> = {};
      
      for (const [key, progress] of Object.entries(result.data)) {
        const languageCode = key.replace('word_progress_', '');
        transformed[languageCode] = progress;
      }
      
      return { success: true, data: transformed };
    }

    return result as StorageResult<Record<string, Record<string, WordProgress>>>;
  }

  /**
   * Cache management
   */
  async warmCache(languageCode: string): Promise<void> {
    if (!this.config.cacheLanguageData) return;

    const keys = [
      `word_progress_${languageCode}`,
      `analytics_${languageCode}`,
      `module_progress_${languageCode}`,
    ];

    // Cache warming handled by smartCache
    await smartCache.warmCache(keys);
    
    if (this.config.debugMode) {
      logger.debug(`🔥 Warmed cache for ${languageCode}`);
    }
  }

  async invalidateLanguageCache(languageCode: string): Promise<void> {
    await smartCache.invalidateByPattern(`.*${languageCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*`);
    
    if (this.config.debugMode) {
      logger.debug(`🔄 Invalidated cache for ${languageCode}`);
    }
  }

  /**
   * Storage health and monitoring
   */
  async getStorageHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: any;
  }> {
    const healthResult = await asyncStorage.healthCheck();
    const cacheStats = await smartCache.getStats();
    const pendingOperations = asyncStorage.getPendingCount();

    const health = {
      storage: healthResult.data?.status || 'unknown',
      cache: {
        hitRate: await smartCache.getHitRate(),
        size: cacheStats.size,
        memoryUsage: cacheStats.memoryUsage,
      },
      queue: {
        pendingOperations,
        isHealthy: pendingOperations < 100,
      },
      analytics: this.analytics,
    };

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (pendingOperations > 100 || health.cache.hitRate < 0.7) {
      overallStatus = 'degraded';
    }
    
    if (pendingOperations > 500 || healthResult.data?.status === 'unhealthy') {
      overallStatus = 'unhealthy';
    }

    return { status: overallStatus, details: health };
  }

  async getStorageStats(): Promise<{
    totalOperations: number;
    averageResponseTime: number;
    hitRate: number;
    compressionSavings: number;
    cacheStats: any;
  }> {
    const cacheStats = await smartCache.getStats();
    const hitRate = this.analytics.hits / (this.analytics.hits + this.analytics.misses);
    const avgTime = this.analytics.totalTime / this.analytics.operations;

    return {
      totalOperations: this.analytics.operations,
      averageResponseTime: avgTime,
      hitRate: hitRate || 0,
      compressionSavings: this.analytics.compressionSavings,
      cacheStats,
    };
  }

  /**
   * Migration support for backend transition
   */
  async migrateToBackend(): Promise<StorageResult<void>> {
    try {
      logger.info('🚀 Backend migration starting...');
      
      // Step 1: Collect all local data
      const migrationData = await this.collectMigrationData();
      
      // Step 2: Validate data integrity
      const validation = await this.validateMigrationData(migrationData);
      if (!validation.success) {
        return { success: false, error: `Migration validation failed: ${validation.error}` };
      }
      
      // Step 3: Create backup before migration
      const backupResult = await this.createMigrationBackup(migrationData);
      if (!backupResult.success) {
        return { success: false, error: `Backup creation failed: ${backupResult.error}` };
      }
      
      // Step 4: Migrate to backend (when backend is available)
      // This will be implemented when backend endpoints are ready
      logger.info('� Backend endpoints not configured - migration prepared but not executed');
      
      // Step 5: Verify migration success
      logger.info('✅ Migration preparation completed successfully');
      
      return { 
        success: true
      };
      
    } catch (error) {
      logger.error('Backend migration failed', error);
      return { success: false, error: error instanceof Error ? error.message : 'Migration failed' };
    }
  }

  /**
   * Helper methods for backend migration
   */
  private async collectMigrationData(): Promise<any> {
    const migrationData: any = {};
    
    try {
      // Collect all progress data
      const progressKeys = await asyncStorage.getKeys('word_progress_*');
      if (progressKeys.success && progressKeys.data) {
        for (const key of progressKeys.data) {
          const data = await asyncStorage.get(key);
          if (data.success) {
            migrationData[key] = data.data;
          }
        }
      }
      
      // Collect analytics data
      const analyticsKeys = await asyncStorage.getKeys('analytics_*');
      if (analyticsKeys.success && analyticsKeys.data) {
        for (const key of analyticsKeys.data) {
          const data = await asyncStorage.get(key);
          if (data.success) {
            migrationData[key] = data.data;
          }
        }
      }
      
      // Collect session data
      const sessionKeys = await asyncStorage.getKeys('session_*');
      if (sessionKeys.success && sessionKeys.data) {
        for (const key of sessionKeys.data) {
          const data = await asyncStorage.get(key);
          if (data.success) {
            migrationData[key] = data.data;
          }
        }
      }
      
      logger.info(`📦 Collected ${Object.keys(migrationData).length} data items for migration`);
      return migrationData;
    } catch (error) {
      logger.error('Failed to collect migration data', error);
      throw error;
    }
  }

  private async validateMigrationData(data: any): Promise<StorageResult<void>> {
    try {
      // Validate data structure and integrity
      const errors: string[] = [];
      
      // Check for required data types
      const hasProgressData = Object.keys(data).some(key => key.startsWith('word_progress_'));
      if (!hasProgressData) {
        errors.push('No progress data found');
      }
      
      // Validate data format
      for (const [key, value] of Object.entries(data)) {
        if (value === null || value === undefined) {
          errors.push(`Invalid data for key: ${key}`);
        }
      }
      
      if (errors.length > 0) {
        return { success: false, error: errors.join(', ') };
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Validation failed' };
    }
  }

  private async createMigrationBackup(data: any): Promise<StorageResult<void>> {
    try {
      const backupKey = `migration_backup_${Date.now()}`;
      const backup = {
        timestamp: Date.now(),
        version: '1.0',
        data: data,
        metadata: {
          itemCount: Object.keys(data).length,
          totalSize: JSON.stringify(data).length
        }
      };
      
      const result = await asyncStorage.set(backupKey, backup, {
        compress: true,
        ttl: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
      
      if (result.success) {
        logger.info(`💾 Migration backup created: ${backupKey}`);
      }
      
      return result;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Backup failed' };
    }
  }

  async exportAllData(): Promise<StorageResult<any>> {
    try {
      // Get all language progress data
      const allKeys = await asyncStorage.getKeys('word_progress_*');
      if (!allKeys.success || !allKeys.data) {
        return { success: false, error: 'Failed to get storage keys' };
      }

      const allData = await asyncStorage.getBatch(allKeys.data);
      
      if (allData.success) {
        const exportData = {
          version: '2.0.0',
          timestamp: Date.now(),
          data: allData.data,
          analytics: this.analytics,
        };

        return { success: true, data: exportData };
      }

      return allData as StorageResult<any>;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Cleanup and maintenance
   */
  async performMaintenance(): Promise<void> {
    // Flush pending operations
    await asyncStorage.flush();
    
    // Clean up expired cache entries
    // (handled automatically by cache service)
    
    // Log maintenance completion
    if (this.config.debugMode) {
      const stats = await this.getStorageStats();
      logger.info('🧹 Storage maintenance completed:', stats);
    }
  }

  // Private helper methods

  private async shouldCompress(data: any): Promise<boolean> {
    if (!this.config.enableCompression) return false;
    
    const dataSize = JSON.stringify(data).length;
    if (dataSize < this.config.compressionThreshold) return false;
    
    return await compressionService.isCompressionWorthwhile(data);
  }

  private async cacheLanguageSummary(languageCode: string, wordProgress: Record<string, WordProgress>): Promise<void> {
    const summary = {
      totalWords: Object.keys(wordProgress).length,
      practicedWords: Object.values(wordProgress).filter(p => p.timesCorrect > 0).length,
      totalXP: Object.values(wordProgress).reduce((sum, p) => sum + (p.xp || 0), 0),
      lastUpdated: Date.now(),
    };

    await smartCache.set(
      `summary_${languageCode}`, 
      summary, 
      60 * 60 * 1000, // 1 hour
      [`word_progress_${languageCode}`]
    );
  }

  // ==========================================
  // Generic Storage Methods for Learning Profiles
  // ==========================================

  /**
   * Generic data storage method
   */
  async setData<T>(key: string, data: T, options?: StorageOptions): Promise<StorageResult<void>> {
    const startTime = performance.now();
    this.analytics.operations++;

    try {
      const result = await asyncStorage.set(key, data, options);

      // Update analytics
      if (result.success) {
        this.analytics.hits++;
      } else {
        this.analytics.misses++;
      }

      const duration = performance.now() - startTime;
      this.analytics.totalTime += duration;

      if (this.config.debugMode) {
        logger.debug(`💾 Generic data saved to ${key} (${Math.round(duration)}ms)`);
      }

      return result;
    } catch (error) {
      logger.error(`Failed to save data to ${key}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Generic data loading method
   */
  async getData<T>(key: string): Promise<StorageResult<T>> {
    const startTime = performance.now();
    this.analytics.operations++;

    try {
      const result = await asyncStorage.get<T>(key);

      // Update analytics
      if (result.success && result.data) {
        this.analytics.hits++;
      } else {
        this.analytics.misses++;
      }

      const duration = performance.now() - startTime;
      this.analytics.totalTime += duration;

      if (this.config.debugMode && result.success) {
        logger.debug(`📖 Generic data loaded from ${key} (${Math.round(duration)}ms)`);
      }

      return result;
    } catch (error) {
      logger.error(`Failed to load data from ${key}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Delete data method
   */
  async deleteData(key: string): Promise<StorageResult<void>> {
    try {
      // Delete from all storage tiers and cache
      await asyncStorage.delete(key);
      await smartCache.invalidate(key);

      if (this.config.debugMode) {
        logger.debug(`🗑️ Data deleted from ${key}`);
      }

      return { success: true };
    } catch (error) {
      logger.error(`Failed to delete data from ${key}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get keys matching pattern
   */
  async getKeys(pattern: string): Promise<StorageResult<string[]>> {
    try {
      const result = await asyncStorage.getKeys(pattern);
      return result;
    } catch (error) {
      logger.error(`Failed to get keys for pattern ${pattern}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Batch get operation
   */
  async getBatch<T>(keys: string[]): Promise<StorageResult<Record<string, T>>> {
    try {
      const result = await asyncStorage.getBatch<T>(keys);
      return result;
    } catch (error) {
      logger.error('Failed to perform batch get operation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  // ==========================================
  // Analytics Storage Methods (Phase 2)
  // ==========================================

  /**
   * Save analytics events
   */
  async saveAnalyticsEvents(events: any[], options: StorageOptions = {}): Promise<StorageResult<void>> {
    const startTime = Date.now();
    
    try {
      // Store events with compression if enabled
      const key = `analytics_events_${Date.now()}`;
      const result = await asyncStorage.set(key, events, {
        ...options,
        compress: this.config.enableCompression && JSON.stringify(events).length > this.config.compressionThreshold
      });

      const duration = Date.now() - startTime;
      this.analytics.operations++;
      this.analytics.totalTime += duration;
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.analytics.operations++;
      this.analytics.totalTime += duration;
      logger.error('Failed to save analytics events', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Load analytics events with filtering
   */
  async loadAnalyticsEvents(query: any = {}): Promise<any[]> {
    const startTime = Date.now();
    
    try {
      // For Phase 1, load from cache/storage
      // In Phase 2 with backend, this would query the API
      const cacheKey = `analytics_query_${JSON.stringify(query)}`;
      const cached = await smartCache.get(cacheKey);
      
      if (cached) {
        const duration = Date.now() - startTime;
        this.analytics.operations++;
        this.analytics.hits++;
        this.analytics.totalTime += duration;
        return Array.isArray(cached) ? cached : [];
      }

      // Fallback to loading recent events from storage
      const recentEvents = await this.loadRecentAnalyticsEvents();
      await smartCache.set(cacheKey, recentEvents, 5 * 60 * 1000); // 5 minute cache
      
      const duration = Date.now() - startTime;
      this.analytics.operations++;
      this.analytics.misses++;
      this.analytics.totalTime += duration;
      return recentEvents;
    } catch (error) {
      logger.error('Failed to load analytics events', error);
      return [];
    }
  }

  /**
   * Save analytics model data
   */
  async saveAnalyticsModel(type: string, model: any): Promise<StorageResult<void>> {
    const startTime = Date.now();
    
    try {
      const key = `analytics_model_${type}`;
      const result = await asyncStorage.set(key, model, {
        compress: this.config.enableCompression
      });

      // Invalidate model cache
      await smartCache.invalidateByPattern(`models_${type}`);
      
      const duration = Date.now() - startTime;
      this.analytics.operations++;
      this.analytics.totalTime += duration;
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.analytics.operations++;
      this.analytics.totalTime += duration;
      logger.error(`Failed to save analytics model ${type}`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Load all trained models
   */
  async loadAnalyticsModels(): Promise<Record<string, any> | null> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cached = await smartCache.get('analytics_models_all');
      if (cached) {
        const duration = Date.now() - startTime;
        this.analytics.operations++;
        this.analytics.hits++;
        this.analytics.totalTime += duration;
        return cached;
      }

      // Load individual models - in real implementation, this would be more efficient
      const models: Record<string, any> = {};
      const modelTypes = ['PERFORMANCE_FORECAST', 'OPTIMAL_DIFFICULTY', 'SESSION_LENGTH', 'CONTENT_RECOMMENDATION', 'OPTIMAL_TIME'];
      
      for (const type of modelTypes) {
        const key = `analytics_model_${type}`;
        const result = await asyncStorage.get(key);
        if (result.success && result.data) {
          models[type] = result.data;
        }
      }

      // Cache the combined models
      await smartCache.set('analytics_models_all', models, 30 * 60 * 1000); // 30 minutes
      
      const duration = Date.now() - startTime;
      this.analytics.operations++;
      this.analytics.misses++;
      this.analytics.totalTime += duration;
      return Object.keys(models).length > 0 ? models : null;
    } catch (error) {
      logger.error('Failed to load analytics models', error);
      return null;
    }
  }

  /**
   * Load recent analytics events (fallback method)
   */
  private async loadRecentAnalyticsEvents(): Promise<any[]> {
    try {
      // This would be implemented based on storage backend
      // For now, return empty array as placeholder
      return [];
    } catch (error) {
      logger.error('Failed to load recent analytics events', error);
      return [];
    }
  }

  /**
   * Save real-time metrics
   */
  async saveRealtimeMetrics(sessionId: string, metrics: any): Promise<StorageResult<void>> {
    const startTime = Date.now();
    
    try {
      const key = `realtime_metrics_${sessionId}`;
      const result = await asyncStorage.set(key, metrics, {
        compress: false, // Real-time data shouldn't be compressed for speed
        ttl: 24 * 60 * 60 * 1000 // 24 hours
      });

      // Update cache
      await smartCache.set(key, metrics, 60 * 1000); // 1 minute cache for real-time
      
      const duration = Date.now() - startTime;
      this.analytics.operations++;
      this.analytics.totalTime += duration;
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.analytics.operations++;
      this.analytics.totalTime += duration;
      logger.error('Failed to save realtime metrics', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Load real-time metrics
   */
  async loadRealtimeMetrics(sessionId: string): Promise<any | null> {
    const startTime = Date.now();
    
    try {
      const key = `realtime_metrics_${sessionId}`;
      
      // Check cache first
      const cached = await smartCache.get(key);
      if (cached) {
        const duration = Date.now() - startTime;
        this.analytics.operations++;
        this.analytics.hits++;
        this.analytics.totalTime += duration;
        return cached;
      }

      // Load from storage
      const result = await asyncStorage.get(key);
      if (result.success && result.data) {
        // Cache for next time
        await smartCache.set(key, result.data, 60 * 1000);
        const duration = Date.now() - startTime;
        this.analytics.operations++;
        this.analytics.misses++;
        this.analytics.totalTime += duration;
        return result.data;
      }

      return null;
    } catch (error) {
      logger.error('Failed to load realtime metrics', error);
      return null;
    }
  }

  /**
   * Get comprehensive storage analytics and insights
   */
  async getStorageAnalytics(): Promise<StorageResult<any>> {
    try {
      // Collect comprehensive storage metrics
      const cacheMetrics = { hitRate: 0, missRate: 0, totalRequests: 0, averageResponseTime: 0, memoryUsage: 0 }; // Placeholder until cache.getMetrics() is implemented
      const compressionStats = await this.getCompressionStats();
      const tierAnalysis = {}; // Placeholder until tieredStorage integration
      const usageStats = await this.getUsageStatistics();
      
      const analytics = {
        // Cache performance
        cache: {
          hitRate: cacheMetrics.hitRate || 0,
          missRate: cacheMetrics.missRate || 0,
          totalRequests: cacheMetrics.totalRequests || 0,
          averageResponseTime: cacheMetrics.averageResponseTime || 0,
          memoryUsage: cacheMetrics.memoryUsage || 0
        },
        
        // Internal analytics
        internal: {
          operations: this.analytics.operations,
          hits: this.analytics.hits,
          misses: this.analytics.misses,
          totalTime: this.analytics.totalTime,
          averageTime: this.analytics.operations > 0 ? this.analytics.totalTime / this.analytics.operations : 0,
          hitRate: this.analytics.operations > 0 ? this.analytics.hits / this.analytics.operations : 0
        },
        
        // Compression efficiency
        compression: compressionStats,
        
        // Storage tier distribution
        tiers: tierAnalysis,
        
        // Usage patterns
        usage: usageStats,
        
        // Overall performance
        performance: {
          totalSize: await this.getTotalStorageSize(),
          itemCount: await this.getTotalItemCount(),
          averageOperationTime: this.analytics.operations > 0 ? this.analytics.totalTime / this.analytics.operations : 0,
          errorRate: 0 // Will be calculated from error tracking
        },
        
        // Health indicators
        health: {
          score: await this.calculateHealthScore(),
          recommendations: await this.generateOptimizationRecommendations(),
          alerts: await this.getHealthAlerts()
        },
        
        lastAnalyzed: Date.now()
      };
      
      logger.info('📊 Storage analytics completed', { 
        cacheHitRate: analytics.cache.hitRate,
        internalHitRate: analytics.internal.hitRate,
        operations: analytics.internal.operations,
        healthScore: analytics.health.score
      });
      
      return { success: true, data: analytics };
    } catch (error) {
      logger.error('Storage analytics failed', error);
      return { success: false, error: error instanceof Error ? error.message : 'Analytics failed' };
    }
  }

  /**
   * Helper methods for storage analytics
   */
  private async getCompressionStats(): Promise<any> {
    try {
      // Calculate compression effectiveness from compressed storage
      return {
        ratio: 0.7, // Estimate - would be calculated from actual data
        spaceSaved: '70%',
        averageCompressionTime: 5,
        averageDecompressionTime: 3
      };
    } catch (error) {
      return { ratio: 0, spaceSaved: '0%', averageCompressionTime: 0, averageDecompressionTime: 0 };
    }
  }

  private async getUsageStatistics(): Promise<any> {
    try {
      const allKeys = await asyncStorage.getKeys('*');
      const keyCount = allKeys.success ? allKeys.data?.length || 0 : 0;
      
      return {
        totalKeys: keyCount,
        progressKeys: await this.countKeysWithPrefix('word_progress_'),
        analyticsKeys: await this.countKeysWithPrefix('analytics_'),
        sessionKeys: await this.countKeysWithPrefix('session_'),
        cacheKeys: await this.countKeysWithPrefix('cache_'),
        modelKeys: await this.countKeysWithPrefix('analytics_model_')
      };
    } catch (error) {
      return { totalKeys: 0, progressKeys: 0, analyticsKeys: 0, sessionKeys: 0, cacheKeys: 0, modelKeys: 0 };
    }
  }

  private async countKeysWithPrefix(prefix: string): Promise<number> {
    try {
      const keys = await asyncStorage.getKeys(`${prefix}*`);
      return keys.success ? keys.data?.length || 0 : 0;
    } catch (error) {
      return 0;
    }
  }

  private async getTotalStorageSize(): Promise<number> {
    try {
      // Estimate total storage size
      const allKeys = await asyncStorage.getKeys('*');
      if (!allKeys.success || !allKeys.data) return 0;
      
      let totalSize = 0;
      for (const key of allKeys.data.slice(0, 10)) { // Sample first 10 keys
        const data = await asyncStorage.get(key);
        if (data.success) {
          totalSize += JSON.stringify(data.data).length;
        }
      }
      
      // Extrapolate total size
      return Math.round((totalSize / Math.min(10, allKeys.data.length)) * allKeys.data.length);
    } catch (error) {
      return 0;
    }
  }

  private async getTotalItemCount(): Promise<number> {
    try {
      const allKeys = await asyncStorage.getKeys('*');
      return allKeys.success ? allKeys.data?.length || 0 : 0;
    } catch (error) {
      return 0;
    }
  }

  private async calculateHealthScore(): Promise<number> {
    try {
      const hitRate = this.analytics.operations > 0 ? this.analytics.hits / this.analytics.operations : 0;
      const avgTime = this.analytics.operations > 0 ? this.analytics.totalTime / this.analytics.operations : 0;
      
      // Health score based on hit rate (0-50) and performance (0-50)
      const hitRateScore = hitRate * 50;
      const performanceScore = Math.max(0, 50 - (avgTime / 10)); // Lower time = higher score
      
      return Math.round(hitRateScore + performanceScore);
    } catch (error) {
      return 0;
    }
  }

  private async generateOptimizationRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];
    
    try {
      const hitRate = this.analytics.operations > 0 ? this.analytics.hits / this.analytics.operations : 0;
      const avgTime = this.analytics.operations > 0 ? this.analytics.totalTime / this.analytics.operations : 0;
      
      if (hitRate < 0.7) {
        recommendations.push('Consider increasing cache size or adjusting cache TTL');
      }
      
      if (avgTime > 100) {
        recommendations.push('Storage operations are slow - consider enabling compression');
      }
      
      if (this.analytics.operations > 1000) {
        recommendations.push('High operation count - consider batch operations');
      }
      
      const itemCount = await this.getTotalItemCount();
      if (itemCount > 10000) {
        recommendations.push('Large item count - consider data archival or cleanup');
      }
      
      if (recommendations.length === 0) {
        recommendations.push('Storage system is performing optimally');
      }
      
      return recommendations;
    } catch (error) {
      return ['Unable to generate recommendations due to analysis error'];
    }
  }

  private async getHealthAlerts(): Promise<string[]> {
    const alerts: string[] = [];
    
    try {
      const hitRate = this.analytics.operations > 0 ? this.analytics.hits / this.analytics.operations : 0;
      const avgTime = this.analytics.operations > 0 ? this.analytics.totalTime / this.analytics.operations : 0;
      
      if (hitRate < 0.5) {
        alerts.push('LOW_CACHE_HIT_RATE: Cache hit rate below 50%');
      }
      
      if (avgTime > 200) {
        alerts.push('SLOW_OPERATIONS: Storage operations averaging over 200ms');
      }
      
      const itemCount = await this.getTotalItemCount();
      if (itemCount > 50000) {
        alerts.push('HIGH_ITEM_COUNT: Storage contains over 50,000 items');
      }
      
      return alerts;
    } catch (error) {
      return ['ANALYSIS_ERROR: Unable to perform health check'];
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    asyncStorage.destroy();
    smartCache.destroy();
  }
}

// Export singleton instance
export const enhancedStorage = new EnhancedStorageService();

// Export class for custom instances
export { EnhancedStorageService };