/**
 * Persistence Middleware - Background Auto-Save Architecture
 *
 * SIMPLIFIED ARCHITECTURE:
 * Redux Actions → Persistence Middleware → Background Auto-Save → Storage Services
 *
 * KEY IMPROVEMENTS:
 * - Simplified from complex immediate vs debounced logic
 * - Background auto-save handles all timing and coordination
 * - Kept intelligent action batching for queue optimization
 * - Much cleaner and easier to maintain
 *
 * BENEFITS:
 * - Non-blocking UI (storage operations don't block game interactions)
 * - Better performance (background processing + smart batching)
 * - Simpler logic flow and easier debugging
 * - Maintained backward compatibility
 */

import type { Middleware } from '@reduxjs/toolkit';
import type { RootState } from './store';
import { logger } from '../services/logger';
import BackgroundAutoSave from '../services/storage/backgroundAutoSave';
import { enhancedStorage } from '../services/storage/enhancedStorage';

// Critical actions that need immediate saving (bypass background queue)
const CRITICAL_ACTIONS = [
  'game/setLanguage', // Language switches must be immediate
  'session/completeSession', // Session completion triggers navigation
  'achievements/unlockAchievement', // Achievements should be immediately saved
];

// Actions that trigger state changes needing persistence
const PERSIST_ACTIONS = [
  'game/checkAnswer',
  'game/setCurrentModule',
  'game/resetGame',
  'session/startSession',
  'session/addCorrectAnswer',
  'session/addIncorrectAnswer',
  'session/incrementWordsCompleted',
  'session/updateProgress',
  'session/resetSession',
];

// Action groups for intelligent batching (reduces queue size)
const RELATED_ACTION_GROUPS = [
  [
    'game/checkAnswer',
    'session/addCorrectAnswer',
    'session/addIncorrectAnswer',
    'session/incrementWordsCompleted',
  ],
];

// Background auto-save instance
let backgroundAutoSave: BackgroundAutoSave | null = null;

// Simplified batching state
let batchTimeout: NodeJS.Timeout | null = null;
const pendingBatchActions = new Set<string>();
let hasGameCheckAnswerInBatch = false; // Track if game/checkAnswer is in current batch

// Initialize background auto-save system
const getAutoSave = () => {
  if (!backgroundAutoSave) {
    backgroundAutoSave = new BackgroundAutoSave(enhancedStorage, logger, {
      interval: 30000, // 30s auto-save
      maxPendingActions: 20, // Reduced since we're batching better
      idleThreshold: 2000, // 2s idle (faster response)
      enabled: true,
    });

    logger.debug('🤖 Background auto-save initialized (simplified)');

    // Make available for debugging
    if (typeof window !== 'undefined') {
      (window as any).__BACKGROUND_AUTOSAVE__ = backgroundAutoSave;
    }
  }
  return backgroundAutoSave;
};

// Simplified queue helper
const queueStateChange = (autoSave: BackgroundAutoSave, state: RootState, action: any) => {
  const actionType = action.type;
  const priority = CRITICAL_ACTIONS.includes(actionType) ? 'high' : 'medium';

  // Queue appropriate state based on action type
  if (actionType.startsWith('game/')) {
    autoSave.queueChange('gameState', state.game, undefined, priority);

    // Queue word progress if language exists
    const languageCode = state.game?.language;
    const wordProgress = state.game?.wordProgress;
    const wordProgressKeys = wordProgress ? Object.keys(wordProgress) : [];
    
    // ALWAYS log for checkAnswer to diagnose the issue
    if (actionType === 'game/checkAnswer') {
      logger.debug('🔍 Word progress persistence check:', {
        action: actionType,
        languageCode,
        hasWordProgress: !!wordProgress,
        wordProgressCount: wordProgressKeys.length,
        sampleKeys: wordProgressKeys.slice(0, 5),
        wordProgressSample: wordProgressKeys.length > 0 ? wordProgress[wordProgressKeys[0]] : null,
      });
    }
    
    if (languageCode && wordProgress && wordProgressKeys.length > 0) {
      logger.debug(`📝 Queuing wordProgress for language: ${languageCode} (${wordProgressKeys.length} words)`);
      autoSave.queueChange(
        'wordProgress',
        wordProgress, // wordProgress is indexed by wordId, not languageCode
        languageCode,
        priority
      );
    }
  }

  if (actionType.startsWith('session/')) {
    autoSave.queueChange('sessionState', state.session, undefined, priority);
  }

  if (actionType.startsWith('achievements/')) {
    autoSave.queueChange('achievements', state.achievements, undefined, priority);
  }
};

