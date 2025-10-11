/**
 * Environment Configuration for Server-Side Storage
 * 
 * Manages configuration for local development vs. production deployment
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

// Development configuration (local testing)
const developmentConfig: EnvironmentConfig = {
  apiBaseUrl: window.location.origin,  // Use current origin with Vite proxy
  enableRemoteStorage: true,
  enableLocalFallback: true,
  debugMode: true,
  storageEndpoints: {
    storage: '/api/storage',
    users: '/api/users'
  },
  cacheBusting: {
    enabled: true,
    autoCleanOnStart: true,
    clearServiceWorkerCache: true,
    clearApplicationCache: true,
    clearStorageCache: true,
    addTimestampToRequests: true,
    logCacheOperations: true,
  }
};

// Production configuration (Vercel deployment)
const productionConfig: EnvironmentConfig = {
  apiBaseUrl: window.location.origin,
  enableRemoteStorage: true,
  enableLocalFallback: true, // Keep fallback for offline scenarios
  debugMode: false,
  storageEndpoints: {
    storage: '/api/storage',
    users: '/api/users'
  },
  cacheBusting: {
    enabled: false,
    autoCleanOnStart: false,
    clearServiceWorkerCache: false,
    clearApplicationCache: false,
    clearStorageCache: false,
    addTimestampToRequests: false,
    logCacheOperations: false,
  }
};

// Test configuration (unit testing) - Used programmatically in tests
const testConfig: EnvironmentConfig = {
  apiBaseUrl: 'http://localhost:3001',
  enableRemoteStorage: false,
  enableLocalFallback: true,
  debugMode: true,
  storageEndpoints: {
    storage: '/api/storage',
    users: '/api/users'
  },
  cacheBusting: {
    enabled: false,
    autoCleanOnStart: false,
    clearServiceWorkerCache: false,
    clearApplicationCache: false,
    clearStorageCache: false,
    addTimestampToRequests: false,
    logCacheOperations: false,
  }
};

// Get configuration based on environment
export function getEnvironmentConfig(): EnvironmentConfig {
  // Detect environment based on hostname and build context
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isCodespaces = window.location.hostname.includes('app.github.dev');
  const isVercel = window.location.hostname.includes('vercel.app') || window.location.hostname.includes('levelup');
  
  if (isLocalhost || isCodespaces) {
    return developmentConfig;
  } else if (isVercel) {
    return productionConfig;
  } else {
    return developmentConfig; // Default to development
  }
}

// Export the current environment config
export const environmentConfig = getEnvironmentConfig();

// Helper to get test config (used in tests)
export const getTestConfig = () => testConfig;

// Environment detection helpers
const isCodespaces = window.location.hostname.includes('app.github.dev');
export const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || isCodespaces;
export const isProduction = !isDevelopment && window.location.hostname.includes('vercel.app');
export const isTest = false; // Set programmatically in tests

// Storage tier configuration based on environment
export function getStorageTierConfig() {
  const config = getEnvironmentConfig();
  
  return {
    memory: {
      enabled: true,
      maxSize: 50 * 1024 * 1024, // 50MB
      ttl: 60 * 60 * 1000, // 1 hour
      priority: 3
    },
    local: {
      enabled: true,
      maxSize: 200 * 1024 * 1024, // 200MB
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      priority: 2
    },
    indexedDB: {
      enabled: true,
      maxSize: 500 * 1024 * 1024, // 500MB
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
      priority: 1
    },
    remote: {
      enabled: config.enableRemoteStorage,
      maxSize: 1024 * 1024 * 1024, // 1GB
      ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
      priority: 0
    }
  };
}

// Logging configuration
export function getLoggingConfig() {
  return {
    level: isDevelopment ? 'debug' : 'warn',
    enableStorageLogs: isDevelopment,
    enablePerformanceLogs: isDevelopment,
    enableRemoteLogging: isProduction
  };
}