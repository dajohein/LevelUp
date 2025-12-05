/**
 * Debug Performance Helper
 *
 * Easy way to enable performance monitoring when debugging issues.
 *
 * Usage in browser console:
 * - window.enablePerformanceDebug()  // Start tracking
 * - window.getPerformanceReport()    // Get analysis
 * - window.disablePerformanceDebug() // Stop tracking
 */

import {
  enablePerformanceTracking,
  disablePerformanceTracking,
  analyzePerformance,
} from './advancedPerformanceAnalyzer';

// Add debug helpers to window for easy console access
if (process.env.NODE_ENV === 'development') {
  (window as any).enablePerformanceDebug = () => {
    enablePerformanceTracking();
    console.log('🔍 Performance debugging enabled!');
    console.log('💡 Use window.getPerformanceReport() to analyze performance');
  };

  (window as any).disablePerformanceDebug = () => {
    disablePerformanceTracking();
    console.log('🔍 Performance debugging disabled');
  };

  (window as any).getPerformanceReport = () => {
    const report = analyzePerformance();
    console.log('📊 Performance Report:', report);
    return report;
  };

  console.log('🛠️ Performance debugging tools available:');
  console.log('   window.enablePerformanceDebug()  - Start tracking');
  console.log('   window.getPerformanceReport()    - Get analysis');
  console.log('   window.disablePerformanceDebug() - Stop tracking');
}
