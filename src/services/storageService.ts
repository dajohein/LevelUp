// Persistent storage utilities for LevelUp language learning app
import type { WordProgress } from '../store/types';

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
  quizMode: 'multiple-choice' | 'open-answer';
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
    console.warn('Failed to parse stored data:', error);
    return fallback;
  }
};

// Safe JSON stringifying with error handling
const safeJSONStringify = (data: any): string => {
  try {
    return JSON.stringify(data);
  } catch (error) {
    console.error('Failed to stringify data:', error);
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
  } catch {
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

      existingData[languageCode] = wordProgress;
      localStorage.setItem(STORAGE_KEYS.WORD_PROGRESS, safeJSONStringify(existingData));
    } catch (error) {
      console.error('Failed to save word progress:', error);
    }
  },

  load: (languageCode: string): { [key: string]: WordProgress } => {
    if (!isLocalStorageAvailable()) return {};

    try {
      const data = safeJSONParse<PersistentWordProgress>(
        localStorage.getItem(STORAGE_KEYS.WORD_PROGRESS),
        {}
      );

      return data[languageCode] || {};
    } catch (error) {
      console.error('Failed to load word progress:', error);
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
      console.error('Failed to clear word progress:', error);
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
      console.error('Failed to save game state:', error);
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
      console.error('Failed to save session state:', error);
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
      console.error('Failed to save user preferences:', error);
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
  console.log(`Migrating data from version ${storedVersion} to ${CURRENT_VERSION}`);

  try {
    // Add migration logic here for future versions
    if (storedVersion === '1.0.0') {
      // Example migration: convert old format to new format
      // This is where you'd handle breaking changes between versions
    }

    versionStorage.setCurrentVersion();
    console.log('Data migration completed successfully');
  } catch (error) {
    console.error('Data migration failed:', error);
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

  console.log('All stored data cleared');
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
    console.warn('localStorage is not available. Progress will not be saved.');
    return;
  }

  // Run migration if needed
  migrateData();

  // Update last played timestamp
  userPreferencesStorage.save({ lastPlayed: new Date().toISOString() });

  console.log('Storage system initialized');
};
