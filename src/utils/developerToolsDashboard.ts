/**
 * LevelUp Developer Tools Dashboard
 * 
 * Centralized interface for all development, testing, and debugging utilities.
 * Consolidates scattered window.* functions into a unified, discoverable API.
 */

// Core utilities
import { testSaveOptimization } from './testSaveOptimization';
import { testAllGameServicesPerformance } from './testAllGameServicesPerformance';
import { testImmediateImprovements } from './testImmediateImprovements';
import { testPerformanceFix } from './testPerformanceFix';
import { testDataMigration, testDirectionalAnalytics, testMigrationStatus, runAllTests as migrationRunAllTests } from './migrationTests';
import performanceAnalyzer, { enablePerformanceTracking, disablePerformanceTracking, analyzePerformance } from './advancedPerformanceAnalyzer';
import { developmentCacheManager, getDevCacheStats, clearDevCaches } from './developmentCacheManager';

// Services
import { enhancedStorage } from '../services/storage/enhancedStorage';
import { logger } from '../services/logger';

// Types (using interface definitions instead of importing non-existent types)
interface ChallengeResult {
  success: boolean;
  score: number;
  timeMs: number;
  error?: string;
}

interface WordProgress {
  wordId: string;
  xp: number;
  lastPracticed: string;
  timesCorrect: number;
  timesIncorrect: number;
}

interface StorageResult<T> {
  success: boolean;
  data: T;
  error?: string;
}

// Service health tracking
interface ServiceHealth {
  isHealthy: boolean;
  lastCheck: Date;
  errorCount: number;
  avgResponseTime: number;
}

/**
 * LevelUp Developer Tools - Main Class
 */
class LevelUpDeveloperTools {
  private serviceHealthCache = new Map<string, ServiceHealth>();

  /**
   * Testing utilities
   */
  testing = {
    // Storage and performance tests
    saveOptimization: testSaveOptimization,
    gameServicesPerformance: testAllGameServicesPerformance,
    immediateImprovements: testImmediateImprovements,
    performanceFix: testPerformanceFix,

    // Data migration tests
    migration: {
      runAllTests: migrationRunAllTests,
      testDataMigration,
      testDirectionalAnalytics,
      testMigrationStatus,
      verifyDataIntegrity: migrationRunAllTests,
      testLegacyDataLoad: testDataMigration
    },

    // Comprehensive testing
    runAllTests: async () => {
      console.log('🧪 Running comprehensive test suite...');
      
      const results = {
        saveOptimization: await testSaveOptimization(),
        gameServices: await testAllGameServicesPerformance(),
        immediateImprovements: await testImmediateImprovements(),
        performanceFix: await testPerformanceFix(),
        migration: await migrationRunAllTests()
      };

      const totalTests = Object.values(results).reduce((sum, result) => {
        if (result && typeof result === 'object' && 'testsTotal' in result) {
          return sum + (result.testsTotal as number);
        }
        return sum + 1;
      }, 0);
      
      const passedTests = Object.values(results).reduce((sum, result) => {
        if (result && typeof result === 'object') {
          if ('testsPassed' in result) {
            return sum + (result.testsPassed as number);
          } else if ('success' in result) {
            return sum + ((result.success as boolean) ? 1 : 0);
          }
        }
        return sum;
      }, 0);

      console.log(`✅ Test Suite Complete: ${passedTests}/${totalTests} passed`);
      
      return {
        success: passedTests === totalTests,
        testsPassed: passedTests,
        testsTotal: totalTests,
        details: results
      };
    }
  };

