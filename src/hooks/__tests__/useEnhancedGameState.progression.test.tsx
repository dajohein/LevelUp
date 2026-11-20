import { act, renderHook } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import type { ReactNode } from 'react';
import gameReducer, { setCurrentWord } from '../../store/gameSlice';
import sessionReducer, { sessionTypes } from '../../store/sessionSlice';
import { useEnhancedGameState } from '../useEnhancedGameState';

jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }));
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
jest.mock('../useEnhancedGame', () => ({
  useEnhancedGame: () => ({
    isUsingSpacedRepetition: false,
    getCurrentWordInfo: () => null,
    handleEnhancedAnswer: jest.fn(),
    getSessionStats: jest.fn(),
    forceCompleteSession: jest.fn(),
    initializeEnhancedSession: jest.fn(),
  }),
}));
jest.mock('../../services/storageService', () => ({
  gameStateStorage: { load: () => ({}) },
  sessionStateStorage: { load: () => ({}) },
}));
jest.mock('../../services/dataMigrationService', () => ({
  DataMigrationService: { safeLoadWordProgress: () => ({}) },
}));
jest.mock('../../services/wordSelectionManager', () => ({
  selectWordForRegularSession: jest.fn(),
  selectWordForMixedPractice: jest.fn(),
}));
jest.mock('../../services/wordService', () => ({ words: {} }));
jest.mock('../../services/challengeServiceManager', () => ({
  challengeServiceManager: { isSessionTypeSupported: () => false },
}));
jest.mock('../../services/game', () => ({
  gameServices: {
    modeHandler: new (jest.requireActual('../../services/game/GameModeHandler').GameModeHandler)(),
    progressTracker: {
      calculateWordLearningStatus: () => ({
        isTrulyNewWord: false,
        needsReinforcement: false,
      }),
      validateAnswer: () => ({ isCorrect: true, feedbackInfo: null }),
      generateFeedbackKey: () => 'house',
    },
    sessionManager: {
      initializeSession: () => Promise.resolve(false),
      handleAnswerSubmission: jest.fn(),
    },
  },
}));

describe('production submission progression scope', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it.each(['deep-dive', 'quick-dash', null])(
    'advances the learning marker only in Deep Dive (%s)',
    async sessionId => {
      const store = configureStore({ reducer: { game: gameReducer, session: sessionReducer } });
      const word = { id: 'house', term: 'Haus', definition: 'house' };
      store.dispatch(setCurrentWord({ word, options: ['Haus'], quizMode: 'multiple-choice' }));
      const currentSession = sessionTypes.find(session => session.id === sessionId) ?? null;
      const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider store={store}>{children}</Provider>
      );
      const { result, unmount } = renderHook(
        () =>
          useEnhancedGameState({
            languageCode: 'de',
            currentWord: word,
            quizMode: 'multiple-choice',
            wordProgress: {},
            currentSession,
            sessionProgress: store.getState().session.progress,
            isSessionActive: currentSession !== null,
            sessionStartTime: null,
            gameLanguage: 'de',
          }),
        { wrapper }
      );
      await act(() => Promise.resolve());
      act(() => result.current.gameHandlers.handleSubmit('Haus'));
      expect(store.getState().game.wordProgress.house.learningMode).toBe(
        sessionId === 'deep-dive' ? 'letter-scramble' : undefined
      );
      unmount();
    }
  );
});
