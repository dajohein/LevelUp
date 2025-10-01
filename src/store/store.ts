import { configureStore, Middleware } from '@reduxjs/toolkit';
import { Store } from 'redux';
import gameReducer from './gameSlice';
import achievementsReducer from './achievementsSlice';
import sessionReducer from './sessionSlice';
import type { GameState } from './types';
import type { AchievementsState } from './types';
import type { SessionState } from './sessionSlice';
import { persistenceMiddleware } from './persistenceMiddleware';

const reducer = {
  game: gameReducer,
  achievements: achievementsReducer,
  session: sessionReducer,
} as const;

export type StoreState = {
  game: GameState;
  achievements: AchievementsState;
  session: SessionState;
};

export const store: Store<StoreState> = configureStore({
  reducer,
  middleware: getDefaultMiddleware => {
    const middleware = getDefaultMiddleware();
    return middleware
      .concat(persistenceMiddleware as Middleware<any, StoreState>);
  },
});

export type RootState = StoreState;
export type AppDispatch = typeof store.dispatch;
