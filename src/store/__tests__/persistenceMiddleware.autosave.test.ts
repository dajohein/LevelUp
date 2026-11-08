import { configureStore } from '@reduxjs/toolkit';
import gameReducer from '../gameSlice';
import sessionReducer from '../sessionSlice';
import achievementsReducer from '../achievementsSlice';
import { persistenceMiddleware, persistenceUtils } from '../persistenceMiddleware';
import { enhancedStorage } from '../../services/storage/enhancedStorage';
import { logger } from '../../services/logger';

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
});
