/**
 * Updated test utility for simplified storage system with background auto-save
 * Tests that the intelligent action batching and background auto-save work correctly
 */

import { storageCoordinator } from '../services/storageCoordinator';
import { store } from '../store/store';
import { logger } from '../services/logger';

export const testSimplifiedBatching = async () => {
  logger.info('🎯 Testing Simplified Storage System with Background Auto-Save');

  const results = {
    success: false,
    beforeStats: null as any,
    afterStats: null as any,
    issues: [] as string[],
    recommendation: '',
    batchingActive: false,
    backgroundAutoSaveActive: false
  };

  try {
    // Get initial analytics
    results.beforeStats = await storageCoordinator.getAnalytics();
    const initialStatus = storageCoordinator.getStatus();
    
    logger.info('📊 Initial state:', {
      backgroundAutoSave: initialStatus.enabled,
      pendingChanges: initialStatus.pendingChanges
    });

    // Test intelligent action batching by dispatching related actions
    logger.info('🔄 Testing intelligent action batching...');
    
    // Monitor for batch messages
    let batchCount = 0;
    const originalDebug = console.debug;
    console.debug = function(...args) {
      if (args[0]?.includes('Batched') && args[0]?.includes('related actions')) {
        batchCount++;
      }
      return originalDebug.apply(console, args);
    };

    // Dispatch related actions that should be batched
    for (let i = 0; i < 3; i++) {
      // Use simple action dispatches that match the middleware action types
      store.dispatch({ type: 'game/checkAnswer', payload: 'correct' });
      store.dispatch({ type: 'session/incrementWordsCompleted' });
      store.dispatch({ type: 'session/addCorrectAnswer', payload: {} });
      
      // Small delay between sets
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Wait for batching to complete
    await new Promise(resolve => setTimeout(resolve, 200));
    console.debug = originalDebug;

    // Check status after actions
    const afterActionsStatus = storageCoordinator.getStatus();
    results.backgroundAutoSaveActive = afterActionsStatus.enabled;
    results.batchingActive = batchCount > 0;

    logger.info('📊 After actions:', {
      batchMessagesDetected: batchCount,
      pendingChanges: afterActionsStatus.pendingChanges,
      lastActionTime: new Date(afterActionsStatus.lastActionTime).toLocaleTimeString()
    });

    // Test background auto-save
    logger.info('🤖 Testing background auto-save...');
    
    // Add more actions to test queue buildup
    for (let i = 0; i < 5; i++) {
      store.dispatch({ type: 'session/addCorrectAnswer', payload: {} });
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const afterQueueStatus = storageCoordinator.getStatus();
    logger.info('📊 After queue test:', {
      pendingChanges: afterQueueStatus.pendingChanges,
      isProcessing: afterQueueStatus.isProcessing
    });

    // Force save to test immediate functionality
    logger.info('🚀 Testing force save...');
    await storageCoordinator.forceSave();
    
    const afterForceSaveStatus = storageCoordinator.getStatus();
    logger.info('📊 After force save:', {
      pendingChanges: afterForceSaveStatus.pendingChanges,
      isProcessing: afterForceSaveStatus.isProcessing
    });

    // Get final analytics
    results.afterStats = await storageCoordinator.getAnalytics();

    // Evaluate results
    if (results.backgroundAutoSaveActive) {
      logger.info('✅ Background auto-save system active');
    } else {
      results.issues.push('Background auto-save not active');
    }

    if (results.batchingActive) {
      logger.info('✅ Intelligent action batching working');
    } else {
      results.issues.push('No batching messages detected');
    }

    if (afterForceSaveStatus.pendingChanges === 0) {
      logger.info('✅ Force save functionality working');
    } else {
      results.issues.push('Force save did not clear all pending changes');
    }

    // Check for improvements
    results.success = results.issues.length === 0;
    
    if (results.success) {
      results.recommendation = 'Simplified storage system working perfectly! Background auto-save and intelligent batching both active.';
      logger.info('🎉 All tests passed - simplified storage system working correctly');
    } else {
      results.recommendation = `Issues detected: ${results.issues.join(', ')}. Check console for batch messages and background auto-save status.`;
      logger.warn('⚠️ Some issues detected:', results.issues);
    }

  } catch (error) {
    logger.error('❌ Test failed:', error);
    results.issues.push(`Test execution failed: ${error}`);
    results.recommendation = 'Test failed to complete - check for system errors';
  }

  return results;
};

// Legacy function name for compatibility
export const testBatchingOptimization = testSimplifiedBatching;

// Simple status check function
export const checkStorageSystemStatus = () => {
  const status = storageCoordinator.getStatus();
  const backgroundAutoSave = (typeof window !== 'undefined') ? (window as any).__BACKGROUND_AUTOSAVE__ : null;
  
  console.log('🔍 Storage System Status:');
  console.table({
    'Background Auto-Save Enabled': status.enabled,
    'Pending Changes': status.pendingChanges,
    'Is Processing': status.isProcessing,
    'Last Action': status.lastActionTime ? new Date(status.lastActionTime).toLocaleTimeString() : 'None',
    'Auto-Save Instance Available': !!backgroundAutoSave
  });

  if (backgroundAutoSave) {
    console.log('🤖 Background Auto-Save Config:');
    console.table({
      'Interval': status.config?.interval + 'ms',
      'Max Pending Actions': status.config?.maxPendingActions,
      'Idle Threshold': status.config?.idleThreshold + 'ms'
    });
  }

  return status;
};