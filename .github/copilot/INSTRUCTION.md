# LevelUp Language Learning Game - Development Guidelines

## Project Overview

LevelUp is a modern, interactive language learning application built with React, TypeScript, and Redux. It focuses on vocabulary acquisition through scientifically-proven methods including spaced repetition, active recall, and systematic learning algorithms. The application features German case sensitivity, persistent progress tracking, and adaptive quiz modes.

## Core Principles

1. **Learning-First Design**
   - Prioritize educational effectiveness through evidence-based methods
   - Implement mastery-based progression (0-100 XP per word)
   - Automatic quiz mode switching based on learner competency
   - Language-specific features (e.g., German capitalization teaching)

2. **Modern Development Practices**
   - TypeScript for type safety and developer experience
   - React functional components with hooks
   - Redux Toolkit for predictable state management
   - Emotion for scalable CSS-in-JS styling

3. **User Experience Excellence**
   - Persistent progress with cross-tab synchronization
   - Real-time feedback and smooth animations
   - Responsive design for all screen sizes
   - Comprehensive achievement and progress systems

## Architecture Guidelines

### Project Structure
```
src/
├── components/          # React components
│   ├── animations/      # Animation components
│   ├── feedback/        # User feedback components
│   └── quiz/           # Quiz-specific components
├── store/              # Redux state management
│   ├── gameSlice.ts    # Game state and logic
│   ├── sessionSlice.ts # Session tracking
│   └── types.ts        # State type definitions
├── services/           # Business logic services
│   ├── wordService.ts  # Vocabulary management
│   ├── masteryService.ts # Learning algorithm
│   ├── storageService.ts # Persistence layer
│   └── answerValidation.ts # Language-specific validation
├── data/               # Language vocabulary data
├── styles/             # Theme and styling utilities
└── types/              # TypeScript type definitions
```

### Technology Stack

- **Frontend**: React 18 with TypeScript
- **State Management**: Redux Toolkit with persistence middleware
- **Styling**: Emotion (CSS-in-JS) with comprehensive theming
- **Build Tool**: Vite for fast development and optimized builds
- **Testing**: Vitest for unit testing
- **Code Quality**: Prettier for consistent formatting

## Development Best Practices

### React Components

1. **Functional Components with Hooks**
   ```typescript
   import React, { useState, useEffect } from 'react';
   import { useSelector, useDispatch } from 'react-redux';
   import styled from '@emotion/styled';

   interface ComponentProps {
     title: string;
     onAction: (value: string) => void;
   }

   export const MyComponent: React.FC<ComponentProps> = ({ title, onAction }) => {
     const [localState, setLocalState] = useState<string>('');
     const gameState = useSelector((state: RootState) => state.game);
     const dispatch = useDispatch();

     useEffect(() => {
       // Side effects here
     }, [dependencies]);

     return (
       <Container>
         <Title>{title}</Title>
         {/* Component JSX */}
       </Container>
     );
   };
   ```

2. **Styled Components with Theme**
   ```typescript
   const Container = styled.div`
     padding: ${props => props.theme.spacing.lg};
     background-color: ${props => props.theme.colors.surface};
     border-radius: ${props => props.theme.borderRadius};
     
     @media (max-width: 768px) {
       padding: ${props => props.theme.spacing.md};
     }
   `;
   ```

### Redux State Management

1. **Slice Structure**
   ```typescript
   import { createSlice, PayloadAction } from '@reduxjs/toolkit';

   interface StateType {
     property: string;
     data: DataType[];
   }

   const initialState: StateType = {
     property: '',
     data: []
   };

   const sliceName = createSlice({
     name: 'sliceName',
     initialState,
     reducers: {
       updateProperty: (state, action: PayloadAction<string>) => {
         state.property = action.payload;
         // Immer allows direct mutations
       },
       addData: (state, action: PayloadAction<DataType>) => {
         state.data.push(action.payload);
       }
     }
   });

   export const { updateProperty, addData } = sliceName.actions;
   export default sliceName.reducer;
   ```

2. **Type-Safe Selectors**
   ```typescript
   import { RootState } from './store';

   export const selectGameData = (state: RootState) => state.game.currentWord;
   export const selectProgress = (state: RootState) => state.game.wordProgress;
   ```

### Service Layer

