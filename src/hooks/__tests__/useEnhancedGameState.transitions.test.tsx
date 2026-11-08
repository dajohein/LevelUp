import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { act, renderHook } from '@testing-library/react';
import { useEnhancedGameState, UseEnhancedGameStateProps } from '../useEnhancedGameState';
import { Word } from '../../services/wordService';
import { SessionProgress } from '../../store/sessionSlice';
import gameReducer from '../../store/gameSlice';
import sessionReducer from '../../store/sessionSlice';

jest.mock('../useEnhancedGame', () => ({
  useEnhancedGame: () => ({
    isUsingSpacedRepetition: false,
    handleEnhancedAnswer: jest.fn(() => false),
    getCurrentWordInfo: jest.fn(() => null),
    getSessionStats: jest.fn(() => null),
    forceCompleteSession: jest.fn(),
    initializeEnhancedSession: jest.fn(async () => true),
  }),
}));

jest.mock('../../features/audio/AudioContext', () => ({
  useAudio: () => ({ playCorrect: jest.fn(), playIncorrect: jest.fn() }),
}));

jest.mock('../useLevelUpDetection', () => ({
  useLevelUpDetection: () => ({
    showLevelUp: false,
    newLevel: 0,
    totalXP: 0,
    closeLevelUp: jest.fn(),
  }),
}));

const sessionProgress: SessionProgress = {
  wordsCompleted: 0,
  correctAnswers: 0,
  incorrectAnswers: 0,
  currentStreak: 0,
  longestStreak: 0,
  timeElapsed: 0,
  hintsUsed: 0,
  score: 0,
  bonusPoints: 0,
};

const makeProps = (currentWord: Word): UseEnhancedGameStateProps => ({
  languageCode: 'de',
  currentWord,
  quizMode: 'multiple-choice',
  wordProgress: {},
  currentSession: null,
  sessionProgress,
  isSessionActive: false,
  sessionStartTime: null,
  gameLanguage: 'de',
});

const makeWrapper = () => {
  const store = configureStore({
    reducer: { game: gameReducer, session: sessionReducer },
  });
  const Wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
    <Provider store={store}>
      <MemoryRouter>{children}</MemoryRouter>
    </Provider>
  );
  return { store, Wrapper };
};

describe('useEnhancedGameState answer transitions', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('ignores duplicate submissions while a successful answer is awaiting transition', () => {
    const word: Word = {
      id: 'de-hund',
      term: 'Hund',
      definition: 'dog',
      direction: 'definition-to-term',
    };
    const { store, Wrapper } = makeWrapper();
    const { result } = renderHook(() => useEnhancedGameState(makeProps(word)), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.gameHandlers.handleSubmit('Hund');
      result.current.gameHandlers.handleSubmit('Hund');
    });

    expect(store.getState().game.totalAttempts).toBe(1);
    expect(result.current.gameState.isTransitioning).toBe(true);

    act(() => jest.advanceTimersByTime(500));

    expect(result.current.gameState.isTransitioning).toBe(false);
  });

  it('retains the longer incorrect-answer correction window', async () => {
    const word: Word = {
      id: 'de-hund',
      term: 'Hund',
      definition: 'dog',
      direction: 'definition-to-term',
    };
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useEnhancedGameState(makeProps(word)), {
      wrapper: Wrapper,
    });

    act(() => result.current.gameHandlers.handleSubmit('Katze'));

    await act(async () => {
      await jest.advanceTimersByTimeAsync(4999);
    });
    expect(result.current.gameState.isTransitioning).toBe(true);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1);
    });
    expect(result.current.gameState.isTransitioning).toBe(false);
  });

  it('cancels a pending answer transition when the question changes', () => {
    const firstWord: Word = {
      id: 'de-hund',
      term: 'Hund',
      definition: 'dog',
      direction: 'definition-to-term',
    };
    const nextWord: Word = {
      id: 'de-katze',
      term: 'Katze',
      definition: 'cat',
      direction: 'definition-to-term',
    };
    const { store, Wrapper } = makeWrapper();
    const { result, rerender } = renderHook(
      ({ currentWord }) => useEnhancedGameState(makeProps(currentWord)),
      { initialProps: { currentWord: firstWord }, wrapper: Wrapper }
    );

    act(() => result.current.gameHandlers.handleSubmit('Hund'));
    expect(jest.getTimerCount()).toBe(1);

    rerender({ currentWord: nextWord });

    expect(jest.getTimerCount()).toBe(0);
    expect(result.current.gameState.isTransitioning).toBe(false);

    act(() => result.current.gameHandlers.handleSubmit('Katze'));
    expect(store.getState().game.totalAttempts).toBe(2);
    expect(jest.getTimerCount()).toBe(1);
  });
});
