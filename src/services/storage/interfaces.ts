/**
 * Storage Interface Abstractions
 *
 * Backend-ready storage interfaces that can be implemented for:
 * - localStorage (current)
 * - IndexedDB (browser)
 * - REST API (future backend)
 * - GraphQL (future backend)
 */

// Base storage operations that work for both local and remote storage
export interface StorageOperation<T = any> {
  type: 'read' | 'write' | 'delete' | 'batch';
  key: string;
  data?: T;
  options?: StorageOptions;
}

export interface StorageOptions {
  ttl?: number; // Time to live in milliseconds
  compress?: boolean; // Whether to compress data
  encrypt?: boolean; // Whether to encrypt data (for backend)
  priority?: 'low' | 'normal' | 'high';
  retries?: number; // Number of retry attempts
  timeout?: number; // Request timeout in ms
}

export interface StorageResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    size?: number;
    compressed?: boolean;
    cached?: boolean;
    timestamp?: number;
    optimistic?: boolean; // For optimistic updates
    operationId?: string; // For tracking operations
    tier?: string; // Which storage tier was used
    retrievalTime?: number; // Time taken to retrieve
    queueSize?: number; // Current queue size
    isProcessing?: boolean; // Whether operations are being processed
    deletedFromTiers?: string[]; // Tiers data was deleted from
    totalTiers?: number; // Total number of tiers checked
    successfulDeletions?: number; // Number of successful deletions
    [key: string]: any; // Allow additional metadata
  };
}

// Async storage interface - works for both local and remote
export interface AsyncStorageProvider {
  // Basic CRUD operations
  get<T>(key: string, options?: StorageOptions): Promise<StorageResult<T>>;
  set<T>(key: string, data: T, options?: StorageOptions): Promise<StorageResult<void>>;
  delete(key: string, options?: StorageOptions): Promise<StorageResult<void>>;
  exists(key: string): Promise<boolean>;

  // Batch operations for efficiency
  getBatch<T>(keys: string[], options?: StorageOptions): Promise<StorageResult<Record<string, T>>>;
  setBatch<T>(data: Record<string, T>, options?: StorageOptions): Promise<StorageResult<void>>;

  // Storage management
  clear(pattern?: string): Promise<StorageResult<void>>;
  getSize(): Promise<StorageResult<number>>;
  getKeys(pattern?: string): Promise<StorageResult<string[]>>;

  // Health and monitoring
  healthCheck(): Promise<StorageResult<{ status: 'healthy' | 'degraded' | 'unhealthy' }>>;
}

// Tiered storage interface for hot/warm/cold data
export interface TieredStorageProvider extends AsyncStorageProvider {
  // Tier management
  promote(key: string, tier: StorageTier): Promise<StorageResult<void>>;
  demote(key: string, tier: StorageTier): Promise<StorageResult<void>>;
  getTier(key: string): Promise<StorageResult<StorageTier>>;

  // Tier-specific operations
  getFromTier<T>(
    key: string,
    tier: StorageTier,
    options?: StorageOptions
  ): Promise<StorageResult<T>>;
  setToTier<T>(
    key: string,
    data: T,
    tier: StorageTier,
    options?: StorageOptions
  ): Promise<StorageResult<void>>;

  // Cache warming and management
  warmCache(keys: string[]): Promise<StorageResult<void>>;
  evictFromTier(tier: StorageTier, count?: number): Promise<StorageResult<string[]>>;
}

export type StorageTier = 'memory' | 'local' | 'indexedDB' | 'remote' | 'archive';

// Cache interface with intelligent invalidation
export interface CacheProvider {
  // Cache operations
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, data: T, ttl?: number, dependencies?: string[]): Promise<void>;
  invalidate(key: string): Promise<void>;
  invalidateByDependency(dependency: string): Promise<void>;
  invalidateByPattern(pattern: string): Promise<void>;

  // Cache statistics
  getStats(): Promise<CacheStats>;
  getHitRate(): Promise<number>;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  memoryUsage: number;
  oldestEntry: number;
  newestEntry: number;
}

// Compression interface for data optimization
export interface CompressionProvider {
  compress<T>(data: T): Promise<CompressedData>;
  decompress<T>(compressed: CompressedData): Promise<T>;
  getCompressionRatio(data: any): Promise<number>;
  isCompressionWorthwhile(data: any): Promise<boolean>;
}

export interface CompressedData {
  data: string | Uint8Array;
  algorithm: 'gzip' | 'lz4' | 'brotli' | 'none';
  originalSize: number;
  compressedSize: number;
  checksum?: string;
}

// Synchronization interface for eventual backend integration
export interface SyncProvider {
  // Sync operations
  sync(keys?: string[]): Promise<SyncResult>;
  forcePush(keys: string[]): Promise<SyncResult>;
  forcePull(keys: string[]): Promise<SyncResult>;

  // Conflict resolution
  resolveConflicts(conflicts: ConflictData[]): Promise<ConflictResolution[]>;

  // Sync status
  getSyncStatus(): Promise<SyncStatus>;
  getLastSyncTime(): Promise<number>;
}

export interface SyncResult {
  success: boolean;
  syncedKeys: string[];
  conflicts: ConflictData[];
  errors: string[];
  timestamp: number;
}

export interface ConflictData {
  key: string;
  localData: any;
  remoteData: any;
  localTimestamp: number;
  remoteTimestamp: number;
}

export interface ConflictResolution {
  key: string;
  resolution: 'local' | 'remote' | 'merge' | 'manual';
  mergedData?: any;
}

export interface SyncStatus {
  status: 'synced' | 'syncing' | 'conflict' | 'offline' | 'error';
  pendingOperations: number;
  lastSyncTime: number;
  nextSyncTime?: number;
}

// Event system for storage notifications
export interface StorageEventListener {
  onDataChanged?: (key: string, newData: any, oldData: any) => void;
  onCacheHit?: (key: string) => void;
  onCacheMiss?: (key: string) => void;
  onSyncComplete?: (result: SyncResult) => void;
  onConflict?: (conflict: ConflictData) => void;
  onError?: (error: string, operation: StorageOperation) => void;
}

export interface EventEmitter {
  addEventListener(listener: StorageEventListener): () => void;
  removeEventListener(listener: StorageEventListener): void;
  emit(event: string, ...args: any[]): void;
}

// Backend-ready authentication interface
export interface AuthProvider {
  getAuthToken(): Promise<string | null>;
  refreshToken(): Promise<string | null>;
  isAuthenticated(): Promise<boolean>;
  getUserId(): Promise<string | null>;
}

// Configuration for different storage backends
export interface StorageConfig {
  // Provider configuration
  provider: 'localStorage' | 'indexedDB' | 'restAPI' | 'graphQL';

  // Connection settings (for backend)
  endpoint?: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;

  // Feature flags
  enableCompression?: boolean;
  enableEncryption?: boolean;
  enableCaching?: boolean;
  enableSync?: boolean;

  // Performance settings
  batchSize?: number;
  cacheSize?: number;
  cacheTtl?: number;
  compressionThreshold?: number;

  // Tier configuration
  tiers?: {
    memory?: { maxSize: number; ttl: number };
    local?: { maxSize: number; ttl: number };
    remote?: { endpoint: string; ttl: number };
    archive?: { endpoint: string; compression: boolean };
  };
}
