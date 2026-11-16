/**
 * Persistence Middleware - Durable Redux snapshots with background word-progress saves
 *
 * Game/session snapshots are committed synchronously for Redux hydration.
 * Language-scoped word progress also enters the background queue for tiered storage.
 */

import type { Middleware, AnyAction } from '@reduxjs/toolkit';
import type { Store } from 'redux';
import type { RootState } from './store';
import { logger } from '../services/logger';
import BackgroundAutoSave from '../services/storage/backgroundAutoSave';
import { enhancedStorage } from '../services/storage/enhancedStorage';
import {
  gameStateStorage,
  sessionStateStorage,
  wordProgressStorage,
} from '../services/storageService';
import { learningCacheService } from '../services/cacheService';

/** Dev-only window extensions for debugging the persistence layer. */
interface DevWindow extends Window {
  __BACKGROUND_AUTOSAVE__?: BackgroundAutoSave;
  __SAVE_ANALYTICS__?: { getAnalytics: () => unknown };
}

// Critical actions that need immediate saving (bypass background queue)
const CRITICAL_ACTIONS = [
  'game/setLanguage', // Language switches must be immediate
  'session/completeSession', // Session completion triggers navigation
  'achievements/unlockAchievement', // Achievements should be immediately saved
];

// Actions that trigger state changes needing persistence
const PERSIST_ACTIONS = [
  'game/checkAnswer',
  'game/submitAnswer',
  'session/setLanguage',
  'session/setWeeklyChallenge',
  'game/setCurrentModule',
  'game/resetGame',
  'session/startSession',
  'session/handleAnswerSubmission',
  'session/addCorrectAnswer',
  'session/addIncorrectAnswer',
  'session/incrementWordsCompleted',
  'session/addPerfectAccuracyBonus',
  'session/addIncorrectWordForReview',
  'session/markWordForReview',
  'session/addTimeElapsed',
  'session/useHint',
  'session/updateProgress',
  'session/resetSession',
  'session/clearStaleSession',
];

// Background auto-save instance
let backgroundAutoSave: BackgroundAutoSave | null = null;

const createGameSnapshot = (game: RootState['game']) => ({
  language: game.language,
  module: game.module,
  score: game.score,
  streak: game.streak,
  bestStreak: game.bestStreak,
  correctAnswers: game.correctAnswers,
  totalAttempts: game.totalAttempts,
  quizMode: game.quizMode,
});

const createSessionSnapshot = (session: RootState['session']) => ({
  language: session.currentLanguage,
  currentSession: null,
  sessionProgress: session.progress,
  sessionTimer: 0,
  isActive: false,
  completedSessionsByLanguage: session.completedSessionsByLanguage,
  weeklyChallengeBylanguage: session.weeklyChallengeBylanguage,
});

// Initialize background auto-save system
const getAutoSave = () => {
  if (!backgroundAutoSave) {
    backgroundAutoSave = new BackgroundAutoSave(enhancedStorage, logger, {
      interval: 30000, // 30s auto-save
      maxPendingActions: 20,
      idleThreshold: 2000, // 2s idle (faster response)
      enabled: true,
    });

    logger.debug('🤖 Background auto-save initialized (simplified)');

    // Make available for debugging
    if (typeof window !== 'undefined') {
      (window as DevWindow).__BACKGROUND_AUTOSAVE__ = backgroundAutoSave;
    }
  }
  return backgroundAutoSave;
};

// Queue non-Redux data that does not need synchronous hydration.
const queueStateChange = (autoSave: BackgroundAutoSave, state: RootState, action: AnyAction) => {
  const actionType = action.type;
  const priority = CRITICAL_ACTIONS.includes(actionType) ? 'high' : 'medium';

  if (actionType.startsWith('achievements/')) {
    autoSave.queueChange('achievements', state.achievements, undefined, priority);
  }
};

const persistDurableSnapshot = (state: RootState, actionType: string): void => {
  if (actionType.startsWith('game/')) {
    gameStateStorage.save(createGameSnapshot(state.game));

    if (actionType === 'game/checkAnswer' || actionType === 'game/submitAnswer') {
      if (state.game.language) {
        wordProgressStorage.save(state.game.language, state.game.wordProgress);
      }
    }
  }

  if (actionType.startsWith('session/')) {
    sessionStateStorage.save(createSessionSnapshot(state.session));

    if (
      actionType === 'session/completeSession' &&
      state.session.currentLanguage &&
      state.session.currentSession &&
      state.session.sessionStartTime > 0
    ) {
      const progress = state.session.progress;
      const totalAnswers = progress.correctAnswers + progress.incorrectAnswers;
      learningCacheService.recordPracticeSession(
        state.session.currentLanguage,
        `${state.session.currentLanguage}:${state.session.sessionStartTime}`,
        state.session.sessionStartTime,
        Date.now(),
        {
          groupId: state.session.currentSession.id,
          wordsLearned: progress.wordsCompleted,
          averageAccuracy: totalAnswers > 0 ? progress.correctAnswers / totalAnswers : 0,
          fastestModeCompletion: '',
          strugglingWords: [],
          recommendations: [],
        },
        [],
        state.session.currentSession.id
      );
    }
  }
};

export const persistenceMiddleware: Middleware<Record<string, never>, RootState> =
  store => next => action => {
    // Execute action first
    const result = next(action);

    // Only process actions that need persistence
    if (!PERSIST_ACTIONS.includes(action.type) && !CRITICAL_ACTIONS.includes(action.type)) {
      return result;
    }

    try {
      const state = store.getState();
      persistDurableSnapshot(state, action.type);
      const autoSave = getAutoSave();

      // Capture answer progress under its current language before any navigation action can
      // replace the active Redux progress map.
      if (action.type === 'game/checkAnswer' || action.type === 'game/submitAnswer') {
        const languageCode = state.game?.language;
        const wordProgress = state.game?.wordProgress;
        if (languageCode && wordProgress && Object.keys(wordProgress).length > 0) {
          autoSave.queueChange('wordProgress', wordProgress, languageCode, 'high');
        }
      }

      // Handle critical actions immediately
      if (CRITICAL_ACTIONS.includes(action.type)) {
        queueStateChange(autoSave, state, action);
        void autoSave.forceSave().catch(error => {
          logger.error('Critical persistence save failed; changes remain queued:', error);
        });
        return result;
      }

      queueStateChange(autoSave, state, action);
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
        lastError: null,
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
  updateConfig: (config: Parameters<BackgroundAutoSave['updateConfig']>[0]) => {
    if (backgroundAutoSave) {
      backgroundAutoSave.updateConfig(config);
      logger.debug('🔧 Config updated', config);
    }
  },

  // Get simple analytics
  getAnalytics: () => {
    const status = backgroundAutoSave?.getStatus();
    const analytics =
      typeof window !== 'undefined'
        ? (window as DevWindow).__SAVE_ANALYTICS__?.getAnalytics()
        : null;

    return {
      autoSave: status,
      backgroundSaves: analytics,
    };
  },

  // Cleanup
  cleanup: async () => {
    if (backgroundAutoSave) {
      await backgroundAutoSave.cleanup();
      backgroundAutoSave = null;
      logger.debug('🧹 Cleanup completed');
    }
  },
};

// Setup cross-tab sync (simplified)
export const setupStorageSync = (store: Store<RootState>) => {
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
