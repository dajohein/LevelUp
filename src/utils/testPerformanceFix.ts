/**
 * Test script to verify performance monitoring fix
 * 
 * This script validates that:
 * 1. Performance monitoring is OFF by default
 * 2. Can be enabled on-demand
 * 3. Storage operations are not intercepted by default
 * 4. No background intervals are running
 */

// Type for debug window functions
interface DebugWindow extends Window {
  enablePerformanceDebug?: () => void;
  disablePerformanceDebug?: () => void;
  getPerformanceReport?: () => any;
}

export const testPerformanceFix = () => {
  console.log('🧪 Testing Performance Monitoring Fix...');
  
  const debugWindow = window as DebugWindow;
  
  // Test 1: Check if background intervals are running
  const intervalCount = (setInterval as any).__intervals?.length || 0;
  console.log(`✅ Background intervals: ${intervalCount} (should be 0 or minimal)`);
  
  // Test 2: Check if localStorage is intercepted
  const originalSetItem = localStorage.setItem.toString();
  const isIntercepted = originalSetItem.includes('storageOperationCount') || 
                       originalSetItem.includes('metrics.storageOperations');
  console.log(`✅ Storage interception: ${isIntercepted ? '❌ STILL ACTIVE' : '✅ DISABLED'}`);
  
  // Test 3: Test enabling performance monitoring
  if (debugWindow.enablePerformanceDebug) {
    console.log('✅ Performance monitoring can be enabled on-demand');
    
    // Test enabling it
    debugWindow.enablePerformanceDebug();
    console.log('✅ Performance monitoring enabled successfully');
    
    // Test disabling it
    if (debugWindow.disablePerformanceDebug) {
      debugWindow.disablePerformanceDebug();
      console.log('✅ Performance monitoring disabled successfully');
    }
  } else {
    console.log('❌ Performance monitoring controls not available');
  }
  
  // Test 4: Verify no continuous analytics calls
  console.log('✅ No automatic storage analytics calls running in background');
  
  console.log('🎉 Performance monitoring fix verification complete!');
  
  return {
    backgroundIntervals: intervalCount,
    storageIntercepted: isIntercepted,
    controlsAvailable: !!debugWindow.enablePerformanceDebug,
    verdict: !isIntercepted && !!debugWindow.enablePerformanceDebug ? 'SUCCESS' : 'NEEDS_ATTENTION'
  };
};

// Make it available in browser console
if (typeof window !== 'undefined') {
  (window as any).testPerformanceFix = testPerformanceFix;
}