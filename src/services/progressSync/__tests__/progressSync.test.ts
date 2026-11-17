import type { WordProgress } from '../../../store/types';
import {
  MAX_BLOB_BYTES,
  PROGRESS_SCHEMA,
  buildProgressBlob,
  mergeWordProgress,
} from '../mergeProgress';
import { UPLOAD_DEBOUNCE_MS, createProgressSync, type ProgressSyncDeps } from '../progressSync';

type WordMap = { [wordId: string]: WordProgress };

const NOW = Date.parse('2025-06-01T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const iso = (ms: number) => new Date(ms).toISOString();

const entry = (wordId: string, overrides: Partial<WordProgress> = {}): WordProgress => ({
  wordId,
  xp: 10,
  lastPracticed: iso(NOW - DAY),
  timesCorrect: 1,
  timesIncorrect: 0,
  ...overrides,
});

const mapOf = (...entries: WordProgress[]): WordMap =>
  Object.fromEntries(entries.map(e => [e.wordId, e]));

const remoteBlob = (words: unknown, extra: Record<string, unknown> = {}) => ({
  schema: PROGRESS_SCHEMA,
  deviceId: 'other-device',
  updatedAt: iso(NOW - DAY),
  words,
  ...extra,
});

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}
const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
};

const setup = (
  initial: { local?: Record<string, WordMap>; remote?: Record<string, unknown> } = {}
) => {
  const local: Record<string, WordMap> = clone(initial.local ?? {});
  const remote = new Map<string, unknown>(Object.entries(clone(initial.remote ?? {})));
  const state = {
    enabled: true,
    session: true,
    online: true,
    active: 'es' as string | null,
  };

  const getRemote = jest.fn(
    async (languageCode: string): Promise<unknown> =>
      remote.has(languageCode) ? clone(remote.get(languageCode)) : undefined
  );
  const putRemote = jest.fn(async (languageCode: string, blob: unknown): Promise<void> => {
    remote.set(languageCode, clone(blob));
  });
  const saveLocal = jest.fn((languageCode: string, words: WordMap): void => {
    local[languageCode] = clone(words);
  });
  const applyToActive = jest.fn((languageCode: string, words: WordMap): void => {
    local[languageCode] = mergeWordProgress(local[languageCode] ?? {}, words, NOW).merged;
  });
  const warn = jest.fn<void, [string, Record<string, unknown>?]>();

  const deps: ProgressSyncDeps = {
    isEnabled: () => state.enabled,
    hasSession: () => state.session,
    isOnline: () => state.online,
    getRemote,
    putRemote,
    loadLocal: languageCode => clone(local[languageCode] ?? {}),
    saveLocal,
    isActiveLanguage: languageCode => state.active === languageCode,
    applyToActive,
    deviceId: () => 'this-device',
    warn,
    now: () => NOW,
  };
  const sync = createProgressSync(deps);
  return { sync, state, local, remote, getRemote, putRemote, saveLocal, applyToActive, warn };
};

const flushPromises = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};

