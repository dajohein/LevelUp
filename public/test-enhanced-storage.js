/**
 * Enhanced Browser Console Test Script 
 * Tests both intelligent action batching AND background auto-save system
 */

// Main test function combining both batching and background saves
window.testStorageBatching = async function() {
  console.log('🎯 Testing Enhanced Storage System (Batching + Background Auto-Save)');
  
  try {
    const store = window.__REDUX_STORE__;
    const backgroundAutoSave = window.__BACKGROUND_AUTOSAVE__;
    
    if (!store) {
      console.error('❌ Redux store not available');
      return;
    }

    console.log('✅ Redux store found');
    
    if (backgroundAutoSave) {
      console.log('✅ Background auto-save system active');
      const status = backgroundAutoSave.getStatus();
      console.log('🤖 Current status:', {
        enabled: status.enabled,
        pendingChanges: status.pendingChanges,
        interval: status.config.interval + 'ms'
      });
    } else {
      console.log('⚠️ Background auto-save not initialized (will start on first action)');
    }

    // Test intelligent batching
    console.log('\n🔄 Testing intelligent action batching...');
    let batchCount = 0;
    
    const originalDebug = console.debug;
    console.debug = function(...args) {
      if (args[0]?.includes('Smart batch')) {
        batchCount++;
        console.log('✅ ' + args[0]);
      }
      return originalDebug.apply(console, args);
    };

    // Simulate answer submission (triggers related action group)
    store.dispatch({ type: 'game/checkAnswer', payload: { isCorrect: true, word: 'test' } });
    store.dispatch({ type: 'session/incrementWordsCompleted' });
    store.dispatch({ type: 'session/addCorrectAnswer', payload: { word: 'test' } });

    await new Promise(resolve => setTimeout(resolve, 100));
    console.debug = originalDebug;

    console.log(`📊 Batching result: ${batchCount} batch operations detected`);
    
    if (backgroundAutoSave) {
      const newStatus = backgroundAutoSave.getStatus();
      console.log(`🤖 Background save status: ${newStatus.pendingChanges} pending changes`);
    }

    return { batchingWorking: batchCount > 0, backgroundAutoSaveActive: !!backgroundAutoSave };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Test background auto-save behavior specifically
window.testBackgroundSaves = async function() {
  console.log('🤖 === BACKGROUND AUTO-SAVE TEST ===');
  
  try {
    const store = window.__REDUX_STORE__;
    let backgroundAutoSave = window.__BACKGROUND_AUTOSAVE__;
    
    if (!store) {
      console.error('❌ Redux store not available');
      return;
    }

    console.log('🎮 Simulating rapid game interactions...');
    
    // Simulate multiple rapid interactions to test queuing
    for (let i = 0; i < 5; i++) {
      store.dispatch({ type: 'game/checkAnswer', payload: { isCorrect: true, word: `word-${i}` } });
      store.dispatch({ type: 'session/addCorrectAnswer', payload: { word: `word-${i}` } });
      store.dispatch({ type: 'session/incrementWordsCompleted' });
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Background auto-save should be initialized now
    backgroundAutoSave = window.__BACKGROUND_AUTOSAVE__;
    
    if (backgroundAutoSave) {
      console.log('\n📊 Background auto-save status after actions:');
      const status = backgroundAutoSave.getStatus();
      console.table({
        'Pending Changes': status.pendingChanges,
        'Is Processing': status.isProcessing,
        'Last Action Time': new Date(status.lastActionTime).toLocaleTimeString()
      });

      console.log('\n⏳ Waiting for idle save (3 second threshold)...');
      await new Promise(resolve => setTimeout(resolve, 4000));

      const afterIdleStatus = backgroundAutoSave.getStatus();
      console.log('\n📊 Status after idle period:');
      console.table({
        'Pending Changes': afterIdleStatus.pendingChanges,
        'Is Processing': afterIdleStatus.isProcessing
      });

      if (afterIdleStatus.pendingChanges < status.pendingChanges) {
        console.log('✅ Background auto-save triggered by idle threshold!');
      } else {
        console.log('⚠️ Changes may still be processing');
      }

      // Check analytics
      const analytics = window.__SAVE_ANALYTICS__?.getAnalytics();
      if (analytics) {
        console.log('\n📈 Background Save Analytics:');
        console.table({
          'Total Saves': analytics.totalSaves,
          'Avg Duration': analytics.avgDuration + 'ms',
          'Total Changes': analytics.totalChanges
        });
      }
    } else {
      console.log('⚠️ Background auto-save not initialized yet');
    }

  } catch (error) {
    console.error('❌ Background save test failed:', error);
  }
};

// Manual fallback test for when modules don't load
window.manualBatchTest = function() {
  console.log('🔧 Manual Batch Test (Fallback)');
  
  const store = window.__REDUX_STORE__;
  if (!store) {
    console.error('❌ Redux store not available');
    return;
  }

  console.log('📤 Dispatching test actions...');
  
  // Monitor console for batch messages
  store.dispatch({ type: 'game/checkAnswer', payload: { isCorrect: true, word: 'manual-test' } });
  store.dispatch({ type: 'session/incrementWordsCompleted' });
  store.dispatch({ type: 'session/addCorrectAnswer', payload: { word: 'manual-test' } });
  
  console.log('✅ Actions dispatched. Check console above for "Smart batch" messages!');
  console.log('🎯 Expected: You should see a message about batching 3 related actions into 1 save operation');
};

console.log('🛠️ Enhanced Storage Test Tools Loaded');
console.log('Available functions:');
console.log('  - testStorageBatching(): Test both batching and background saves');
console.log('  - testBackgroundSaves(): Focus on background auto-save system');
console.log('  - manualBatchTest(): Simple fallback test');
console.log('');
console.log('🚀 New Features:');
console.log('  ✅ Intelligent action batching (4→1 storage operations)');
console.log('  ✅ Background auto-save system (non-blocking saves)');
console.log('  ✅ Performance monitoring and analytics');