1. **Business Logic Services**
   ```typescript
   export interface WordProgress {
     wordId: string;
     xp: number;
     lastPracticed: string;
     timesCorrect: number;
     timesIncorrect: number;
   }

   export const calculateMasteryGain = (
     currentXP: number, 
     isCorrect: boolean, 
     mode: QuizMode
   ): number => {
     const baseGain = isCorrect ? (mode === 'open-answer' ? 8 : 5) : -2;
     const difficultyMultiplier = currentXP < 20 ? 1.5 : 1.0;
     return Math.max(0, Math.min(100, currentXP + baseGain * difficultyMultiplier));
   };
   ```

2. **Persistent Storage**
   ```typescript
   export const storageService = {
     save: <T>(key: string, data: T): void => {
       try {
         localStorage.setItem(key, JSON.stringify(data));
       } catch (error) {
         console.error(`Failed to save ${key}:`, error);
       }
     },

     load: <T>(key: string, defaultValue: T): T => {
       try {
         const stored = localStorage.getItem(key);
         return stored ? JSON.parse(stored) : defaultValue;
       } catch (error) {
         console.error(`Failed to load ${key}:`, error);
         return defaultValue;
       }
     }
   };
   ```

## Feature Implementation Guidelines

### Learning Modules
- Implement clear difficulty progression
- Support multiple learning modes
- Track user performance metrics
- Adapt content based on user mastery

### Learning System Implementation

1. **Mastery-Based Progression**
   ```typescript
   // XP thresholds for quiz mode switching
   const MASTERY_THRESHOLDS = {
     BEGINNER: 0,        // Multiple choice mode
     INTERMEDIATE: 50,   // Switch to open-ended
     MASTERED: 100       // Maximum XP
   };

   // Implement intelligent word selection
   const selectNextWord = (wordProgress: WordProgress[], language: string) => {
     const priorityWords = wordProgress
       .filter(word => word.xp < 50) // Focus on non-mastered words
       .sort((a, b) => a.lastPracticed.localeCompare(b.lastPracticed));
     
     return priorityWords[0] || getRandomWord(language);
   };
   ```

2. **Language-Specific Features**
   ```typescript
   // German case sensitivity implementation
   interface AnswerValidation {
     isCorrect: boolean;
     capitalizationCorrect: boolean;
     capitalizationPenalty: number; // 0.5-1.0 multiplier
   }

   export const validateAnswer = (
     userAnswer: string, 
     correctAnswer: string, 
     language: string
   ): AnswerValidation => {
     if (language === 'de') {
       return checkGermanCapitalization(userAnswer, correctAnswer);
     }
     // Standard case-insensitive validation
     return { 
       isCorrect: userAnswer.toLowerCase() === correctAnswer.toLowerCase(),
       capitalizationCorrect: true,
       capitalizationPenalty: 1.0
     };
   };
   ```

### Persistent Storage Strategy

1. **Redux Persistence Middleware**
   ```typescript
   export const persistenceMiddleware: Middleware = store => next => action => {
     const result = next(action);
     const state = store.getState();
     
     // Debounced saving to localStorage
     debouncedSave(state);
     
     return result;
   };
   ```

2. **Cross-Tab Synchronization**
   ```typescript
   useEffect(() => {
     const handleStorageChange = (e: StorageEvent) => {
       if (e.key === STORAGE_KEYS.GAME_STATE && e.newValue) {
         const newState = JSON.parse(e.newValue);
         dispatch(syncStateFromStorage(newState));
       }
     };

     window.addEventListener('storage', handleStorageChange);
     return () => window.removeEventListener('storage', handleStorageChange);
   }, [dispatch]);
   ```

### UI/UX Implementation

1. **Responsive Design Patterns**
   ```typescript
   const useBreakpoint = () => {
     const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
     
     useEffect(() => {
       const handleResize = () => {
         const width = window.innerWidth;
         if (width < 768) setBreakpoint('mobile');
         else if (width < 1024) setBreakpoint('tablet');
         else setBreakpoint('desktop');
       };

       handleResize();
       window.addEventListener('resize', handleResize);
       return () => window.removeEventListener('resize', handleResize);
     }, []);

     return breakpoint;
   };
   ```

