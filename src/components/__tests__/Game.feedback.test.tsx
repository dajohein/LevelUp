import { ThemeProvider } from '@emotion/react';
import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { act, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { Game } from '../Game';
import { theme } from '../../styles/theme';

jest.mock('../../hooks/useEnhancedGameState', () => ({
  useEnhancedGameState: () => ({
    gameState: {
      inputValue: '',
      isTransitioning: true,
      sessionCompleted: false,
      showLearningCard: false,
      lastAnswerCorrect: true,
      answerSequence: 1,
      lastSelectedAnswer: 'hund',
      feedbackQuestionKey: 'de-hund-dog',
      feedbackWordInfo: { correctAnswer: 'Hund', originalWord: 'dog', context: '' },
    },
    gameHandlers: {},
    gameHelpers: {},
    enhancedGame: {},
    levelUp: { showLevelUp: false },
    audio: {},
  }),
}));

jest.mock('../Navigation', () => ({ Navigation: () => null }));
jest.mock('../SessionManager', () => ({ SessionManager: () => null }));
jest.mock('../QuizRenderer', () => ({ QuizRenderer: () => null }));
jest.mock('../AchievementManager', () => ({ AchievementManager: () => null }));
jest.mock('../animations/LevelUpNotification', () => ({ LevelUpNotification: () => null }));

describe('Game feedback updates', () => {
  it('updates capitalization feedback when existing progress changes without adding a word', () => {
    const game = createSlice({
      name: 'game',
      initialState: {
        currentWord: { id: 'de-hund', term: 'Hund', definition: 'dog' },
        currentOptions: [],
        quizMode: 'open-answer',
        wordProgress: { 'de-hund': { xp: 50 } },
        capitalizationFeedback: '',
        language: 'de',
      },
      reducers: {
        setFeedback: (state, action: PayloadAction<string>) => {
          state.capitalizationFeedback = action.payload;
          state.wordProgress['de-hund'].xp += 1;
        },
      },
    });
    const session = createSlice({
      name: 'session',
      initialState: {
        currentSession: null,
        progress: { wordsCompleted: 0 },
        isSessionActive: false,
        sessionStartTime: null,
      },
      reducers: {},
    });
    const store = configureStore({ reducer: { game: game.reducer, session: session.reducer } });

    render(
      <Provider store={store}>
        <MemoryRouter>
          <ThemeProvider theme={theme}>
            <Game />
          </ThemeProvider>
        </MemoryRouter>
      </Provider>
    );

    act(() => store.dispatch(game.actions.setFeedback('Remember to capitalize German nouns.')));

    expect(screen.getByRole('status')).toHaveTextContent('Remember to capitalize German nouns.');
    expect(screen.getByText('★').parentElement).toHaveTextContent(
      'Remember to capitalize German nouns.'
    );
  });
});
