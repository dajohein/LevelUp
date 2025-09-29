# Language Level Up 🎮

A modern, interactive language learning game featuring **three engaging quiz modes**: Multiple Choice for recognition, Letter Scramble for interactive spelling, and Open-Ended for mastery testing. Built with React, TypeScript, and Redux, it uses scientifically-proven spaced repetition and active recall methods with real-time feedback and keyboard support for an optimal learning experience.

## 🎯 Features

### Core Learning Features
- **Systematic Learning Algorithm**
  - Tracks individual word mastery levels (0-100 XP scale)
  - Adjusts difficulty based on performance
  - Prioritizes words needing practice
  - Implements spaced repetition with mastery-based progression

### Advanced Game Mechanics
- **Triple Quiz System**
  - **Multiple Choice**: Visual recognition for beginners (up to 50 XP)
  - **Letter Scramble**: Interactive word building with real-time feedback
  - **Open-Ended**: Advanced text input for mastery (50+ XP)
  - Intelligent mode selection based on word complexity and user mastery
  - German case sensitivity with partial credit system

### Comprehensive Progress Tracking
- **Persistent Learning Progress**
  - localStorage-based progress saving
  - Cross-tab synchronization
  - Comprehensive statistics tracking
  - Learning progress visualization by mastery level

### Quality of Life Features
- **Modern User Experience**
  - Emotion-styled components with theming
  - Responsive design with mobile support
  - **Keyboard & Touch Support**: Full keyboard navigation in Letter Scramble mode
  - Real-time visual feedback and smooth animations
  - Achievement system with notifications
  - Clean, distraction-free interface optimized for learning

## 🏗️ Architecture & Data Management

### Multi-Language Data Isolation
The application implements **strict language separation** to prevent data contamination between different languages:

- **Per-Language Storage**: Each language maintains isolated progress data (`de_progress`, `es_progress`)
- **Redux State Separation**: Language-specific progress loading prevents cross-contamination
- **Storage Safeguards**: Multiple validation layers ensure data integrity across browser sessions
- **Migration-Safe Design**: Robust data migration utilities for format changes

### Key Architectural Decisions
1. **Language-Scoped Progress**: `wordProgressStorage.save(languageCode, progress)` ensures strict isolation
2. **State Management**: Redux slices load only current language data, not mixed global state
3. **Storage Validation**: Debug logging and integrity checks prevent silent data corruption
4. **Reload Persistence**: Cross-tab synchronization maintains language separation after page reloads

