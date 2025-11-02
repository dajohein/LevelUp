/**
 * Background Auto-Save System
 * Decouples storage operations from game interactions for better performance and reliability
 */

interface AutoSaveConfig {
  interval: number; // Auto-save interval in milliseconds
  maxPendingActions: number; // Max actions before forced save
  idleThreshold: number; // Time to wait after last action before saving
  enabled: boolean;
}

interface PendingChange {
  type: 'wordProgress' | 'gameState' | 'sessionState' | 'achievements';
  languageCode?: string;
  data: any;
  timestamp: number;
  priority: 'low' | 'medium' | 'high';
}

class BackgroundAutoSave {
  private config: AutoSaveConfig;
  private pendingChanges: Map<string, PendingChange> = new Map();
  private lastActionTime: number = 0;
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  private isProcessing: boolean = false;
  private enhancedStorage: any;
  private logger: any;

  constructor(enhancedStorage: any, logger: any, config: Partial<AutoSaveConfig> = {}) {
    this.enhancedStorage = enhancedStorage;
    this.logger = logger;
    this.config = {
      interval: 30000, // 30 seconds
      maxPendingActions: 50, // Force save after 50 pending changes
      idleThreshold: 5000, // 5 seconds of inactivity
      enabled: true,
      ...config
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
    type: PendingChange['type'],
    data: any,
    languageCode?: string,
    priority: PendingChange['priority'] = 'medium'
  ): void {
    if (!this.config.enabled) return;

    const key = languageCode ? `${type}:${languageCode}` : type;
    const change: PendingChange = {
      type,
      data,
      languageCode,
      timestamp: Date.now(),
      priority
    };

    // Replace existing pending change for same key (only keep latest)
    this.pendingChanges.set(key, change);
    this.lastActionTime = Date.now();

    this.logger?.debug(`📝 Queued background save: ${key} (${this.pendingChanges.size} pending)`, {
      priority,
      pendingCount: this.pendingChanges.size
    });

    // Force save if too many pending changes
    if (this.pendingChanges.size >= this.config.maxPendingActions) {
      this.logger?.debug('🚨 Force save triggered: max pending changes reached');
      this.performSave('force');
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
        this.performSave('interval');
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
        this.performSave('idle');
      }
    }, this.config.idleThreshold);
  }

  /**
   * Perform the actual save operation
   */
  private async performSave(trigger: 'interval' | 'idle' | 'force' | 'manual'): Promise<void> {
    if (this.isProcessing || this.pendingChanges.size === 0) {
      return;
    }

    this.isProcessing = true;
    const saveStartTime = performance.now();
    const changesToSave = new Map(this.pendingChanges);
    this.pendingChanges.clear();

    try {
      this.logger?.debug(`💾 Background save started (${trigger}): ${changesToSave.size} changes`);

      // Group changes by type for batch processing
      const changesByType = this.groupChangesByType(changesToSave);
      
      // Process each type of change
      const savePromises: Promise<any>[] = [];

      for (const [type, changes] of changesByType.entries()) {
        switch (type) {
          case 'wordProgress':
            for (const change of changes) {
              if (change.languageCode) {
                savePromises.push(
                  this.enhancedStorage.saveWordProgress(change.languageCode, change.data)
                );
              }
            }
            break;

          case 'gameState':
            // Take the latest game state change
            const latestGameState = changes[changes.length - 1];
            savePromises.push(
              this.enhancedStorage.saveGameState(latestGameState.data)
            );
            break;

          case 'sessionState':
            // Take the latest session state change
            const latestSessionState = changes[changes.length - 1];
            savePromises.push(
              this.enhancedStorage.saveSessionState(latestSessionState.data)
            );
            break;

          case 'achievements':
            // Take the latest achievements change
            const latestAchievements = changes[changes.length - 1];
            savePromises.push(
              this.enhancedStorage.saveAchievements(latestAchievements.data)
            );
            break;
        }
      }

      // Execute all saves in parallel
      await Promise.allSettled(savePromises);

      const saveEndTime = performance.now();
      const saveDuration = saveEndTime - saveStartTime;

      this.logger?.debug(`✅ Background save completed (${trigger})`, {
        changeCount: changesToSave.size,
        duration: `${saveDuration.toFixed(2)}ms`,
        operations: savePromises.length
      });

      // Update analytics
      this.updateSaveAnalytics(trigger, changesToSave.size, saveDuration);

    } catch (error) {
      this.logger?.error('❌ Background save failed:', error);
      
      // Re-queue failed changes with lower priority
      for (const [key, change] of changesToSave) {
        change.priority = 'low';
        this.pendingChanges.set(key, change);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Group changes by type for efficient batch processing
   */
  private groupChangesByType(changes: Map<string, PendingChange>): Map<string, PendingChange[]> {
    const grouped = new Map<string, PendingChange[]>();

    for (const change of changes.values()) {
      if (!grouped.has(change.type)) {
        grouped.set(change.type, []);
      }
      grouped.get(change.type)!.push(change);
    }

    // Sort by priority and timestamp within each type
    for (const changes of grouped.values()) {
      changes.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.timestamp - b.timestamp;
      });
    }

    return grouped;
  }

  /**
   * Update save analytics
   */
  private updateSaveAnalytics(trigger: string, changeCount: number, duration: number): void {
    // This would integrate with the existing analytics system
    if (typeof window !== 'undefined' && (window as any).__SAVE_ANALYTICS__) {
      (window as any).__SAVE_ANALYTICS__.recordBackgroundSave({
        trigger,
        changeCount,
        duration,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Force immediate save of all pending changes
   */
  async forceSave(): Promise<void> {
    await this.performSave('manual');
  }

  /**
   * Get current auto-save status
   */
  getStatus(): {
    enabled: boolean;
    pendingChanges: number;
    isProcessing: boolean;
    lastActionTime: number;
    config: AutoSaveConfig;
  } {
    return {
      enabled: this.config.enabled,
      pendingChanges: this.pendingChanges.size,
      isProcessing: this.isProcessing,
      lastActionTime: this.lastActionTime,
      config: { ...this.config }
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
    if (this.pendingChanges.size > 0) {
      this.logger?.debug('🧹 Performing final save before cleanup');
      await this.forceSave();
    }
  }
}

export default BackgroundAutoSave;