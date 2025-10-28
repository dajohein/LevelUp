/**
 * Advanced Performance Testing & Optimization
 * 
 * This script provides comprehensive performance analysis tools
 * to identify bottlenecks, memory leaks, and optimization opportunities.
 */

import { logger } from '../services/logger';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  storageOperations: number;
  componentRenders: Map<string, number>;
  expensiveCalculations: number;
  networkRequests: number;
}

class PerformanceAnalyzer {
  private metrics: PerformanceMetrics = {
    renderTime: 0,
    memoryUsage: 0,
    storageOperations: 0,
    componentRenders: new Map(),
    expensiveCalculations: 0,
    networkRequests: 0,
  };
  
  private observers: Map<string, PerformanceObserver> = new Map();
  private storageOperationCount = 0;
  private startTime = performance.now();

  constructor() {
    // Only initialize observers and interception if explicitly enabled
    if ((window as any).__ENABLE_PERFORMANCE_TRACKING__) {
      this.initializeObservers();
      this.interceptStorageOperations();
    }
  }

  private initializeObservers() {
    // Measure paint and layout performance
    if ('PerformanceObserver' in window) {
      const paintObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.renderTime = entry.startTime;
          }
        });
      });
      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.set('paint', paintObserver);

      // Measure long tasks (blocking operations)
      const longTaskObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.duration > 50) { // Tasks longer than 50ms
            logger.warn(`Long task detected: ${entry.duration}ms`, {
              name: entry.name,
              startTime: entry.startTime,
            });
          }
        });
      });
      
      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', longTaskObserver);
      } catch (e) {
        // longtask not supported in all browsers
      }
    }
  }

  private interceptStorageOperations() {
    // Monitor localStorage operations
    const originalSetItem = localStorage.setItem;
    const originalGetItem = localStorage.getItem;
    
    localStorage.setItem = (key: string, value: string) => {
      this.storageOperationCount++;
      this.metrics.storageOperations++;
      
      // Detect rapid repeated operations
      if (this.storageOperationCount > 10) {
        const timeDiff = performance.now() - this.startTime;
        if (timeDiff < 1000) { // More than 10 operations in 1 second
          logger.warn(`High storage operation frequency: ${this.storageOperationCount} ops in ${timeDiff}ms`);
        }
      }
      
      return originalSetItem.call(localStorage, key, value);
    };

    localStorage.getItem = (key: string) => {
      this.metrics.storageOperations++;
      return originalGetItem.call(localStorage, key);
    };
  }

  /**
   * Track component render frequency
   */
  trackComponentRender(componentName: string) {
    const current = this.metrics.componentRenders.get(componentName) || 0;
    this.metrics.componentRenders.set(componentName, current + 1);
    
    // Warn about excessive renders
    if (current > 20) {
      logger.warn(`Component ${componentName} has rendered ${current} times - potential performance issue`);
    }
  }

  /**
   * Track expensive calculations
   */
  trackExpensiveCalculation(operationName: string, fn: () => any) {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    this.metrics.expensiveCalculations++;
    
    if (duration > 10) {
      logger.warn(`Expensive calculation detected: ${operationName} took ${duration}ms`);
    }
    
    return result;
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
      };
    }
    return null;
  }

  /**
   * Analyze current performance metrics
   */
  analyzePerformance() {
    const memoryStats = this.getMemoryStats();
    const report = {
      ...this.metrics,
      memoryStats,
      timestamp: new Date().toISOString(),
      suggestions: this.generateOptimizationSuggestions(),
    };

    logger.info('🔍 Performance Analysis Report:', report);
    return report;
  }

  private generateOptimizationSuggestions(): string[] {
    const suggestions: string[] = [];
    
    // Check storage operations
    if (this.metrics.storageOperations > 50) {
      suggestions.push('Consider implementing storage operation debouncing or caching');
    }
    
    // Check component renders
    this.metrics.componentRenders.forEach((count, component) => {
      if (count > 15) {
        suggestions.push(`Component ${component} is re-rendering frequently (${count} times) - consider React.memo or useMemo`);
      }
    });
    
    // Check memory
    const memoryStats = this.getMemoryStats();
    if (memoryStats && memoryStats.usedJSHeapSize > 100) {
      suggestions.push('High memory usage detected - check for memory leaks or large object retention');
    }
    
    // Check expensive calculations
    if (this.metrics.expensiveCalculations > 20) {
      suggestions.push('Multiple expensive calculations detected - consider memoization strategies');
    }
    
    return suggestions;
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {
      renderTime: 0,
      memoryUsage: 0,
      storageOperations: 0,
      componentRenders: new Map(),
      expensiveCalculations: 0,
      networkRequests: 0,
    };
    this.storageOperationCount = 0;
    this.startTime = performance.now();
  }

  /**
   * Cleanup observers
   */
  cleanup() {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers.clear();
  }
}

// Global performance analyzer instance
const performanceAnalyzer = new PerformanceAnalyzer();

// Declare the debug flag type
declare global {
  interface Window {
    __ENABLE_PERFORMANCE_TRACKING__?: boolean;
  }
}

// Export for manual use in components (opt-in only)
export const trackComponentRender = (componentName: string) => {
  // Only track if explicitly enabled via debug flag
  if (process.env.NODE_ENV === 'development' && window.__ENABLE_PERFORMANCE_TRACKING__) {
    performanceAnalyzer.trackComponentRender(componentName);
  }
};

export const trackExpensiveCalculation = (name: string, fn: () => any) => {
  // Only track if explicitly enabled via debug flag
  if (process.env.NODE_ENV === 'development' && window.__ENABLE_PERFORMANCE_TRACKING__) {
    return performanceAnalyzer.trackExpensiveCalculation(name, fn);
  }
  return fn();
};

export const analyzePerformance = () => {
  if (process.env.NODE_ENV === 'development') {
    return performanceAnalyzer.analyzePerformance();
  }
};

export const resetPerformanceMetrics = () => {
  if (process.env.NODE_ENV === 'development') {
    performanceAnalyzer.reset();
  }
};

// Manual activation functions for debugging
export const enablePerformanceTracking = () => {
  if (process.env.NODE_ENV === 'development') {
    window.__ENABLE_PERFORMANCE_TRACKING__ = true;
    // Re-initialize the analyzer with tracking enabled
    performanceAnalyzer.cleanup();
    new PerformanceAnalyzer();
    console.log('🔍 Performance tracking enabled - use analyzePerformance() to get report');
  }
};

export const disablePerformanceTracking = () => {
  window.__ENABLE_PERFORMANCE_TRACKING__ = false;
  performanceAnalyzer.cleanup();
  console.log('🔍 Performance tracking disabled');
};

// Cleanup on window unload
window.addEventListener('beforeunload', () => {
  performanceAnalyzer.cleanup();
});

export default performanceAnalyzer;