/**
 * Phase 1 Verification Tests
 * 
 * Quick tests to verify the enhanced storage system is working correctly
 */

import { enhancedStorage, storageUtils } from '../services/storage';

export const verifyPhase1Implementation = async (): Promise<{
  success: boolean;
  results: Record<string, any>;
  errors: string[];
}> => {
  const results: Record<string, any> = {};
  const errors: string[] = [];

  try {
    console.log('🧪 Starting Phase 1 verification tests...');

    // Test 1: Basic storage operations
    console.log('📝 Test 1: Basic storage operations');
    const testData = {
      word1: { 
        wordId: 'word1', 
        xp: 100, 
        timesCorrect: 5, 
        timesIncorrect: 1, 
        lastPracticed: new Date().toISOString() 
      },
      word2: { 
        wordId: 'word2', 
        xp: 150, 
        timesCorrect: 8, 
        timesIncorrect: 0, 
        lastPracticed: new Date().toISOString() 
      }
    };

    const saveResult = await enhancedStorage.saveWordProgress('test_lang', testData);
    results.basicSave = saveResult.success;
    
    if (!saveResult.success) {
      errors.push(`Save failed: ${saveResult.error}`);
    }

    const loadResult = await enhancedStorage.loadWordProgress('test_lang');
    results.basicLoad = loadResult.success && Object.keys(loadResult.data || {}).length === 2;
    
    if (!loadResult.success) {
      errors.push(`Load failed: ${loadResult.error}`);
    }

    // Test 2: Performance testing
    console.log('⚡ Test 2: Performance testing');
    try {
      const perfResults = await storageUtils.testStoragePerformance();
      results.performance = {
        writeTime: perfResults.writeTime,
        readTime: perfResults.readTime,
        compressionRatio: perfResults.compressionRatio
      };
      results.performanceTest = perfResults.writeTime < 100 && perfResults.readTime < 50;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Performance test failed: ${errorMessage}`);
      results.performanceTest = false;
    }

    // Test 3: Storage health check
    console.log('🏥 Test 3: Storage health check');
    try {
      const health = await enhancedStorage.getStorageHealth();
      results.healthCheck = health.status !== 'unhealthy';
      results.healthDetails = health.details;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Health check failed: ${errorMessage}`);
      results.healthCheck = false;
    }

    // Test 4: Batch operations
    console.log('📦 Test 4: Batch operations');
    try {
      const batchData = {
        'lang1': { word1: testData.word1 },
        'lang2': { word2: testData.word2 }
      };
      
      const batchSaveResult = await enhancedStorage.saveMultipleLanguageProgress(batchData);
      const batchLoadResult = await enhancedStorage.loadMultipleLanguageProgress(['lang1', 'lang2']);
      
      results.batchOperations = batchSaveResult.success && batchLoadResult.success;
      
      if (!batchSaveResult.success) {
        errors.push(`Batch save failed: ${batchSaveResult.error}`);
      }
      if (!batchLoadResult.success) {
        errors.push(`Batch load failed: ${batchLoadResult.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Batch operations failed: ${errorMessage}`);
      results.batchOperations = false;
    }

    // Test 5: Storage statistics
    console.log('📊 Test 5: Storage statistics');
    try {
      const stats = await enhancedStorage.getStorageStats();
      results.statistics = {
        totalOperations: stats.totalOperations,
        averageResponseTime: stats.averageResponseTime,
        hitRate: stats.hitRate
      };
      results.statisticsTest = stats.totalOperations > 0;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Statistics test failed: ${errorMessage}`);
      results.statisticsTest = false;
    }

    // Cleanup test data
    console.log('🧹 Cleaning up test data');
    await enhancedStorage.clearWordProgress('test_lang');
    await enhancedStorage.clearWordProgress('lang1');
    await enhancedStorage.clearWordProgress('lang2');

    const allTestsPassed = Object.values(results).every(result => 
      typeof result === 'boolean' ? result : true
    );

    console.log('✅ Phase 1 verification complete');
    
    return {
      success: allTestsPassed && errors.length === 0,
      results,
      errors
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Verification failed: ${errorMessage}`);
    return {
      success: false,
      results,
      errors
    };
  }
};

// Export for easy testing
export default verifyPhase1Implementation;