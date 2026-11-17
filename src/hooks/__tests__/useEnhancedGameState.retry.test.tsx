import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { act, renderHook } from '@testing-library/react';
import { useEnhancedGameState, UseEnhancedGameStateProps } from '../useEnhancedGameState';
import { Word } from '../../services/wordService';
import gameReducer from '../../store/gameSlice';
import sessionReducer, { sessionTypes, startSession } from '../../store/sessionSlice';
import { gameServices } from '../../services/game';

const mockWordInfo: { isRetry: boolean } = { isRetry: false };
const word: Word = {
  id: 'de-hund',
  term: 'Hund',
  definition: 'dog',
  direction: 'definition-to-term',
};

jest.mock('../useEnhancedGame', () => ({
  useEnhancedGame: () => ({
    isUsingSpacedRepetition: true,
    handleEnhancedAnswer: jest.fn(() => false),
    getCurrentWordInfo: jest.fn(() => ({
      word,
      quizMode: 'multiple-choice',
      options: ['Hund', 'Katze'],
      type: 'group',
      isRetry: mockWordInfo.isRetry,
      isEnhanced: true,
    })),
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

/** Submit an answer in an active session; returns how often the session manager was told. */
const submitInActiveSession = (isRetry: boolean, answer: string) => {
  mockWordInfo.isRetry = isRetry;
  const store = configureStore({ reducer: { game: gameReducer, session: sessionReducer } });
  store.dispatch(startSession(sessionTypes[0].id));
  const session = store.getState().session;

  const props: UseEnhancedGameStateProps = {
    languageCode: 'de',
    currentWord: word,
    quizMode: 'multiple-choice',
    wordProgress: {},
    currentSession: session.currentSession,
    sessionProgress: session.progress,
    isSessionActive: true,
    sessionStartTime: session.sessionStartTime,
    gameLanguage: 'de',
  };
  const Wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
    <Provider store={store}>
      <MemoryRouter>{children}</MemoryRouter>
    </Provider>
  );
  // The session manager dispatches to the app's global store, so observe the call itself
  const spy = jest
    .spyOn(gameServices.sessionManager, 'handleAnswerSubmission')
    .mockResolvedValue({ isComplete: false });
  try {
    const { result } = renderHook(() => useEnhancedGameState(props), { wrapper: Wrapper });
    act(() => result.current.gameHandlers.handleSubmit(answer));
    // the retry still gets its feedback and transition; only the session bookkeeping is skipped
    expect(result.current.gameState.isTransitioning).toBe(true);
    return spy.mock.calls.map(([isCorrect]) => isCorrect);
  } finally {
    spy.mockRestore();
  }
};

describe('re-queued retries and the active session', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('a normal answer is reported to the active session', () => {
    expect(submitInActiveSession(false, 'Hund')).toEqual([true]);
    expect(submitInActiveSession(false, 'Katze')).toEqual([false]);
  });

  it('a retry, right or wrong, is not reported to the active session', () => {
    // a correct retry would otherwise add words completed and bonuses a second time
    expect(submitInActiveSession(true, 'Hund')).toEqual([]);
    expect(submitInActiveSession(true, 'Katze')).toEqual([]);
  });
});
