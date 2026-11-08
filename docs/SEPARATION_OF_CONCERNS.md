# Separation of Concerns - Storage Architecture

## Modal interactions

`ModalDialog` wraps the browser's native `showModal()` API for the profile reset and device-link
dialogs. It names each dialog from its visible heading, keeps keyboard focus inside, and returns
focus to the opening control on dismissal. Escape closes either dialog; reset also permits backdrop
dismissal, except while a reset is in progress. Reset initially focuses Cancel and guards against
duplicate requests and dismissal while the operation is pending. This is UI-only behavior and does
not change storage or language isolation.

Run `npm test -- --runInBand src/components/__tests__/modalDialogs.test.tsx` for component
coverage. jsdom substitutes the native dialog methods; verify native focus containment with a real
browser and perform a separate screen-reader walkthrough on each supported platform. - Storage Architecture

## 🏗️ **Architecture Overview**

The LevelUp application follows a **layered storage architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERACTIONS                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                 REACT COMPONENTS                            │
│  • Game.tsx - Main game logic                              │
│  • QuizRenderer.tsx - Quiz interaction handling            │
│  • Dispatches Redux actions only                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  REDUX STORE                                │
│  • gameSlice.ts - Pure state management                    │
│  • sessionSlice.ts - Session state tracking                │
│  • NO direct storage calls                                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│             PERSISTENCE MIDDLEWARE                          │
│  • Intercepts specific Redux actions                       │
│  • Coordinates save timing (immediate vs debounced)        │
│  • Prevents duplicate operations                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              STORAGE ORCHESTRATOR                           │
│  • Centralized save queue management                       │
│  • Deduplication and batching                              │
│  • Cross-component coordination                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│               STORAGE SERVICES                              │
│  • wordProgressStorage - Language-isolated progress        │
│  • gameStateStorage - Game configuration                   │
│  • sessionStateStorage - Session tracking                  │
│  • Direct localStorage/IndexedDB operations                │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 **Component Responsibilities**

### **React Components** 
**Single Responsibility**: UI rendering and user interaction
- Dispatch Redux actions for state changes
- Handle user input and validation
- Manage local UI state (transitions, animations)
- **Never directly call storage services**

### **Redux Slices**
**Single Responsibility**: Pure state management
- Respond to dispatched actions
- Update application state immutably
- Handle state derivation and validation
- **No side effects or storage operations**

### **Persistence Middleware**
**Single Responsibility**: Storage coordination
- Intercept actions that require persistence
- Determine save timing (immediate vs debounced)
- Route saves to storage orchestrator
- Handle cross-tab synchronization

### **Storage Orchestrator**
**Single Responsibility**: Save queue management
- Centralized queue for all save operations
- Deduplication to prevent redundant saves
- Batching and debouncing for performance
- Statistics and health monitoring

### **Storage Services**
**Single Responsibility**: Data persistence
- Direct interaction with browser storage APIs
- Language isolation enforcement
- Error handling and fallback strategies
- Cross-storage-tier management (localStorage → IndexedDB → Remote)

## 🔄 **Data Flow Examples**

### **Standard Game Answer Flow**
```typescript
// 1. User answers question
onAnswer={(correct) => { ... }}

// 2. Component dispatches action  
dispatch(addCorrectAnswer({}));

// 3. Redux slice updates state
state.progress.correctAnswers += 1;

// 4. Middleware intercepts action
if (DEBOUNCED_PERSIST_ACTIONS.includes(action.type))

// 5. Orchestrator queues save
storageOrchestrator.saveCurrentState('debounced');

// 6. Storage service persists data
sessionStateStorage.save(sessionData);
```

### **Enhanced Mode Flow**
```typescript
// 1. Enhanced answer processing (no Redux actions)
const result = handleEnhancedAnswer(correct);

// 2. Internal enhanced service manages state
enhancedWordService.recordAnswer(correct, timeSpent);

// 3. No middleware triggers (enhanced mode is self-contained)

// 4. Enhanced service manages its own persistence strategy
```

## 🚫 **Anti-Patterns Avoided**

### **Before Optimization**
```typescript
// ❌ Multiple save triggers per action
gameSlice: saveGameState(state);           // Direct save #1
sessionSlice: saveSessionState(state);     // Direct save #2  
middleware: storageOrchestrator.save();    // Middleware save #3
```

### **After Optimization**
```typescript
// ✅ Single coordinated save
middleware: storageOrchestrator.save();    // Only save point
```

## 📊 **Performance Benefits**

- **67% reduction** in save operations per user action
- **Eliminated race conditions** between competing saves
- **Smart debouncing** prevents storage queue overflow
- **Language isolation** maintained at all levels
- **Type safety** preserved throughout the stack

## 🧪 **Testing Strategy**

Each layer can be tested independently:
- **Components**: User interaction simulation
- **Redux**: Action/state verification  
- **Middleware**: Save coordination testing
- **Orchestrator**: Queue management validation
- **Storage**: Persistence verification

This architecture ensures **maintainability**, **performance**, and **reliability** while keeping concerns properly separated.