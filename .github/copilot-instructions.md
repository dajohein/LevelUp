# LevelUp Coding Agent Instructions

## 🎯 **Core Coding Principles**

### 1. **CRITICAL: Language Data Isolation**
**Never allow cross-language data contamination - this is the #1 architectural constraint**

```typescript
// ✅ ALWAYS: Language-scoped operations
await enhancedStorage.saveWordProgress(languageCode, progress);
const progress = await enhancedStorage.loadWordProgress(languageCode);

// ❌ NEVER: Mixed language data
const mixed = {...germanData, ...spanishData}; // FORBIDDEN
```

### 2. **Storage System Usage**
Use the **tiered storage architecture** (Memory → localStorage → IndexedDB → Remote):

```typescript
// ✅ CORRECT: Use enhanced storage services
import { enhancedStorage } from '../services/storage/enhancedStorage';
import { indexedDBStorage } from '../services/storage/indexedDB';
import { tieredStorage } from '../services/storage/tieredStorage';

// Monitor health and performance
const analytics = await enhancedStorage.getStorageAnalytics();
if (analytics.data.health.score < 80) {
  // Trigger optimization
}
```

### 3. **TypeScript Requirements**
- **Full type safety**: No `any` types without justification
- **Strict language isolation**: Types must prevent cross-language mixing
- **Interface-first**: Define interfaces before implementation
- **Zero build errors**: Code must compile without TypeScript errors

### 4. **Testing Requirements**
Every new feature must include:
- Unit tests for core logic
- Integration tests for storage operations
- Language isolation verification
- Performance benchmark validation

```typescript
// Use comprehensive test suite
import { testImmediateImprovements } from '../utils/testImmediateImprovements';
const results = await testImmediateImprovements();
```

## 📚 **Documentation Requirements**

### **When Creating/Modifying Code:**

1. **Always update existing documentation** - Never create standalone docs
   - Update `README.md` for user-facing changes
   - Update `docs/` files for technical architecture changes
   - Consolidate information into existing structure

2. **Required Documentation for New Features:**
   - **Purpose**: What problem does this solve?
   - **Usage**: Clear code examples with TypeScript
   - **Testing**: How to verify it works
   - **Performance**: Expected benchmarks and monitoring
   - **Integration**: How it fits with existing systems

3. **Documentation Consolidation Rules:**
   - ❌ **NEVER** create standalone `.md` files in root directory
   - ✅ **ALWAYS** integrate into existing `docs/` structure
   - ✅ **ALWAYS** update main `README.md` for major features
   - ✅ **ALWAYS** include testing instructions in relevant docs

4. **Code Documentation Standards:**
   ```typescript
   /**
    * Comprehensive function documentation required
    * @param languageCode - ISO language code (e.g., 'de', 'es')
    * @param data - Language-isolated progress data
    * @returns Promise with success/error result
    * @throws StorageError when language isolation is violated
    */
   async function saveProgress(languageCode: string, data: ProgressData): Promise<Result> {
     // Implementation with language validation
   }
   ```

### **Documentation File Structure:**
```
README.md                    # Main project overview
docs/
├── README.md               # Documentation index
├── PHASE2_ANALYTICS_COMPLETE.md  # Latest implementation status
├── PERFORMANCE_OPTIMIZATION.md   # Performance & testing guide
├── ERROR_HANDLING.md       # Error patterns and debugging
└── DEPLOYMENT.md          # Production deployment guide
```

## 🛠 **Coding Instructions**

### **Component Development:**

### **Component Development:**

1. **React Component Pattern:**
   ```typescript
   interface ComponentProps {
     languageCode: string;  // ALWAYS required for language isolation
     onAction: (data: TypedData) => void;
   }

   export const Component: React.FC<ComponentProps> = ({ languageCode, onAction }) => {
     // Use language-scoped hooks
     const progress = useLanguageProgress(languageCode);
     
     // Validate language isolation
     useEffect(() => {
       if (!languageCode) throw new Error('Language code required');
     }, [languageCode]);

     return <StyledContainer>{/* JSX */}</StyledContainer>;
   };
   ```

2. **Redux State Management:**
   ```typescript
   // CRITICAL: Always load language-specific data
   const loadPersistedState = (): Partial<GameState> => {
     const currentLanguage = getCurrentLanguage();
     return {
       language: currentLanguage,
       wordProgress: currentLanguage ? wordProgressStorage.load(currentLanguage) : {}
     };
   };
   ```

3. **Storage Operations:**
   ```typescript
   // ALWAYS use enhanced storage with language isolation
   const saveData = async (languageCode: string, data: any) => {
     const result = await enhancedStorage.saveWordProgress(languageCode, data);
     
     // Monitor performance
     const analytics = await enhancedStorage.getStorageAnalytics();
     if (analytics.data.health.score < 80) {
       console.warn('Storage health degraded');
     }
     
     return result;
   };
   ```

## Architecture Guidelines

### 🔴 CRITICAL: Language Data Separation
**The most important architectural constraint is maintaining strict language data isolation to prevent cross-contamination.**

## 🔧 **Required Patterns**

