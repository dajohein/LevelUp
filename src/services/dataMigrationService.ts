/**
 * Data Migration Service for safely upgrading legacy data formats
 * Provides safe migration from legacy data format to enhanced directional tracking
 * Also handles word ID migration for collision prevention
 */

import { logger } from './logger';
import { wordProgressStorage } from './storageService';
import { WordIdMigrationService } from './wordIdMigrationService';
import type { WordProgress, LegacyWordProgress } from '../store/types';

export class DataMigrationService {
  private static migrationInProgress = new Set<string>();

  /**
   * Migrate legacy WordProgress to enhanced format
   * Preserves all original data while adding directional tracking capabilities
   */
  static migrateLegacyWordProgress(legacy: LegacyWordProgress): WordProgress {
    // Handle null/undefined input gracefully
    if (!legacy || typeof legacy !== 'object') {
      logger.warn('Invalid legacy progress data, creating default progress');
      const now = new Date().toISOString();
      return {
        wordId: '',
        xp: 0,
        lastPracticed: now,
        timesCorrect: 0,
        timesIncorrect: 0,
        totalXp: 0,
        firstLearned: now,
        version: 2,
        directions: {
          'term-to-definition': {
            timesCorrect: 0,
            timesIncorrect: 0,
            xp: 0,
            lastPracticed: now,
            consecutiveCorrect: 0,
            longestStreak: 0,
          },
          'definition-to-term': {
            timesCorrect: 0,
            timesIncorrect: 0,
            xp: 0,
            lastPracticed: now,
            consecutiveCorrect: 0,
            longestStreak: 0,
          },
        },
        learningPhase: 'introduction',
        tags: [],
      };
    }

    const enhanced: WordProgress = {
      wordId: legacy.wordId || '',
      xp: legacy.xp || 0,
      lastPracticed: legacy.lastPracticed || new Date().toISOString(),
      timesCorrect: legacy.timesCorrect || 0,
      timesIncorrect: legacy.timesIncorrect || 0,

      // Enhanced tracking fields
      totalXp: legacy.xp,
      firstLearned: legacy.lastPracticed || new Date().toISOString(),
      version: 2,

      // Split existing progress between directions
      directions: {
        'term-to-definition': {
          timesCorrect: Math.floor(legacy.timesCorrect / 2),
          timesIncorrect: Math.floor(legacy.timesIncorrect / 2),
          xp: legacy.xp / 2,
          lastPracticed: legacy.lastPracticed,
          consecutiveCorrect: 0,
          longestStreak: 0,
        },
        'definition-to-term': {
          timesCorrect: Math.ceil(legacy.timesCorrect / 2),
          timesIncorrect: Math.ceil(legacy.timesIncorrect / 2),
          xp: legacy.xp / 2,
          lastPracticed: legacy.lastPracticed,
          consecutiveCorrect: 0,
          longestStreak: 0,
        },
      },

      // Infer learning phase from existing data
      learningPhase: this.inferLearningPhase(legacy),
      tags: [],
    };

    // Verify data integrity: totals should match original
    const totalCorrect =
      enhanced.directions!['term-to-definition']!.timesCorrect +
      enhanced.directions!['definition-to-term']!.timesCorrect;
    const totalIncorrect =
      enhanced.directions!['term-to-definition']!.timesIncorrect +
      enhanced.directions!['definition-to-term']!.timesIncorrect;
    const totalXp =
      enhanced.directions!['term-to-definition']!.xp +
      enhanced.directions!['definition-to-term']!.xp;

    // Safety check: ensure no data loss during migration
    if (
      totalCorrect !== legacy.timesCorrect ||
      totalIncorrect !== legacy.timesIncorrect ||
      totalXp !== legacy.xp
    ) {
      logger.warn(`Data integrity check failed for word ${legacy.wordId || 'unknown'}:`, {
        original: { correct: legacy.timesCorrect, incorrect: legacy.timesIncorrect, xp: legacy.xp },
        migrated: { correct: totalCorrect, incorrect: totalIncorrect, xp: totalXp },
      });
    }

    return enhanced;
  }

  /**
   * Check if data needs migration
   */
  static needsMigration(progress: any): boolean {
    return !progress.version || progress.version < 2;
  }

