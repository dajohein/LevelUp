/**
 * Test utility to verify save operation optimization
 * This ensures we eliminated excessive saves and storage operations
 */

import { storageOrchestrator } from '../services/storageCoordinator';
import { store } from '../store/store';
import { addCorrectAnswer } from '../store/sessionSlice';
import { logger } from '../services/logger';

export const testSaveOptimization = async () => {
  logger.info('🎯 Testing Save Operation Optimization');

  const results = {
    testsPassed: 0,
    testsTotal: 2,
    issues: [] as string[],
  };

  // Test 1: Single answer should trigger minimal background operations
  try {
    const beforeStats = await storageOrchestrator.getStatistics();
    const initialPending = beforeStats?.backgroundAutoSave?.pendingChanges || 0;

    // Simulate answering a question correctly
    store.dispatch(addCorrectAnswer({}));

    // Wait for background processing
    await new Promise(resolve => setTimeout(resolve, 250));

    const afterStats = await storageOrchestrator.getStatistics();
    const currentPending = afterStats?.backgroundAutoSave?.pendingChanges || 0;

    // Since we have background processing, pending changes should be managed
    if (currentPending <= initialPending + 1) {
      results.testsPassed++;
      logger.info('✅ Answer submission optimization test passed');
      logger.info(`   📊 Background operations efficiently managed`);
    } else {
      results.issues.push(`Too many pending operations: ${currentPending} (was ${initialPending})`);
      logger.warn(`⚠️ Answer submission triggered excessive background operations`);
    }
  } catch (error) {
    results.issues.push(`Answer submission test failed: ${error}`);
    logger.error('❌ Answer submission test failed:', error);
  }

  // Test 2: Verify storage coordinator responsiveness
  try {
    // Force save all pending operations
    await storageOrchestrator.saveCurrentState('immediate');

    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 100));

    const afterSave = await storageOrchestrator.getStatistics();
    const isProcessing = afterSave?.backgroundAutoSave?.isProcessing || false;

    // System should complete forced saves quickly
    if (!isProcessing) {
      results.testsPassed++;
      logger.info('✅ Storage coordinator force save test passed');
      logger.info(`   � Immediate save completed successfully`);
    } else {
      results.issues.push('Force save still processing after delay');
      logger.warn(`⚠️ Force save taking longer than expected`);
    }
  } catch (error) {
    results.issues.push(`Storage force save test failed: ${error}`);
    logger.error('❌ Storage force save test failed:', error);
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

  const finalStats = await storageOrchestrator.getStatistics();
  logger.info(`\n📊 Storage Statistics:`);
  logger.info(
    `   Background Auto-Save: ${finalStats?.backgroundAutoSave?.enabled ? 'enabled' : 'disabled'}`
  );
  logger.info(`   Pending Changes: ${finalStats?.backgroundAutoSave?.pendingChanges || 0}`);
  logger.info(`   Is Processing: ${finalStats?.backgroundAutoSave?.isProcessing || false}`);

  return {
    success: results.testsPassed === results.testsTotal,
    testsPassed: results.testsPassed,
    testsTotal: results.testsTotal,
    issues: results.issues,
    statistics: finalStats,
  };
};

// Global access for testing
if (typeof window !== 'undefined') {
  (window as any).testSaveOptimization = testSaveOptimization;
}
