/**
 * Enhanced Storage System - Main Exports
 *
 * Backend-ready storage architecture with:
 * - Tiered storage (memory -> localStorage -> future remote)
 * - Smart caching with dependency invalidation
 * - Compression and optimization
 * - Optimistic updates for better UX
 * - Async operations with batching
 */

// Main storage service (recommended for most use cases)
export { enhancedStorage, EnhancedStorageService } from './enhancedStorage';

// Individual components (for advanced use cases)
export { asyncStorage, AsyncStorageService } from './asyncStorage';
export { tieredStorage, TieredStorageService } from './tieredStorage';
export { smartCache, SmartCacheManager } from './cache';
export { compressionService, CompressionService } from './compression';

// Type definitions
export type {
  AsyncStorageProvider,
  TieredStorageProvider,
  CacheProvider,
  CompressionProvider,
  SyncProvider,
  StorageOperation,
  StorageOptions,
  StorageResult,
  StorageTier,
  StorageConfig,
  CacheStats,
  CompressedData,
  SyncResult,
  ConflictData,
  ConflictResolution,
  SyncStatus,
  StorageEventListener,
  EventEmitter,
  AuthProvider,
} from './interfaces';

// Utility functions for easy migration from old storage system
import { enhancedStorage } from './enhancedStorage';
import { compressionService } from './compression';

export const storageUtils = {
  /**
   * Migrate from old storageService to enhanced storage
   */
  async migrateFromOldStorage(): Promise<void> {
    try {
      console.log('🔄 Starting migration from old storage system...');

      // Check if we need to migrate from localStorage directly
      const oldKeys = [
        'de_progress',
        'es_progress',
        'de_session',
        'es_session',
        'user_preferences',
        'achievements',
      ];

      let migratedCount = 0;

      for (const oldKey of oldKeys) {
        const oldData = localStorage.getItem(oldKey);
        if (oldData) {
          try {
            const parsedData = JSON.parse(oldData);

            // Determine new key format
            let newKey: string;
            if (oldKey.includes('progress')) {
              newKey = `word_progress_${oldKey.split('_')[0]}`;
            } else if (oldKey.includes('session')) {
              newKey = `session_${oldKey.split('_')[0]}`;
            } else {
              newKey = oldKey; // Keep same key for preferences and achievements
            }

            // Save to enhanced storage
            const result = await enhancedStorage.saveWordProgress(oldKey.split('_')[0], parsedData);

            if (result.success) {
              migratedCount++;
              console.log(`✅ Migrated ${oldKey} -> ${newKey}`);

              // Remove old data after successful migration
              localStorage.removeItem(oldKey);
            }
          } catch (error) {
            console.error(`❌ Failed to migrate ${oldKey}:`, error);
          }
        }
      }

      console.log(`🎉 Migration completed! Migrated ${migratedCount} items`);

      // Save migration marker
      localStorage.setItem('storage_migration_completed', Date.now().toString());
    } catch (error) {
      console.error('💥 Migration failed:', error);
      throw error;
    }
  },

  /**
   * Test storage performance
   */
  async testStoragePerformance(): Promise<{
    writeTime: number;
    readTime: number;
    compressionRatio: number;
  }> {
    const testData = {
      testKey: 'performance_test',
      testValue: {
        words: Array.from({ length: 1000 }, (_, i) => ({
          id: `word_${i}`,
          xp: Math.floor(Math.random() * 1000),
          timesCorrect: Math.floor(Math.random() * 50),
          timesIncorrect: Math.floor(Math.random() * 10),
          lastPracticed: new Date().toISOString(),
        })),
      },
    };

    // Test write performance
    const writeStart = performance.now();
    await enhancedStorage.saveWordProgress(
      'test',
      testData.testValue.words.reduce((acc, word) => {
        acc[word.id] = word;
        return acc;
      }, {} as any)
    );
    const writeTime = performance.now() - writeStart;

    // Test read performance
    const readStart = performance.now();
    await enhancedStorage.loadWordProgress('test');
    const readTime = performance.now() - readStart;

    // Test compression ratio
    const compressionRatio = await compressionService.getCompressionRatio(testData.testValue);

    // Cleanup
    await enhancedStorage.clearWordProgress('test');

    return {
      writeTime: Math.round(writeTime * 100) / 100,
      readTime: Math.round(readTime * 100) / 100,
      compressionRatio: Math.round(compressionRatio * 100) / 100,
    };
  },

  /**
   * Get storage usage breakdown
   */
  async getStorageBreakdown(): Promise<{
    totalSize: number;
    byLanguage: Record<string, number>;
    byType: Record<string, number>;
  }> {
    try {
      const analytics = await enhancedStorage.getStorageAnalytics();

      if (!analytics.success) {
        throw new Error(analytics.error);
      }

      const breakdown = {
        totalSize: analytics.data.performance.totalSize || 0,
        byLanguage: {} as Record<string, number>,
        byType: {
          'Word Progress': 0,
          'Analytics Data': 0,
          'Session Data': 0,
          'Cache Data': 0,
          'ML Models': 0,
          Other: 0,
        },
      };

      // Extract language breakdown from usage stats
      const usage = analytics.data.usage;
      if (usage) {
        // Estimate size distribution
        const totalKeys = usage.totalKeys || 1;
        const avgSize = breakdown.totalSize / totalKeys;

        breakdown.byType['Word Progress'] = (usage.progressKeys || 0) * avgSize;
        breakdown.byType['Analytics Data'] = (usage.analyticsKeys || 0) * avgSize;
        breakdown.byType['Session Data'] = (usage.sessionKeys || 0) * avgSize;
        breakdown.byType['Cache Data'] = (usage.cacheKeys || 0) * avgSize;
        breakdown.byType['ML Models'] = (usage.modelKeys || 0) * avgSize;
        breakdown.byType['Other'] =
          breakdown.totalSize -
          breakdown.byType['Word Progress'] -
          breakdown.byType['Analytics Data'] -
          breakdown.byType['Session Data'] -
          breakdown.byType['Cache Data'] -
          breakdown.byType['ML Models'];

        // Language breakdown estimation
        const languages = ['de', 'es']; // Known languages
        const avgPerLanguage = breakdown.byType['Word Progress'] / languages.length;

        for (const lang of languages) {
          breakdown.byLanguage[lang] = avgPerLanguage;
        }
      }

      console.log('📊 Storage breakdown:', breakdown);
      return breakdown;
    } catch (error) {
      console.error('Failed to get storage breakdown:', error);
      return {
        totalSize: 0,
        byLanguage: {},
        byType: {},
      };
    }
  },
};
