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
  replaceRemoteProgress,
  resetRemoteProgress,
} from '../../services/progressSync/resetRemoteProgress';
import { pauseProgressSync } from '../../services/progressSync/startProgressSync';
import type { WordProgress } from '../../store/types';

jest.mock('../../services/progressSync/resetRemoteProgress', () => ({
  isProgressSyncActive: jest.fn(),
  resetRemoteProgress: jest.fn(),
  replaceRemoteProgress: jest.fn(),
}));
jest.mock('../../services/progressSync/startProgressSync', () => ({
  pauseProgressSync: jest.fn(),
}));
jest.mock('../../services/moduleService', () => ({
  ...jest.requireActual('../../services/moduleService'),
  // Spanish has two small modules (one word each); German none, so only Spanish shows module buttons
  getModulesForLanguage: (code: string) =>
    code === 'es'
      ? [
          { id: 'basics', name: 'Basics', words: [{ id: 'hola' }] },
          { id: 'other', name: 'Other', words: [{ id: 'keep' }] },
        ]
      : [],
  getAvailableLanguages: () => [
    { code: 'es', info: { name: 'Spanish', flag: 'ES' } },
    { code: 'de', info: { name: 'German', flag: 'DE' } },
  ],
}));

const PROGRESS_KEY = 'levelup_word_progress';
const mockedActive = jest.mocked(isProgressSyncActive);
const mockedReset = jest.mocked(resetRemoteProgress);
const mockedReplace = jest.mocked(replaceRemoteProgress);
const mockedPause = jest.mocked(pauseProgressSync);

// Order of the steps the component takes (pause, remote call, resume, dispatch)
let calls: string[];
let resume: jest.Mock;
let dispatched: Array<{ type: string; payload?: unknown }>;

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
    reducer: (_state: unknown, action: { type: string; payload?: unknown }) => {
      if (action.type.startsWith('game/')) {
        dispatched.push(action);
        calls.push('dispatch');
      }
      return { game: { wordProgress: {}, language: 'es' }, session: { isSessionActive: false } };
    },
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
const resetBasics = () => screen.getByRole('button', { name: /Reset Basics/ });
const clearAll = () => screen.getByRole('button', { name: /Clear All Data|Clearing/ });

let confirmSpy: jest.SpyInstance;
let alertSpy: jest.SpyInstance;
let esSnapshot: string;

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  seedCounter += 1;
  wordProgressStorage.save('es', { hola: progress('hola'), keep: progress('keep') });
  wordProgressStorage.save('de', { hallo: progress('hallo') });
  esSnapshot = JSON.stringify(stored().es);
  mockedActive.mockReturnValue(false);
  calls = [];
  dispatched = [];
  resume = jest.fn(() => {
    calls.push('resume');
  });
  mockedPause.mockImplementation(async () => {
    calls.push('pause');
    return resume;
  });
  mockedReset.mockImplementation(async () => {
    calls.push('remote');
  });
  mockedReplace.mockImplementation(async () => {
    calls.push('remote');
  });
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
      calls.push('remote');
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
    // paused before the remote call; not resumed, because the page reloads
    expect(calls).toEqual(['pause', 'remote']);
    expect(resume).not.toHaveBeenCalled();
  });

  it('leaves local progress alone and says so when the server cannot be reached', async () => {
    mockedActive.mockReturnValue(true);
    mockedReset.mockImplementation(async () => {
      calls.push('remote');
      throw new Error('offline');
    });
    renderIt();
    await userEvent.click(resetSpanish());

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(alertTexts()).toHaveLength(1);
    expect(alertTexts()[0]).toContain('NOT reset');
    expect(JSON.stringify(stored().es)).toBe(esSnapshot);
    expect(stored().de).toBeDefined();
    expect(calls).toEqual(['pause', 'remote', 'resume']);
  });

  it('abandons the reset the same way when pausing sync itself fails', async () => {
    mockedPause.mockRejectedValue(new Error('pause failed'));
    renderIt();
    await userEvent.click(resetSpanish());

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(alertTexts()).toHaveLength(1);
    expect(alertTexts()[0]).toContain('NOT reset');
    expect(mockedReset).not.toHaveBeenCalled();
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
    expect(mockedPause).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
    expect(JSON.stringify(stored().es)).toBe(esSnapshot);
  });
});

