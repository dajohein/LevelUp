import React, { memo, Suspense, lazy } from 'react';
import { LoadingFallback } from '../components/feedback/LoadingSkeleton';

/**
 * Simple lazy loading utility with better error handling
 */
export function createLazyComponent<T = any>(
  factory: () => Promise<{ default: React.ComponentType<T> }>
) {
  const LazyComponent = lazy(factory);

  const Component = memo((props: T) => (
    <Suspense fallback={<LoadingFallback />}>
      <LazyComponent {...(props as any)} />
    </Suspense>
  ));

  Component.displayName = 'LazyComponent';
  return Component;
}

/**
 * Debounced effect hook for performance
 */
export function useDebouncedEffect(
  effect: () => void,
  deps: React.DependencyList,
  delay: number = 300
) {
  React.useEffect(() => {
    const timer = setTimeout(effect, delay);
    return () => clearTimeout(timer);
  }, [...deps, delay]);
}

/**
 * Performance monitoring utilities
 */
export const performanceUtils = {
  // Measure function execution time
  measureTime: <T extends (...args: any[]) => any>(fn: T, name?: string): T => {
    return ((...args: any[]) => {
      const start = performance.now();
      const result = fn(...args);
      const end = performance.now();
      if (process.env.NODE_ENV === 'development') {
        console.log(`⏱️ ${name || fn.name}: ${(end - start).toFixed(2)}ms`);
      }
      return result;
    }) as T;
  },

  // Throttle function calls
  throttle: <T extends (...args: any[]) => any>(fn: T, ms: number): T => {
    let lastCall = 0;
    return ((...args: any[]) => {
      const now = Date.now();
      if (now - lastCall >= ms) {
        lastCall = now;
        return fn(...args);
      }
    }) as T;
  },

  // Debounce function calls
  debounce: <T extends (...args: any[]) => any>(fn: T, ms: number): T => {
    let timeoutId: NodeJS.Timeout;
    return ((...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), ms);
    }) as T;
  },
};
