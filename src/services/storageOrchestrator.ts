/**
 * Centralized Storage Orchestrator
 * 
 * This service provides the SINGLE SOURCE OF TRUTH for all storage operations.
 * All saves must go through this centralized system to prevent duplicates and ensure consistency.
 * 
 * ARCHITECTURE PRINCIPLE: Only this service should call the actual storage APIs.
 * Components and hooks should dispatch actions or call this service, never save directly.
 */

import { store } from '../store/store';
import { wordProgressStorage, gameStateStorage, sessionStateStorage } from './storageService';
import { logger } from './logger';
import type { RootState } from '../store/store';

interface SaveOperation {
  type: 'wordProgress' | 'gameState' | 'sessionState';
  languageCode?: string;
  data: any;
  timestamp: number;
  priority: 'immediate' | 'debounced';
}

class StorageOrchestrator {
  private saveQueue: SaveOperation[] = [];
  private isProcessing = false;
  private lastSave: { [key: string]: number } = {};
  private readonly DEBOUNCE_MS = 1000; // 1 second debounce for most operations
  private readonly IMMEDIATE_DEBOUNCE_MS = 100; // 100ms for immediate operations

  /**
   * CENTRALIZED SAVE - The only method that should trigger actual storage writes
   */
  async saveWordProgress(languageCode: string, wordProgress: any, priority: 'immediate' | 'debounced' = 'debounced'): Promise<void> {
    const operation: SaveOperation = {
      type: 'wordProgress',
      languageCode,
      data: wordProgress,
      timestamp: Date.now(),
      priority
    };

    await this.queueSave(operation);
  }

  async saveGameState(gameState: any, priority: 'immediate' | 'debounced' = 'debounced'): Promise<void> {
    const operation: SaveOperation = {
      type: 'gameState',
      data: gameState,
      timestamp: Date.now(),
      priority
    };

    await this.queueSave(operation);
  }

  async saveSessionState(sessionState: any, priority: 'immediate' | 'debounced' = 'debounced'): Promise<void> {
    const operation: SaveOperation = {
      type: 'sessionState',
      data: sessionState,
      timestamp: Date.now(),
      priority
    };

    await this.queueSave(operation);
  }

  /**
   * Queue save operation and process with appropriate timing
   */
  private async queueSave(operation: SaveOperation): Promise<void> {
    // Create unique key for deduplication
    const key = `${operation.type}-${operation.languageCode || 'global'}`;
    const now = Date.now();
    const lastSaveTime = this.lastSave[key] || 0;

    // For immediate operations, skip if very recent save
    if (operation.priority === 'immediate' && (now - lastSaveTime) < this.IMMEDIATE_DEBOUNCE_MS) {
      return; // Skip duplicate immediate save
    }

    // Remove any existing operations of the same type (latest wins)
    this.saveQueue = this.saveQueue.filter(op => 
      !(op.type === operation.type && op.languageCode === operation.languageCode)
    );

    // Add new operation
    this.saveQueue.push(operation);

    // Process queue
    await this.processQueue(operation.priority === 'immediate');
  }

  /**
   * Process the save queue with appropriate timing
   */
  private async processQueue(immediate: boolean = false): Promise<void> {
    if (this.isProcessing) return;

    if (immediate) {
      // Process immediately for critical operations
      await this.processSaves();
    } else {
      // Debounce for regular operations
      setTimeout(() => this.processSaves(), this.DEBOUNCE_MS);
    }
  }

