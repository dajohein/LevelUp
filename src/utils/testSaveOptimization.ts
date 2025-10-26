/**
 * Test utility to verify save operation optimization
 * This ensures we eliminated excessive saves and storage operations
 */

import { storageOrchestrator } from '../services/storageOrchestrator';
import { store } from '../store/store';
import { checkAnswer } from '../store/gameSlice';
import { addCorrectAnswer, addIncorrectAnswer } from '../store/sessionSlice';
import { logger } from '../services/logger';

export const testSaveOptimization = async () => {
  logger.info('🎯 Testing Save Operation Optimization');

  const results = {
    beforeStats: storageOrchestrator.getStatistics(),
    testsPassed: 0,
    testsTotal: 2,
    issues: [] as string[]
  };

  // Test 1: Single answer should trigger minimal queue operations
  try {
    const initialQueueLength = results.beforeStats.queueLength;
    
    // Simulate answering a question correctly
    store.dispatch(addCorrectAnswer({}));
    
    // Wait for debounced operations
    await new Promise(resolve => setTimeout(resolve, 250));
    
    const newStats = storageOrchestrator.getStatistics();
    const queueIncrease = newStats.queueLength - initialQueueLength;
    
    if (queueIncrease <= 1) {
      results.testsPassed++;
      logger.info('✅ Answer submission optimization test passed');
      logger.info(`   📊 Queue operations increased by only ${queueIncrease} (optimal: ≤1)`);
    } else {
      results.issues.push(`Too many queue operations: ${queueIncrease} (should be ≤1)`);
      logger.warn(`⚠️ Answer submission triggered ${queueIncrease} queue operations (too many)`);
    }
  } catch (error) {
    results.issues.push(`Answer submission test failed: ${error}`);
    logger.error('❌ Answer submission test failed:', error);
  }

  // Test 2: Verify storage orchestrator responsiveness
  try {
    const beforeFlush = storageOrchestrator.getStatistics();
    
    // Force flush all pending saves
    await storageOrchestrator.flush();
    
    const afterFlush = storageOrchestrator.getStatistics();
    
    if (afterFlush.queueLength === 0) {
      results.testsPassed++;
      logger.info('✅ Storage orchestrator flush test passed');
      logger.info(`   📈 Queue cleared successfully: ${beforeFlush.queueLength} → ${afterFlush.queueLength}`);
    } else {
      results.issues.push(`Queue not properly cleared: ${afterFlush.queueLength} remaining`);
      logger.warn(`⚠️ Queue not fully processed: ${afterFlush.queueLength} operations remaining`);
    }
  } catch (error) {
    results.issues.push(`Storage flush test failed: ${error}`);
    logger.error('❌ Storage flush test failed:', error);
  }

  // Summary
  logger.info(`\n🏁 Save Optimization Test Complete:`);
  logger.info(`   ✅ Tests passed: ${results.testsPassed}/${results.testsTotal}`);
  
  if (results.issues.length > 0) {
    logger.warn(`   ❌ Issues found:`);
    results.issues.forEach(issue => logger.warn(`      - ${issue}`));
  } else {
    logger.info(`   🎉 All tests passed - save optimization is working!`);
  }

  const finalStats = storageOrchestrator.getStatistics();
  logger.info(`\n📊 Storage Statistics:`);
  logger.info(`   Queue length: ${finalStats.queueLength}`);
  logger.info(`   Is processing: ${finalStats.isProcessing}`);
  logger.info(`   Last saves: ${Object.keys(finalStats.lastSaves).length} operations tracked`);

  return {
    success: results.testsPassed === results.testsTotal,
    testsPassed: results.testsPassed,
    testsTotal: results.testsTotal,
    issues: results.issues,
    statistics: finalStats
  };
};

// Global access for testing
if (typeof window !== 'undefined') {
  (window as any).testSaveOptimization = testSaveOptimization;
}