// Simplified persistence middleware
export const persistenceMiddleware: Middleware<{}, RootState> = store => next => action => {
  // Execute action first
  const result = next(action);

  // Only process actions that need persistence
  if (!PERSIST_ACTIONS.includes(action.type) && !CRITICAL_ACTIONS.includes(action.type)) {
    return result;
  }

  try {
    const autoSave = getAutoSave();
    const state = store.getState();

    // Handle critical actions immediately
    if (CRITICAL_ACTIONS.includes(action.type)) {
      queueStateChange(autoSave, state, action);
      autoSave.forceSave(); // Immediate save for critical actions
      return result;
    }

    // Handle related action groups with intelligent batching
    const isRelatedAction = RELATED_ACTION_GROUPS.some(group => group.includes(action.type));

    if (isRelatedAction) {
      // Add to pending batch
      pendingBatchActions.add(action.type);
      
      // Track if game/checkAnswer is in the batch
      if (action.type === 'game/checkAnswer') {
        hasGameCheckAnswerInBatch = true;
      }

      // Clear existing timeout
      if (batchTimeout) {
        clearTimeout(batchTimeout);
      }

      // Set new batch timeout
      batchTimeout = setTimeout(() => {
        if (pendingBatchActions.size > 0) {
          const batchedState = store.getState();
          
          // Always queue gameState if this batch includes game/checkAnswer (for wordProgress)
          if (hasGameCheckAnswerInBatch) {
            autoSave.queueChange('gameState', batchedState.game, undefined, 'high');
            
            // Queue word progress separately with language code
            const languageCode = batchedState.game?.language;
            const wordProgress = batchedState.game?.wordProgress;
            const wordProgressKeys = wordProgress ? Object.keys(wordProgress) : [];
            
            if (languageCode && wordProgress && wordProgressKeys.length > 0) {
              logger.debug(`📝 Queuing wordProgress for language: ${languageCode} (${wordProgressKeys.length} words)`);
              autoSave.queueChange(
                'wordProgress',
                wordProgress,
                languageCode,
                'high'
              );
            } else {
              logger.debug('⚠️ WordProgress not queued:', {
                languageCode: !!languageCode,
                hasWordProgress: !!wordProgress,
                wordProgressKeys: wordProgressKeys.length,
              });
            }
          }
          
          // Queue session state for session actions in batch
          if (Array.from(pendingBatchActions).some(a => a.startsWith('session/'))) {
            autoSave.queueChange('sessionState', batchedState.session, undefined, 'medium');
          }

          if (process.env.NODE_ENV === 'development') {
            logger.debug(
              `🔄 Batched ${pendingBatchActions.size} related actions: ${Array.from(pendingBatchActions).join(', ')}`
            );
          }

          pendingBatchActions.clear();
          hasGameCheckAnswerInBatch = false;
        }
        batchTimeout = null;
      }, 50); // 50ms batch window
    } else {
      // Non-related action - queue immediately
      queueStateChange(autoSave, state, action);
    }
  } catch (error) {
    logger.error('Persistence middleware error:', error);
    // Don't throw - keep app working
  }

  return result;
};

// Simplified utilities for debugging and cleanup
export const persistenceUtils = {
  // Get background auto-save status
  getStatus: () => {
    return (
      backgroundAutoSave?.getStatus() || {
        enabled: false,
        pendingChanges: 0,
        isProcessing: false,
        lastActionTime: 0,
        config: null,
      }
    );
  },

  // Force immediate save
  forceSave: async () => {
    if (backgroundAutoSave) {
      await backgroundAutoSave.forceSave();
      logger.debug('🚀 Manual save completed');
    }
  },

  // Update configuration
  updateConfig: (config: any) => {
    if (backgroundAutoSave) {
      backgroundAutoSave.updateConfig(config);
      logger.debug('🔧 Config updated', config);
    }
  },

  // Get simple analytics
  getAnalytics: () => {
    const status = backgroundAutoSave?.getStatus();
    const analytics =
      typeof window !== 'undefined' ? (window as any).__SAVE_ANALYTICS__?.getAnalytics() : null;

    return {
      autoSave: status,
      backgroundSaves: analytics,
    };
  },

  // Cleanup
  cleanup: async () => {
    if (backgroundAutoSave) {
      await backgroundAutoSave.cleanup();
      logger.debug('🧹 Cleanup completed');
    }
  },
};

// Setup cross-tab sync (simplified)
export const setupStorageSync = (store: any) => {
  const handleStorageChange = (event: StorageEvent) => {
    if (!event.key || !event.newValue) return;

    try {
      // Handle critical state changes from other tabs
      if (event.key === 'levelup_game_state') {
        const newGameState = JSON.parse(event.newValue);
        store.dispatch({ type: 'game/syncFromStorage', payload: newGameState });
      }

      if (event.key === 'levelup_session_state') {
        const newSessionState = JSON.parse(event.newValue);
        store.dispatch({ type: 'session/syncFromStorage', payload: newSessionState });
      }
    } catch (error) {
      logger.error('Storage sync error:', error);
    }
  };

  window.addEventListener('storage', handleStorageChange);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
};
