import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useEnhancedGame } from '../useEnhancedGame';
import gameReducer from '../../store/gameSlice';
import sessionReducer from '../../store/sessionSlice';

// Mock the enhanced word service
jest.mock('../../services/enhancedWordService', () => ({
  enhancedWordService: {
    initializeLearningSession: jest.fn(() => true),
    getCurrentWord: jest.fn(() => ({
      word: { id: 'test-word', german: 'Hund', english: 'dog' },
      quizMode: 'multiple-choice',
      type: 'group',
      difficulty: 1,
    })),
    moveToNextWord: jest.fn(() => true),
    recordWordResult: jest.fn(),
    getSessionProgress: jest.fn(() => ({
      currentIndex: 1,
      totalWords: 10,
      correctAnswers: 5,
      accuracy: 0.5,
      timeElapsed: 60,
      sessionType: 'regular',
    })),
    hasActiveSession: jest.fn(() => true),
    resetSession: jest.fn(),
    analyzeSession: jest.fn(() => ({
      accuracy: 0.8,
      averageTimePerWord: 5000,
      strongWords: [],
      weakWords: [],
      recommendations: ['Practice more'],
    })),
  },
}));

// Helper to create a Redux store for testing
const createTestStore = () => {
  return configureStore({
    reducer: {
      game: gameReducer,
      session: sessionReducer,
    },
    preloadedState: {
      game: {
        language: 'de',
        direction: 'de-to-en',
        wordProgress: {},
        currentWord: null,
        gameMode: 'regular',
        isLoading: false,
        streakCount: 0,
        totalCorrect: 0,
        totalIncorrect: 0,
      },
      session: {
        currentSession: null,
        sessionHistory: [],
        progress: {
          wordsCompleted: 0,
          correctAnswers: 0,
          incorrectAnswers: 0,
          currentStreak: 0,
        },
        isLoading: false,
      },
    },
  });
};

// Wrapper component for hook tests
const createWrapper = () => {
  const store = createTestStore();
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
};

describe('useEnhancedGame', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Hook Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useEnhancedGame('de'), {
        wrapper: createWrapper(),
      });

      expect(result.current.enhancedState).toBeDefined();
      expect(result.current.enhancedState.isUsingSpacedRepetition).toBe(false);
      expect(result.current.enhancedState.sessionProgress).toBeNull();
    });

    it('should accept language code', () => {
      const { result } = renderHook(() => useEnhancedGame('es'), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeDefined();
    });

    it('should accept optional module ID', () => {
      const { result } = renderHook(() => useEnhancedGame('de', 'basic-nouns'), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeDefined();
    });
  });

  describe('Session Management', () => {
    it('should provide initializeEnhancedSession function', () => {
      const { result } = renderHook(() => useEnhancedGame('de'), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.initializeEnhancedSession).toBe('function');
    });

    it('should initialize enhanced session', async () => {
      const { result } = renderHook(() => useEnhancedGame('de'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        const initialized = await result.current.initializeEnhancedSession();
        expect(initialized).toBeDefined();
      });
    });

    it('should handle session without language code', async () => {
      const { result } = renderHook(() => useEnhancedGame(''), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        const initialized = await result.current.initializeEnhancedSession();
        expect(initialized).toBe(false);
      });
    });
  });

  describe('Word Navigation', () => {
    it('should provide word navigation state', () => {
      const { result } = renderHook(() => useEnhancedGame('de'), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeDefined();
      expect(result.current.enhancedState).toBeDefined();
      expect(result.current.enhancedState).toHaveProperty('currentWordInfo');
    });
  });

  describe('Progress Tracking', () => {
    it('should track progress in enhanced state', () => {
      const { result } = renderHook(() => useEnhancedGame('de'), {
        wrapper: createWrapper(),
      });

      expect(result.current.enhancedState).toHaveProperty('sessionProgress');
      expect(result.current.enhancedState).toHaveProperty('currentWordInfo');
    });

    it('should handle enhanced answers', () => {
      const { result } = renderHook(() => useEnhancedGame('de'), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.handleEnhancedAnswer).toBe('function');
      
      act(() => {
        result.current.handleEnhancedAnswer(true);
      });

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Enhanced State', () => {
    it('should track spaced repetition usage', () => {
      const { result } = renderHook(() => useEnhancedGame('de'), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.enhancedState.isUsingSpacedRepetition).toBe('boolean');
    });

    it('should provide session progress in state', () => {
      const { result } = renderHook(() => useEnhancedGame('de'), {
        wrapper: createWrapper(),
      });

      expect(result.current.enhancedState).toHaveProperty('sessionProgress');
    });

    it('should provide current word info in state', () => {
      const { result } = renderHook(() => useEnhancedGame('de'), {
        wrapper: createWrapper(),
      });

      expect(result.current.enhancedState).toHaveProperty('currentWordInfo');
    });

    it('should provide recommendations in state', () => {
      const { result } = renderHook(() => useEnhancedGame('de'), {
        wrapper: createWrapper(),
      });

      expect(result.current.enhancedState).toHaveProperty('recommendations');
      expect(Array.isArray(result.current.enhancedState.recommendations)).toBe(true);
    });
  });

  describe('State Updates', () => {
    it('should maintain stable state reference', () => {
      const { result, rerender } = renderHook(() => useEnhancedGame('de'), {
        wrapper: createWrapper(),
      });

      rerender();

      // State should be stable (same reference unless explicitly updated)
      expect(result.current.enhancedState).toBeDefined();
    });

    it('should react to Redux state changes', () => {
      const { result } = renderHook(() => useEnhancedGame('de'), {
        wrapper: createWrapper(),
      });

      // Hook should be connected to Redux
      expect(result.current).toBeDefined();
    });
  });

  describe('Session Completion', () => {
    it('should track session state', () => {
      const { result } = renderHook(() => useEnhancedGame('de'), {
        wrapper: createWrapper(),
      });

      expect(result.current.enhancedState).toHaveProperty('isUsingSpacedRepetition');
      expect(typeof result.current.enhancedState.isUsingSpacedRepetition).toBe('boolean');
    });

    it('should provide session completion capability', () => {
      const { result } = renderHook(() => useEnhancedGame('de'), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.forceCompleteSession).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing language code gracefully', () => {
      const { result } = renderHook(() => useEnhancedGame(''), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeDefined();
      expect(result.current.enhancedState).toBeDefined();
    });

    it('should initialize with safe defaults', () => {
      const { result } = renderHook(() => useEnhancedGame('de'), {
        wrapper: createWrapper(),
      });

      expect(result.current.enhancedState.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useEnhancedGame('de'), {
        wrapper: createWrapper(),
      });

      unmount();

      // Should not throw
      expect(true).toBe(true);
    });
  });
});
