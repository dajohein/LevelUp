/**
 * Word ID Compatibility Layer
 *
 * Provides consistent numeric ID handling across the system.
 * We use numeric IDs everywhere to avoid format mixing.
 */

import { getModulesForLanguage, getModule } from './moduleService';
import { logger } from './logger';
import { WordProgress } from '../store/types';

export interface WordLookupResult {
  word: any | null;
  moduleId: string | null;
  effectiveId: string; // The numeric ID to use for progress storage
}

export class WordIdCompatibilityService {
  /**
   * Find a word by numeric ID across all modules
   */
  static findWordById(languageCode: string, wordId: string): WordLookupResult {
    const result: WordLookupResult = {
      word: null,
      moduleId: null,
      effectiveId: wordId,
    };

    try {
      // Search for the word across all modules using numeric ID
      const modules = getModulesForLanguage(languageCode);

      for (const moduleInfo of modules) {
        const module = getModule(languageCode, moduleInfo.id);
        if (!module || !module.words) continue;

        const word = module.words.find(w => w.id === wordId);

        if (word) {
          result.word = word;
          result.moduleId = moduleInfo.id;
          result.effectiveId = wordId; // Use numeric ID as-is
          break;
        }
      }
    } catch (error) {
      logger.error(`Error finding word by ID ${wordId}:`, error);
    }

    return result;
  }

  /**
   * Get word progress using numeric ID
   */
  static getWordProgress(
    wordProgress: Record<string, WordProgress>,
    wordId: string
  ): WordProgress | null {
    if (!wordProgress[wordId]) {
      return null;
    }

    return wordProgress[wordId];
  }

  /**
   * Update word progress with numeric ID
   */
  static updateWordProgress(
    existingProgress: Record<string, WordProgress>,
    wordId: string,
    progress: WordProgress
  ): Record<string, WordProgress> {
    const updatedProgress = { ...existingProgress };

    // Use numeric ID as-is
    updatedProgress[wordId] = {
      ...progress,
      wordId: wordId,
    };

    return updatedProgress;
  }

  /**
   * Get all words for a language with their numeric IDs
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
          // Use numeric ID consistently
          results.push({
            word,
            moduleId: moduleInfo.id,
            originalId: word.id,
            effectiveId: word.id,
          });
        }
      }
    } catch (error) {
      logger.error(`Error getting words with effective IDs for ${languageCode}:`, error);
    }

    return results;
  }
}
