import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@emotion/react';
import { Provider } from 'react-redux';
import { StorageManagement } from '../StorageManagement';
import { theme } from '../../styles/theme';
import { wordProgressStorage } from '../../services/storageService';
import {
  isProgressSyncActive,
  resetRemoteProgress,
} from '../../services/progressSync/resetRemoteProgress';
import type { WordProgress } from '../../store/types';

jest.mock('../../services/progressSync/resetRemoteProgress', () => ({
  isProgressSyncActive: jest.fn(),
  resetRemoteProgress: jest.fn(),
}));
jest.mock('../../services/moduleService', () => ({
  ...jest.requireActual('../../services/moduleService'),
  getAvailableLanguages: () => [
    { code: 'es', info: { name: 'Spanish', flag: 'ES' } },
    { code: 'de', info: { name: 'German', flag: 'DE' } },
  ],
}));

const PROGRESS_KEY = 'levelup_word_progress';
const mockedActive = jest.mocked(isProgressSyncActive);
const mockedReset = jest.mocked(resetRemoteProgress);

// wordProgressStorage skips an identical save within 100ms, so every test seeds distinct data
let seedCounter = 0;
const progress = (wordId: string): WordProgress => ({
  wordId,
  xp: 40 + seedCounter,
  lastPracticed: '2026-11-08T10:00:00.000Z',
  timesCorrect: 4,
  timesIncorrect: 1,
});

const stored = (): Record<string, unknown> =>
  JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '{}') as Record<string, unknown>;

const renderIt = () => {
  const store = configureStore({
    reducer: () => ({
      game: { wordProgress: {}, language: 'es' },
      session: { isSessionActive: false },
    }),
  });
  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <StorageManagement />
      </ThemeProvider>
    </Provider>
  );
};

const resetSpanish = () => screen.getByRole('button', { name: /Reset All Spanish/ });
const clearAll = () => screen.getByRole('button', { name: /Clear All Data|Clearing/ });

let confirmSpy: jest.SpyInstance;
let alertSpy: jest.SpyInstance;
let esSnapshot: string;

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  seedCounter += 1;
  wordProgressStorage.save('es', { hola: progress('hola') });
  wordProgressStorage.save('de', { hallo: progress('hallo') });
  esSnapshot = JSON.stringify(stored().es);
  mockedActive.mockReturnValue(false);
  mockedReset.mockResolvedValue(undefined);
  confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
  alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => undefined);
  // jsdom logs "not implemented: navigation" for location.reload; keep it out of the test output
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

const alertTexts = () => alertSpy.mock.calls.map(call => String(call[0]));

describe('StorageManagement reset language', () => {
  it('clears only that language, without the synced-copy note, when sync is not active', async () => {
    renderIt();
    await userEvent.click(resetSpanish());

    await waitFor(() => expect(stored().es).toBeUndefined());
    expect(stored().de).toBeDefined();
    // the sync-inactive no-op lives in resetRemoteProgress itself (covered by its own tests)
    expect(String(confirmSpy.mock.calls[0][0])).not.toContain('Other devices linked');
  });

  it('warns about the synced copy and removes it remotely before clearing locally', async () => {
    mockedActive.mockReturnValue(true);
    let esAtCallTime: string | undefined;
    mockedReset.mockImplementation(async () => {
      esAtCallTime = JSON.stringify(stored().es);
    });
    renderIt();
    await userEvent.click(resetSpanish());

    await waitFor(() => expect(stored().es).toBeUndefined());
    expect(String(confirmSpy.mock.calls[0][0])).toContain('Other devices linked to this account');
    expect(mockedReset).toHaveBeenCalledTimes(1);
    expect(mockedReset).toHaveBeenCalledWith(['es']);
    expect(esAtCallTime).toBe(esSnapshot);
    expect(stored().de).toBeDefined();
    expect(alertTexts().some(text => text.includes('has been reset'))).toBe(true);
  });

  it('leaves local progress alone and says so when the server cannot be reached', async () => {
    mockedActive.mockReturnValue(true);
    mockedReset.mockRejectedValue(new Error('offline'));
    renderIt();
    await userEvent.click(resetSpanish());

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(alertTexts()).toHaveLength(1);
    expect(alertTexts()[0]).toContain('NOT reset');
    expect(JSON.stringify(stored().es)).toBe(esSnapshot);
    expect(stored().de).toBeDefined();
  });

  it('does nothing when the learner cancels the confirmation', async () => {
    mockedActive.mockReturnValue(true);
    confirmSpy.mockReturnValue(false);
    renderIt();
    await userEvent.click(resetSpanish());

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(mockedReset).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
    expect(JSON.stringify(stored().es)).toBe(esSnapshot);
  });
});

describe('StorageManagement clear all', () => {
  it('removes every language remotely, then clears local data, when sync is active', async () => {
    mockedActive.mockReturnValue(true);
    let beforeCall: string | null = null;
    mockedReset.mockImplementation(async () => {
      beforeCall = localStorage.getItem(PROGRESS_KEY);
    });
    renderIt();
    await userEvent.click(clearAll());

    await waitFor(() => expect(localStorage.getItem(PROGRESS_KEY)).toBeNull());
    expect(mockedReset).toHaveBeenCalledWith(['es', 'de']);
    expect(beforeCall).not.toBeNull();
    expect(String(confirmSpy.mock.calls[0][0])).toContain('Other devices linked');
  });

  it('keeps local data and releases the button when the server rejects', async () => {
    mockedActive.mockReturnValue(true);
    mockedReset.mockRejectedValue(new Error('offline'));
    renderIt();
    await userEvent.click(clearAll());

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(alertTexts()[0]).toContain('NOT cleared');
    expect(JSON.stringify(stored().es)).toBe(esSnapshot);
    expect(stored().de).toBeDefined();
    await waitFor(() => expect(clearAll()).toBeEnabled());
    expect(clearAll()).toHaveTextContent('Clear All Data');
  });

  it('clears local data without the synced-copy note when sync is not active', async () => {
    renderIt();
    await userEvent.click(clearAll());

    await waitFor(() => expect(localStorage.getItem(PROGRESS_KEY)).toBeNull());
    expect(String(confirmSpy.mock.calls[0][0])).not.toContain('Other devices linked');
  });
});
