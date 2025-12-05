/**
 * Word ID Compatibility Layer
 * 
 * This module provides functions to handle both old and new word ID formats
 * seamlessly, ensuring backward compatibility while enabling the new robust
 * module-prefixed ID system.
 */

import { WordIdMigrationService } from './wordIdMigrationService';
import { getModulesForLanguage, getModule } from './moduleService';
import { logger } from './logger';
import { WordProgress } from '../store/types';

export interface WordLookupResult {
  word: any | null;
  moduleId: string | null;
  effectiveId: string; // The ID that should be used for progress storage
}

export class WordIdCompatibilityService {
  
  /**
   * Find a word by ID, supporting both old and new formats
   * This function enables backward compatibility during the migration period
   */
  static findWordById(
    languageCode: string, 
    wordId: string
  ): WordLookupResult {
    const result: WordLookupResult = {
      word: null,
      moduleId: null,
      effectiveId: wordId
    };
    
    try {
      // Check if this is already a robust ID format
      const parsed = WordIdMigrationService.parseRobustWordId(wordId);
      
      if (parsed) {
        // New format: module:id
        const { moduleId, originalId } = parsed;
        const module = getModule(languageCode, moduleId);
        
        if (module && module.words) {
          const word = module.words.find(w => w.id === wordId || w.id === originalId);
          if (word) {
            result.word = word;
            result.moduleId = moduleId;
            result.effectiveId = wordId; // Keep the robust ID
          }
        }
      } else {
        // Old format: search across all modules
        const modules = getModulesForLanguage(languageCode);
        
        for (const moduleInfo of modules) {
          const module = getModule(languageCode, moduleInfo.id);
          if (!module || !module.words) continue;
          
          const word = module.words.find(w => 
            w.id === wordId || 
            w.id === WordIdMigrationService.createRobustWordId(moduleInfo.id, wordId)
          );
          
          if (word) {
            result.word = word;
            result.moduleId = moduleInfo.id;
            // For old format words, return the robust ID for future storage
            result.effectiveId = WordIdMigrationService.createRobustWordId(moduleInfo.id, wordId);
            break;
          }
        }
      }
      
    } catch (error) {
      logger.error(`Error finding word by ID ${wordId}:`, error);
    }
    
    return result;
  }
  
  /**
   * Get word progress with automatic ID migration
   * This function ensures that progress is always stored with robust IDs
   */
  static getWordProgress(
    wordProgress: Record<string, WordProgress>,
    wordId: string,
    languageCode: string
  ): WordProgress | null {
    // First, try to find progress with the exact ID
    if (wordProgress[wordId]) {
      return wordProgress[wordId];
    }
    
    // If not found, try to find it with compatibility layer
    const wordLookup = this.findWordById(languageCode, wordId);
    
    if (wordLookup.word) {
      // Check if progress exists under the effective ID
      if (wordProgress[wordLookup.effectiveId]) {
        return wordProgress[wordLookup.effectiveId];
      }
      
      // Check if progress exists under the original format (for migration)
      if (WordIdMigrationService.needsIdMigration(wordId)) {
        return wordProgress[wordId] || null;
      }
    }
    
    return null;
  }
  
  /**
   * Update word progress with automatic ID migration
   * This ensures all progress is stored with robust IDs going forward
   */
  static updateWordProgress(
    existingProgress: Record<string, WordProgress>,
    wordId: string,
    progress: WordProgress,
    languageCode: string
  ): Record<string, WordProgress> {
    const updatedProgress = { ...existingProgress };
    
    // Find the effective ID to use for storage
    const wordLookup = this.findWordById(languageCode, wordId);
    
    if (wordLookup.word) {
      const effectiveId = wordLookup.effectiveId;
      
      // Update the progress with the correct word ID
      updatedProgress[effectiveId] = {
        ...progress,
        wordId: effectiveId
      };
      
      // If this was a migration from old format, remove the old entry
      if (WordIdMigrationService.needsIdMigration(wordId) && wordId !== effectiveId) {
        delete updatedProgress[wordId];
        
        logger.debug(`Migrated word progress: ${wordId} -> ${effectiveId}`);
      }
    } else {
      // Fallback: use the provided ID as-is
      updatedProgress[wordId] = progress;
      logger.warn(`Could not find word for ID ${wordId}, storing as-is`);
    }
    
    return updatedProgress;
  }
  
  /**
   * Get all words for a language with their effective IDs
   * This helps ensure consistent ID usage across the application
   */
  static getAllWordsWithEffectiveIds(languageCode: string): Array<{
    word: any;
    moduleId: string;
    originalId: string;
    effectiveId: string;
  }> {
    const results: Array<{
      word: any;
      moduleId: string;
      originalId: string;
      effectiveId: string;
    }> = [];
    
    try {
      const modules = getModulesForLanguage(languageCode);
      
      for (const moduleInfo of modules) {
        const module = getModule(languageCode, moduleInfo.id);
        if (!module || !module.words) continue;
        
        for (const word of module.words) {
          const parsed = WordIdMigrationService.parseRobustWordId(word.id);
          
          if (parsed) {
            // Already in robust format
            results.push({
              word,
              moduleId: moduleInfo.id,
              originalId: parsed.originalId,
              effectiveId: word.id
            });
          } else {
            // Convert to robust format
            results.push({
              word,
              moduleId: moduleInfo.id,
              originalId: word.id,
              effectiveId: WordIdMigrationService.createRobustWordId(moduleInfo.id, word.id)
            });
          }
        }
      }
    } catch (error) {
      logger.error(`Error getting words with effective IDs for ${languageCode}:`, error);
    }
    
    return results;
  }
}