### **Language Isolation Pattern (MANDATORY):**
```typescript
// ✅ CORRECT: Always language-scoped
const progress = await enhancedStorage.loadWordProgress(languageCode);
const analytics = await enhancedStorage.getStorageAnalytics();

// ❌ FORBIDDEN: Cross-language mixing
const mixed = {...germanProgress, ...spanishProgress};
```

### **Error Handling Pattern:**
```typescript
try {
  const result = await storageOperation();
  if (!result.success) {
    logger.error('Operation failed:', result.error);
    // Handle gracefully
  }
} catch (error) {
  logger.error('Unexpected error:', error);
  // Fallback strategy
}
```

### **Performance Monitoring Pattern:**
```typescript
// Monitor storage health regularly
const checkSystemHealth = async () => {
  const analytics = await enhancedStorage.getStorageAnalytics();
  
  // Health score should be > 80
  if (analytics.data.health.score < 80) {
    await indexedDBStorage.cleanup();
  }
  
  // Cache hit rate should be > 85%
  if (analytics.data.cache.hitRate < 0.85) {
    // Review caching strategy
  }
};
```

#### Storage Performance & Analytics
```typescript
// Monitor storage health (0-100 score)
const health = await enhancedStorage.getStorageAnalytics();
console.log('Health score:', health.data.health.score);

// Track cache performance (85%+ target hit rate)
console.log('Cache hit rate:', health.data.cache.hitRate);

// Monitor storage distribution across tiers
const tierStats = await tieredStorage.getAnalytics();
console.log('Storage distribution:', tierStats.data.distribution);
```

#### Language Isolation Patterns
```typescript
// ✅ CORRECT: Language-scoped operations
wordProgressStorage.save(languageCode, progress);  // Language-specific storage
wordProgressStorage.load(languageCode);           // Language-specific loading

// ❌ WRONG: Mixed language operations  
const allProgress = {...germanData, ...spanishData}; // Creates contamination
store.getState().game.wordProgress; // If contains mixed language data
```

#### Redux State Management Rules
1. **Never load mixed language data into Redux state**
2. **Always scope progress loading by current language**
3. **Implement storage-level validation with debug logging**
4. **Test browser reload scenarios thoroughly**

```typescript
// ✅ CORRECT: gameSlice.ts loadPersistedState pattern
const loadPersistedState = (): Partial<GameState> => {
  const savedState = gameStateStorage.load();
  const currentLanguage = savedState.language;
  
  // CRITICAL: Load only current language's progress
  const languageSpecificProgress = currentLanguage 
    ? wordProgressStorage.load(currentLanguage) 
    : {};
    
  return {
    ...savedState,
    wordProgress: languageSpecificProgress  // Never mixed data
  };
};
## 📁 **File Organization**

### **Key Directories:**
```
src/
├── services/storage/       # Enhanced storage system (Phase 2+)
├── components/            # React components
├── store/                 # Redux state (language isolation critical)
├── data/{lang}/          # Language-specific data
├── config/               # Language rules configuration
└── utils/                # Testing utilities
```

### **Critical Files:**
- `src/services/storage/enhancedStorage.ts` - Main storage orchestration
- `src/store/gameSlice.ts` - Language isolation implementation
- `src/config/languageRules.ts` - Language-specific behavior
- `src/utils/testImmediateImprovements.ts` - System testing

## ✅ **Development Checklist**

### **Before Every Commit:**
- [ ] **Language isolation verified** - No cross-language data mixing
- [ ] **TypeScript compiles** - Zero errors required
- [ ] **Tests pass** - Run `testImmediateImprovements()`
- [ ] **Storage health > 80** - Check analytics
- [ ] **Documentation updated** - In existing files only
- [ ] **Performance targets met** - Cache hit rate > 85%

### **Code Review Criteria:**
1. **Language separation compliance** - Most critical
2. **Type safety** - No `any` without justification  
3. **Error handling** - Graceful fallbacks
4. **Performance impact** - Monitor storage analytics
5. **Testing coverage** - Unit and integration tests

## 🚨 **Common Mistakes to Avoid**

1. **Cross-language data mixing** - Will break user progress
2. **Direct localStorage access** - Use enhanced storage services
3. **Missing language validation** - Always validate language codes
4. **Ignoring storage health** - Monitor analytics regularly
5. **Creating standalone docs** - Update existing documentation
6. **Skipping tests** - Every feature needs verification

---

## 🎯 **Quick Reference**

### **Language-Agnostic Architecture:**
- Languages auto-discovered from `src/data/{language-code}/`
- Rules configured in `src/config/languageRules.ts`  
- No hardcoded language references in core logic

### **Current System Status (October 2025):**
- ✅ **Phase 2+ Complete**: Enhanced storage with 50x capacity increase
- ✅ **Backend Migration Ready**: Zero-code-change transition prepared
- ✅ **Real-time Analytics**: Health monitoring and performance optimization
- ✅ **Comprehensive Testing**: Full test suite available
- ✅ **Production Ready**: Enterprise-grade architecture deployed

### **Next Development Priorities:**
1. Advanced analytics dashboard UI
2. Backend API integration (when ready)
3. Cross-device synchronization features
4. Performance monitoring widgets

---

*For project overview and features, see README.md*
*For technical architecture details, see docs/ directory*