### Lessons Learned: Preventing Data Mixing
- **Never merge cross-language data** in Redux state - always load language-specific subsets
- **Implement storage-level validation** to catch contamination early with debug logging
- **Use consistent language prefixing** in storage keys to prevent accidental merging
- **Test browser reload scenarios** as they often expose hidden state persistence bugs

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/dajohein/LevelUp.git
   cd LevelUp
   ```

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/dajohein/LevelUp.git
   cd LevelUp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

5. Run tests:
   ```bash
   npm test
   ```

### Development Commands

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint for code quality
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## 🎮 How to Use

1. **Select Language**: Choose from available language pairs (German ↔ Dutch, etc.)
2. **Start Learning**: Begin with Multiple Choice mode for new words
3. **Progress Through Modes**: 
   - 📝 **Multiple Choice** → Visual recognition and immediate feedback
   - 🔤 **Letter Scramble** → Interactive spelling with keyboard/touch support
   - ✍️ **Open-Ended** → Advanced recall testing (unlocked at 50+ XP)
4. **Track Progress**: Monitor your mastery levels and learning statistics
5. **Earn Achievements**: Complete challenges and maintain learning streaks

### 🎯 Letter Scramble Controls
- **🖱️ Click letters** to add them to your answer
- **⌨️ Type directly** - letters will auto-select from available options  
- **⌫ Backspace** to remove the last letter
- **🖱️ Click letters in your answer** to remove specific letters
- **💡 Hint button** adds the next correct letter
- **Real-time feedback** shows letter correctness as you type

## 📚 Documentation

### Architecture Overview

The application follows a modern React architecture with Redux state management:

```
LevelUp/
├── src/
│   ├── components/        # React components
│   │   ├── animations/    # Animation components
│   │   ├── feedback/      # User feedback components
│   │   └── quiz/          # Quiz-specific components
│   ├── store/             # Redux store and slices
│   │   ├── gameSlice.ts   # Game state management
│   │   ├── sessionSlice.ts # Session tracking
│   │   └── achievementsSlice.ts # Achievement system
│   ├── services/          # Business logic services
│   │   ├── wordService.ts # Vocabulary management
│   │   ├── masteryService.ts # Learning algorithm
│   │   ├── storageService.ts # Persistence layer
│   │   └── answerValidation.ts # Answer checking logic
│   ├── data/              # Language vocabulary data
│   └── types/             # TypeScript type definitions
├── public/                # Static assets
├── index.html            # Main HTML template
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies and scripts
```

### Core Systems

1. **Redux State Management**
   - Centralized application state
   - Persistent storage with localStorage
   - Cross-tab synchronization
   - Type-safe state updates

2. **Systematic Learning Algorithm**
   - Mastery-based progression (0-100 XP)
   - Spaced repetition system
   - Adaptive quiz mode switching
   - Performance analysis and word prioritization

3. **Modern React Architecture**
   - Functional components with hooks
   - Emotion-styled components
   - TypeScript for type safety
   - Component-based UI structure

### Game Rules

1. **Learning Progression & Quiz Modes**

   **📝 Multiple Choice Mode**
   - Visual recognition for new vocabulary (0-49 XP)
   - 4 randomized answer options
   - Immediate feedback with correct answer highlighting
   - Context clues hidden until after answering

   **🔤 Letter Scramble Mode** 
   - Interactive word building with scrambled letters
   - **Dual Input Methods**: Click letters OR type directly with keyboard
   - **Real-time Visual Feedback**: 
     - 🟢 Green: Correct letter in correct position
     - 🟠 Orange: Correct letter in wrong position  
     - 🔴 Red: Wrong letter
   - **Smart Features**: Backspace support, hint system, auto-completion detection
   - Perfect for reinforcing spelling and word structure

   **✍️ Open-Ended Mode**
   - Advanced text input for mastery verification (50+ XP)
   - German case sensitivity with partial credit
   - Flexible answer validation (handles articles, variations)
   - Context provided after answering to prevent spoilers

   **🎯 Intelligent Mode Selection**
   - Automatic progression based on mastery level
   - Considers word complexity and user performance
   - Balanced learning curve from recognition to production

2. **Scoring System**
   ```typescript
   // Base scoring with mode multipliers
   const baseScore = 10 * modeMultiplier * (1 + Math.floor(streak / 5));
   const finalScore = baseScore * capitalizationPenalty; // For German
   ```

3. **Mastery System**
   ```typescript
   // XP-based mastery progression
   const calculateMasteryGain = (currentXP: number, isCorrect: boolean, mode: QuizMode) => {
     const baseGain = isCorrect ? (mode === 'open-answer' ? 8 : 5) : -2;
     const difficultyMultiplier = currentXP < 20 ? 1.5 : 1.0;
     return Math.max(0, Math.min(100, currentXP + baseGain * difficultyMultiplier));
   };
   ```

## 📚 Adding Language Content

Language vocabularies are defined in `src/data/` as JSON files. Each language follows this structure:

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
    },
    {
      "id": "de_2", 
      "term": "die Katze",
      "definition": "the cat",
      "direction": "term-to-definition"
    }
  ]
}
            definition: ["Translation 1", "Translation 2"]
        },
        
        // Words with context
        {
            term: "Contextualized word",
            definition: "Translation",
            context: {
                sentence: "Example sentence using the word",
                translation: "Translation of the example sentence"
            }
        }
    ]
}
### Supported Languages

Currently supported languages with full vocabulary sets:
- **German (Deutsch)** - 48 vocabulary entries with case sensitivity
- **Spanish (Español)** - Comprehensive vocabulary set

### Adding New Languages

To add a new language:

1. Create a new JSON file in `src/data/` (e.g., `fr.json`)
2. Follow the existing structure with unique IDs
3. Add appropriate language metadata (name, flag emoji)
4. Test with all three quiz modes (multiple choice, letter scramble, and open-ended)
5. Verify keyboard input works correctly for your language's character set

## 🛠️ Development Guide

### Technology Stack

- **Frontend**: React 18 with TypeScript and modern hooks
- **State Management**: Redux Toolkit with localStorage persistence
- **Styling**: Emotion (CSS-in-JS) with responsive theming and animations
- **Build Tool**: Vite for fast development and optimized production builds
- **User Interface**: 
  - Interactive quiz components with real-time feedback
  - Keyboard event handling for enhanced accessibility
  - Smooth animations with CSS-in-JS keyframes
- **Testing**: Vitest for unit testing
- **Code Quality**: ESLint + Prettier for consistent, maintainable code

### Testing

The project uses Vitest for testing. Key test areas:

```typescript
// Service tests
describe('masteryService', () => {
  test('should calculate mastery gain correctly', () => {
    const newXP = calculateMasteryGain(0, true, 'multiple-choice');
    expect(newXP).toBeGreaterThan(0);
  });
});

