import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { updateWordProgress } from '../store/gameSlice';
import { wordProgressStorage } from '../services/storageService';
import { calculateLanguageProgress, LanguageProgress } from '../services/progressService';
import { logger } from '../services/logger';

/**
 * Custom hook for managing word progress with automatic persistence and optimized updates
 */
export const useOptimizedWordProgress = (languageCode: string) => {
  const dispatch = useDispatch();
  const wordProgress = useSelector((state: RootState) => state.game.wordProgress);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save progress via Redux dispatch (no direct storage calls)
  const saveProgress = useCallback(
    async (progress: typeof wordProgress) => {
      try {
        setIsLoading(true);
        setError(null);
        // Use proper Redux action creator for full progress replacement
        dispatch(updateWordProgress(progress));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save progress');
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch]
  );

  const loadProgress = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const progress = wordProgressStorage.load(languageCode);
      return progress;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load progress');
      return {};
    } finally {
      setIsLoading(false);
    }
  }, [languageCode]);

  return {
    wordProgress,
    saveProgress,
    loadProgress,
    isLoading,
    error,
  };
};

/**
 * Custom hook for language-specific progress calculations with memoization
 */
export const useLanguageProgress = (
  languageCode: string
): LanguageProgress & { isLoading: boolean } => {
  const [progress, setProgress] = useState<LanguageProgress>({
    totalWords: 0,
    practicedWords: 0,
    averageMastery: 0,
    completedModules: 0,
    totalModules: 0,
    recentActivity: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Memoize the calculation to avoid unnecessary recalculations
  const memoizedProgress = useMemo(() => {
    if (!languageCode) return progress;

    try {
      return calculateLanguageProgress(languageCode);
    } catch (error) {
      logger.warn('Failed to calculate language progress', { languageCode, error });
      return progress;
    }
  }, [languageCode, progress]);

  useEffect(() => {
    if (languageCode) {
      setIsLoading(true);

      // Use requestIdleCallback for better performance if available
      const callback = () => {
        setProgress(memoizedProgress);
        setIsLoading(false);
      };

      if (window.requestIdleCallback) {
        const handle = window.requestIdleCallback(callback);
        return () => window.cancelIdleCallback(handle);
      } else {
        const timeout = setTimeout(callback, 0);
        return () => clearTimeout(timeout);
      }
    }
  }, [languageCode, memoizedProgress]);

  return { ...progress, isLoading };
};

/**
 * Custom hook for responsive design breakpoints with optimized listeners
 */
export const useBreakpoints = () => {
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setScreenSize({ width, height });

      if (width < 768) {
        setBreakpoint('mobile');
      } else if (width < 1024) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('desktop');
      }
    };

    // Initial calculation
    updateBreakpoint();

    // Debounce resize events to improve performance
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateBreakpoint, 150);
    };

    window.addEventListener('resize', debouncedResize);

    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return {
    breakpoint,
    screenSize,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
  };
};

/**
 * Custom hook for optimized local storage with debouncing and error handling
 */
export const useDebouncedStorage = <T>(key: string, defaultValue: T, delay = 1000) => {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      logger.warn(`Failed to load ${key} from localStorage`, { key, error });
      return defaultValue;
    }
  });

  const [debouncedValue, setDebouncedValue] = useState(value);

  // Debounce value changes
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  // Save to localStorage when debounced value changes
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(debouncedValue));
    } catch (error) {
      logger.error(`Failed to save ${key} to localStorage`, { key, error });
    }
  }, [key, debouncedValue]);

  return [value, setValue] as const;
};

/**
 * Performance monitoring hook
 */
export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    memoryUsage: 0,
    loadTime: 0,
  });

  useEffect(() => {
    // Monitor render performance
    const startTime = performance.now();

    const updateMetrics = () => {
      const renderTime = performance.now() - startTime;

      // Get memory usage if available
      const memoryUsage = (performance as any).memory
        ? (performance as any).memory.usedJSHeapSize / 1024 / 1024
        : 0;

      // Get navigation timing if available
      const loadTime = performance.timing
        ? performance.timing.loadEventEnd - performance.timing.navigationStart
        : 0;

      setMetrics({
        renderTime: Math.round(renderTime * 100) / 100,
        memoryUsage: Math.round(memoryUsage * 100) / 100,
        loadTime,
      });
    };

    // Update metrics after a short delay
    const timer = setTimeout(updateMetrics, 100);

    return () => clearTimeout(timer);
  }, []);

  return metrics;
};

/**
 * Image preloader hook for better performance
 */
export const useImagePreloader = (imageUrls: string[]) => {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (imageUrls.length === 0) {
      setLoading(false);
      return;
    }

    const preloadImage = (url: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          setLoadedImages(prev => new Set(prev).add(url));
          resolve();
        };
        img.onerror = reject;
        img.src = url;
      });
    };

    const preloadAll = async () => {
      try {
        await Promise.all(imageUrls.map(preloadImage));
      } catch (error) {
        logger.warn('Some images failed to preload', { imageCount: imageUrls.length, error });
      } finally {
        setLoading(false);
      }
    };

    preloadAll();
  }, [imageUrls]);

  return { loadedImages, loading };
};
