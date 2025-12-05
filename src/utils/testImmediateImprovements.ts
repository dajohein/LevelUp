/**
 * Test script for immediate improvements
 * Verifies IndexedDB integration, storage analytics, tiered storage, and module-scoped quiz generation
 */

import { enhancedStorage } from '../services/storage/enhancedStorage';
import { indexedDBStorage } from '../services/storage/indexedDB';
import { tieredStorage } from '../services/storage/tieredStorage';
import { testModuleScopedQuizGeneration } from './testModuleScopedQuiz';

export async function testImmediateImprovements() {
  console.log('🧪 Testing Immediate Improvements...');

  const results = {
    indexedDBIntegration: false,
    storageAnalytics: false,
    tieredStorage: false,
    moduleScopedQuiz: false,
  };

  try {
    // Test 1: IndexedDB Integration
    console.log('\n1️⃣ Testing IndexedDB Integration...');
    const testData = { test: 'IndexedDB integration', timestamp: Date.now() };
    const setResult = await indexedDBStorage.set('test_key', testData, 'test');

    if (setResult.success) {
      const getResult = await indexedDBStorage.get('test_key');
      if (getResult.success && getResult.data) {
        console.log('✅ IndexedDB integration working');
        results.indexedDBIntegration = true;

        // Cleanup test data
        await indexedDBStorage.delete('test_key');
      }
    } else {
      console.log('❌ IndexedDB integration failed:', setResult.error);
    }

    // Test 3: Storage Analytics
    // Test 2: Storage Analytics
    console.log('\n2️⃣ Testing Storage Analytics...');
    const analyticsResult = await enhancedStorage.getStorageAnalytics();
    if (analyticsResult.success) {
      console.log('✅ Storage analytics working');
      console.log('   - Cache hit rate:', analyticsResult.data.cache.hitRate);
      console.log('   - Health score:', analyticsResult.data.health.score);
      console.log('   - Total operations:', analyticsResult.data.internal.operations);
      results.storageAnalytics = true;
    } else {
      console.log('❌ Storage analytics failed:', analyticsResult.error);
    }

    // Test 3: Tiered Storage
    console.log('\n3️⃣ Testing Tiered Storage...');
    const tierTestData = { tier: 'test', data: 'tiered storage test' };
    const tierSetResult = await tieredStorage.setToTier('tier_test', tierTestData, 'indexedDB');

    if (tierSetResult.success) {
      const tierGetResult = await tieredStorage.getFromTier('tier_test', 'indexedDB');
      if (tierGetResult.success) {
        console.log('✅ Tiered storage with IndexedDB working');
        results.tieredStorage = true;

        // Cleanup
        await tieredStorage.delete('tier_test');
      }
    } else {
      console.log('❌ Tiered storage failed:', tierSetResult.error);
    }

    // Test 6: Module-Scoped Quiz Generation
    // Test 4: Module-Scoped Quiz Generation
    console.log('\n4️⃣ Testing Module-Scoped Quiz Generation...');
    try {
      await testModuleScopedQuizGeneration();
      console.log('✅ Module-scoped quiz generation working');
      results.moduleScopedQuiz = true;
    } catch (error) {
      console.log('❌ Module-scoped quiz generation failed:', (error as Error).message);
    }
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  }

  // Summary
  console.log('\n🎯 Test Results Summary:');
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;

  console.log('Passed: ' + passedTests + '/' + totalTests + ' tests');

  Object.entries(results).forEach(([test, passed]) => {
    console.log('   ' + (passed ? '✅' : '❌') + ' ' + test);
  });

  if (passedTests === totalTests) {
    console.log('\n🎉 All immediate improvements working perfectly!');
  } else {
    console.log('\n⚠️  ' + (totalTests - passedTests) + ' tests need attention');
  }

  return results;
}

// Export for console testing
if (typeof window !== 'undefined') {
  (window as any).testImmediateImprovements = testImmediateImprovements;
}