// Component tests  
describe('Game Component', () => {
  test('should render with correct initial state', () => {
    render(<Game />);
    expect(screen.getByText(/Select Language/i)).toBeInTheDocument();
  });
});
    });
});
```

```

Run tests with:
```bash
npm test                # Run all tests once  
npm run test:watch     # Watch mode for development
```

### Configuration

### Performance Optimizations

The codebase includes several performance improvements for optimal user experience:

- **Reduced Re-renders**: Eliminated circular dependencies in useEffect hooks
- **Optimized Logging**: Smart debugging that only shows relevant information
- **Efficient State Management**: Proper cleanup of event listeners and timeouts
- **Styled Components**: Replaced inline styles with cached styled components
- **Smart Quiz Selection**: Optimized word selection algorithm with mastery-based filtering

### Configuration

The application uses TypeScript configuration and environment-based settings:

```typescript
// Game constants in services/masteryService.ts
export const MASTERY_CONFIG = {
  // Learning progression
  MASTERY_THRESHOLD: 100,      // Maximum XP per word
  QUIZ_MODE_SWITCH: 50,        // XP threshold for open-ended mode
  
  // XP gains by quiz mode
  CORRECT_GAIN_MC: 5,          // Multiple choice correct answer
  CORRECT_GAIN_SCRAMBLE: 6,    // Letter scramble correct answer
  CORRECT_GAIN_OPEN: 8,        // Open-ended correct answer  
  INCORRECT_PENALTY: -2,       // Wrong answer penalty
  
  // Difficulty scaling
  BEGINNER_MULTIPLIER: 1.5,    // Extra XP for new words (< 20 XP)
  
  // German case sensitivity
  CAPITALIZATION_PENALTIES: {
    MINOR: 0.9,                // 10% penalty for minor errors
    MAJOR: 0.7,                // 30% penalty for major errors
    MINIMUM: 0.5               // Minimum 50% of points retained
  }
};
```

### Performance Features

1. **React Optimizations**
   ```typescript
   // Efficient state updates with Redux Toolkit
   const gameSlice = createSlice({
     name: 'game',
     initialState,
     reducers: {
       // Immer for immutable updates
       updateWordProgress: (state, action) => {
         state.wordProgress[action.payload.wordId] = action.payload;
       }
     }
   });
   ```

