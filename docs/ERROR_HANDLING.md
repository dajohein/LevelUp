# Error Handling System

## Overview

The LevelUp app now includes a comprehensive error handling system that provides structured error management, user-friendly error messages, and graceful error recovery.

## Error Classes

### AppError (Base Class)
```typescript
const error = new AppError(
  'Technical error message',
  'ERROR_CODE',
  'high', // severity: 'low' | 'medium' | 'high' | 'critical'
  'User-friendly message',
  { context: 'additional data' }
);
```

### Specialized Error Classes

#### StorageError
```typescript
const storageError = new StorageError(
  'Failed to save user progress',
  { languageCode: 'de', data: progressData }
);
// User sees: "Unable to save your progress. Please check your browser settings."
```

#### NetworkError
```typescript
const networkError = new NetworkError(
  'API request failed',
  { url: '/api/words', status: 500 }
);
// User sees: "Connection issue. Please check your internet connection."
```

#### DataIntegrityError
```typescript
const dataError = new DataIntegrityError(
  'Language data corrupted',
  { languageCode: 'es', module: 'vocabulario-basico' }
);
// User sees: "Data corruption detected. Your progress may need to be reset."
```

## Error Boundary Usage

### Enhanced Class-Based ErrorBoundary
The main ErrorBoundary component now provides:
- Detailed error information with collapsible technical details
- Multiple recovery options (retry, go home, reload)
- User-friendly error messages based on error type
- Error tracking integration ready for analytics

### Functional Error Handling
```typescript
import { useErrorBoundary, useErrorReporting } from '../utils/errorHandling';

const MyComponent = () => {
  const { error, resetError } = useErrorBoundary();
  const { reportError } = useErrorReporting();

  const handleSomething = async () => {
    try {
      await riskyOperation();
    } catch (err) {
      reportError(err, { operation: 'riskyOperation' });
    }
  };

  return (
    <div>
      {error && <ErrorAlert error={error} onClose={resetError} />}
      {/* component content */}
    </div>
  );
};
```

## Retry Utility

```typescript
import { withRetry } from '../utils/errorHandling';

const loadData = async () => {
  return withRetry(
    async () => {
      const response = await fetch('/api/data');
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
    3, // max retries
    1000 // delay (ms)
  );
};
```

## Error Recovery Patterns

### 1. Graceful Degradation
```typescript
try {
  const data = await loadCriticalData();
  return <FullFeatureComponent data={data} />;
} catch (error) {
  reportError(error);
  return <FallbackComponent />;
}
```

### 2. User-Initiated Retry
```typescript
const [retryCount, setRetryCount] = useState(0);

const handleRetry = () => {
  setRetryCount(prev => prev + 1);
  resetError();
};

return (
  <ErrorHandler>
    <DataComponent key={retryCount} />
  </ErrorHandler>
);
```

### 3. Progressive Enhancement
```typescript
const { error } = useErrorBoundary();

if (error instanceof StorageError) {
  return <OfflineModeComponent />;
}

if (error instanceof NetworkError) {
  return <CachedDataComponent />;
}

return <FullFeatureComponent />;
```

## Integration with Analytics

The error system is ready for analytics integration:

```typescript
// In useErrorBoundary hook
if (typeof window !== 'undefined' && window.gtag) {
  window.gtag('event', 'exception', {
    description: error.message,
    fatal: false,
  });
}
```

## Best Practices

1. **Use specific error types** for different scenarios
2. **Provide context** in error objects for debugging
3. **Always include user-friendly messages** for production errors
4. **Implement fallback UI** for critical errors
5. **Test error scenarios** in development
6. **Monitor error patterns** in production

## Error Monitoring Setup

To integrate with error tracking services like Sentry:

```typescript
// In production build
import * as Sentry from '@sentry/react';

// In useErrorBoundary hook
const captureError = (error: Error, errorInfo?: any) => {
  console.error('Error captured:', error, errorInfo);
  
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      contexts: { errorInfo },
      tags: { component: 'ErrorBoundary' }
    });
  }
  
  setError(error);
};
```