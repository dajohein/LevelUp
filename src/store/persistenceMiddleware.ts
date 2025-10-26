/**
 * Persistence Middleware - Centralized Storage Coordination
 * 
 * ARCHITECTURE:
 * Redux Actions → Persistence Middleware → Storage Orchestrator → Storage Services
 * 
 * RESPONSIBILITIES:
 * - Intercepts specific Redux actions that require persistence
 * - Coordinates debounced vs immediate saves based on action criticality
 * - Prevents duplicate saves through centralized orchestration
 * - Handles cross-tab synchronization
 * 
 * SEPARATION OF CONCERNS:
 * - Redux Slices: Pure state management, no storage calls
 * - Persistence Middleware: Save coordination and timing
 * - Storage Orchestrator: Queue management and deduplication  
 * - Storage Services: Actual localStorage/IndexedDB operations
 */

import type { Middleware } from '@reduxjs/toolkit';
import type { RootState } from './store';
import { storageOrchestrator } from '../services/storageOrchestrator';
import { 
  gameStateStorage, 
  sessionStateStorage, 
  wordProgressStorage 
} from '../services/storageService';
import { logger } from '../services/logger';

// Actions requiring immediate persistence (critical state changes)
const IMMEDIATE_PERSIST_ACTIONS = [
  'game/setLanguage',        // Language switching affects all subsequent operations
  'game/setCurrentModule',   // Module changes affect word selection
  'game/resetGame',          // Game resets must be preserved
  'session/startSession',    // Session initialization is critical
  'session/completeSession', // Session completion triggers navigation
  'session/resetSession',    // Session resets affect UI state
];

// Actions using debounced persistence (frequent updates, optimized for performance)
const DEBOUNCED_PERSIST_ACTIONS = [
  'session/addCorrectAnswer',      // User progress tracking
  'session/addIncorrectAnswer',    // Error pattern analysis
  'session/incrementWordsCompleted', // Session progression
  'session/updateProgress',        // Score and statistics updates
  // NOTE: Removed game actions to prevent duplicate saves
  // Enhanced mode handles its own state, standard mode uses session actions
];

// Main persistence middleware - now using centralized orchestrator
export const persistenceMiddleware: Middleware<{}, RootState> = (_store) => next => action => {
  // Execute the action first
  const result = next(action);

  try {
    // Handle immediate persistence actions
    if (IMMEDIATE_PERSIST_ACTIONS.includes(action.type)) {
      // Use centralized orchestrator for immediate saves
      storageOrchestrator.saveCurrentState('immediate');
    }

    // Handle debounced persistence actions
    else if (DEBOUNCED_PERSIST_ACTIONS.includes(action.type)) {
      // Use centralized orchestrator for debounced saves
      storageOrchestrator.saveCurrentState('debounced');
    }
  } catch (error) {
    logger.error('Persistence middleware error:', error);
    // Don't throw - let the app continue working even if persistence fails
  }

  return result;
};

// Storage event listener for cross-tab synchronization
export const setupStorageSync = (store: any) => {
  const handleStorageChange = (event: StorageEvent) => {
    if (!event.key || !event.newValue) return;

    try {
      // Handle word progress changes from other tabs
      if (event.key === 'levelup_word_progress') {
        const newWordProgress = JSON.parse(event.newValue);
        const currentLanguage = store.getState().game.language;

        if (currentLanguage && newWordProgress[currentLanguage]) {
          // Update the current language's word progress
          store.dispatch({
            type: 'game/syncWordProgress',
            payload: newWordProgress[currentLanguage],
          });
        }
      }

      // Handle session state changes from other tabs
      else if (event.key === 'levelup_session_state') {
        const newSessionState = JSON.parse(event.newValue);

        // Sync session state if it changed in another tab
        store.dispatch({
          type: 'session/syncSessionState',
          payload: newSessionState,
        });
      }
    } catch (error) {
      logger.error('Storage sync error:', error);
    }
  };

  // Listen for storage changes from other tabs
  window.addEventListener('storage', handleStorageChange);

  // Return cleanup function
  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
};

// Utilities for manual persistence control
export const persistenceUtils = {
  // Force immediate save of all state
  saveAll: async () => {
    await storageOrchestrator.flush();
  },

  // Clear all persisted data
  clearAll: () => {
    gameStateStorage.clear();
    sessionStateStorage.clear();
    wordProgressStorage.clear();
  },

  // Get storage usage information
  getStorageInfo: () => {
    try {
      const gameState = localStorage.getItem('levelup_game_state');
      const sessionState = localStorage.getItem('levelup_session_state');
      const wordProgress = localStorage.getItem('levelup_word_progress');

      const sizes = {
        gameState: gameState ? gameState.length : 0,
        sessionState: sessionState ? sessionState.length : 0,
        wordProgress: wordProgress ? wordProgress.length : 0,
      };

      const total = Object.values(sizes).reduce((sum, size) => sum + size, 0);

      return {
        sizes,
        total,
        totalKB: Math.round((total / 1024) * 100) / 100,
      };
    } catch (error) {
      logger.error('Error getting storage info:', error);
      return { sizes: {}, total: 0, totalKB: 0 };
    }
  },

  // Get orchestrator statistics
  getOrchestratorStats: () => {
    return storageOrchestrator.getStatistics();
  },
};