  /**
   * Safely load word progress with automatic migration
   * This is the main entry point for transparent data migration
   */
  static safeLoadWordProgress(languageCode: string): { [key: string]: WordProgress } {
    // Prevent concurrent migrations for the same language
    if (this.migrationInProgress.has(languageCode)) {
      // If migration is in progress, load current data without migration
      return wordProgressStorage.loadRaw(languageCode) as { [key: string]: WordProgress };
    }

    try {
      const rawData = wordProgressStorage.loadRaw(languageCode);
      let migratedData: { [key: string]: WordProgress } = {};
      let migrationCount = 0;

      // Step 1: Check if any words need data format migration
      const needsDataMigration = Object.values(rawData).some(progress =>
        this.needsMigration(progress)
      );

      if (needsDataMigration) {
        // Mark migration as in progress
        this.migrationInProgress.add(languageCode);

        Object.entries(rawData).forEach(([wordId, progress]) => {
          if (this.needsMigration(progress)) {
            // Migrate legacy data format
            migratedData[wordId] = this.migrateLegacyWordProgress(progress as LegacyWordProgress);
            migrationCount++;
          } else {
            // Already in new format
            migratedData[wordId] = progress as WordProgress;
          }
        });

        if (migrationCount > 0) {
          logger.info(
            `Data format migration completed: ${migrationCount} words updated for ${languageCode}`
          );

          // Save the migrated data
          try {
            wordProgressStorage.save(languageCode, migratedData);
          } catch (saveError) {
            logger.error('Failed to save migrated data:', saveError);
            // Continue with word ID migration even if save failed
          }
        }
      } else {
        // No data format migration needed
        migratedData = rawData as { [key: string]: WordProgress };
      }

      // Step 2: Check if word ID migration is needed (for collision prevention)
      const idMigrationStats = WordIdMigrationService.getIdMigrationStats(languageCode);

      if (idMigrationStats.needsMigration) {
        logger.info(
          `Starting word ID migration for ${languageCode}: ${idMigrationStats.oldFormatWords} words need robust IDs`
        );

        // Run word ID migration
        const idMigrationResult = WordIdMigrationService.migrateWordProgressIds(
          languageCode,
          migratedData
        );

        if (idMigrationResult.success && idMigrationResult.migratedCount > 0) {
          logger.info(
            `Word ID migration completed: ${idMigrationResult.migratedCount} IDs updated for ${languageCode}`
          );

          // Reload the data after ID migration
          migratedData = wordProgressStorage.loadRaw(languageCode) as {
            [key: string]: WordProgress;
          };
        } else if (!idMigrationResult.success) {
          logger.error(`Word ID migration failed for ${languageCode}:`, idMigrationResult.errors);
          // Continue with existing data even if ID migration failed
        }
      }

      // Clear migration flag
      this.migrationInProgress.delete(languageCode);

      return migratedData;
    } catch (error) {
      // Clear migration flag on error
      this.migrationInProgress.delete(languageCode);

      logger.error('Error during migration:', error);
      // Fallback to original data if migration fails
      return wordProgressStorage.loadRaw(languageCode) as { [key: string]: WordProgress };
    }
  }

  /**
   * Infer learning phase from existing progress data
   */
  private static inferLearningPhase(
    legacy: LegacyWordProgress
  ): 'introduction' | 'practice' | 'mastery' | 'maintenance' {
    const totalAttempts = legacy.timesCorrect + legacy.timesIncorrect;

    if (totalAttempts === 0) return 'introduction';
    if (legacy.xp < 30) return 'practice';
    if (legacy.xp < 80) return 'mastery';
    return 'maintenance';
  }

  /**
   * Get migration statistics for a language
   */
  static getMigrationStats(languageCode: string): {
    totalWords: number;
    legacyWords: number;
    migratedWords: number;
    migrationComplete: boolean;
  } {
    try {
      const rawData = wordProgressStorage.loadRaw(languageCode);
      const totalWords = Object.keys(rawData).length;
      const legacyWords = Object.values(rawData).filter(p => this.needsMigration(p)).length;
      const migratedWords = totalWords - legacyWords;

      return {
        totalWords,
        legacyWords,
        migratedWords,
        migrationComplete: legacyWords === 0,
      };
    } catch (error) {
      logger.error('Error getting migration stats:', error);
      return {
        totalWords: 0,
        legacyWords: 0,
        migratedWords: 0,
        migrationComplete: true,
      };
    }
  }
}

