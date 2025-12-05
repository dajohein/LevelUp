/**
 * Word ID Migration Service
 * 
 * This service handles the migration from simple numeric IDs to module-prefixed IDs
 * to prevent cross-module ID collisions while maintaining backward compatibility.
 * 
 * Old format: "185", "186", "187"...
 * New format: "comida-y-bebidas:185", "vocabulario-basico:1", etc.
 */

import { logger } from './logger';
import { getModulesForLanguage, getModule } from './moduleService';
import { wordProgressStorage } from './storageService';
import { WordProgress } from '../store/types';

export interface IdMigrationMap {
  [oldId: string]: string; // oldId -> newId
}

export interface WordIdMigrationResult {
  success: boolean;
  migratedCount: number;
  skippedCount: number;
  errorCount: number;
  migrationMap: IdMigrationMap;
  errors: string[];
}

export class WordIdMigrationService {
  private static migrationCache = new Map<string, IdMigrationMap>();
  
  /**
   * Create a new robust word ID format: moduleId:originalId
   */
  static createRobustWordId(moduleId: string, originalId: string): string {
    return `${moduleId}:${originalId}`;
  }
  
  /**
   * Parse a robust word ID back into components
   */
  static parseRobustWordId(robustId: string): { moduleId: string; originalId: string } | null {
    if (!robustId.includes(':')) {
      // Legacy format - no module prefix
      return null;
    }
    
    const [moduleId, originalId] = robustId.split(':', 2);
    if (!moduleId || !originalId) {
      return null;
    }
    
    return { moduleId, originalId };
  }
  
  /**
   * Check if a word ID is in the old format (needs migration)
   */
  static needsIdMigration(wordId: string): boolean {
    return !wordId.includes(':');
  }
  
  /**
   * Generate migration map for a specific language
   * Maps old word IDs to new module-prefixed IDs
   */
  static generateIdMigrationMap(languageCode: string): IdMigrationMap {
    // Check cache first
    const cacheKey = languageCode;
    if (this.migrationCache.has(cacheKey)) {
      return this.migrationCache.get(cacheKey)!;
    }
    
    const migrationMap: IdMigrationMap = {};
    
    try {
      const modules = getModulesForLanguage(languageCode);
      
      for (const moduleInfo of modules) {
        const module = getModule(languageCode, moduleInfo.id);
        if (!module || !module.words) continue;
        
        for (const word of module.words) {
          const oldId = word.id;
          const newId = this.createRobustWordId(moduleInfo.id, oldId);
          migrationMap[oldId] = newId;
        }
      }
      
      // Cache the result
      this.migrationCache.set(cacheKey, migrationMap);
      
      logger.debug(`Generated ID migration map for ${languageCode}: ${Object.keys(migrationMap).length} mappings`);
      
    } catch (error) {
      logger.error(`Failed to generate ID migration map for ${languageCode}:`, error);
    }
    
    return migrationMap;
  }
  