2. **Animation Best Practices**
   ```typescript
   const FadeInAnimation = styled.div<{ show: boolean }>`
     opacity: ${props => props.show ? 1 : 0};
     transform: translateY(${props => props.show ? 0 : '20px'});
     transition: all 0.3s ease-in-out;
   `;
   ```

## Testing Guidelines

### Unit Testing with Vitest
```typescript
import { describe, it, expect } from 'vitest';
import { calculateMasteryGain } from '../services/masteryService';

describe('masteryService', () => {
  it('should increase XP for correct answers', () => {
    const newXP = calculateMasteryGain(10, true, 'multiple-choice');
    expect(newXP).toBeGreaterThan(10);
  });

  it('should decrease XP for incorrect answers', () => {
    const newXP = calculateMasteryGain(20, false, 'multiple-choice');
    expect(newXP).toBeLessThan(20);
  });
});
```

### Component Testing
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { Game } from '../components/Game';

describe('Game Component', () => {
  it('should render language selection initially', () => {
    render(
      <Provider store={mockStore}>
        <Game />
      </Provider>
    );
    expect(screen.getByText(/Select Language/i)).toBeInTheDocument();
  });
});
```

## Performance Optimization

1. **Bundle Optimization**
   - Use Vite's built-in code splitting
   - Implement lazy loading for large components
   - Optimize asset loading and caching

2. **Runtime Performance**
   ```typescript
   // Memoize expensive calculations
   const wordStats = useMemo(() => {
     return calculateWordStatistics(wordProgress);
   }, [wordProgress]);

   // Debounce user input
   const debouncedValidation = useCallback(
     debounce((answer: string) => {
       dispatch(checkAnswer(answer));
     }, 300),
     [dispatch]
   );
   ```

## Accessibility Standards

1. **Keyboard Navigation**
   ```typescript
   const handleKeyDown = (e: KeyboardEvent) => {
     switch (e.key) {
       case 'Enter':
       case ' ':
         handleSubmit();
         break;
       case 'Escape':
         handleCancel();
         break;
     }
   };
   ```

2. **Screen Reader Support**
   ```typescript
   <button
     aria-label={`Select answer: ${option}`}
     aria-describedby="question-text"
     role="button"
     tabIndex={0}
   >
     {option}
   </button>
   ```

## Development Workflow

### Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run tests
npm run format       # Format code with Prettier
npm run format:check # Check code formatting
```

### Git Workflow
```bash
# Feature development
git checkout -b feature/german-case-sensitivity
git commit -m "feat: implement German capitalization validation"
git push origin feature/german-case-sensitivity

# Commit message format
# feat: new feature
# fix: bug fix
# docs: documentation
# style: formatting
# refactor: code restructuring
# test: adding tests
```

## Key Implementation Notes

1. **Language Data Structure**
   ```json
   {
     "name": "Deutsch",
     "flag": "🇩🇪",
     "words": [
       {
         "id": "de_1",
         "term": "der Hund",
         "definition": "the dog", 
         "direction": "definition-to-term"
       }
     ]
   }
   ```

2. **State Management Patterns**
   - Keep state normalized and flat
   - Use Redux Toolkit for type safety
   - Implement optimistic UI updates
   - Handle loading and error states

3. **Component Organization**
   - One component per file
   - Co-locate styles with components
   - Use TypeScript interfaces for props
   - Implement proper error boundaries

This architecture supports scalable, maintainable, and performant language learning experiences with modern web technologies.
   - feature/*: New features
   - fix/*: Bug fixes

## Continuous Improvement

1. **Code Reviews**
   - Check architectural alignment
   - Verify best practices
   - Ensure documentation
   - Test coverage

2. **Refactoring**
   - Identify technical debt
   - Improve modularity
   - Enhance performance
   - Update dependencies

## Learning Integration

1. **Spaced Repetition**
   - Track word exposure
   - Calculate optimal intervals
   - Adjust difficulty
   - Monitor progress

2. **Active Recall**
   - Vary question types
   - Progressive difficulty
   - Context-based learning
   - Performance feedback

## Game Design Principles

1. **Engagement**
   - Clear objectives
   - Immediate feedback
   - Progress visualization
   - Reward systems

2. **Learning Flow**
   - Adaptive difficulty
   - Varied exercises
   - Context integration
   - Performance tracking