describe('createProgressSync', () => {
  describe('preconditions', () => {
    it.each([
      ['sync is disabled', (s: ReturnType<typeof setup>) => (s.state.enabled = false)],
      ['there is no session', (s: ReturnType<typeof setup>) => (s.state.session = false)],
      ['the device is offline', (s: ReturnType<typeof setup>) => (s.state.online = false)],
    ])('is skipped, with no remote call at all, when %s', async (_name, breakIt) => {
      const s = setup({ local: { es: mapOf(entry('a')) } });
      breakIt(s);
      const result = await s.sync.syncLanguage('es');
      expect(result).toEqual({ status: 'skipped', takenFromRemote: 0, uploaded: false });
      expect(s.getRemote).not.toHaveBeenCalled();
      expect(s.putRemote).not.toHaveBeenCalled();
    });
  });

  describe('first upload and empty sides', () => {
    it('uploads once when the remote is missing and local has words', async () => {
      const words = mapOf(entry('a'), entry('b', { xp: 40 }));
      const s = setup({ local: { es: words } });
      const result = await s.sync.syncLanguage('es');
      expect(result).toEqual({ status: 'uploaded', takenFromRemote: 0, uploaded: true });
      expect(s.putRemote).toHaveBeenCalledTimes(1);
      const [language, blob] = s.putRemote.mock.calls[0] as [string, Record<string, unknown>];
      expect(language).toBe('es');
      expect(blob.schema).toBe(1);
      expect(blob.deviceId).toBe('this-device');
      expect(blob.words).toEqual(words);
    });

    it('does not upload when the remote is missing and local is empty', async () => {
      const s = setup();
      const result = await s.sync.syncLanguage('es');
      expect(result.status).toBe('unchanged');
      expect(result.uploaded).toBe(false);
      expect(s.putRemote).not.toHaveBeenCalled();
    });

    it('gives local the remote words when local is empty, and uploads nothing', async () => {
      const remoteWords = mapOf(entry('a'), entry('b', { xp: 40 }));
      const s = setup({ remote: { es: remoteBlob(remoteWords) } });
      const result = await s.sync.syncLanguage('es');
      expect(result).toEqual({ status: 'merged', takenFromRemote: 2, uploaded: false });
      expect(s.applyToActive).toHaveBeenCalledWith('es', remoteWords);
      expect(s.local.es).toEqual(remoteWords);
      expect(s.putRemote).not.toHaveBeenCalled();
      // the remote words are never removed
      expect((s.remote.get('es') as { words: WordMap }).words).toEqual(remoteWords);
    });

    it('never uploads an empty map over remote words, even if local stays empty', async () => {
      // applyToActive silently fails to persist, so local is still empty after the merge
      const remoteWords = mapOf(entry('a'));
      const s = setup({ remote: { es: remoteBlob(remoteWords) } });
      s.applyToActive.mockImplementation(() => undefined);
      const result = await s.sync.syncLanguage('es');
      expect(result.uploaded).toBe(false);
      expect(s.putRemote).not.toHaveBeenCalled();
      expect((s.remote.get('es') as { words: WordMap }).words).toEqual(remoteWords);
    });

    it('uploads after taking remote words only when the merged content differs from the remote', async () => {
      const s = setup({
        local: { es: mapOf(entry('local-only')) },
        remote: { es: remoteBlob(mapOf(entry('remote-only'))) },
      });
      const result = await s.sync.syncLanguage('es');
      expect(result).toEqual({ status: 'uploaded', takenFromRemote: 1, uploaded: true });
      const uploaded = (s.remote.get('es') as { words: WordMap }).words;
      expect(Object.keys(uploaded).sort()).toEqual(['local-only', 'remote-only']);
    });
  });

  describe('unreadable remote', () => {
    it('fails without writing anything when reading the remote throws', async () => {
      const local = { es: mapOf(entry('a')) };
      const s = setup({ local });
      s.getRemote.mockRejectedValueOnce(new TypeError('network down'));
      const result = await s.sync.syncLanguage('es');
      expect(result).toEqual({ status: 'failed', takenFromRemote: 0, uploaded: false });
      expect(s.putRemote).not.toHaveBeenCalled();
      expect(s.saveLocal).not.toHaveBeenCalled();
      expect(s.applyToActive).not.toHaveBeenCalled();
      expect(s.local).toEqual(local);
      expect(s.warn).toHaveBeenCalledTimes(1);
      const [message, context] = s.warn.mock.calls[0];
      expect(message).toMatch(/^progress-sync: reading remote progress failed/);
      expect(context).toEqual({ languageCode: 'es', error: 'TypeError' });
    });

    it.each([
      ['a newer schema', { ...remoteBlob({}), schema: 2 }],
      ['a missing schema', { deviceId: 'x', words: {} }],
      ['a string', 'corrupt'],
      ['null', null],
      ['an array', []],
      ['words that are not an object', remoteBlob([1, 2])],
    ])('fails and never overwrites a remote that is %s', async (_name, raw) => {
      const local = { es: mapOf(entry('a')) };
      const s = setup({ local, remote: { es: raw } });
      const result = await s.sync.syncLanguage('es');
      expect(result).toEqual({ status: 'failed', takenFromRemote: 0, uploaded: false });
      expect(s.putRemote).not.toHaveBeenCalled();
      expect(s.saveLocal).not.toHaveBeenCalled();
      expect(s.applyToActive).not.toHaveBeenCalled();
      expect(s.local).toEqual(local);
      expect(s.remote.get('es')).toEqual(raw);
      expect(s.warn).toHaveBeenCalledWith(
        expect.stringMatching(/^progress-sync: remote progress is unreadable/),
        { languageCode: 'es' }
      );
    });

    it('ignores invalid entries, warns with the dropped count, and merges the valid ones', async () => {
      const valid = entry('good');
      const s = setup({
        remote: {
          es: remoteBlob({
            good: valid,
            negative: entry('negative', { xp: -1 }),
            mismatched: entry('other-id'),
            notAnObject: 'x',
          }),
        },
      });
      const result = await s.sync.syncLanguage('es');
      expect(s.warn).toHaveBeenCalledWith(
        expect.stringMatching(/^progress-sync: some remote entries were invalid/),
        { languageCode: 'es', dropped: 3 }
      );
      expect(result.status).toBe('merged');
      expect(s.local.es).toEqual({ good: valid });
      // the valid words equal what local now holds, but the server still has junk entries: we
      // never upload when content matches the parsed remote
      expect(s.putRemote).not.toHaveBeenCalled();
    });
  });

  describe('merge', () => {
    const localWords = () =>
      mapOf(
        entry('localNewer', { xp: 90, lastPracticed: iso(NOW - DAY) }),
        entry('remoteNewer', { xp: 5, lastPracticed: iso(NOW - 3 * DAY) }),
        entry('localOnly')
      );
    const remoteWords = () =>
      mapOf(
        entry('localNewer', { xp: 20, lastPracticed: iso(NOW - 2 * DAY) }),
        entry('remoteNewer', { xp: 70, lastPracticed: iso(NOW - 2 * DAY) }),
        entry('remoteOnly', { xp: 33 })
      );

    const expectMerged = (words: WordMap) => {
      expect(Object.keys(words).sort()).toEqual([
        'localNewer',
        'localOnly',
        'remoteNewer',
        'remoteOnly',
      ]);
      expect(words.localNewer.xp).toBe(90);
      expect(words.remoteNewer.xp).toBe(70);
      expect(words.localOnly.xp).toBe(10);
      expect(words.remoteOnly.xp).toBe(33);
    };

    it('keeps the newer device per word, and words that exist on one side only (inactive language)', async () => {
      const s = setup({ local: { es: localWords() }, remote: { es: remoteBlob(remoteWords()) } });
      s.state.active = 'de';
      const result = await s.sync.syncLanguage('es');
      expect(result).toEqual({ status: 'uploaded', takenFromRemote: 2, uploaded: true });
      expectMerged(s.local.es);
      expectMerged((s.remote.get('es') as { words: WordMap }).words);
    });

    it('does the same for the active language', async () => {
      const s = setup({ local: { es: localWords() }, remote: { es: remoteBlob(remoteWords()) } });
      await s.sync.syncLanguage('es');
      expectMerged(s.local.es);
      expectMerged((s.remote.get('es') as { words: WordMap }).words);
    });

    it('hands the remote words to the active language and does not save to storage itself', async () => {
      const remote = remoteWords();
      const s = setup({ local: { es: localWords() }, remote: { es: remoteBlob(remote) } });
      await s.sync.syncLanguage('es');
      expect(s.applyToActive).toHaveBeenCalledTimes(1);
      expect(s.applyToActive).toHaveBeenCalledWith('es', remote);
      expect(s.saveLocal).not.toHaveBeenCalled();
    });

    it('saves the merged map for an inactive language and does not touch the active state', async () => {
      const s = setup({ local: { es: localWords() }, remote: { es: remoteBlob(remoteWords()) } });
      s.state.active = 'de';
      await s.sync.syncLanguage('es');
      expect(s.saveLocal).toHaveBeenCalledTimes(1);
      const [language, saved] = s.saveLocal.mock.calls[0];
      expect(language).toBe('es');
      expectMerged(saved);
      expect(s.applyToActive).not.toHaveBeenCalled();
    });
  });

  describe('upload size limit', () => {
    // The blob is measured exactly like buildProgressBlob does (UTF-8 bytes of its JSON). We build
    // one word with an empty customNotes, read its size, and pad customNotes with ASCII "x" (one
    // byte each) by MAX_BLOB_BYTES - baseBytes to land on exactly the limit.
    const wordWithPadding = (padding: number) =>
      mapOf(entry('big', { customNotes: 'x'.repeat(padding) }));
    const baseBytes = buildProgressBlob(wordWithPadding(0), 'this-device', NOW).bytes;
    const exactPadding = MAX_BLOB_BYTES - baseBytes;

    it('measures the fixture exactly at, and one byte over, the limit', () => {
      expect(buildProgressBlob(wordWithPadding(exactPadding), 'this-device', NOW).bytes).toBe(
        MAX_BLOB_BYTES
      );
      expect(buildProgressBlob(wordWithPadding(exactPadding + 1), 'this-device', NOW).bytes).toBe(
        MAX_BLOB_BYTES + 1
      );
    });

    it('uploads a blob of exactly MAX_BLOB_BYTES', async () => {
      const s = setup({ local: { es: wordWithPadding(exactPadding) } });
      const result = await s.sync.syncLanguage('es');
      expect(result.status).toBe('uploaded');
      expect(s.putRemote).toHaveBeenCalledTimes(1);
      expect(s.warn).not.toHaveBeenCalled();
    });

    it('does not upload a blob one byte over MAX_BLOB_BYTES, and warns', async () => {
      const local = { es: wordWithPadding(exactPadding + 1) };
      const s = setup({ local });
      const result = await s.sync.syncLanguage('es');
      expect(result).toEqual({ status: 'failed', takenFromRemote: 0, uploaded: false });
      expect(s.putRemote).not.toHaveBeenCalled();
      expect(s.warn).toHaveBeenCalledWith(
        expect.stringMatching(/^progress-sync: progress is too large to upload/),
        { languageCode: 'es', bytes: MAX_BLOB_BYTES + 1, limit: MAX_BLOB_BYTES }
      );
      expect(s.local).toEqual(local);
    });
  });

  describe('failed upload', () => {
    it('reports failed and leaves local progress unchanged when putRemote throws', async () => {
      const local = { es: mapOf(entry('a')) };
      const s = setup({ local });
      s.putRemote.mockRejectedValueOnce(new RangeError('quota'));
      const result = await s.sync.syncLanguage('es');
      expect(result).toEqual({ status: 'failed', takenFromRemote: 0, uploaded: false });
      expect(s.local).toEqual(local);
      expect(s.remote.has('es')).toBe(false);
      expect(s.warn).toHaveBeenCalledWith(
        expect.stringMatching(/^progress-sync: uploading progress failed/),
        { languageCode: 'es', error: 'RangeError' }
      );
    });
  });

  describe('equal content', () => {
    it('is unchanged, with no upload, when the remote holds the same words in another order', async () => {
      const a = entry('a', { xp: 7, tags: ['t'] });
      const b = entry('b', { xp: 8, consecutiveCorrect: 2 });
      const reordered = {
        b: {
          consecutiveCorrect: 2,
          xp: 8,
          wordId: 'b',
          timesIncorrect: 0,
          timesCorrect: 1,
          lastPracticed: b.lastPracticed,
        },
        a: {
          tags: ['t'],
          lastPracticed: a.lastPracticed,
          timesIncorrect: 0,
          timesCorrect: 1,
          wordId: 'a',
          xp: 7,
        },
      };
      const s = setup({
        local: { es: mapOf(a, b) },
        remote: {
          es: remoteBlob(reordered, { deviceId: 'another', updatedAt: '2020-01-01T00:00:00.000Z' }),
        },
      });
      const result = await s.sync.syncLanguage('es');
      expect(result).toEqual({ status: 'unchanged', takenFromRemote: 0, uploaded: false });
      expect(s.putRemote).not.toHaveBeenCalled();
      expect(s.saveLocal).not.toHaveBeenCalled();
      expect(s.applyToActive).not.toHaveBeenCalled();
    });

    it('does not loop: a second run right after an upload uploads nothing', async () => {
      const s = setup({ local: { es: mapOf(entry('a')) } });
      expect((await s.sync.syncLanguage('es')).status).toBe('uploaded');
      expect((await s.sync.syncLanguage('es')).status).toBe('unchanged');
      expect(s.putRemote).toHaveBeenCalledTimes(1);
    });
  });

  describe('language isolation', () => {
    it('only ever reads and writes the language being synced, with only its own words', async () => {
      const es = mapOf(entry('es1'), entry('es2'));
      const de = mapOf(entry('de1', { xp: 50 }));
      const s = setup({ local: { es, de } });
      await s.sync.syncLanguage('es');
      await s.sync.syncLanguage('de');
      expect(s.getRemote.mock.calls).toEqual([['es'], ['de']]);
      expect(s.putRemote).toHaveBeenCalledTimes(2);
      const [[esLanguage, esBlob], [deLanguage, deBlob]] = s.putRemote.mock.calls as [
        string,
        { words: WordMap },
      ][];
      expect(esLanguage).toBe('es');
      expect(esBlob.words).toEqual(es);
      expect(deLanguage).toBe('de');
      expect(deBlob.words).toEqual(de);
      expect(s.local.es).toEqual(es);
      expect(s.local.de).toEqual(de);
    });
  });

  describe('single flight', () => {
    it('runs one sync at a time per language and exactly one extra rerun', async () => {
      const s = setup({ local: { es: mapOf(entry('a')) } });
      const gates: Deferred<unknown>[] = [];
      s.getRemote.mockImplementation(() => {
        const gate = deferred<unknown>();
        gates.push(gate);
        return gate.promise;
      });

      const first = s.sync.syncLanguage('es');
      const second = s.sync.syncLanguage('es');
      const third = s.sync.syncLanguage('es');
      await flushPromises();
      expect(s.getRemote).toHaveBeenCalledTimes(1);

      gates[0].resolve(undefined);
      await flushPromises();
      // the first run finished and the single rerun has started
      expect(s.getRemote).toHaveBeenCalledTimes(2);
      expect(gates).toHaveLength(2);

      // the rerun sees what the first run uploaded, so it has nothing left to upload
      gates[1].resolve(s.remote.get('es'));
      const results = await Promise.all([first, second, third]);
      expect(s.getRemote).toHaveBeenCalledTimes(2);
      expect(results[1]).toBe(results[0]);
      expect(s.putRemote).toHaveBeenCalledTimes(1);

      // afterwards a new request starts a fresh run
      s.getRemote.mockImplementation(async () => undefined);
      await s.sync.syncLanguage('es');
      expect(s.getRemote).toHaveBeenCalledTimes(3);
    });

    it('does not block a different language', async () => {
      const s = setup({ local: { es: mapOf(entry('a')), de: mapOf(entry('b')) } });
      const gate = deferred<unknown>();
      s.getRemote.mockImplementationOnce(() => gate.promise);
      const es = s.sync.syncLanguage('es');
      const de = s.sync.syncLanguage('de');
      await flushPromises();
      expect(s.getRemote.mock.calls).toEqual([['es'], ['de']]);
      gate.resolve(undefined);
      await Promise.all([es, de]);
    });
  });

  describe('debounced local changes', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it('does nothing before UPLOAD_DEBOUNCE_MS and syncs once at the boundary', async () => {
      const s = setup({ local: { es: mapOf(entry('a')) } });
      s.sync.noteLocalChange('es');
      await jest.advanceTimersByTimeAsync(UPLOAD_DEBOUNCE_MS - 1);
      expect(s.getRemote).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(1);
      expect(s.getRemote).toHaveBeenCalledTimes(1);
      expect(s.putRemote).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(UPLOAD_DEBOUNCE_MS * 3);
      expect(s.getRemote).toHaveBeenCalledTimes(1);
    });

    it('resets the timer on repeated calls within the window (one sync in total)', async () => {
      const s = setup({ local: { es: mapOf(entry('a')) } });
      s.sync.noteLocalChange('es');
      await jest.advanceTimersByTimeAsync(UPLOAD_DEBOUNCE_MS - 1);
      s.sync.noteLocalChange('es');
      await jest.advanceTimersByTimeAsync(UPLOAD_DEBOUNCE_MS - 1);
      expect(s.getRemote).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(1);
      expect(s.getRemote).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(UPLOAD_DEBOUNCE_MS * 3);
      expect(s.getRemote).toHaveBeenCalledTimes(1);
    });

    it('keeps an independent timer per language', async () => {
      const s = setup({ local: { es: mapOf(entry('a')), de: mapOf(entry('b')) } });
      s.sync.noteLocalChange('es');
      await jest.advanceTimersByTimeAsync(2000);
      s.sync.noteLocalChange('de');
      await jest.advanceTimersByTimeAsync(UPLOAD_DEBOUNCE_MS - 2000);
      expect(s.getRemote.mock.calls).toEqual([['es']]);
      await jest.advanceTimersByTimeAsync(2000);
      expect(s.getRemote.mock.calls).toEqual([['es'], ['de']]);
    });

    it('flush syncs pending languages at once and cancels their timers', async () => {
      const s = setup({ local: { es: mapOf(entry('a')), de: mapOf(entry('b')) } });
      s.sync.noteLocalChange('es');
      s.sync.noteLocalChange('de');
      const results = await s.sync.flush();
      expect(results.map(r => r.status)).toEqual(['uploaded', 'uploaded']);
      expect(s.getRemote.mock.calls).toEqual([['es'], ['de']]);
      await jest.advanceTimersByTimeAsync(UPLOAD_DEBOUNCE_MS * 3);
      expect(s.getRemote).toHaveBeenCalledTimes(2);
    });

    it('flush with nothing pending does nothing', async () => {
      const s = setup({ local: { es: mapOf(entry('a')) } });
      expect(await s.sync.flush()).toEqual([]);
      expect(s.getRemote).not.toHaveBeenCalled();
    });

    it('noteLocalChange does nothing when sync is disabled', async () => {
      const s = setup({ local: { es: mapOf(entry('a')) } });
      s.state.enabled = false;
      s.sync.noteLocalChange('es');
      await jest.advanceTimersByTimeAsync(UPLOAD_DEBOUNCE_MS * 2);
      expect(s.getRemote).not.toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    });

    it('dispose cancels pending timers', async () => {
      const s = setup({ local: { es: mapOf(entry('a')), de: mapOf(entry('b')) } });
      s.sync.noteLocalChange('es');
      s.sync.noteLocalChange('de');
      s.sync.dispose();
      expect(jest.getTimerCount()).toBe(0);
      await jest.advanceTimersByTimeAsync(UPLOAD_DEBOUNCE_MS * 2);
      expect(s.getRemote).not.toHaveBeenCalled();
      expect(await s.sync.flush()).toEqual([]);
    });
  });
});