  /**
   * Actually execute the save operations
   */
  private async processSaves(): Promise<void> {
    if (this.isProcessing || this.saveQueue.length === 0) return;

    this.isProcessing = true;

    try {
      const operations = [...this.saveQueue];
      this.saveQueue = []; // Clear queue

      // Group operations by type to optimize
      const wordProgressOps = operations.filter(op => op.type === 'wordProgress');
      const gameStateOps = operations.filter(op => op.type === 'gameState');
      const sessionStateOps = operations.filter(op => op.type === 'sessionState');

      // Execute saves (only latest for each type)
      await Promise.all([
        this.executeWordProgressSaves(wordProgressOps),
        this.executeGameStateSaves(gameStateOps),
        this.executeSessionStateSaves(sessionStateOps)
      ]);

    } catch (error) {
      logger.error('Storage orchestrator error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeWordProgressSaves(operations: SaveOperation[]): Promise<void> {
    // Group by language code and take latest for each
    const latestByLanguage = new Map<string, SaveOperation>();
    
    operations.forEach(op => {
      if (op.languageCode) {
        latestByLanguage.set(op.languageCode, op);
      }
    });

    // Execute saves
    for (const [languageCode, operation] of latestByLanguage) {
      try {
        wordProgressStorage.save(languageCode, operation.data);
        this.lastSave[`wordProgress-${languageCode}`] = Date.now();
        
        if (process.env.NODE_ENV === 'development') {
          logger.debug(`✅ Centralized save: wordProgress for ${languageCode} (${Object.keys(operation.data).length} entries)`);
        }
      } catch (error) {
        logger.error(`Failed to save word progress for ${languageCode}:`, error);
      }
    }
  }

  private async executeGameStateSaves(operations: SaveOperation[]): Promise<void> {
    if (operations.length === 0) return;

    // Take latest game state operation
    const latest = operations[operations.length - 1];
    
    try {
      gameStateStorage.save(latest.data);
      this.lastSave['gameState-global'] = Date.now();
      
      if (process.env.NODE_ENV === 'development') {
        logger.debug('✅ Centralized save: gameState');
      }
    } catch (error) {
      logger.error('Failed to save game state:', error);
    }
  }

  private async executeSessionStateSaves(operations: SaveOperation[]): Promise<void> {
    if (operations.length === 0) return;

    // Take latest session state operation
    const latest = operations[operations.length - 1];
    
    try {
      sessionStateStorage.save(latest.data);
      this.lastSave['sessionState-global'] = Date.now();
      
      if (process.env.NODE_ENV === 'development') {
        logger.debug('✅ Centralized save: sessionState');
      }
    } catch (error) {
      logger.error('Failed to save session state:', error);
    }
  }

  /**
   * Save current Redux state (convenience method)
   */
  async saveCurrentState(priority: 'immediate' | 'debounced' = 'debounced'): Promise<void> {
    const state: RootState = store.getState();

    if (state.game.language) {
      await this.saveWordProgress(state.game.language, state.game.wordProgress, priority);
    }

    await this.saveGameState({
      language: state.game.language,
      score: state.game.score,
      streak: state.game.streak,
      correctAnswers: state.game.correctAnswers,
      totalAttempts: state.game.totalAttempts,
      quizMode: state.game.quizMode,
      wordProgress: {}, // Don't save mixed word progress
    }, priority);

    await this.saveSessionState({
      language: state.session.currentLanguage,
      currentSession: state.session.currentSession,
      sessionProgress: state.session.progress,
      isActive: state.session.isSessionActive,
    }, priority);
  }

  /**
   * Force immediate save of all pending operations
   */
  async flush(): Promise<void> {
    await this.processSaves();
  }

  /**
   * Get save statistics for monitoring
   */
  getStatistics() {
    return {
      queueLength: this.saveQueue.length,
      isProcessing: this.isProcessing,
      lastSaves: { ...this.lastSave }
    };
  }
}

// Export singleton instance
export const storageOrchestrator = new StorageOrchestrator();

// Export convenience methods for common operations
export const saveWordProgress = (languageCode: string, wordProgress: any, immediate = false) =>
  storageOrchestrator.saveWordProgress(languageCode, wordProgress, immediate ? 'immediate' : 'debounced');

export const saveCurrentGameState = (immediate = false) =>
  storageOrchestrator.saveCurrentState(immediate ? 'immediate' : 'debounced');

export const flushAllSaves = () => storageOrchestrator.flush();

export default storageOrchestrator;