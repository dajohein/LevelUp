import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@emotion/react';
import { Provider } from 'react-redux';
import { SessionAnalytics } from '../SessionAnalytics';
import { words } from '../../services/wordService';
import { theme } from '../../styles/theme';
import type { GameState, WordProgress } from '../../store/types';

jest.mock('../../services/enhancedWordService', () => ({
  enhancedWordService: {
    getLearningAnalytics: () => null,
    getSessionHistory: () => [],
  },
}));

jest.mock('../DirectionalStats', () => ({
  DirectionalStats: () => null,
}));

interface TestState {
  game: Pick<GameState, 'wordProgress' | 'language'>;
}

describe('SessionAnalytics', () => {
  it('does not infer session counts or day streaks from answer and word progress', () => {
    const word = words.de.words[0];
    const progress: WordProgress = {
      wordId: word.id,
      xp: 10,
      lastPracticed: '2026-11-08T10:00:00.000Z',
      timesCorrect: 26,
      timesIncorrect: 0,
    };
    const store = configureStore({
      reducer: (
        state: TestState = { game: { wordProgress: { [word.id]: progress }, language: 'de' } }
      ) => state,
    });

    render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <SessionAnalytics
            languageCode="de"
            showRecommendations={false}
            showWeeklyProgress={false}
          />
        </ThemeProvider>
      </Provider>
    );

    expect(screen.getByText('Sessions').previousElementSibling?.textContent).toBe('0');
    expect(screen.getByText('Day Streak (UTC)').previousElementSibling?.textContent).toBe('0');
  });
});
