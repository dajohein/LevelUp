/**
 * Background Auto-Save System
 * Decouples storage operations from game interactions for better performance and reliability
 */

import type { enhancedStorage } from './enhancedStorage';
import type { logger as storageLogger } from '../logger';
import type { StorageResult } from './interfaces';
import type { WordProgress } from '../../store/types';

interface AutoSaveConfig {
  interval: number; // Auto-save interval in milliseconds
  maxPendingActions: number; // Max actions before forced save
  idleThreshold: number; // Time to wait after last action before saving
  enabled: boolean;
}

type StateChangeType = 'gameState' | 'sessionState' | 'achievements';
type ChangePriority = 'low' | 'medium' | 'high';
type WordProgressData = Record<string, WordProgress>;

interface ChangeMetadata {
  languageCode?: string;
  timestamp: number;
  priority: ChangePriority;
}

type PendingChange = ChangeMetadata &
  ({ type: 'wordProgress'; data: WordProgressData } | { type: StateChangeType; data: unknown });

type SaveProvider = Pick<
  typeof enhancedStorage,
  'saveWordProgress' | 'saveGameState' | 'saveSessionState' | 'saveAchievements'
>;

interface SaveAnalyticsWindow extends Window {
  __SAVE_ANALYTICS__?: {
    recordBackgroundSave: (record: {
      trigger: string;
      changeCount: number;
      duration: number;
      timestamp: number;
    }) => void;
  };
}

class BackgroundAutoSave {
  private config: AutoSaveConfig;
  private pendingChanges: Map<string, PendingChange> = new Map();
  private lastActionTime = 0;
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  private inFlightSave: Promise<void> | null = null;
  private lastError: string | null = null;

  constructor(
    private enhancedStorage: SaveProvider,
    private logger: Pick<typeof storageLogger, 'debug' | 'error'>,
    config: Partial<AutoSaveConfig> = {}
  ) {
    this.config = {
      interval: 30000, // 30 seconds
      maxPendingActions: 50, // Force save after 50 pending changes
      idleThreshold: 5000, // 5 seconds of inactivity
      enabled: true,
      ...config,
    };

    if (this.config.enabled) {
      this.startAutoSave();
    }

    this.logger?.debug('🤖 Background auto-save initialized', this.config);
  }

  /**
   * Queue a change for background saving
   */
  queueChange(
    ...[type, data, languageCode, priority = 'medium']:
      | [
          type: 'wordProgress',
          data: WordProgressData,
          languageCode?: string,
          priority?: ChangePriority,
        ]
      | [type: StateChangeType, data: unknown, languageCode?: string, priority?: ChangePriority]
  ): void {
    if (!this.config.enabled) return;

    const key = languageCode ? `${type}:${languageCode}` : type;
    const metadata: ChangeMetadata = {
      languageCode,
      timestamp: Date.now(),
      priority,
    };
    const change: PendingChange =
      type === 'wordProgress' ? { ...metadata, type, data } : { ...metadata, type, data };

    // Replace existing pending change for same key (only keep latest)
    this.pendingChanges.set(key, change);
    this.lastActionTime = Date.now();

    this.logger?.debug(`📝 Queued background save: ${key} (${this.pendingChanges.size} pending)`, {
      priority,
      pendingCount: this.pendingChanges.size,
    });

    // Force save if too many pending changes
    if (this.pendingChanges.size >= this.config.maxPendingActions) {
      this.logger?.debug('🚨 Force save triggered: max pending changes reached');
      this.saveInBackground('force');
    } else {
      // Schedule idle save
      this.scheduleIdleSave();
    }
  }

  /**
   * Start the automatic save interval
   */
  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(() => {
      if (this.pendingChanges.size > 0) {
        this.saveInBackground('interval');
      }
    }, this.config.interval);