2. **Persistent Storage Optimization**
   ```typescript
   // Debounced persistence to avoid excessive localStorage writes
   const debouncedSave = debounce((state: RootState) => {
     gameStateStorage.save(state.game);
   }, 1000);
   ```
   }
   ```

## �️ Contributing

### Development Workflow

1. **Setup Development Environment**
   ```bash
   git clone https://github.com/dajohein/LevelUp.git
   cd LevelUp
   npm install
   npm run dev
   ```

2. **Making Changes**
   - Write tests first (TDD approach)
   - Follow TypeScript and React best practices
   - Update documentation when needed
   - Run linter: `npm run lint`
   - Format code: `npm run format`

3. **Testing**
   ```bash
   npm test               # Run all tests once
   ```

### Adding Features

1. **New Language Support**
   - Create JSON file in `src/data/` following existing structure
   - Add appropriate language-specific rules in `answerValidation.ts`
   - **CRITICAL**: Implement proper language isolation in storage and Redux state
   - Test with all quiz modes (multiple choice, letter scramble, open-ended)
   - Ensure keyboard input compatibility for special characters
   - **Test cross-language data separation** thoroughly, including browser reloads

2. **Game Mechanics**
   - Add logic to appropriate service files
   - Update Redux slices for state management
   - **Maintain language-scoped state loading** - never merge cross-language data
   - Create or update React components as needed
   - Add TypeScript types in `src/types/`
   - **Implement storage validation** with debug logging for new data structures

### Data Management Best Practices

1. **Language Isolation Patterns**
   ```typescript
   // ✅ CORRECT: Language-scoped storage
   const progress = wordProgressStorage.load(currentLanguage);
   
   // ❌ WRONG: Global mixed storage
   const allProgress = wordProgressStorage.loadAll();
   ```

2. **Redux State Management**
   ```typescript
   // ✅ CORRECT: Load only current language
   const languageProgress = wordProgressStorage.load(savedState.language);
   
   // ❌ WRONG: Load mixed progress into global state
   const mixedProgress = { ...germanProgress, ...spanishProgress };
   ```

3. **Storage Validation**
   ```typescript
   // ✅ CORRECT: Add validation and logging
   save: (languageCode: string, data: Record<string, WordProgress>) => {
     logger.debug(`Saving ${Object.keys(data).length} items for ${languageCode}`);
     // Validation logic...
   }
   ```

## � Troubleshooting

### Common Language Data Issues

**Problem**: Language XP/levels showing identical values across different languages
- **Cause**: Cross-language data contamination in Redux state or localStorage
- **Solution**: Check `gameSlice.ts` loadPersistedState - ensure language-scoped loading
- **Prevention**: Always use `wordProgressStorage.load(languageCode)` instead of mixed loading

**Problem**: Data mixing after browser reload
- **Cause**: Storage persistence loading mixed data into Redux state
- **Solution**: Implement storage-level validation and language-specific state initialization
- **Debug**: Enable storage debug logging to trace data flow

**Problem**: XP/level in top navigation bar not updating when switching languages
- **Cause**: Navigation component using mixed Redux state instead of language-specific data
- **Solution**: Use `wordProgressStorage.load(currentLanguage)` instead of Redux `wordProgress`
- **Fix**: Ensures top bar always shows current language's XP and level

**Problem**: Word IDs colliding across languages
- **Cause**: Same numeric IDs (1, 2, 3) used across different language modules
- **Solution**: This is expected - language separation happens at storage level, not ID level
- **Important**: Never rely on word IDs alone - always include language context

### Data Management Tools

**User-Friendly Reset Options:**
1. Navigate to the **Profile page** (click "Manage Data" button on languages overview)
2. Scroll to the **Language Data Management** section
3. Choose your reset option:
   - **Reset All [Language]**: Completely resets all progress for a language
   - **Reset [Module Name]**: Resets progress for a specific module within a language

**Safety Features:**
- Confirmation dialogs prevent accidental data loss
- Reset buttons are disabled when there's no progress to reset
- Automatic page reload ensures all components refresh with clean data

### Debug Tools
```javascript
// Browser console commands for debugging storage
localStorage.getItem('levelup_word_progress_de'); // Check German progress
localStorage.getItem('levelup_word_progress_es'); // Check Spanish progress

// Enable debug logging in development
localStorage.setItem('debug', 'true');
```

## �📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📚 Documentation

- **[Language Separation Architecture](docs/LANGUAGE_SEPARATION.md)**: Comprehensive guide on multi-language data isolation, debugging, and architectural patterns
- **[Development Guidelines](.github/copilot/INSTRUCTION.md)**: Complete development instructions and best practices

## 🎯 Key Features Summary

- **🧠 Systematic Learning**: XP-based mastery system with spaced repetition
- **🎮 Adaptive Gameplay**: Automatic quiz mode switching based on mastery level  
- **🇩🇪 Language-Specific Features**: German case sensitivity with partial credit
- **💾 Persistent Progress**: Cross-tab synchronized localStorage-based saving
- **⚡ Modern Architecture**: React 18 + TypeScript + Redux Toolkit + Vite
- **🎨 Polished UI**: Emotion-styled components with smooth animations
- **🌍 Multi-Language Support**: Strict language data isolation preventing cross-contamination

Built with ❤️ for effective language learning through scientifically-proven methods.
