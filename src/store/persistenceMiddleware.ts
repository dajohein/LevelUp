// Redux middleware for automatic state persistence
import type { Middleware } from '@reduxjs/toolkit';
import type { RootState } from './store';
import {
  wordProgressStorage,
  gameStateStorage,
  sessionStateStorage,
} from '../services/storageService';

// Debounce function to prevent excessive localStorage writes
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Actions that should trigger immediate persistence (no debounce)
const IMMEDIATE_PERSIST_ACTIONS = [
  'game/setLanguage',
  'session/startSession',
  'session/completeSession',
  'session/resetSession',
];

// Actions that should trigger debounced persistence
const DEBOUNCED_PERSIST_ACTIONS = [
  'game/checkAnswer',
  'session/addCorrectAnswer',
  'session/addIncorrectAnswer',
  'session/incrementWordsCompleted',
  'session/updateProgress',
];

// Debounced persistence functions
const debouncedGameStateSave = debounce((state: RootState) => {
  if (state.game.language) {
    gameStateStorage.save({
      language: state.game.language,
      score: state.game.score,
      streak: state.game.streak,
      correctAnswers: state.game.correctAnswers,
      totalAttempts: state.game.totalAttempts,
      quizMode: state.game.quizMode,
      wordProgress: state.game.wordProgress,
    });

    wordProgressStorage.save(state.game.language, state.game.wordProgress);
  }
}, 1000); // 1 second debounce

const debouncedSessionStateSave = debounce((state: RootState) => {
  sessionStateStorage.save({
    language: state.session.currentLanguage,
    currentSession: state.session.currentSession,
    sessionProgress: state.session.progress,
    isActive: state.session.isSessionActive,
  });
}, 1000); // 1 second debounce

// Immediate persistence functions (no debounce)
const immediateGameStateSave = (state: RootState) => {
  if (state.game.language) {
    gameStateStorage.save({
      language: state.game.language,
      score: state.game.score,
      streak: state.game.streak,
      correctAnswers: state.game.correctAnswers,
      totalAttempts: state.game.totalAttempts,
      quizMode: state.game.quizMode,
      wordProgress: state.game.wordProgress,
    });

    wordProgressStorage.save(state.game.language, state.game.wordProgress);
  }
};

const immediateSessionStateSave = (state: RootState) => {
  sessionStateStorage.save({
    language: state.session.currentLanguage,
    currentSession: state.session.currentSession,
    sessionProgress: state.session.progress,
    isActive: state.session.isSessionActive,
  });
};

// Main persistence middleware
export const persistenceMiddleware: Middleware<{}, RootState> = store => next => action => {
  // Execute the action first
  const result = next(action);

  // Get updated state
  const state = store.getState();

  try {
    // Handle immediate persistence actions
    if (IMMEDIATE_PERSIST_ACTIONS.includes(action.type)) {
      if (action.type.startsWith('game/')) {
        immediateGameStateSave(state);
      } else if (action.type.startsWith('session/')) {
        immediateSessionStateSave(state);
      }
    }

    // Handle debounced persistence actions
    else if (DEBOUNCED_PERSIST_ACTIONS.includes(action.type)) {
      if (action.type.startsWith('game/')) {
        debouncedGameStateSave(state);
      } else if (action.type.startsWith('session/')) {
        debouncedSessionStateSave(state);
      }
    }
  } catch (error) {
    console.error('Persistence middleware error:', error);
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
      console.error('Storage sync error:', error);
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
  saveAll: (state: RootState) => {
    immediateGameStateSave(state);
    immediateSessionStateSave(state);
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
      console.error('Error getting storage info:', error);
      return { sizes: {}, total: 0, totalKB: 0 };
    }
  },
};
