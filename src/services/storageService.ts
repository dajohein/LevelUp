// Persistent storage utilities for LevelUp language learning app
import type { WordProgress } from '../store/types';
import { logger } from './logger';
import { StorageError } from '../utils/errorHandling';

// Storage keys
const STORAGE_KEYS = {
  WORD_PROGRESS: 'levelup_word_progress',
  GAME_STATE: 'levelup_game_state',
  SESSION_STATE: 'levelup_session_state',
  APP_VERSION: 'levelup_app_version',
  USER_PREFERENCES: 'levelup_user_preferences',
} as const;

// Current app version for migration handling
const CURRENT_VERSION = '2.0.0';

// Types for persistent data
interface PersistentWordProgress {
  [languageCode: string]: {
    [wordId: string]: WordProgress;
  };
}

interface PersistentGameState {
  language: string;
  wordProgress: { [key: string]: WordProgress };
  score: number;
  streak: number;
  correctAnswers: number;
  totalAttempts: number;
  quizMode: 'multiple-choice' | 'letter-scramble' | 'open-answer';
}

interface PersistentSessionState {
  currentSession: any; // Session type
  sessionProgress: any; // SessionProgress type
  sessionTimer: number;
  language: string;
  isActive: boolean;
}

interface UserPreferences {
  preferredLanguage: string;
  soundEnabled: boolean;
  theme: string;
  lastPlayed: string;
}

// Safe JSON parsing with error handling
const safeJSONParse = <T>(data: string | null, fallback: T): T => {
  if (!data) return fallback;

  try {
    return JSON.parse(data);
  } catch (error) {
    const storageError = new StorageError('Failed to parse stored data', { data, error });
    logger.warn(storageError.message, storageError.context);
    return fallback;
  }
};

// Safe JSON stringifying with error handling
const safeJSONStringify = (data: any): string => {
  try {
    return JSON.stringify(data);
  } catch (error) {
    const storageError = new StorageError('Failed to stringify data', { data, error });
    logger.error(storageError.message, storageError.context);
    return '{}';
  }
};

// Check if localStorage is available
const isLocalStorageAvailable = (): boolean => {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (error) {
    const storageError = new StorageError('localStorage not available', { error });
    logger.warn(storageError.userMessage || 'Storage not available', storageError.context);
    return false;
  }
};

// Word Progress Storage
export const wordProgressStorage = {
  save: (languageCode: string, wordProgress: { [key: string]: WordProgress }): void => {
    if (!isLocalStorageAvailable()) return;

    try {
      const existingData = safeJSONParse<PersistentWordProgress>(
        localStorage.getItem(STORAGE_KEYS.WORD_PROGRESS),
        {}
      );

      // Ensure we're only saving to the specific language key
      existingData[languageCode] = wordProgress;

      localStorage.setItem(STORAGE_KEYS.WORD_PROGRESS, safeJSONStringify(existingData));

      // Debug logging for language separation
      if (process.env.NODE_ENV === 'development') {
        logger.debug(
          `Saved progress for ${languageCode}: ${Object.keys(wordProgress).length} entries`
        );
        logger.debug(
          `Storage now has DE: ${Object.keys(existingData.de || {}).length}, ES: ${
            Object.keys(existingData.es || {}).length
          } entries`
        );
      }
    } catch (error) {
      logger.error('Failed to save word progress:', error);
    }
  },

  load: (languageCode: string): { [key: string]: WordProgress } => {
    if (!isLocalStorageAvailable()) return {};

    try {
      const data = safeJSONParse<PersistentWordProgress>(
        localStorage.getItem(STORAGE_KEYS.WORD_PROGRESS),
        {}
      );

      const result = data[languageCode] || {};

      // Removed debug logging to prevent console spam during frequent loads

      return result;
    } catch (error) {
      logger.error('Failed to load word progress:', error);
      return {};
    }
  },

  loadAll: (): PersistentWordProgress => {
    if (!isLocalStorageAvailable()) return {};

    return safeJSONParse<PersistentWordProgress>(
      localStorage.getItem(STORAGE_KEYS.WORD_PROGRESS),
      {}
    );
  },

  clear: (languageCode?: string): void => {
    if (!isLocalStorageAvailable()) return;

    try {
      if (languageCode) {
        const existingData = safeJSONParse<PersistentWordProgress>(
          localStorage.getItem(STORAGE_KEYS.WORD_PROGRESS),
          {}
        );
        delete existingData[languageCode];
        localStorage.setItem(STORAGE_KEYS.WORD_PROGRESS, safeJSONStringify(existingData));
      } else {
        localStorage.removeItem(STORAGE_KEYS.WORD_PROGRESS);
      }
    } catch (error) {
      logger.error('Failed to clear word progress:', error);
    }
  },

  // Raw data access methods for migration purposes
  loadRaw: (languageCode: string): { [key: string]: any } => {
    if (!isLocalStorageAvailable()) return {};

    try {
      const data = safeJSONParse<PersistentWordProgress>(
        localStorage.getItem(STORAGE_KEYS.WORD_PROGRESS),
        {}
      );

      return data[languageCode] || {};
    } catch (error) {
      logger.error('Failed to load raw word progress:', error);
      return {};
    }
  },

  saveRaw: (languageCode: string, data: { [key: string]: any }): void => {
    if (!isLocalStorageAvailable()) return;

    try {
      // Load existing data for all languages
      const existingData = safeJSONParse<any>(
        localStorage.getItem(STORAGE_KEYS.WORD_PROGRESS),
        {}
      );

      // Update the specific language with raw data
      existingData[languageCode] = data;

      // Save back to localStorage
      localStorage.setItem(STORAGE_KEYS.WORD_PROGRESS, safeJSONStringify(existingData));

      logger.debug(`💾 Saved raw data for ${languageCode}`);
    } catch (error) {
      logger.error('Failed to save raw word progress:', error);
      throw new StorageError('Failed to save raw word progress', error as Record<string, any>);
    }
  },
};

