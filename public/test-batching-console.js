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
    console.log('\n� Testing intelligent action batching...');
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
    
    // Fallback manual test
    return await manualBatchTest();
  }
};

// Manual fallback test
window.manualBatchTest = async function() {
  console.log('🔧 Manual Batching Test');
  
  // Access Redux store
  const store = window.__REDUX_STORE__ || window.store;
  if (!store) {
    console.error('❌ Redux store not accessible');
    return { success: false, error: 'Store not found' };
  }
  
  // Import actions
  const { checkAnswer } = await import('/src/store/gameSlice.ts');
  const { addCorrectAnswer, incrementWordsCompleted } = await import('/src/store/sessionSlice.ts');
  
  console.log('📊 Starting manual test...');
  
  // Record initial state
  const initialTime = Date.now();
  
  // Dispatch the exact sequence that happens during answer submission
  console.log('🔄 Dispatching related actions (these should be batched)...');
  store.dispatch(checkAnswer('test answer'));
  store.dispatch(incrementWordsCompleted());
  store.dispatch(addCorrectAnswer({}));
  
  console.log('⏳ Waiting for batching window (50ms)...');
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const duration = Date.now() - initialTime;
  console.log(`✅ Test completed in ${duration}ms`);
  console.log('🔍 Check the console for middleware batching logs');
  console.log('📝 Look for "Smart batch: X related actions → 1 save operation"');
  
  return { success: true, message: 'Manual test completed - check console logs' };
};

// Auto-run instructions
console.log('🚀 Storage Batching Test Ready!');
console.log('📋 Run one of these commands:');
console.log('   testStorageBatching()    - Full automated test');
console.log('   manualBatchTest()        - Manual fallback test');
console.log('');
console.log('👆 Then answer some questions in the game to see real batching in action!');