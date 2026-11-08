import { configureStore } from '@reduxjs/toolkit';
import gameReducer from '../gameSlice';
import sessionReducer from '../sessionSlice';
import achievementsReducer from '../achievementsSlice';
import { persistenceMiddleware, persistenceUtils } from '../persistenceMiddleware';
import { enhancedStorage } from '../../services/storage/enhancedStorage';
import { learningCacheService } from '../../services/cacheService';
import { logger } from '../../services/logger';
import {
  addCorrectAnswer,
  completeSession,
  setLanguage,
  startSession,
} from '../sessionSlice';

jest.mock('../../services/storage/enhancedStorage', () => ({
  enhancedStorage: {
    saveWordProgress: jest.fn(),
    saveGameState: jest.fn(),
    saveSessionState: jest.fn(),
    saveAchievements: jest.fn(),
  },
}));

jest.mock('../../services/logger', () => ({
  logger: { debug: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

describe('Persistence middleware autosave failure integration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.mocked(enhancedStorage.saveWordProgress).mockResolvedValue({ success: true });
    jest.mocked(enhancedStorage.saveGameState).mockResolvedValue({ success: true });
    jest.mocked(enhancedStorage.saveSessionState).mockResolvedValue({ success: true });
    jest.mocked(enhancedStorage.saveAchievements).mockResolvedValue({ success: true });
    learningCacheService.clearCache();
    persistenceUtils.updateConfig({ enabled: true });
  });

  afterEach(async () => {
    jest.mocked(enhancedStorage.saveGameState).mockResolvedValue({ success: true });
    await persistenceUtils.cleanup();
    jest.useRealTimers();
  });

  it('keeps critical dispatch synchronous, reports async failure, and allows a later retry', async () => {
    const store = configureStore({
      reducer: { game: gameReducer, session: sessionReducer, achievements: achievementsReducer },
      middleware: getDefaultMiddleware => getDefaultMiddleware().concat(persistenceMiddleware),
    });
    jest.mocked(enhancedStorage.saveAchievements).mockRejectedValueOnce(new Error('Offline'));
    const action = { type: 'achievements/unlockAchievement', payload: 'first-answer' };

    expect(store.dispatch(action)).toEqual(action);
    await jest.advanceTimersByTimeAsync(0);

    expect(logger.error).toHaveBeenCalledWith(
      'Critical persistence save failed; changes remain queued:',
      expect.any(Error)
    );
    expect(persistenceUtils.getStatus()).toMatchObject({
      pendingChanges: 1,
      lastError: expect.stringContaining('Offline'),
    });
    jest.mocked(enhancedStorage.saveAchievements).mockResolvedValueOnce({
      success: false,
      error: 'Quota exceeded',
    });
    await expect(persistenceUtils.forceSave()).rejects.toThrow('Quota exceeded');
    expect(logger.debug).not.toHaveBeenCalledWith('🚀 Manual save completed');
    await persistenceUtils.forceSave();
    expect(persistenceUtils.getStatus()).toMatchObject({ pendingChanges: 0, lastError: null });
  });

  it('records one language-scoped practice session regardless of its answer count', () => {
    jest.setSystemTime(new Date('2026-11-08T12:00:00.000Z'));
    const store = configureStore({
      reducer: { game: gameReducer, session: sessionReducer, achievements: achievementsReducer },
      middleware: getDefaultMiddleware => getDefaultMiddleware().concat(persistenceMiddleware),
    });

    store.dispatch(setLanguage('de'));
    store.dispatch(startSession('quick-dash'));
    for (let answer = 0; answer < 20; answer++) {
      store.dispatch(addCorrectAnswer({}));
    }
    store.dispatch(completeSession());

    expect(learningCacheService.getAnalytics('de')).toMatchObject({
      totalSessions: 1,
      practiceDays: ['2026-11-08'],
    });
    expect(learningCacheService.getSessionHistory('de')).toHaveLength(1);
    expect(learningCacheService.getAnalytics('es')).toBeNull();
  });
});
