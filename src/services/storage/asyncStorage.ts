/**
 * Async Storage Service with Optimistic Updates
 * 
 * Non-blocking storage operations with optimistic UI updates
 * Backend-ready: designed for eventual API integration
 */

import { AsyncStorageProvider, StorageOptions, StorageResult } from './interfaces';
import { tieredStorage } from './tieredStorage';
import { smartCache } from './cache';
import { logger } from '../logger';

interface QueuedOperation {
  id: string;
  type: 'write' | 'delete' | 'batch';
  key: string;
  data?: any;
  options?: StorageOptions;
  timestamp: number;
  retries: number;
  maxRetries: number;
  resolve: (result: StorageResult) => void;
  reject: (error: Error) => void;
}

interface OptimisticState {
  [key: string]: {
    data: any;
    timestamp: number;
    isPending: boolean;
    operationId: string;
  };
}

interface AsyncStorageConfig {
  maxQueueSize: number;        // Maximum operations in queue
  batchInterval: number;       // Batch processing interval in ms
  maxRetries: number;          // Maximum retry attempts
  optimisticTimeout: number;   // How long to keep optimistic data
  enableBatching: boolean;     // Enable batch operations
  enableOptimistic: boolean;   // Enable optimistic updates
}

const DEFAULT_CONFIG: AsyncStorageConfig = {
  maxQueueSize: 1000,
  batchInterval: 100,          // 100ms batching
  maxRetries: 3,
  optimisticTimeout: 10000,    // 10 seconds
  enableBatching: true,
  enableOptimistic: true,
};

export class AsyncStorageService implements AsyncStorageProvider {
  private config: AsyncStorageConfig;
  private operationQueue: QueuedOperation[] = [];
  private optimisticState: OptimisticState = {};
  private batchTimer?: NodeJS.Timeout;
  private isProcessing = false;
  private operationCounter = 0;

  constructor(config: Partial<AsyncStorageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startBatchProcessor();
  }

  /**
   * Get data with optimistic state consideration
   */
  async get<T>(key: string, options: StorageOptions = {}): Promise<StorageResult<T>> {
    // Check optimistic state first
    if (this.config.enableOptimistic && this.optimisticState[key]) {
      const optimistic = this.optimisticState[key];
      
      // Return optimistic data if still valid
      if (Date.now() - optimistic.timestamp < this.config.optimisticTimeout) {
        logger.debug(`⚡ Returning optimistic data for ${key}`);
        return {
          success: true,
          data: optimistic.data,
          metadata: {
            optimistic: true,
            operationId: optimistic.operationId,
          },
        };
      } else {
        // Clean up expired optimistic data
        delete this.optimisticState[key];
      }
    }

    // Fallback to actual storage
    return await tieredStorage.get<T>(key, options);
  }

  /**
   * Set data with optimistic update
   */
  async set<T>(key: string, data: T, options: StorageOptions = {}): Promise<StorageResult<void>> {
    const operationId = `set_${++this.operationCounter}_${Date.now()}`;
    
    // Optimistic update for immediate UI response
    if (this.config.enableOptimistic && options.priority !== 'low') {
      this.optimisticState[key] = {
        data,
        timestamp: Date.now(),
        isPending: true,
        operationId,
      };
      
      // Also update cache immediately
      await smartCache.set(key, data, options.ttl);
      
      logger.debug(`⚡ Optimistic update for ${key}`);
    }

    // Queue the actual storage operation
    return new Promise((resolve, reject) => {
      const operation: QueuedOperation = {
        id: operationId,
        type: 'write',
        key,
        data,
        options,
        timestamp: Date.now(),
        retries: 0,
        maxRetries: options.retries || this.config.maxRetries,
        resolve,
        reject,
      };

      this.enqueueOperation(operation);
    });
  }

