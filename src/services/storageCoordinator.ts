/**
 * Storage Coordinator
 * 
 * PURPOSE: Lightweight coordination layer for background auto-save system
 * REPLACES: Complex storage orchestrator with simplified, efficient approach
 * 
 * ARCHITECTURE:
 * - Background auto-save handles all complex coordination
 * - This provides simple direct access when needed
 * - Maintains compatibility with existing code
 */

import { enhancedStorage } from './storage/enhancedStorage';
import { logger } from './logger';

class StorageCoordinator {
  private backgroundAutoSave: any = null;

  // Set background auto-save instance (injected from middleware)
  setBackgroundAutoSave(autoSave: any) {
    this.backgroundAutoSave = autoSave;
    logger.debug('🔗 Background auto-save linked to coordinator');
  }

  // Simple direct saves (bypasses background queue when needed)
  async saveWordProgressDirect(languageCode: string, data: any): Promise<void> {
    try {
      await enhancedStorage.saveWordProgress(languageCode, data);
      logger.debug(`💾 Direct word progress save: ${languageCode}`);
    } catch (error) {
      logger.error('Direct word progress save failed:', error);
      throw error;
    }
  }

  async saveGameStateDirect(data: any): Promise<void> {
    try {
      await enhancedStorage.saveGameState(data);
      logger.debug('💾 Direct game state save');
    } catch (error) {
      logger.error('Direct game state save failed:', error);
      throw error;
    }
  }

  async saveSessionStateDirect(data: any): Promise<void> {
    try {
      await enhancedStorage.saveSessionState(data);
      logger.debug('💾 Direct session state save');
    } catch (error) {
      logger.error('Direct session state save failed:', error);
      throw error;
    }
  }

  // Background queue operations (preferred method)
  queueWordProgress(languageCode: string, data: any, priority: 'high' | 'medium' | 'low' = 'medium') {
    if (this.backgroundAutoSave) {
      this.backgroundAutoSave.queueChange('wordProgress', data, languageCode, priority);
    } else {
      logger.warn('Background auto-save not available, falling back to direct save');
      this.saveWordProgressDirect(languageCode, data);
    }
  }

  queueGameState(data: any, priority: 'high' | 'medium' | 'low' = 'medium') {
    if (this.backgroundAutoSave) {
      this.backgroundAutoSave.queueChange('gameState', data, undefined, priority);
    } else {
      logger.warn('Background auto-save not available, falling back to direct save');
      this.saveGameStateDirect(data);
    }
  }

  queueSessionState(data: any, priority: 'high' | 'medium' | 'low' = 'medium') {
    if (this.backgroundAutoSave) {
      this.backgroundAutoSave.queueChange('sessionState', data, undefined, priority);
    } else {
      logger.warn('Background auto-save not available, falling back to direct save');
      this.saveSessionStateDirect(data);
    }
  }

  // Force immediate save of all queued items
  async forceSave(): Promise<void> {
    if (this.backgroundAutoSave) {
      await this.backgroundAutoSave.forceSave();
      logger.debug('🚀 Forced background save completed');
    } else {
      logger.warn('Background auto-save not available for force save');
    }
  }

  // Get current status
  getStatus() {
    if (this.backgroundAutoSave) {
      return this.backgroundAutoSave.getStatus();
    }
    return {
      enabled: false,
      pendingChanges: 0,
      isProcessing: false,
      lastActionTime: 0,
      config: null
    };
  }

  // Get storage analytics
  async getAnalytics() {
    try {
      const storageAnalytics = await enhancedStorage.getStorageAnalytics();
      const backgroundStatus = this.getStatus();
      
      return {
        storage: storageAnalytics,
        backgroundAutoSave: backgroundStatus,
        simplified: true
      };
    } catch (error) {
      logger.error('Failed to get analytics:', error);
      return null;
    }
  }

  // Cleanup
  async cleanup(): Promise<void> {
    if (this.backgroundAutoSave) {
      await this.backgroundAutoSave.cleanup();
    }
    logger.debug('🧹 Storage coordinator cleanup completed');
  }
}

// Export singleton instance
export const storageCoordinator = new StorageCoordinator();

// Legacy compatibility - for gradual migration from old storageOrchestrator
export const storageOrchestrator = {
  // Map old methods to new simplified ones
  saveWordProgress: (languageCode: string, data: any, priority = 'debounced') => {
    const mappedPriority = priority === 'immediate' ? 'high' : 'medium';
    return storageCoordinator.queueWordProgress(languageCode, data, mappedPriority);
  },

  saveGameState: (data: any, priority = 'debounced') => {
    const mappedPriority = priority === 'immediate' ? 'high' : 'medium';
    return storageCoordinator.queueGameState(data, mappedPriority);
  },

  saveSessionState: (data: any, priority = 'debounced') => {
    const mappedPriority = priority === 'immediate' ? 'high' : 'medium';
    return storageCoordinator.queueSessionState(data, mappedPriority);
  },

  saveCurrentState: (priority = 'debounced') => {
    // Legacy method - now just force a save of current queue
    const mappedPriority = priority === 'immediate' ? 'high' : 'medium';
    if (mappedPriority === 'high') {
      return storageCoordinator.forceSave();
    }
    // For debounced, just let background auto-save handle it
    return Promise.resolve();
  },

  getStatistics: () => storageCoordinator.getAnalytics(),
  
  cleanup: () => storageCoordinator.cleanup()
};