export class DataBackupService {
  /**
   * Create backup before migration
   */
  static createBackup(languageCode: string): string {
    const backupKey = `levelup_backup_${languageCode}_${Date.now()}`;
    const currentData = wordProgressStorage.loadRaw(languageCode);

    const backup = {
      version: 1,
      languageCode,
      timestamp: new Date().toISOString(),
      dataCount: Object.keys(currentData).length,
      data: currentData,
    };

    try {
      localStorage.setItem(backupKey, JSON.stringify(backup));
      logger.info(`🛡️ Created backup ${backupKey} for ${languageCode} (${backup.dataCount} words)`);
      return backupKey;
    } catch (error) {
      logger.error('Failed to create backup:', error);
      throw new Error('Backup creation failed - migration aborted for safety');
    }
  }

  /**
   * Restore from backup if needed
   */
  static restoreBackup(backupKey: string): boolean {
    try {
      const backupData = localStorage.getItem(backupKey);
      if (!backupData) {
        logger.error('Backup not found:', backupKey);
        return false;
      }

      const backup = JSON.parse(backupData);
      wordProgressStorage.saveRaw(backup.languageCode, backup.data);
      logger.info(`🔄 Restored backup ${backupKey} for ${backup.languageCode}`);
      return true;
    } catch (error) {
      logger.error('Backup restoration failed:', error);
      return false;
    }
  }

  /**
   * List available backups
   */
  static listBackups(): Array<{
    key: string;
    languageCode: string;
    timestamp: string;
    dataCount: number;
  }> {
    const backups = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('levelup_backup_')) {
        try {
          const backup = JSON.parse(localStorage.getItem(key) || '');
          backups.push({
            key,
            languageCode: backup.languageCode,
            timestamp: backup.timestamp,
            dataCount: backup.dataCount || 0,
          });
        } catch (error) {
          // Skip corrupted backups
          logger.warn('Skipping corrupted backup:', key);
        }
      }
    }

    return backups.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Clean up old backups (keep only the 5 most recent per language)
   */
  static cleanupOldBackups(): void {
    const backups = this.listBackups();
    const backupsByLanguage = backups.reduce(
      (acc, backup) => {
        if (!acc[backup.languageCode]) acc[backup.languageCode] = [];
        acc[backup.languageCode].push(backup);
        return acc;
      },
      {} as { [lang: string]: typeof backups }
    );

    let deletedCount = 0;
    Object.values(backupsByLanguage).forEach(languageBackups => {
      // Keep only the 5 most recent backups per language
      languageBackups.slice(5).forEach(backup => {
        localStorage.removeItem(backup.key);
        deletedCount++;
      });
    });

    if (deletedCount > 0) {
      logger.info(`🧹 Cleaned up ${deletedCount} old backups`);
    }
  }
}

// Enhanced analytics for directional learning
export interface DirectionalAnalytics {
  termToDefinitionMastery: number; // 0-100
  definitionToTermMastery: number; // 0-100
  bidirectionalBalance: number; // How balanced the learning is (-100 to 100)
  preferredDirection: 'term-to-definition' | 'definition-to-term' | 'balanced';
  weakDirection: 'term-to-definition' | 'definition-to-term' | null;
  totalDirectionalSessions: number;
}