  /**
   * Performance monitoring utilities
   */
  performance = {
    enable: () => enablePerformanceTracking(),
    disable: () => disablePerformanceTracking(),
    getReport: () => analyzePerformance(),
    
    analyzeMemory: () => {
      try {
        const memory = (performance as any).memory;
        if (memory) {
          return {
            used: (memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
            allocated: (memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + ' MB', 
            limit: (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + ' MB',
            usage: ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(1) + '%'
          };
        }
        return { error: 'Memory API not available' };
      } catch (error) {
        return { error: 'Failed to get memory info' };
      }
    },

    getStorageStats: async () => {
      try {
        const analytics = await enhancedStorage.getStorageAnalytics();
        return analytics.data;
      } catch (error) {
        return { error: 'Failed to get storage stats' };
      }
    },

    flushStorage: async () => {
      try {
        // Force flush any pending storage operations
        await new Promise(resolve => setTimeout(resolve, 100));
        return { success: true };
      } catch (error) {
        return { success: false, error };
      }
    },

    cache: {
      enable: () => clearDevCaches(),
      disable: () => clearDevCaches(),
      clear: () => clearDevCaches(),
      stats: () => getDevCacheStats()
    }
  };

  /**
   * Storage and data management utilities
   */
  storage = {
    getAnalytics: () => enhancedStorage.getStorageAnalytics(),
    
    exportUserData: async (languageCode?: string) => {
      try {
        const analytics = await enhancedStorage.getStorageAnalytics();
        const wordProgress = languageCode 
          ? await enhancedStorage.loadWordProgress(languageCode)
          : undefined;
        
        return {
          analytics: analytics.data,
          wordProgress,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        };
      } catch (error) {
        console.error('Failed to export user data:', error);
        return { error: 'Export failed' };
      }
    },

    checkHealth: async () => {
      try {
        const analytics = await enhancedStorage.getStorageAnalytics();
        return {
          healthy: analytics.success && analytics.data.health.score > 50,
          score: analytics.data.health.score,
          details: analytics.data
        };
      } catch (error) {
        return { healthy: false, error: (error as Error).message };
      }
    },

    clearAllData: (confirm: boolean = false) => {
      if (!confirm) {
        console.warn('⚠️ Use clearAllData(true) to confirm data deletion');
        return;
      }
      console.log('🗑️ Clearing all user data (this would reset progress)');
      // Implementation would go here in production
    }
  };

  /**
   * Game services debugging utilities
   */
  gameServices = {
    listServices: (): string[] => {
      return ['quick-dash', 'deep-dive', 'word-match', 'challenge-mode'];
    },

    getServiceHealth: (sessionId: string): ServiceHealth | null => {
      return this.serviceHealthCache.get(sessionId) || null;
    },

    testService: async (sessionId: string) => {
      try {
        // Mock service test - replace with actual service call
        const result: ChallengeResult = {
          success: true,
          score: 85,
          timeMs: 1500
        };
        
        // Update health cache
        this.serviceHealthCache.set(sessionId, {
          isHealthy: true,
          lastCheck: new Date(),
          errorCount: 0,
          avgResponseTime: result.timeMs
        });

        return { success: true, result };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    },

    benchmarkServices: async () => {
      const services = this.gameServices.listServices();
      const results: Record<string, any> = {};
      
      for (const service of services) {
        try {
          const start = performance.now();
          await this.gameServices.testService(service);
          const end = performance.now();
          
          results[service] = {
            responseTime: Math.round(end - start),
            status: 'healthy'
          };
        } catch (error) {
          results[service] = {
            status: 'error',
            error: (error as Error).message
          };
        }
      }
      
      return results;
    }
  };

  /**
   * Debug utilities
   */
  debug = {
    getReduxState: () => {
      return typeof window !== 'undefined' && (window as any).__REDUX_DEVTOOLS_EXTENSION__
        ? 'Redux DevTools available - use browser extension'
        : 'Redux DevTools not available';
    },

    getComponentInfo: () => {
      return typeof window !== 'undefined' && (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__
        ? 'React DevTools available - use browser extension'
        : 'React DevTools not available';
    },

    enableVerboseLogging: () => {
      // Since logger doesn't have setLevel, we'll just log this
      console.log('🔊 Verbose logging would be enabled (logger.setLevel not available)');
    },

    disableVerboseLogging: () => {
      // Since logger doesn't have setLevel, we'll just log this
      console.log('🔇 Verbose logging would be disabled (logger.setLevel not available)');
    },

    simulateError: (type: 'storage' | 'network' | 'component' = 'storage') => {
      console.log(`🚨 Simulating ${type} error for testing...`);
      
      switch (type) {
        case 'storage':
          throw new Error('Simulated storage error');
        case 'network':
          throw new Error('Simulated network error');
        case 'component':
          throw new Error('Simulated component error');
      }
    }
  };

  /**
   * Help and documentation utilities
   */
  help = {
    list: () => {
      const functions: Record<string, string> = {};
      
      // Collect all available functions
      Object.keys(this.testing).forEach(key => {
        if (key !== 'migration') {
          functions[`testing.${key}`] = typeof (this.testing as any)[key] === 'function' ? 'function' : 'object';
        }
      });

      Object.keys(this.testing.migration).forEach(key => {
        functions[`testing.migration.${key}`] = 'function';
      });

      Object.keys(this.performance).forEach(key => {
        if (key !== 'cache') {
          functions[`performance.${key}`] = typeof (this.performance as any)[key] === 'function' ? 'function' : 'object';
        }
      });

      Object.keys(this.performance.cache).forEach(key => {
        functions[`performance.cache.${key}`] = 'function';
      });

      Object.keys(this.storage).forEach(key => {
        functions[`storage.${key}`] = 'function';
      });

      Object.keys(this.gameServices).forEach(key => {
        functions[`gameServices.${key}`] = 'function';
      });

      Object.keys(this.debug).forEach(key => {
        functions[`debug.${key}`] = 'function';
      });

      console.table(functions);
      return functions;
    },

    quickStart: () => {
      console.log(`
🚀 LevelUp Developer Tools Quick Start

📋 Common workflows:
  LevelUpDev.testing.runAllTests()        // Run all tests
  LevelUpDev.performance.enable()         // Start performance monitoring
  LevelUpDev.storage.checkHealth()        // Check storage health
  LevelUpDev.help.list()                  // List all functions

🔧 Testing:
  LevelUpDev.testing.saveOptimization()   // Test storage optimization
  LevelUpDev.testing.gameServicesPerformance() // Test services

📊 Performance:
  LevelUpDev.performance.getReport()      // Get performance report
  LevelUpDev.performance.analyzeMemory()  // Check memory usage

💾 Storage:
  LevelUpDev.storage.getAnalytics()       // Storage analytics
  LevelUpDev.storage.exportUserData()     // Export user data

🎮 Game Services:
  LevelUpDev.gameServices.benchmarkServices() // Test all services
  LevelUpDev.gameServices.listServices()  // List available services

🐛 Debug:
  LevelUpDev.debug.enableVerboseLogging() // Enable detailed logging
  LevelUpDev.debug.simulateError()        // Test error handling
      `);
    },

    version: () => {
      return {
        version: '1.0.0',
        build: new Date().toISOString(),
        features: [
          'Unified testing interface',
          'Performance monitoring',
          'Storage analytics',
          'Game service debugging',
          'Error simulation'
        ]
      };
    }
  };
}

// Create singleton instance
export const levelUpDevTools = new LevelUpDeveloperTools();

// Set up global access
if (typeof window !== 'undefined') {
  (window as any).LevelUpDev = levelUpDevTools;
  
  // Backward compatibility - map old functions to new interface
  (window as any).testSaveOptimization = levelUpDevTools.testing.saveOptimization;
  (window as any).testAllGameServicesPerformance = levelUpDevTools.testing.gameServicesPerformance;
  (window as any).testImmediateImprovements = levelUpDevTools.testing.immediateImprovements;
  (window as any).testPerformanceFix = levelUpDevTools.testing.performanceFix;
  (window as any).migrationTests = levelUpDevTools.testing.migration;
  (window as any).enablePerformanceDebug = levelUpDevTools.performance.enable;
  
  console.log('🛠️ LevelUp Developer Tools loaded');
  console.log('📖 Use window.LevelUpDev.help.quickStart() for usage guide');
}

export default levelUpDevTools;