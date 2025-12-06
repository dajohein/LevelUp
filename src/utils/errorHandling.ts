// Enhanced error handling with error reporting and user-friendly messages
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    public userMessage?: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class StorageError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(
      message,
      'STORAGE_ERROR',
      'high',
      'Unable to save your progress. Please check your browser settings.',
      context
    );
  }
}

export class NetworkError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(
      message,
      'NETWORK_ERROR',
      'medium',
      'Connection issue. Please check your internet connection.',
      context
    );
  }
}

export class DataIntegrityError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(
      message,
      'DATA_INTEGRITY_ERROR',
      'high',
      'Data corruption detected. Your progress may need to be reset.',
      context
    );
  }
}

// Type declaration for gtag
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

// Error boundary hook for functional components
import { useState, useEffect } from 'react';

export const useErrorBoundary = () => {
  const [error, setError] = useState<Error | null>(null);

  const resetError = () => setError(null);

  const captureError = (error: Error, errorInfo?: any) => {
    console.error('Error captured by boundary:', error, errorInfo);
    setError(error);

    // Report to error tracking service (e.g., Sentry)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false,
      });
    }
  };

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      captureError(new Error(event.reason));
    };

    const handleError = (event: ErrorEvent) => {
      captureError(new Error(event.message));
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return { error, resetError, captureError };
};

// Retry utility for failed operations
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        throw lastError;
      }

      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError!;
};