describe('StorageManagement reset module', () => {
  it('pauses, replaces the synced copy with the pruned progress, then dispatches the update', async () => {
    mockedActive.mockReturnValue(true);
    renderIt();
    await userEvent.click(resetBasics());

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(mockedReplace).toHaveBeenCalledTimes(1);
    const [code, words] = mockedReplace.mock.calls[0];
    expect(code).toBe('es');
    expect(Object.keys(words)).toEqual(['keep']);
    expect(mockedReset).not.toHaveBeenCalled();
    // the remote call comes first; the local update only after the server confirmed
    expect(calls).toEqual(['pause', 'remote', 'dispatch']);
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].type).toBe('game/updateWordProgress');
    expect(Object.keys(dispatched[0].payload as object)).toEqual(['keep']);
    expect(resume).not.toHaveBeenCalled();
    expect(alertTexts()).toHaveLength(1);
    expect(alertTexts()[0]).toContain('Module "Basics" has been reset');
  });

  it('stops when the server cannot confirm: no dispatch, local data untouched, sync resumed', async () => {
    mockedActive.mockReturnValue(true);
    mockedReplace.mockImplementation(async () => {
      calls.push('remote');
      throw new Error('offline');
    });
    renderIt();
    await userEvent.click(resetBasics());

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(alertTexts()).toHaveLength(1);
    expect(alertTexts()[0]).toContain('was NOT reset');
    expect(dispatched).toHaveLength(0);
    expect(JSON.stringify(stored().es)).toBe(esSnapshot);
    expect(stored().de).toBeDefined();
    expect(resume).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(['pause', 'remote', 'resume']);
  });

  it('abandons the reset the same way when pausing sync itself fails', async () => {
    mockedPause.mockRejectedValue(new Error('pause failed'));
    renderIt();
    await userEvent.click(resetBasics());

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(alertTexts()[0]).toContain('was NOT reset');
    expect(mockedReplace).not.toHaveBeenCalled();
    expect(dispatched).toHaveLength(0);
    expect(JSON.stringify(stored().es)).toBe(esSnapshot);
  });

  it('does nothing when the learner cancels the confirmation', async () => {
    confirmSpy.mockReturnValue(false);
    renderIt();
    await userEvent.click(resetBasics());

    expect(mockedPause).not.toHaveBeenCalled();
    expect(mockedReplace).not.toHaveBeenCalled();
    expect(dispatched).toHaveLength(0);
    expect(alertSpy).not.toHaveBeenCalled();
  });
});

describe('StorageManagement clear all', () => {
  it('removes every language remotely, then clears local data, when sync is active', async () => {
    mockedActive.mockReturnValue(true);
    let beforeCall: string | null = null;
    mockedReset.mockImplementation(async () => {
      calls.push('remote');
      beforeCall = localStorage.getItem(PROGRESS_KEY);
    });
    renderIt();
    await userEvent.click(clearAll());

    await waitFor(() => expect(localStorage.getItem(PROGRESS_KEY)).toBeNull());
    expect(mockedReset).toHaveBeenCalledWith(['es', 'de']);
    expect(beforeCall).not.toBeNull();
    expect(String(confirmSpy.mock.calls[0][0])).toContain('Other devices linked');
    expect(calls).toEqual(['pause', 'remote']);
    expect(resume).not.toHaveBeenCalled();
  });

  it('keeps local data and releases the button when the server rejects', async () => {
    mockedActive.mockReturnValue(true);
    mockedReset.mockImplementation(async () => {
      calls.push('remote');
      throw new Error('offline');
    });
    renderIt();
    await userEvent.click(clearAll());

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(alertTexts()[0]).toContain('NOT cleared on this device');
    expect(alertTexts()[0]).toContain(
      'Some languages may already have been removed from the server'
    );
    expect(calls).toEqual(['pause', 'remote', 'resume']);
    expect(JSON.stringify(stored().es)).toBe(esSnapshot);
    expect(stored().de).toBeDefined();
    await waitFor(() => expect(clearAll()).toBeEnabled());
    expect(clearAll()).toHaveTextContent('Clear All Data');
  });

  it('abandons the clear the same way when pausing sync itself fails', async () => {
    mockedPause.mockRejectedValue(new Error('pause failed'));
    renderIt();
    await userEvent.click(clearAll());

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(alertTexts()[0]).toContain('NOT cleared on this device');
    expect(mockedReset).not.toHaveBeenCalled();
    expect(JSON.stringify(stored().es)).toBe(esSnapshot);
    await waitFor(() => expect(clearAll()).toBeEnabled());
  });

  it('clears local data without the synced-copy note when sync is not active', async () => {
    renderIt();
    await userEvent.click(clearAll());

    await waitFor(() => expect(localStorage.getItem(PROGRESS_KEY)).toBeNull());
    expect(String(confirmSpy.mock.calls[0][0])).not.toContain('Other devices linked');
  });
});
