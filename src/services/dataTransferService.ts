import {
  wordProgressStorage,
  gameStateStorage,
  sessionStateStorage,
  userPreferencesStorage,
} from './storageService';
import { getAllLanguageProgress } from './progressService';
import { getAvailableLanguages } from './moduleService';
import { logger } from './logger';

export interface ExportData {
  version: string;
  exportDate: string;
  wordProgress: { [languageCode: string]: any };
  gameState: any;
  sessionState: any;
  userPreferences: any;
  metadata: {
    totalLanguages: number;
    languageStats: {
      [languageCode: string]: {
        totalWords: number;
        practicedWords: number;
        totalXP: number;
        averageMastery: number;
      };
    };
  };
}

export interface ImportResult {
  success: boolean;
  message: string;
  importedLanguages?: string[];
  errors?: string[];
}

export const dataTransferService = {
  /**
   * Export all user progress and settings to a JSON file
   */
  exportAllData: (): ExportData => {
    logger.info('📤 Starting data export...');

    try {
      // Get all word progress for all languages
      const allWordProgress = wordProgressStorage.loadAll();

      // Get current states
      const gameState = gameStateStorage.load();
      const sessionState = sessionStateStorage.load();
      const userPreferences = userPreferencesStorage.load();

      // Calculate metadata
      const languages = getAvailableLanguages();
      const languageProgress = getAllLanguageProgress();

      const metadata = {
        totalLanguages: Object.keys(allWordProgress).length,
        languageStats: {} as any,
      };

      // Generate stats for each language
      languages.forEach(({ code }) => {
        const progress = languageProgress[code];
        const wordProg = allWordProgress[code] || {};
        const totalXP = Object.values(wordProg).reduce(
          (sum: number, prog: any) => sum + (prog?.xp || 0),
          0
        );

        metadata.languageStats[code] = {
          totalWords: progress?.totalWords || 0,
          practicedWords: progress?.practicedWords || 0,
          totalXP,
          averageMastery: progress?.averageMastery || 0,
        };
      });

      const exportData: ExportData = {
        version: '2.0.0',
        exportDate: new Date().toISOString(),
        wordProgress: allWordProgress,
        gameState,
        sessionState,
        userPreferences,
        metadata,
      };

      logger.info(
        `📤 Export complete: ${Object.keys(allWordProgress).length} languages, ${Object.keys(allWordProgress).reduce((sum, lang) => sum + Object.keys(allWordProgress[lang] || {}).length, 0)} words`
      );

      return exportData;
    } catch (error) {
      logger.error('❌ Export failed:', error);
      throw new Error('Failed to export data. Please try again.');
    }
  },

  /**
   * Download exported data as a JSON file
   */
  downloadExport: (): void => {
    try {
      const data = dataTransferService.exportAllData();

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `levelup-progress-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      logger.info('📤 Export file downloaded successfully');
    } catch (error) {
      logger.error('❌ Export download failed:', error);
      throw error;
    }
  },

  /**
   * Import data from uploaded file
   */
  importData: async (
    file: File,
    options: {
      mergeWithExisting?: boolean;
      overwriteExisting?: boolean;
      selectedLanguages?: string[];
    } = {}
  ): Promise<ImportResult> => {
    logger.info('📥 Starting data import...');

    try {
      // Read and parse file
      const text = await file.text();
      const importData: ExportData = JSON.parse(text);

      // Validate import data
      if (!importData.version || !importData.wordProgress) {
        throw new Error('Invalid export file format');
      }

      // Version compatibility check
      if (importData.version !== '2.0.0') {
        logger.warn(`⚠️ Version mismatch: importing ${importData.version} into 2.0.0`);
      }

      const importedLanguages: string[] = [];
      const errors: string[] = [];

      // Import word progress for each language
      Object.entries(importData.wordProgress).forEach(([languageCode, languageProgress]) => {
        try {
          // Check if user wants to import this language
          if (options.selectedLanguages && !options.selectedLanguages.includes(languageCode)) {
            return;
          }

          // Handle merge vs overwrite
          if (options.mergeWithExisting) {
            const existingProgress = wordProgressStorage.load(languageCode);
            const mergedProgress = { ...existingProgress, ...languageProgress };
            wordProgressStorage.save(languageCode, mergedProgress);
          } else {
            wordProgressStorage.save(languageCode, languageProgress);
          }

          importedLanguages.push(languageCode);
          logger.info(
            `✅ Imported ${Object.keys(languageProgress).length} words for ${languageCode}`
          );
        } catch (error) {
          const errorMsg = `Failed to import ${languageCode}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          logger.error(`❌ ${errorMsg}`);
        }
      });

      // Import other settings if requested
      if (!options.selectedLanguages) {
        try {
          if (importData.userPreferences) {
            const currentPrefs = userPreferencesStorage.load();
            const mergedPrefs = { ...currentPrefs, ...importData.userPreferences };
            userPreferencesStorage.save(mergedPrefs);
          }
        } catch (error) {
          errors.push('Failed to import user preferences');
          logger.error('❌ Failed to import user preferences:', error);
        }
      }

      const result: ImportResult = {
        success: importedLanguages.length > 0,
        message:
          importedLanguages.length > 0
            ? `Successfully imported ${importedLanguages.length} language(s): ${importedLanguages.join(', ')}`
            : 'No data was imported',
        importedLanguages,
        errors: errors.length > 0 ? errors : undefined,
      };

      logger.info(`📥 Import complete: ${result.message}`);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown import error';
      logger.error('❌ Import failed:', error);

      return {
        success: false,
        message: `Import failed: ${errorMessage}`,
        errors: [errorMessage],
      };
    }
  },

  /**
   * Preview import data without actually importing
   */
  previewImport: async (
    file: File
  ): Promise<{
    success: boolean;
    data?: {
      version: string;
      exportDate: string;
      languages: Array<{
        code: string;
        name: string;
        wordCount: number;
        totalXP: number;
      }>;
      totalWords: number;
    };
    error?: string;
  }> => {
    try {
      const text = await file.text();
      const importData: ExportData = JSON.parse(text);

      if (!importData.version || !importData.wordProgress) {
        throw new Error('Invalid export file format');
      }

      const languages = getAvailableLanguages();
      const languageList = Object.entries(importData.wordProgress).map(([code, progress]) => {
        const language = languages.find(l => l.code === code);
        const wordCount = Object.keys(progress).length;
        const totalXP = Object.values(progress).reduce(
          (sum: number, prog: any) => sum + (prog?.xp || 0),
          0
        );

        return {
          code,
          name: language ? language.info.name : `Unknown (${code})`,
          wordCount,
          totalXP,
        };
      });

      const totalWords = languageList.reduce((sum, lang) => sum + lang.wordCount, 0);

      return {
        success: true,
        data: {
          version: importData.version,
          exportDate: importData.exportDate,
          languages: languageList,
          totalWords,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to preview file',
      };
    }
  },
};
