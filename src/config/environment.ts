/**
 * Environment Configuration for Server-Side Storage
 *
 * Refactored to be env-first (Twelve-Factor): configuration via `import.meta.env`
 * with safe defaults. Hostname heuristics removed in favor of explicit envs.
 */

export interface EnvironmentConfig {
  apiBaseUrl: string;
  enableRemoteStorage: boolean;
  enableLocalFallback: boolean;
  debugMode: boolean;
  storageEndpoints: {
    storage: string;
    users: string;
  };
  cacheBusting: {
    enabled: boolean;
    autoCleanOnStart: boolean;
    clearServiceWorkerCache: boolean;
    clearApplicationCache: boolean;
    clearStorageCache: boolean;
    addTimestampToRequests: boolean;
    logCacheOperations: boolean;
  };
}

// Parse boolean-like envs
function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
}

// Safe environment reader: prefers window.__APP_ENV (set in main.tsx),
// falls back to process.env for tests and Node contexts.
function getEnv(name: string): string | undefined {
  const w: any = typeof window !== 'undefined' ? (window as any) : undefined;
  if (w && w.__APP_ENV && typeof w.__APP_ENV[name] !== 'undefined') {
    return w.__APP_ENV[name];
  }
  if (typeof process !== 'undefined' && (process as any).env && typeof (process as any).env[name] !== 'undefined') {
    return (process as any).env[name];
  }
  return undefined;
}

// Get configuration based on environment variables (with safe defaults)
export function getEnvironmentConfig(): EnvironmentConfig {
  const apiBaseUrl = getEnv('VITE_API_BASE_URL') || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');
  const enableRemoteStorage = parseBool(getEnv('VITE_ENABLE_REMOTE_STORAGE'), true);
  const enableLocalFallback = parseBool(getEnv('VITE_ENABLE_LOCAL_FALLBACK'), true);
  const debugMode = parseBool(getEnv('VITE_DEBUG_MODE'), false);

  const storage = getEnv('VITE_STORAGE_ENDPOINT_STORAGE') || '/api/storage';
  const users = getEnv('VITE_STORAGE_ENDPOINT_USERS') || '/api/users';

  const cacheEnabled = parseBool(getEnv('VITE_CACHE_ENABLED'), false);
  const cacheAutoClean = parseBool(getEnv('VITE_CACHE_AUTO_CLEAN_ON_START'), false);
  const cacheClearSW = parseBool(getEnv('VITE_CACHE_CLEAR_SW'), false);
  const cacheClearApp = parseBool(getEnv('VITE_CACHE_CLEAR_APP'), false);
  const cacheClearStorage = parseBool(getEnv('VITE_CACHE_CLEAR_STORAGE'), false);
  const cacheAddTimestamp = parseBool(getEnv('VITE_CACHE_ADD_TIMESTAMP'), false);
  const cacheLogOps = parseBool(getEnv('VITE_CACHE_LOG_OPERATIONS'), false);

  return {
    apiBaseUrl,
    enableRemoteStorage,
    enableLocalFallback,
    debugMode,
    storageEndpoints: {
      storage,
      users,
    },
    cacheBusting: {
      enabled: cacheEnabled,
      autoCleanOnStart: cacheAutoClean,
      clearServiceWorkerCache: cacheClearSW,
      clearApplicationCache: cacheClearApp,
      clearStorageCache: cacheClearStorage,
      addTimestampToRequests: cacheAddTimestamp,
      logCacheOperations: cacheLogOps,
    },
  };
}

// Export the current environment config
export const environmentConfig = getEnvironmentConfig();

// Helper to get test config (used in tests)
export const getTestConfig = (): EnvironmentConfig => ({
  apiBaseUrl: 'http://localhost:3001',
  enableRemoteStorage: false,
  enableLocalFallback: true,
  debugMode: true,
  storageEndpoints: {
    storage: '/api/storage',
    users: '/api/users',
  },
  cacheBusting: {
    enabled: false,
    autoCleanOnStart: false,
    clearServiceWorkerCache: false,
    clearApplicationCache: false,
    clearStorageCache: false,
    addTimestampToRequests: false,
    logCacheOperations: false,
  },
});

// Environment detection helpers (approximate; primarily for logging levels)
export const isDevelopment = parseBool(getEnv('VITE_DEBUG_MODE'), false);
export const isProduction = !isDevelopment;
export const isTest = false; // Set programmatically in tests

// Storage tier configuration based on environment
export function getStorageTierConfig() {
  const config = getEnvironmentConfig();

  return {
    memory: {
      enabled: true,
      maxSize: 50 * 1024 * 1024, // 50MB
      ttl: 60 * 60 * 1000, // 1 hour
      priority: 3,
    },
    local: {
      enabled: true,
      maxSize: 200 * 1024 * 1024, // 200MB
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      priority: 2,
    },
    indexedDB: {
      enabled: true,
      maxSize: 500 * 1024 * 1024, // 500MB
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
      priority: 1,
    },
    remote: {
      enabled: config.enableRemoteStorage,
      maxSize: 1024 * 1024 * 1024, // 1GB
      ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
      priority: 0,
    },
  };
}

// Logging configuration
export function getLoggingConfig() {
  return {
    level: isDevelopment ? 'debug' : 'warn',
    enableStorageLogs: isDevelopment,
    enablePerformanceLogs: isDevelopment,
    enableRemoteLogging: isProduction,
  };
}