// Game State Storage
export const gameStateStorage = {
  save: (gameState: Partial<PersistentGameState>): void => {
    if (!isLocalStorageAvailable()) return;

    try {
      localStorage.setItem(STORAGE_KEYS.GAME_STATE, safeJSONStringify(gameState));
    } catch (error) {
      logger.error('Failed to save game state:', error);
    }
  },

  load: (): Partial<PersistentGameState> => {
    if (!isLocalStorageAvailable()) return {};

    return safeJSONParse<Partial<PersistentGameState>>(
      localStorage.getItem(STORAGE_KEYS.GAME_STATE),
      {}
    );
  },

  clear: (): void => {
    if (!isLocalStorageAvailable()) return;
    localStorage.removeItem(STORAGE_KEYS.GAME_STATE);
  },
};

// Session State Storage
export const sessionStateStorage = {
  save: (sessionState: Partial<PersistentSessionState>): void => {
    if (!isLocalStorageAvailable()) return;

    try {
      localStorage.setItem(STORAGE_KEYS.SESSION_STATE, safeJSONStringify(sessionState));
    } catch (error) {
      logger.error('Failed to save session state:', error);
    }
  },

  load: (): Partial<PersistentSessionState> => {
    if (!isLocalStorageAvailable()) return {};

    return safeJSONParse<Partial<PersistentSessionState>>(
      localStorage.getItem(STORAGE_KEYS.SESSION_STATE),
      {}
    );
  },

  clear: (): void => {
    if (!isLocalStorageAvailable()) return;
    localStorage.removeItem(STORAGE_KEYS.SESSION_STATE);
  },
};

// User Preferences Storage
export const userPreferencesStorage = {
  save: (preferences: Partial<UserPreferences>): void => {
    if (!isLocalStorageAvailable()) return;

    try {
      const existing = userPreferencesStorage.load();
      const updated = { ...existing, ...preferences };
      localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, safeJSONStringify(updated));
    } catch (error) {
      logger.error('Failed to save user preferences:', error);
    }
  },

  load: (): UserPreferences => {
    if (!isLocalStorageAvailable()) {
      return {
        preferredLanguage: 'es',
        soundEnabled: true,
        theme: 'default',
        lastPlayed: new Date().toISOString(),
      };
    }

    return safeJSONParse<UserPreferences>(localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES), {
      preferredLanguage: 'es',
      soundEnabled: true,
      theme: 'default',
      lastPlayed: new Date().toISOString(),
    });
  },

  clear: (): void => {
    if (!isLocalStorageAvailable()) return;
    localStorage.removeItem(STORAGE_KEYS.USER_PREFERENCES);
  },
};

// App Version and Migration
export const versionStorage = {
  getCurrentVersion: (): string => {
    if (!isLocalStorageAvailable()) return CURRENT_VERSION;
    return localStorage.getItem(STORAGE_KEYS.APP_VERSION) || '1.0.0';
  },

  setCurrentVersion: (): void => {
    if (!isLocalStorageAvailable()) return;
    localStorage.setItem(STORAGE_KEYS.APP_VERSION, CURRENT_VERSION);
  },

  needsMigration: (): boolean => {
    const storedVersion = versionStorage.getCurrentVersion();
    return storedVersion !== CURRENT_VERSION;
  },
};

// Data Migration
export const migrateData = (): void => {
  if (!versionStorage.needsMigration()) return;

  const storedVersion = versionStorage.getCurrentVersion();
  logger.info(`Migrating data from version ${storedVersion} to ${CURRENT_VERSION}`);

  try {
    // Add migration logic here for future versions
    if (storedVersion === '1.0.0') {
      // Example migration: convert old format to new format
      // This is where you'd handle breaking changes between versions
    }

    versionStorage.setCurrentVersion();
    logger.info('Data migration completed successfully');
  } catch (error) {
    logger.error('Data migration failed:', error);
    // On migration failure, clear all data to prevent corruption
    clearAllData();
  }
};

// Utility functions
export const clearAllData = (): void => {
  if (!isLocalStorageAvailable()) return;

  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });

  logger.info('All stored data cleared');
};

export const getStorageInfo = (): { size: number; keys: string[] } => {
  if (!isLocalStorageAvailable()) return { size: 0, keys: [] };

  const keys = Object.values(STORAGE_KEYS).filter(key => localStorage.getItem(key) !== null);

  const size = keys.reduce((total, key) => {
    const item = localStorage.getItem(key);
    return total + (item ? item.length : 0);
  }, 0);

  return { size, keys };
};

// Export storage availability check
export { isLocalStorageAvailable };

// Initialize storage system
export const initializeStorage = (): void => {
  if (!isLocalStorageAvailable()) {
    logger.warn('localStorage is not available. Progress will not be saved.');
    return;
  }

  // Run migration if needed
  migrateData();

  // Update last played timestamp
  userPreferencesStorage.save({ lastPlayed: new Date().toISOString() });

  logger.info('Storage system initialized');
};