    this.logger?.debug(`⏰ Auto-save timer started (${this.config.interval}ms interval)`);
  }

  /**
   * Schedule save after idle period
   */
  private scheduleIdleSave(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    this.idleTimer = setTimeout(() => {
      const timeSinceLastAction = Date.now() - this.lastActionTime;
      if (timeSinceLastAction >= this.config.idleThreshold && this.pendingChanges.size > 0) {
        this.saveInBackground('idle');
      }
    }, this.config.idleThreshold);
  }

  /**
   * Perform the actual save operation
   */
  private saveInBackground(trigger: 'interval' | 'idle' | 'force'): void {
    void this.performSave(trigger).catch(error => {
      this.logger?.error(`❌ Automatic save failed (${trigger}); changes remain queued:`, error);
    });
  }

  /**
   * Share the active batch so manual flushes cannot skip outstanding writes.
   */
  private performSave(trigger: 'interval' | 'idle' | 'force' | 'manual'): Promise<void> {
    if (this.inFlightSave) {
      return this.inFlightSave;
    }
    if (this.pendingChanges.size === 0) {
      return Promise.resolve();
    }

    const changesToSave = Array.from(this.pendingChanges.entries()).sort(([, a], [, b]) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority] || a.timestamp - b.timestamp;
    });
    this.pendingChanges.clear();
    // Defer provider calls until the shared promise has been registered.
    this.inFlightSave = Promise.resolve()
      .then(() => this.saveBatch(trigger, changesToSave))
      .finally(() => {
        this.inFlightSave = null;
      });
    return this.inFlightSave;
  }

  private saveChange(change: PendingChange): Promise<StorageResult<void>> {
    switch (change.type) {
      case 'wordProgress':
        if (!change.languageCode?.trim()) {
          throw new Error('Language code required for word progress');
        }
        return this.enhancedStorage.saveWordProgress(change.languageCode, change.data);
      case 'gameState':
        return this.enhancedStorage.saveGameState(change.data);
      case 'sessionState':
        return this.enhancedStorage.saveSessionState(change.data);
      case 'achievements':
        return this.enhancedStorage.saveAchievements(change.data);
    }
  }

  private async saveBatch(trigger: string, changes: [string, PendingChange][]): Promise<void> {
    const startTime = performance.now();
    this.logger?.debug(`💾 Background save started (${trigger}): ${changes.length} changes`);
    const results = await Promise.allSettled(
      changes.map(([, change]) => Promise.resolve().then(() => this.saveChange(change)))
    );
    const failures: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) return;

      const [key, change] = changes[index];
      const reason =
        result.status === 'rejected'
          ? String(result.reason)
          : result.value.error || 'Storage returned an unsuccessful result';
      failures.push(`${key}: ${reason}`);
      // A failed older snapshot must never overwrite edits queued during its write.
      if (!this.pendingChanges.has(key)) {
        this.pendingChanges.set(key, change);
      }
      this.logger?.error(`❌ Background save failed for ${key}:`, reason);
    });

    if (failures.length > 0) {
      this.lastError = `Background save failed (${trigger}): ${failures.join('; ')}`;
      throw new Error(this.lastError);
    }

    this.lastError = null;
    const duration = performance.now() - startTime;
    this.logger?.debug(`✅ Background save completed (${trigger})`, {
      changeCount: changes.length,
      duration: `${duration.toFixed(2)}ms`,
      operations: results.length,
    });
    this.updateSaveAnalytics(trigger, changes.length, duration);
  }

  /**
   * Update save analytics
   */
  private updateSaveAnalytics(trigger: string, changeCount: number, duration: number): void {
    // This would integrate with the existing analytics system
    if (typeof window !== 'undefined') {
      (window as SaveAnalyticsWindow).__SAVE_ANALYTICS__?.recordBackgroundSave({
        trigger,
        changeCount,
        duration,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Await outstanding writes and drain edits queued while saving.
   * @throws Error when a write fails; failed snapshots remain queued for retry.
   */
  async forceSave(): Promise<void> {
    while (this.inFlightSave || this.pendingChanges.size > 0) {
      await this.performSave('manual');
    }
  }

  /**
   * Get current auto-save status
   */
  getStatus(): {
    enabled: boolean;
    pendingChanges: number;
    isProcessing: boolean;
    lastError: string | null;
    lastActionTime: number;
    config: AutoSaveConfig;
  } {
    return {
      enabled: this.config.enabled,
      pendingChanges: this.pendingChanges.size,
      isProcessing: this.inFlightSave !== null,
      lastError: this.lastError,
      lastActionTime: this.lastActionTime,
      config: { ...this.config },
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AutoSaveConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (this.config.enabled) {
      this.startAutoSave();
    } else {
      this.stop();
    }

    this.logger?.debug('🔧 Auto-save config updated', this.config);
  }

  /**
   * Stop auto-save system
   */
  stop(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }

    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    this.logger?.debug('🛑 Background auto-save stopped');
  }

  /**
   * Cleanup and perform final save
   */
  async cleanup(): Promise<void> {
    this.stop();
    try {
      if (this.inFlightSave || this.pendingChanges.size > 0) {
        this.logger?.debug('🧹 Performing final save before cleanup');
        await this.forceSave();
      }
    } finally {
      // Edits queued during the flush may have scheduled another idle timer.
      this.stop();
    }
  }
}

export default BackgroundAutoSave;
