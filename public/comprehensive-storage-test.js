// Comprehensive Storage System Testing & Analytics
// Usage: Open browser console and run testStorageComprehensive()

window.testStorageComprehensive = async function() {
  console.log('🔧 === COMPREHENSIVE STORAGE SYSTEM TEST ===');
  
  try {
    // Access Redux store and services
    const store = window.__REDUX_STORE__;
    const enhancedStorage = window.__ENHANCED_STORAGE__;
    const backgroundAutoSave = window.__BACKGROUND_AUTOSAVE__;
    const saveAnalytics = window.__SAVE_ANALYTICS__;
    
    if (!store || !enhancedStorage) {
      console.error('❌ Required services not available');
      return;
    }

    console.log('\n📊 === INITIAL ANALYTICS ===');
    const initialAnalytics = await enhancedStorage.getStorageAnalytics();
    console.table({
      'Health Score': initialAnalytics.data.health.score,
      'Cache Hit Rate': (initialAnalytics.data.cache.hitRate * 100).toFixed(1) + '%',
      'Total Operations': initialAnalytics.data.performance.totalOperations,
      'Avg Response Time': initialAnalytics.data.performance.averageResponseTime + 'ms'
    });

    if (backgroundAutoSave) {
      console.log('\n🤖 === BACKGROUND AUTO-SAVE STATUS ===');
      const autoSaveStatus = backgroundAutoSave.getStatus();
      console.table({
        'Enabled': autoSaveStatus.enabled,
        'Pending Changes': autoSaveStatus.pendingChanges,
        'Is Processing': autoSaveStatus.isProcessing,
        'Auto-Save Interval': autoSaveStatus.config.interval + 'ms',
        'Max Pending': autoSaveStatus.config.maxPendingActions,
        'Idle Threshold': autoSaveStatus.config.idleThreshold + 'ms'
      });
    }

    console.log('\n🎮 === SIMULATING GAME INTERACTIONS ===');
    
    // Monitor action batching
    let batchCount = 0;
    const originalDispatch = store.dispatch;
    const actionLog = [];
    
    store.dispatch = function(action) {
      actionLog.push({
        type: action.type,
        timestamp: Date.now(),
        payload: action.payload
      });
      
      if (action.type?.includes('batch') || action.type?.includes('Smart')) {
        batchCount++;
        console.log('🔄 Batch detected:', action.type);
      }
      
      return originalDispatch.call(this, action);
    };

    // Simulate multiple answer submissions
    console.log('Simulating 5 rapid answer submissions...');
    const startTime = Date.now();
    
    for (let i = 0; i < 5; i++) {
      // Dispatch the same sequence that happens during real gameplay
      store.dispatch({ type: 'game/checkAnswer', payload: { isCorrect: true, word: `test-word-${i}` } });
      store.dispatch({ type: 'session/incrementWordsCompleted' });
      store.dispatch({ type: 'session/addCorrectAnswer', payload: { word: `test-word-${i}` } });
      
      // Small delay to simulate user thinking time
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const endTime = Date.now();
    console.log(`⏱️ Simulation completed in ${endTime - startTime}ms`);

    // Wait for any pending batches
    await new Promise(resolve => setTimeout(resolve, 200));

    console.log('\n📈 === POST-SIMULATION ANALYTICS ===');
    const finalAnalytics = await enhancedStorage.getStorageAnalytics();
    console.table({
      'Health Score': finalAnalytics.data.health.score,
      'Cache Hit Rate': (finalAnalytics.data.cache.hitRate * 100).toFixed(1) + '%',
      'Total Operations': finalAnalytics.data.performance.totalOperations,
      'Avg Response Time': finalAnalytics.data.performance.averageResponseTime + 'ms',
      'Operations Delta': finalAnalytics.data.performance.totalOperations - initialAnalytics.data.performance.totalOperations
    });

    if (backgroundAutoSave) {
      console.log('\n🤖 === BACKGROUND AUTO-SAVE POST-TEST ===');
      const finalAutoSaveStatus = backgroundAutoSave.getStatus();
      console.table({
        'Pending Changes': finalAutoSaveStatus.pendingChanges,
        'Is Processing': finalAutoSaveStatus.isProcessing,
        'Last Action Time': new Date(finalAutoSaveStatus.lastActionTime).toLocaleTimeString()
      });
    }

    if (saveAnalytics) {
      console.log('\n💾 === BACKGROUND SAVE ANALYTICS ===');
      const analytics = saveAnalytics.getAnalytics();
      if (analytics) {
        console.table({
          'Total Background Saves': analytics.totalSaves,
          'Avg Save Duration': analytics.avgDuration + 'ms',
          'Total Changes Processed': analytics.totalChanges
        });
        
        console.log('Save Triggers:', analytics.triggerCounts);
        console.log('Recent Saves:', analytics.recentSaves);
      } else {
        console.log('No background saves recorded yet');
      }
    }

    console.log('\n🔍 === ACTION ANALYSIS ===');
    const gameActions = actionLog.filter(a => a.type.startsWith('game/'));
    const sessionActions = actionLog.filter(a => a.type.startsWith('session/'));
    const batchActions = actionLog.filter(a => a.type.includes('batch') || a.type.includes('Smart'));
    
    console.table({
      'Total Actions': actionLog.length,
      'Game Actions': gameActions.length,
      'Session Actions': sessionActions.length,
      'Batch Actions': batchActions.length,
      'Batches Detected': batchCount
    });

    console.log('\n💾 === STORAGE STATE ANALYSIS ===');
    const currentState = store.getState();
    const wordProgressKeys = Object.keys(currentState.game?.wordProgress || {});
    
    console.table({
      'Languages': wordProgressKeys.length,
      'Session Active': currentState.session?.isSessionActive || false,
      'Current Language': currentState.game?.language || 'none',
      'Session Type': currentState.session?.sessionType || 'none'
    });

    // Restore original dispatch
    store.dispatch = originalDispatch;

    console.log('\n✅ === TEST COMPLETE ===');
    console.log('Key findings:');
    console.log(`- Actions per simulation: ${actionLog.length}`);
    console.log(`- Storage operations increase: ${finalAnalytics.data.performance.totalOperations - initialAnalytics.data.performance.totalOperations}`);
    console.log(`- Cache performance: ${(finalAnalytics.data.cache.hitRate * 100).toFixed(1)}%`);
    console.log(`- Health score: ${finalAnalytics.data.health.score}/100`);
    
    if (backgroundAutoSave) {
      const status = backgroundAutoSave.getStatus();
      console.log(`- Background auto-save pending: ${status.pendingChanges} changes`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Test background auto-save system specifically
window.testBackgroundAutoSave = async function() {
  console.log('🤖 === BACKGROUND AUTO-SAVE TEST ===');
  
  try {
    const backgroundAutoSave = window.__BACKGROUND_AUTOSAVE__;
    const store = window.__REDUX_STORE__;
    
    if (!backgroundAutoSave || !store) {
      console.error('❌ Background auto-save or store not available');
      return;
    }

    console.log('\n📊 Initial Status:');
    let status = backgroundAutoSave.getStatus();
    console.table({
      'Enabled': status.enabled,
      'Pending Changes': status.pendingChanges,
      'Is Processing': status.isProcessing
    });

    console.log('\n🎮 Simulating rapid game actions...');
    
    // Simulate rapid actions that should be queued
    for (let i = 0; i < 10; i++) {
      store.dispatch({ type: 'game/checkAnswer', payload: { isCorrect: true, word: `test-${i}` } });
      store.dispatch({ type: 'session/addCorrectAnswer', payload: { word: `test-${i}` } });
      store.dispatch({ type: 'session/incrementWordsCompleted' });
      
      // Very short delay to simulate rapid user interactions
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log('\n📊 Status After Actions:');
    status = backgroundAutoSave.getStatus();
    console.table({
      'Pending Changes': status.pendingChanges,
      'Is Processing': status.isProcessing,
      'Last Action': new Date(status.lastActionTime).toLocaleTimeString()
    });

    console.log('\n⏳ Waiting for auto-save (3 seconds idle threshold)...');
    await new Promise(resolve => setTimeout(resolve, 4000));

    console.log('\n📊 Status After Idle Period:');
    status = backgroundAutoSave.getStatus();
    console.table({
      'Pending Changes': status.pendingChanges,
      'Is Processing': status.isProcessing
    });

    console.log('\n🚀 Testing Force Save...');
    await backgroundAutoSave.forceSave();
    
    console.log('\n📊 Final Status:');
    status = backgroundAutoSave.getStatus();
    console.table({
      'Pending Changes': status.pendingChanges,
      'Is Processing': status.isProcessing
    });

    const analytics = window.__SAVE_ANALYTICS__?.getAnalytics();
    if (analytics) {
      console.log('\n📈 Background Save Analytics:');
      console.table(analytics);
    }

  } catch (error) {
    console.error('❌ Background auto-save test failed:', error);
  }
};

// Test storage performance under load
window.testStorageLoad = async function() {
  console.log('🚀 === STORAGE LOAD TEST ===');
  
  try {
    const enhancedStorage = window.__ENHANCED_STORAGE__;
    if (!enhancedStorage) {
      console.error('❌ Enhanced storage not available');
      return;
    }

    const testData = Array.from({ length: 100 }, (_, i) => ({
      word: `test-word-${i}`,
      mastery: Math.random(),
      attempts: Math.floor(Math.random() * 10),
      lastSeen: Date.now() - Math.random() * 86400000
    }));

    console.log('Testing bulk operations...');
    const startTime = performance.now();

    // Simulate rapid saves
    for (let i = 0; i < 10; i++) {
      await enhancedStorage.saveWordProgress('test-lang', testData);
    }

    const endTime = performance.now();
    console.log(`⏱️ 10 bulk saves completed in ${(endTime - startTime).toFixed(2)}ms`);

    const analytics = await enhancedStorage.getStorageAnalytics();
    console.table({
      'Avg Response Time': analytics.data.performance.averageResponseTime + 'ms',
      'Total Operations': analytics.data.performance.totalOperations,
      'Cache Hit Rate': (analytics.data.cache.hitRate * 100).toFixed(1) + '%',
      'Health Score': analytics.data.health.score
    });

  } catch (error) {
    console.error('❌ Load test failed:', error);
  }
};

// Debug current storage state
window.debugStorageState = function() {
  console.log('🔍 === CURRENT STORAGE STATE ===');
  
  const store = window.__REDUX_STORE__;
  if (!store) {
    console.error('❌ Redux store not available');
    return;
  }

  const state = store.getState();
  
  console.log('📊 Game State:');
  console.table({
    'Current Language': state.game?.language || 'none',
    'Word Progress Languages': Object.keys(state.game?.wordProgress || {}).join(', '),
    'Current Word': state.game?.currentWord?.word || 'none'
  });

  console.log('🎯 Session State:');
  console.table({
    'Session Active': state.session?.isSessionActive || false,
    'Session Type': state.session?.sessionType || 'none',
    'Words Completed': state.session?.wordsCompleted || 0,
    'Correct Answers': state.session?.correctAnswers?.length || 0,
    'Incorrect Answers': state.session?.incorrectAnswers?.length || 0
  });

  if (state.game?.wordProgress) {
    console.log('📚 Word Progress by Language:');
    Object.entries(state.game.wordProgress).forEach(([lang, progress]) => {
      console.log(`${lang}: ${Object.keys(progress).length} words tracked`);
    });
  }
};

console.log('🛠️ Comprehensive Storage Testing Tools Loaded');
console.log('Available functions:');
console.log('  - testStorageComprehensive(): Full system test');
console.log('  - testBackgroundAutoSave(): Test background auto-save system');
console.log('  - testStorageLoad(): Performance load test');
console.log('  - debugStorageState(): Current state analysis');
console.log('');
console.log('🤖 Background Auto-Save System:');
console.log('  - Automatically saves changes every 30 seconds');
console.log('  - Saves after 3 seconds of inactivity');
console.log('  - Forces save after 25 pending changes');
console.log('  - Queues changes in background without blocking UI');