export class DirectionalAnalyticsService {
  /**
   * Calculate directional analytics for a word
   */
  static calculateWordDirectionalAnalytics(progress: WordProgress): DirectionalAnalytics | null {
    if (!progress.directions || progress.version !== 2) {
      return null; // Not migrated yet or no directional data
    }

    const termToDef = progress.directions['term-to-definition'];
    const defToTerm = progress.directions['definition-to-term'];

    if (!termToDef || !defToTerm) {
      return null;
    }

    // Calculate mastery for each direction (0-100)
    const termToDefMastery = Math.min(100, termToDef.xp);
    const defToTermMastery = Math.min(100, defToTerm.xp);

    // Calculate balance (-100 = heavily term-to-def, +100 = heavily def-to-term, 0 = balanced)
    const balance =
      ((defToTermMastery - termToDefMastery) / Math.max(1, termToDefMastery + defToTermMastery)) *
      100;

    // Determine preferred direction
    let preferredDirection: 'term-to-definition' | 'definition-to-term' | 'balanced';
    if (Math.abs(balance) < 20) {
      preferredDirection = 'balanced';
    } else if (balance < 0) {
      preferredDirection = 'term-to-definition';
    } else {
      preferredDirection = 'definition-to-term';
    }

    // Identify weak direction
    const weakDirection =
      termToDefMastery < defToTermMastery
        ? 'term-to-definition'
        : defToTermMastery < termToDefMastery
          ? 'definition-to-term'
          : null;

    return {
      termToDefinitionMastery: termToDefMastery,
      definitionToTermMastery: defToTermMastery,
      bidirectionalBalance: Math.round(balance),
      preferredDirection,
      weakDirection,
      totalDirectionalSessions:
        termToDef.timesCorrect +
        termToDef.timesIncorrect +
        (defToTerm.timesCorrect + defToTerm.timesIncorrect),
    };
  }

  /**
   * Calculate language-wide directional analytics
   * Only returns meaningful data when directional learning is actually being used
   */
  static calculateLanguageDirectionalAnalytics(languageCode: string): {
    overallBalance: number;
    wordsWithDirectionalData: number;
    averageTermToDefMastery: number;
    averageDefToTermMastery: number;
    wordsNeedingBalance: string[];
    hasExplicitDirectionalLearning: boolean; // NEW: indicates if this language actually uses directional learning
  } {
    const wordProgress = DataMigrationService.safeLoadWordProgress(languageCode);

    // Filter for words that have been enhanced AND have meaningful directional data
    const directionalWords = Object.values(wordProgress).filter(p => {
      if (!p.directions || p.version !== 2) return false;

      // Check if word has had actual directional practice (not just migrated data)
      const termToDef = p.directions['term-to-definition'];
      const defToTerm = p.directions['definition-to-term'];

      if (!termToDef || !defToTerm) return false;

      // Consider it meaningful directional data if there's significant difference
      // or if the word has substantial practice in either direction
      const hasPractice =
        termToDef.timesCorrect + termToDef.timesIncorrect > 2 ||
        defToTerm.timesCorrect + defToTerm.timesIncorrect > 2;
      const hasImbalance = Math.abs(termToDef.xp - defToTerm.xp) > 20;

      return hasPractice || hasImbalance;
    });

    // Check if any words in this language actually have explicit directions
    // This would come from the original word data, indicating intentional directional learning
    const hasExplicitDirectionalLearning = directionalWords.length > 3; // Meaningful threshold

    if (directionalWords.length === 0) {
      return {
        overallBalance: 0,
        wordsWithDirectionalData: 0,
        averageTermToDefMastery: 0,
        averageDefToTermMastery: 0,
        wordsNeedingBalance: [],
        hasExplicitDirectionalLearning: false,
      };
    }

    let totalTermToDefMastery = 0;
    let totalDefToTermMastery = 0;
    const wordsNeedingBalance: string[] = [];

    directionalWords.forEach(progress => {
      const analytics = this.calculateWordDirectionalAnalytics(progress);
      if (analytics) {
        totalTermToDefMastery += analytics.termToDefinitionMastery;
        totalDefToTermMastery += analytics.definitionToTermMastery;

        // Identify words with significant imbalance (>30 point difference)
        if (Math.abs(analytics.bidirectionalBalance) > 30) {
          wordsNeedingBalance.push(progress.wordId);
        }
      }
    });

    const count = directionalWords.length;
    const avgTermToDef = totalTermToDefMastery / count;
    const avgDefToTerm = totalDefToTermMastery / count;
    const overallBalance =
      ((avgDefToTerm - avgTermToDef) / Math.max(1, avgTermToDef + avgDefToTerm)) * 100;

    return {
      overallBalance: Math.round(overallBalance),
      wordsWithDirectionalData: count,
      averageTermToDefMastery: Math.round(avgTermToDef),
      averageDefToTermMastery: Math.round(avgDefToTerm),
      wordsNeedingBalance,
      hasExplicitDirectionalLearning,
    };
  }
}