  /**
   * Migrate word progress from old IDs to new robust IDs
   * This function is safe and preserves all existing progress
   */
  static migrateWordProgressIds(
    languageCode: string, 
    wordProgress: Record<string, WordProgress>
  ): WordIdMigrationResult {
    const result: WordIdMigrationResult = {
      success: true,
      migratedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      migrationMap: {},
      errors: []
    };
    
    try {
      // Generate migration map for this language
      const migrationMap = this.generateIdMigrationMap(languageCode);
      result.migrationMap = migrationMap;
      
      const migratedProgress: Record<string, WordProgress> = {};
      
      // Process each word progress entry
      Object.entries(wordProgress).forEach(([oldWordId, progress]) => {
        try {
          // Check if this word ID needs migration
          if (this.needsIdMigration(oldWordId)) {
            // Find the new ID in the migration map
            const newWordId = migrationMap[oldWordId];
            
            if (newWordId) {
              // Migrate the progress to the new ID
              migratedProgress[newWordId] = {
                ...progress,
                wordId: newWordId // Update the wordId field
              };
              result.migratedCount++;
              
              logger.debug(`Migrated word progress: ${oldWordId} -> ${newWordId}`);
            } else {
              // No mapping found - this might be an orphaned word ID
              // Keep it as-is but log a warning
              migratedProgress[oldWordId] = progress;
              result.skippedCount++;
              
              logger.warn(`No migration mapping found for word ID: ${oldWordId}`);
            }
          } else {
            // Already in new format or no migration needed
            migratedProgress[oldWordId] = progress;
            result.skippedCount++;
          }
        } catch (error) {
          // Error processing this specific word - keep original and log error
          migratedProgress[oldWordId] = progress;
          result.errorCount++;
          result.errors.push(`Error migrating ${oldWordId}: ${error}`);
          
          logger.error(`Error migrating word ID ${oldWordId}:`, error);
        }
      });
      
      // If we successfully migrated some words, save the updated progress
      if (result.migratedCount > 0) {
        try {
          wordProgressStorage.save(languageCode, migratedProgress);
          logger.info(`✅ Successfully migrated ${result.migratedCount} word IDs for ${languageCode}`);
        } catch (saveError) {
          result.success = false;
          result.errors.push(`Failed to save migrated progress: ${saveError}`);
          logger.error(`Failed to save migrated progress for ${languageCode}:`, saveError);
        }
      }
      
    } catch (error) {
      result.success = false;
      result.errors.push(`Migration failed: ${error}`);
      logger.error(`Word ID migration failed for ${languageCode}:`, error);
    }
    
    return result;
  }
  
  /**
   * Get migration statistics for a language
   */
  static getIdMigrationStats(languageCode: string): {
    totalWords: number;
    oldFormatWords: number;
    newFormatWords: number;
    needsMigration: boolean;
  } {
    // Generate migration map to ensure we have all current mappings
    this.generateIdMigrationMap(languageCode);
    
    const currentProgress = wordProgressStorage.loadRaw(languageCode);
    
    let oldFormatWords = 0;
    let newFormatWords = 0;
    
    Object.keys(currentProgress).forEach(wordId => {
      if (this.needsIdMigration(wordId)) {
        oldFormatWords++;
      } else {
        newFormatWords++;
      }
    });
    
    return {
      totalWords: Object.keys(currentProgress).length,
      oldFormatWords,
      newFormatWords,
      needsMigration: oldFormatWords > 0
    };
  }
  
  /**
   * Safely run word ID migration for a language if needed
   * This is the main entry point for automatic migration
   */
  static safeIdMigration(languageCode: string): WordIdMigrationResult | null {
    try {
      // Check if migration is needed
      const stats = this.getIdMigrationStats(languageCode);
      
      if (!stats.needsMigration) {
        logger.debug(`No word ID migration needed for ${languageCode}`);
        return null;
      }
      
      logger.info(`Starting word ID migration for ${languageCode}: ${stats.oldFormatWords} words need migration`);
      
      // Load current progress
      const currentProgress = wordProgressStorage.loadRaw(languageCode) as Record<string, WordProgress>;
      
      // Run the migration
      const result = this.migrateWordProgressIds(languageCode, currentProgress);
      
      if (result.success) {
        logger.info(`✅ Word ID migration completed for ${languageCode}: ${result.migratedCount} migrated, ${result.skippedCount} skipped, ${result.errorCount} errors`);
      } else {
        logger.error(`❌ Word ID migration failed for ${languageCode}:`, result.errors);
      }
      
      return result;
      
    } catch (error) {
      logger.error(`Failed to run safe ID migration for ${languageCode}:`, error);
      return {
        success: false,
        migratedCount: 0,
        skippedCount: 0,
        errorCount: 1,
        migrationMap: {},
        errors: [`Safe migration failed: ${error}`]
      };
    }
  }
  
  /**
   * Clear migration cache (useful for development/testing)
   */
  static clearMigrationCache(): void {
    this.migrationCache.clear();
  }
}