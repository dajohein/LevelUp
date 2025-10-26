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

## Quiz Mode Issues & Fixes

### Multiple Choice Context Answer Revelation Fix (October 2025)

#### Problem
Multiple choice questions were revealing answers through context sentences, even with complex detection logic:
- Context sentences often contain the target word being asked about
- Gender variations and word stems made detection error-prone (e.g., "aburrida" vs "aburrido/-a")
- Complex regex matching was unreliable and over-engineered

#### Solution Implemented (Simplified)
**Learning-based approach**: Only show context before answering if user is still learning the word.

```typescript
// Consider a word "learned" if it has significant XP (level 2+ or 200+ XP)
const isWordLearned = (level || 0) >= 2 || (xp || 0) >= 200;

// Show context if:
// 1. User has already answered (for learning reinforcement), OR  
// 2. User is still learning this word (low level/XP)
const shouldShowContext = context && (selectedOption || !isWordLearned);
```

#### Behavior Changes
1. **New/Learning words** (level 0-1, <200 XP): Context and translation shown before answering to help learning
2. **Learned words** (level 2+, 200+ XP): Context hidden until after answering to maintain challenge
3. **Translation always shown**: Context translation doesn't reveal answers, so always displayed when context is shown

#### Benefits
- **Simpler logic**: No complex word detection or conditional translation hiding
- **Educational**: Beginners get help when they need it most  
- **Progressive difficulty**: Advanced learners face appropriate challenge
- **Better UX**: Translation helps understanding without spoiling answers

#### Implementation Files
- `src/components/quiz/MultipleChoiceQuiz.tsx` - Simplified learning-based logic
- Removed complex regex matching and word stem detection
- Uses existing XP/level data to determine learning phase

#### Testing
- Tested with German/Spanish context sentences containing target answers
- Verified proper word boundary detection (avoids false positives)
- Confirmed context revelation after answering maintains learning flow

---

## Fill-in-the-Blank UX Confusion Fix (October 2025)

#### Problem
Fill-in-the-blank mode had confusing and inconsistent UX messaging:
- Showed "Translate: zijn auto" (Dutch phrase) at top
- Then showed "The word means: ____" (implying single word)
- Instruction said "Type the correct German word to fill in the blank"
- User confusion: translating a phrase vs. filling in "the word"

#### Root Cause
- Fallback logic created generic "The word means: ____" prompt
- Mismatch between phrase translation request and single-word blank
- Poor instruction text that didn't match the actual task

#### Solution Implemented
**Clear and consistent messaging** throughout the component:

```typescript
// Better fallback for missing context
return {
  beforeBlank: `In German, "${questionWord || word}" means: `,
  afterBlank: ""
};

// Dynamic instruction text
{questionWord 
  ? `Type the German translation of "${questionWord}"`
  : "Type the correct German word to fill in the blank"
}

// Simplified question prompt
{questionWord} // Instead of "Translate: {questionWord}"
```

#### Behavior Changes
1. **Question display**: Shows Dutch word/phrase clearly without "Translate:" prefix
2. **Context sentence**: Creates meaningful context that matches the question
3. **Instructions**: Dynamic text that matches what user actually needs to do
4. **Consistency**: All text elements work together coherently

#### Benefits
- **Clear intent**: User immediately understands what to translate
- **Consistent messaging**: All UI elements align with the task
- **Better UX**: No more confusion between phrase/word translation
- **Contextual help**: Instructions adapt to the specific question type

*File: `/workspaces/LevelUp/src/components/quiz/FillInTheBlankQuiz.tsx`*