  /**
   * Delete data with optimistic update
   */
  async delete(key: string, options: StorageOptions = {}): Promise<StorageResult<void>> {
    const operationId = `delete_${++this.operationCounter}_${Date.now()}`;
    
    // Optimistic delete
    if (this.config.enableOptimistic) {
      delete this.optimisticState[key];
      await smartCache.invalidate(key);
      
      logger.debug(`⚡ Optimistic delete for ${key}`);
    }

    // Queue the actual delete operation
    return new Promise((resolve, reject) => {
      const operation: QueuedOperation = {
        id: operationId,
        type: 'delete',
        key,
        options,
        timestamp: Date.now(),
        retries: 0,
        maxRetries: options.retries || this.config.maxRetries,
        resolve,
        reject,
      };

      this.enqueueOperation(operation);
    });
  }

  /**
   * Check if key exists (considers optimistic state)
   */
  async exists(key: string): Promise<boolean> {
    // Check optimistic state first
    if (this.optimisticState[key]) {
      return true;
    }

    return await tieredStorage.exists(key);
  }

  /**
   * Batch get operations
   */
  async getBatch<T>(keys: string[], options: StorageOptions = {}): Promise<StorageResult<Record<string, T>>> {
    const results: Record<string, T> = {};
    
    // Process each key individually (could be optimized further)
    for (const key of keys) {
      const result = await this.get<T>(key, options);
      if (result.success && result.data !== undefined) {
        results[key] = result.data;
      }
    }

    return { success: true, data: results };
  }

  /**
   * Batch set operations
   */
  async setBatch<T>(data: Record<string, T>, options: StorageOptions = {}): Promise<StorageResult<void>> {
    const operationId = `batch_${++this.operationCounter}_${Date.now()}`;
    
    // Optimistic updates for all keys
    if (this.config.enableOptimistic) {
      const timestamp = Date.now();
      
      for (const [key, value] of Object.entries(data)) {
        this.optimisticState[key] = {
          data: value,
          timestamp,
          isPending: true,
          operationId,
        };
        
        // Update cache
        await smartCache.set(key, value, options.ttl);
      }
      
      logger.debug(`⚡ Optimistic batch update for ${Object.keys(data).length} keys`);
    }

    // Queue batch operation
    return new Promise((resolve, reject) => {
      const operation: QueuedOperation = {
        id: operationId,
        type: 'batch',
        key: 'batch', // Placeholder
        data,
        options,
        timestamp: Date.now(),
        retries: 0,
        maxRetries: options.retries || this.config.maxRetries,
        resolve,
        reject,
      };

      this.enqueueOperation(operation);
    });
  }

  /**
   * Clear storage (not optimistic)
   */
  async clear(pattern?: string): Promise<StorageResult<void>> {
    // Clear optimistic state
    if (pattern) {
      const regex = new RegExp(pattern);
      Object.keys(this.optimisticState).forEach(key => {
        if (regex.test(key)) {
          delete this.optimisticState[key];
        }
      });
    } else {
      this.optimisticState = {};
    }

    return await tieredStorage.clear(pattern);
  }

  /**
   * Get storage size
   */
  async getSize(): Promise<StorageResult<number>> {
    return await tieredStorage.getSize();
  }

