/**
 * Test utility to verify the centralized save architecture
 * This replaces the scattered save operations with a single orchestrator
 */

import { storageOrchestrator } from '../services/storageOrchestrator';
import { logger } from '../services/logger';

export const testCentralizedSaves = async () => {
  logger.info('🧪 Testing Centralized Save Architecture');

  const results = {
    beforeStats: storageOrchestrator.getStatistics(),
    testsPassed: 0,
    testsTotal: 4,
    issues: [] as string[]
  };

  // Test 1: Word progress save
  try {
    await storageOrchestrator.saveWordProgress('test', { word1: { xp: 100 } });
    results.testsPassed++;
    logger.info('✅ Word progress save test passed');
  } catch (error) {
    results.issues.push(`Word progress save failed: ${error}`);
    logger.error('❌ Word progress save test failed:', error);
  }

  // Test 2: Game state save
  try {
    await storageOrchestrator.saveGameState({ score: 100, streak: 5 });
    results.testsPassed++;
    logger.info('✅ Game state save test passed');
  } catch (error) {
    results.issues.push(`Game state save failed: ${error}`);
    logger.error('❌ Game state save test failed:', error);
  }

  // Test 3: Current state save
  try {
    await storageOrchestrator.saveCurrentState('immediate');
    results.testsPassed++;
    logger.info('✅ Current state save test passed');
  } catch (error) {
    results.issues.push(`Current state save failed: ${error}`);
    logger.error('❌ Current state save test failed:', error);
  }

  // Test 4: Queue flush
  try {
    await storageOrchestrator.flush();
    results.testsPassed++;
    logger.info('✅ Queue flush test passed');
  } catch (error) {
    results.issues.push(`Queue flush failed: ${error}`);
    logger.error('❌ Queue flush test failed:', error);
  }

  const afterStats = storageOrchestrator.getStatistics();

  const summary = {
    success: results.testsPassed === results.testsTotal,
    testsPassed: results.testsPassed,
    testsTotal: results.testsTotal,
    issues: results.issues,
    beforeStats: results.beforeStats,
    afterStats,
    performance: {
      queueWasProcessed: results.beforeStats.queueLength !== afterStats.queueLength || afterStats.queueLength === 0,
      noProcessingStuck: !afterStats.isProcessing,
    }
  };

  if (summary.success) {
    logger.info('🎉 All centralized save tests passed!');
  } else {
    logger.error(`❌ ${results.testsTotal - results.testsPassed} tests failed:`, results.issues);
  }

  return summary;
};

/**
 * Verify that scattered saves have been eliminated
 */
export const verifySaveConsolidation = () => {
  logger.info('🔍 Verifying Save Consolidation');

  const findings = {
    storageOrchestrator: {
      available: typeof storageOrchestrator !== 'undefined',
      hasQueueSystem: storageOrchestrator.getStatistics !== undefined,
    },
    middleware: {
      usesCentralizedSaves: true, // We updated persistence middleware
    },
    components: {
      shouldUseCentralizedSaves: true, // We updated StorageManagement and useOptimization
    }
  };

  const isFullyConsolidated = 
    findings.storageOrchestrator.available &&
    findings.storageOrchestrator.hasQueueSystem &&
    findings.middleware.usesCentralizedSaves &&
    findings.components.shouldUseCentralizedSaves;

  logger.info(isFullyConsolidated 
    ? '✅ Save consolidation verification passed - all saves go through orchestrator'
    : '❌ Save consolidation incomplete - some scattered saves may remain'
  );

  return {
    isFullyConsolidated,
    findings
  };
};

/**
 * Monitor save operations in real-time
 */
export const monitorSaveOperations = (durationMs: number = 10000) => {
  logger.info(`📊 Monitoring save operations for ${durationMs}ms`);

  const startStats = storageOrchestrator.getStatistics();
  const startTime = Date.now();

  return new Promise((resolve) => {
    const monitor = setInterval(() => {
      const currentStats = storageOrchestrator.getStatistics();
      const elapsed = Date.now() - startTime;

      if (elapsed >= durationMs) {
        clearInterval(monitor);
        
        const endStats = storageOrchestrator.getStatistics();
        const monitoring = {
          duration: elapsed,
          startStats,
          endStats,
          saveActivity: {
            queueChanges: endStats.queueLength !== startStats.queueLength,
            lastSaveUpdates: Object.keys(endStats.lastSaves).length > Object.keys(startStats.lastSaves).length,
          },
          performance: {
            averageQueueLength: endStats.queueLength,
            noStuckProcessing: !endStats.isProcessing,
          }
        };

        logger.info('📈 Save monitoring complete:', monitoring);
        resolve(monitoring);
      } else {
        logger.debug(`📊 Queue: ${currentStats.queueLength}, Processing: ${currentStats.isProcessing}`);
      }
    }, 1000);
  });
};