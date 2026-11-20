import { PROGRESS_KEY } from '../progressSync';
import { MAX_BLOB_BYTES, buildProgressBlob } from '../mergeProgress';
import type { WordProgress } from '../../../store/types';

const mockEnv = { enableRemoteStorage: true };
const mockRemote = { hasSession: jest.fn(), deleteValue: jest.fn(), putValue: jest.fn() };

jest.mock('../../../config/environment', () => ({
  environmentConfig: new Proxy(
    {},
    { get: (_t, key) => (mockEnv as Record<string, unknown>)[key as string] }
  ),
}));
jest.mock('../../storage/remoteStorage', () => ({ remoteStorage: mockRemote }));

import {
  isProgressSyncActive,
  replaceRemoteProgress,
  resetRemoteProgress,
} from '../resetRemoteProgress';

const word = (wordId: string): WordProgress => ({
  wordId,
  xp: 10,
  lastPracticed: '2026-01-01T00:00:00.000Z',
  timesCorrect: 1,
  timesIncorrect: 0,
});

/** n distinct small words */
const wordsOf = (n: number): Record<string, WordProgress> => {
  const words: Record<string, WordProgress> = {};
  for (let i = 0; i < n; i += 1) words[`w${i}`] = word(`w${i}`);
  return words;
};

const sizeOf = (words: Record<string, WordProgress>): number =>
  buildProgressBlob(words, 'reset').bytes;

beforeEach(() => {
  jest.clearAllMocks();
  mockEnv.enableRemoteStorage = true;
  mockRemote.hasSession.mockReturnValue(true);
  mockRemote.deleteValue.mockResolvedValue(undefined);
  mockRemote.putValue.mockResolvedValue(undefined);
});

describe('isProgressSyncActive', () => {
  it('is just the flag, whether or not there is a session', () => {
    expect(isProgressSyncActive()).toBe(true);
    mockRemote.hasSession.mockReturnValue(false);
    expect(isProgressSyncActive()).toBe(true);
    mockEnv.enableRemoteStorage = false;
    expect(isProgressSyncActive()).toBe(false);
    mockRemote.hasSession.mockReturnValue(true);
    expect(isProgressSyncActive()).toBe(false);
  });
});

describe('resetRemoteProgress', () => {
  it('deletes the progress entry of each language, and only that key', async () => {
    await resetRemoteProgress(['es', 'de']);
    expect(mockRemote.deleteValue.mock.calls).toEqual([
      ['es', PROGRESS_KEY],
      ['de', PROGRESS_KEY],
    ]);
  });

  it('does nothing when sync is off, without even asking for a session', async () => {
    mockEnv.enableRemoteStorage = false;
    await resetRemoteProgress(['es']);
    expect(mockRemote.hasSession).not.toHaveBeenCalled();
    expect(mockRemote.deleteValue).not.toHaveBeenCalled();
  });

  it('throws, before any network call, when sync is on but there is no account session', async () => {
    mockRemote.hasSession.mockReturnValue(false);
    await expect(resetRemoteProgress(['es', 'de'])).rejects.toThrow('no account session');
    expect(mockRemote.deleteValue).not.toHaveBeenCalled();
  });

  it('throws when the server cannot confirm, and stops at the failing language', async () => {
    mockRemote.deleteValue
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('offline'));
    await expect(resetRemoteProgress(['es', 'de', 'fr'])).rejects.toThrow('offline');
    expect(mockRemote.deleteValue).toHaveBeenCalledTimes(2);
  });
});

describe('replaceRemoteProgress', () => {
  it('does nothing when sync is off', async () => {
    mockEnv.enableRemoteStorage = false;
    await replaceRemoteProgress('es', wordsOf(2));
    await replaceRemoteProgress('es', {});
    expect(mockRemote.hasSession).not.toHaveBeenCalled();
    expect(mockRemote.putValue).not.toHaveBeenCalled();
    expect(mockRemote.deleteValue).not.toHaveBeenCalled();
  });

  it('throws without an account session, before any network call', async () => {
    mockRemote.hasSession.mockReturnValue(false);
    await expect(replaceRemoteProgress('es', wordsOf(2))).rejects.toThrow('no account session');
    await expect(replaceRemoteProgress('es', {})).rejects.toThrow('no account session');
    expect(mockRemote.putValue).not.toHaveBeenCalled();
    expect(mockRemote.deleteValue).not.toHaveBeenCalled();
  });

  it('deletes the entry when no words are left', async () => {
    await replaceRemoteProgress('es', {});
    expect(mockRemote.deleteValue.mock.calls).toEqual([['es', PROGRESS_KEY]]);
    expect(mockRemote.putValue).not.toHaveBeenCalled();
  });

  it('puts a schema 1 blob with exactly the given words and the reset device id', async () => {
    const words = { a: word('a'), b: word('b') };
    await replaceRemoteProgress('de', words);
    expect(mockRemote.deleteValue).not.toHaveBeenCalled();
    expect(mockRemote.putValue).toHaveBeenCalledTimes(1);
    const [lang, key, blob] = mockRemote.putValue.mock.calls[0];
    expect(lang).toBe('de');
    expect(key).toBe(PROGRESS_KEY);
    expect(blob).toMatchObject({ schema: 1, deviceId: 'reset', words });
    expect(Object.keys(blob.words)).toEqual(['a', 'b']);
  });

  it('propagates a failure of the server', async () => {
    mockRemote.putValue.mockRejectedValue(new Error('offline'));
    await expect(replaceRemoteProgress('es', wordsOf(1))).rejects.toThrow('offline');
    mockRemote.deleteValue.mockRejectedValue(new Error('gone'));
    await expect(replaceRemoteProgress('es', {})).rejects.toThrow('gone');
  });

  describe('size limit', () => {
    // The most small words that still fit, then one key padded (ASCII: one char is one byte) so
    // the blob is EXACTLY MAX_BLOB_BYTES
    const exactlyAtLimit = (): Record<string, WordProgress> => {
      let n = 1;
      while (sizeOf(wordsOf(n + 1)) <= MAX_BLOB_BYTES) n += 1;
      const words = wordsOf(n);
      const pad = MAX_BLOB_BYTES - sizeOf(words);
      delete words.w0;
      words[`w0${'x'.repeat(pad)}`] = word('w0');
      return words;
    };

    it('allows a blob of exactly MAX_BLOB_BYTES', async () => {
      const words = exactlyAtLimit();
      expect(sizeOf(words)).toBe(MAX_BLOB_BYTES);
      await replaceRemoteProgress('es', words);
      expect(mockRemote.putValue).toHaveBeenCalledTimes(1);
    });

    it('throws for one byte more, before any network call', async () => {
      const words = exactlyAtLimit();
      const longer: Record<string, WordProgress> = {};
      for (const [key, value] of Object.entries(words))
        longer[key.startsWith('w0') ? `${key}y` : key] = value;
      expect(sizeOf(longer)).toBe(MAX_BLOB_BYTES + 1);
      await expect(replaceRemoteProgress('es', longer)).rejects.toThrow('too large');
      expect(mockRemote.putValue).not.toHaveBeenCalled();
      expect(mockRemote.deleteValue).not.toHaveBeenCalled();
    });
  });
});
