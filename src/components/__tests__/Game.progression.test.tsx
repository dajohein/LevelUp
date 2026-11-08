import { act, render } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { Game } from '../Game';
import gameReducer, { checkAnswer, setCurrentWord } from '../../store/gameSlice';
import sessionReducer from '../../store/sessionSlice';
import { useEnhancedGameState } from '../../hooks/useEnhancedGameState';
import { selectProgressiveQuizMode } from '../../services/quizModeSelectionUtils';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useParams: () => ({ languageCode: 'de' }),
}));
jest.mock('../../services/storageService', () => ({
  gameStateStorage: { load: () => ({}) },
  sessionStateStorage: { load: () => ({}) },
}));
jest.mock('../../services/dataMigrationService', () => ({
  DataMigrationService: { safeLoadWordProgress: () => ({}) },
}));
jest.mock('../../hooks/useEnhancedGameState', () => ({
  useEnhancedGameState: jest.fn(() => ({
    gameState: {},
    gameHandlers: {},
    gameHelpers: { wordLearningStatus: {} },
    enhancedGame: {},
    levelUp: {},
    audio: {},
  })),
}));
jest.mock('../Game/GameStyledComponents', () => ({
  GameContainer: 'div',
  GameContent: 'div',
  SkipButtonContainer: 'div',
  Button: 'button',
}));
jest.mock('../QuizRenderer', () => ({ QuizRenderer: () => null }));
jest.mock('../SessionManager', () => ({ SessionManager: () => null }));
jest.mock('../Navigation', () => ({ Navigation: () => null }));
jest.mock('../AchievementManager', () => ({ AchievementManager: () => null }));
jest.mock('../feedback/FeedbackOverlay', () => ({ FeedbackOverlay: () => null }));

it('supplies fresh per-word progression to the production hook when the key count stays fixed', () => {
  const store = configureStore({ reducer: { game: gameReducer, session: sessionReducer } });
  const word = { id: 'house', term: 'Haus', definition: 'house' };
  store.dispatch(setCurrentWord({ word, options: ['Haus'], quizMode: 'multiple-choice' }));
  // Track the word before rendering so the answer changes a value, not the number of keys.
  store.dispatch(checkAnswer({ answer: 'wrong', progressiveLearning: true }));
  render(
    <Provider store={store}>
      <Game />
    </Provider>
  );
  const hook = jest.mocked(useEnhancedGameState);
  const before = hook.mock.calls[hook.mock.calls.length - 1][0].wordProgress;
  expect(selectProgressiveQuizMode(word, before.house)).toBe('multiple-choice');

  act(() => {
    store.dispatch(checkAnswer({ answer: 'Haus', progressiveLearning: true }));
  });
  const after = hook.mock.calls[hook.mock.calls.length - 1][0].wordProgress;
  expect(Object.keys(after)).toEqual(Object.keys(before));
  expect(after).toBe(store.getState().game.wordProgress);
  expect(after).not.toBe(before);
  expect(selectProgressiveQuizMode(word, after.house)).toBe('letter-scramble');
});
