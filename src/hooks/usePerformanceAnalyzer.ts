import { useEffect } from 'react';
import performanceAnalyzer from '../utils/advancedPerformanceAnalyzer';

/**
 * Hook to ensure performance analyzer cleanup on component unmount
 * Use this in your root App component to ensure proper cleanup
 */
export const usePerformanceAnalyzer = () => {
  useEffect(() => {
    // Cleanup function runs when component unmounts
    return () => {
      // Only cleanup if performance tracking is not actively enabled
      if (!window.__ENABLE_PERFORMANCE_TRACKING__) {
        performanceAnalyzer.cleanup();
      }
    };
  }, []);
};
