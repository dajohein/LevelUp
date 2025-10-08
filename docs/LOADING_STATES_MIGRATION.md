# Loading States Migration Guide

## Overview
This guide helps migrate from the old loading patterns to the new unified loading system that follows modern UX best practices.

## Key Improvements

### 1. **Consistent Visual Design**
- Unified spinner animations and sizes
- Consistent color usage from theme
- Proper spacing and typography hierarchy

### 2. **Better UX Patterns**
- **Skeleton loaders** for content-heavy sections (better perceived performance)
- **Progress indicators** for long operations with known duration
- **Minimal loaders** for quick operations
- **Inline loaders** for buttons and small components

### 3. **Accessibility**
- Proper ARIA labels
- Screen reader friendly
- Reduced motion support (can be added)
- Color contrast compliance

### 4. **Performance**
- Optimized animations using CSS transforms
- Minimal DOM updates
- Efficient re-renders

## Migration Patterns

### Old Pattern: Multiple Loading Components
```tsx
// ❌ OLD - Multiple different components
import { Loading } from './feedback/Loading';
import { LoadingFallback } from './feedback/LoadingSkeleton';

// Different styles and behaviors
<Loading message="Loading..." />
<LoadingFallback text="Loading..." />
```

### New Pattern: Unified Component
```tsx
// ✅ NEW - Single unified component
import { UnifiedLoading } from './feedback/UnifiedLoading';

// Consistent API and behavior
<UnifiedLoading text="Loading..." />
<UnifiedLoading variant="skeleton" />
```

### Migration Examples

#### 1. Basic Loading Spinner
```tsx
// ❌ OLD
<Loading message="Loading words..." />

// ✅ NEW
<UnifiedLoading text="Loading words..." />
```

#### 2. Full Screen Loading
```tsx
// ❌ OLD
<LoadingContainer style={{ minHeight: '100vh' }}>
  <Spinner />
  <LoadingText>Loading...</LoadingText>
</LoadingContainer>

// ✅ NEW
<UnifiedLoading fullScreen text="Loading application..." />
```

#### 3. Skeleton Loading for Lists/Cards
```tsx
// ❌ OLD
<SkeletonCard />
<SkeletonText />
<SkeletonText />

// ✅ NEW
<SkeletonLayout type="card" count={3} />
```

#### 4. Button Loading States
```tsx
// ❌ OLD
<Button disabled={loading}>
  {loading ? 'Saving...' : 'Save'}
</Button>

// ✅ NEW
<LoadingButton 
  isLoading={loading} 
  loadingText="Saving..."
>
  Save
</LoadingButton>
```

#### 5. Progress-based Loading
```tsx
// ❌ OLD - No progress indication
<Loading message="Uploading..." />

// ✅ NEW - With progress
<UnifiedLoading 
  text="Uploading..." 
  progress={uploadProgress}
  indeterminate={false}
/>
```

#### 6. Inline Loading (for small components)
```tsx
// ❌ OLD
{loading && <SmallSpinner />}

// ✅ NEW
<UnifiedLoading variant="inline" text="Loading" />
```

## Component-Specific Migrations

### Router/Lazy Loading
```tsx
// ❌ OLD
<LazyWrapper fallback={() => <ModuleSkeleton />} loadingText="Loading modules...">

// ✅ NEW
<LazyWrapper fallback={() => <SkeletonLayout type="card" count={3} />}>
```

### Game Component
```tsx
// ❌ OLD
return <Loading message="Loading words..." />;

// ✅ NEW
return <UnifiedLoading variant="skeleton" text="Loading words..." />;
// or for game-specific skeleton:
return <SkeletonLayout type="game" />;
```

### Form Loading
```tsx
// ❌ OLD
{loading && <div>Loading...</div>}

// ✅ NEW
{loading && <SkeletonLayout type="form" />}
```

### Account Linking Component
```tsx
// ❌ OLD
<Button disabled={loading}>
  {loading ? 'Generating...' : 'Generate Account Code'}
</Button>

// ✅ NEW
<LoadingButton 
  isLoading={loading}
  loadingText="Generating..."
>
  Generate Account Code
</LoadingButton>
```

## Hook Usage

### Before: Manual Loading State
```tsx
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

// Manual management everywhere
```

### After: Unified Hook
```tsx
const { isLoading, error, startLoading, stopLoading, setLoadingError, updateProgress } = useLoadingState();

// Consistent API everywhere
const handleSave = async () => {
  startLoading();
  try {
    await saveData();
    stopLoading();
  } catch (err) {
    setLoadingError('Failed to save');
  }
};
```

## Best Practices

### 1. Choose the Right Variant
- **`spinner`** (default): For general loading states
- **`skeleton`**: For content-heavy sections (better perceived performance)
- **`minimal`**: For quick operations or tight spaces
- **`inline`**: For buttons and small inline elements

### 2. Provide Meaningful Text
```tsx
// ❌ Generic
<UnifiedLoading text="Loading..." />

// ✅ Specific and helpful
<UnifiedLoading text="Loading your progress..." />
<UnifiedLoading text="Saving changes..." />
<UnifiedLoading text="Connecting to server..." />
```

### 3. Use Progress When Possible
```tsx
// ✅ For operations with known duration
<UnifiedLoading 
  text="Uploading files..." 
  progress={progress}
  indeterminate={false}
/>
```

### 4. Match Loading to Content
```tsx
// ✅ Use skeleton that matches the final content
<SkeletonLayout type="card" count={expectedItemCount} />
```

## Performance Considerations

1. **Lazy load the component** if not immediately needed
2. **Use skeleton loaders** for better perceived performance
3. **Avoid layout shifts** by maintaining consistent dimensions
4. **Debounce quick operations** to avoid flash of loading state

## Accessibility Notes

1. All loading states include proper ARIA labels
2. Screen readers announce loading state changes
3. Loading text is descriptive and helpful
4. Color is not the only indicator of loading state

## Testing

```tsx
// Test loading states consistently
const { isLoading, startLoading, stopLoading } = useLoadingState();

// Test different variants
<UnifiedLoading variant="spinner" text="Test loading" />
<UnifiedLoading variant="skeleton" />
<SkeletonLayout type="card" count={2} />
```

## Migration Checklist

- [ ] Replace `Loading` component usage with `UnifiedLoading`
- [ ] Replace `LoadingSkeleton` usage with `SkeletonLayout`
- [ ] Update button loading states to use `LoadingButton`
- [ ] Migrate manual loading state to `useLoadingState` hook
- [ ] Review loading text for clarity and helpfulness
- [ ] Test all loading states for consistency
- [ ] Remove old loading components after migration
- [ ] Update any tests that reference old loading components

## Files to Update

1. `src/router.tsx` - Lazy loading fallbacks
2. `src/components/Game.tsx` - Game loading states
3. `src/components/AccountLinking.tsx` - Button loading
4. `src/components/mobile/MobileButton.tsx` - Inline loading
5. Any component using `useState` for loading state
6. Remove old loading components after migration complete