  /**
   * Get all keys
   */
  async getKeys(pattern?: string): Promise<StorageResult<string[]>> {
    return await tieredStorage.getKeys(pattern);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<StorageResult<{ status: 'healthy' | 'degraded' | 'unhealthy' }>> {
    const queueSize = this.operationQueue.length;
    const optimisticCount = Object.keys(this.optimisticState).length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (queueSize > this.config.maxQueueSize * 0.8) {
      status = 'degraded';
    }
    
    if (queueSize >= this.config.maxQueueSize) {
      status = 'unhealthy';
    }

    return {
      success: true,
      data: { status },
      metadata: {
        queueSize,
        optimisticCount,
        isProcessing: this.isProcessing,
      },
    };
  }

  /**
   * Flush all pending operations immediately
   */
  async flush(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    
    await this.processBatch();
  }

  /**
   * Get pending operations count
   */
  getPendingCount(): number {
    return this.operationQueue.length;
  }

  /**
   * Get optimistic state for debugging
   */
  getOptimisticState(): OptimisticState {
    return { ...this.optimisticState };
  }

  /**
   * Clear optimistic state for a key
   */
  clearOptimisticState(key: string): void {
    delete this.optimisticState[key];
  }

  // Private methods

  private enqueueOperation(operation: QueuedOperation): void {
    // Check queue size limit
    if (this.operationQueue.length >= this.config.maxQueueSize) {
      const error = new Error('Storage queue is full');
      operation.reject(error);
      logger.error('Storage queue overflow:', error);
      return;
    }

    this.operationQueue.push(operation);
    
    // Trigger immediate processing for high priority operations
    if (operation.options?.priority === 'high') {
      setImmediate(() => this.processBatch());
    }
  }

  private startBatchProcessor(): void {
    if (!this.config.enableBatching) return;

    const scheduleNext = () => {
      this.batchTimer = setTimeout(() => {
        this.processBatch().finally(scheduleNext);
      }, this.config.batchInterval);
    };

    scheduleNext();
  }

  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.operationQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    
    try {
      // Process operations in batches
      const batchSize = Math.min(50, this.operationQueue.length);
      const batch = this.operationQueue.splice(0, batchSize);
      
      logger.debug(`🔄 Processing batch of ${batch.length} storage operations`);
      
      // Group operations by type for efficiency
      const writeOps = batch.filter(op => op.type === 'write');
      const deleteOps = batch.filter(op => op.type === 'delete');
      const batchOps = batch.filter(op => op.type === 'batch');
      
      // Process writes
      await this.processWriteOperations(writeOps);
      
      // Process deletes
      await this.processDeleteOperations(deleteOps);
      
      // Process batch operations
      await this.processBatchOperations(batchOps);
      
    } catch (error) {
      logger.error('Error processing storage batch:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processWriteOperations(operations: QueuedOperation[]): Promise<void> {
    for (const op of operations) {
      try {
        const result = await tieredStorage.set(op.key, op.data, op.options);
        
        if (result.success) {
          // Clear optimistic state
          if (this.optimisticState[op.key]?.operationId === op.id) {
            delete this.optimisticState[op.key];
          }
          op.resolve(result);
        } else {
          await this.handleOperationFailure(op);
        }
      } catch (error) {
        await this.handleOperationError(op, error);
      }
    }
  }

  private async processDeleteOperations(operations: QueuedOperation[]): Promise<void> {
    for (const op of operations) {
      try {
        const result = await tieredStorage.delete(op.key, op.options);
        op.resolve(result);
      } catch (error) {
        await this.handleOperationError(op, error);
      }
    }
  }

  private async processBatchOperations(operations: QueuedOperation[]): Promise<void> {
    for (const op of operations) {
      try {
        const result = await tieredStorage.setBatch(op.data, op.options);
        
        if (result.success) {
          // Clear optimistic state for all keys in batch
          Object.keys(op.data).forEach(key => {
            if (this.optimisticState[key]?.operationId === op.id) {
              delete this.optimisticState[key];
            }
          });
        }
        
        op.resolve(result);
      } catch (error) {
        await this.handleOperationError(op, error);
      }
    }
  }

  private async handleOperationFailure(operation: QueuedOperation): Promise<void> {
    if (operation.retries < operation.maxRetries) {
      operation.retries++;
      this.operationQueue.unshift(operation); // Retry at front of queue
      logger.debug(`🔄 Retrying operation ${operation.id} (attempt ${operation.retries})`);
    } else {
      const error = new Error(`Operation failed after ${operation.maxRetries} retries`);
      operation.reject(error);
      
      // Revert optimistic state
      if (this.optimisticState[operation.key]?.operationId === operation.id) {
        delete this.optimisticState[operation.key];
      }
    }
  }

  private async handleOperationError(operation: QueuedOperation, error: any): Promise<void> {
    logger.error(`Storage operation ${operation.id} failed:`, error);
    await this.handleOperationFailure(operation);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }
    
    // Reject all pending operations
    this.operationQueue.forEach(op => {
      op.reject(new Error('Storage service is being destroyed'));
    });
    
    this.operationQueue = [];
    this.optimisticState = {};
  }
}

// Export singleton instance
export const asyncStorage = new AsyncStorageService();