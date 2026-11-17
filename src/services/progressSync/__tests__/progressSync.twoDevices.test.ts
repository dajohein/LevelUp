import { RemoteStorageService } from '../../storage/remoteStorage';
import {
  PROGRESS_KEY,
  createProgressSync,
  type ProgressSync,
  type SyncResult,
} from '../progressSync';
import { MAX_BLOB_BYTES, buildProgressBlob, parseProgressBlob } from '../mergeProgress';
import type { WordProgress } from '../../../store/types';

type WordMap = { [wordId: string]: WordProgress };

const NOW = Date.parse('2025-06-01T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;
const iso = (ms: number): string => new Date(ms).toISOString();

const entry = (wordId: string, overrides: Partial<WordProgress> = {}): WordProgress => ({
  wordId,
  xp: 10,
  lastPracticed: iso(NOW - 24 * HOUR),
  timesCorrect: 1,
  timesIncorrect: 0,
  ...overrides,
});

const words = (...entries: WordProgress[]): WordMap =>
  Object.fromEntries(entries.map(e => [e.wordId, e]));

// ---- the real API handlers behind a fetch shim --------------------------------------------

function response(body: unknown, status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 500 ? 'Internal Server Error' : 'OK',
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

interface FakeResponse {
  _status: number;
  _json: unknown;
  status(code: number): FakeResponse;
  json(body: unknown): FakeResponse;
  setHeader(): FakeResponse;
  end(): FakeResponse;
}

function res(): FakeResponse {
  const r = { _status: 200, _json: null } as FakeResponse;
  r.status = (c: number) => ((r._status = c), r);
  r.json = (b: unknown) => ((r._json = b), r);
  r.setHeader = () => r;
  r.end = () => r;
  return r;
}

type Fault = null | 'throw' | 'http500' | 'put500';
let fault: Fault = null;

// ---- one device: its own service instance, local map and sync instance ---------------------

interface Device {
  remote: RemoteStorageService;
  local: Map<string, WordMap>;
  sync: ProgressSync;
  putSpy: jest.SpyInstance;
  warn: jest.Mock;
  localJson(): string;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function makeDevice(name: string): Device {
  const remote = new RemoteStorageService({ retries: 1 });
  const local = new Map<string, WordMap>();
  const putSpy = jest.spyOn(remote, 'putValue');
  const warn = jest.fn();
  const sync = createProgressSync({
    isEnabled: () => true,
    hasSession: () => remote.hasSession(),
    isOnline: () => true,
    getRemote: languageCode => remote.getValue<unknown>(languageCode, PROGRESS_KEY),
    putRemote: (languageCode, blob) => remote.putValue(languageCode, PROGRESS_KEY, blob),
    loadLocal: languageCode => clone(local.get(languageCode) ?? {}),
    saveLocal: (languageCode, map) => {
      local.set(languageCode, clone(map));
    },
    isActiveLanguage: () => false,
    applyToActive: () => {
      throw new Error('no language is active in these tests');
    },
    deviceId: () => name,
    warn,
    now: () => NOW,
  });
  return {
    remote,
    local,
    sync,
    putSpy,
    warn,
    localJson: () => JSON.stringify([...local.entries()].sort(([a], [b]) => (a < b ? -1 : 1))),
  };
}

describe('progress sync between two devices of one account (real API handlers)', () => {
  let a: Device;
  let b: Device;

  /** Device A creates the account; device B joins it through the real link-code flow. */
  const linkDevices = async (): Promise<void> => {
    const sessionA = await a.remote.getUserSession();
    const { code } = await a.remote.generateAccountCode();
    const linked = await b.remote.linkDeviceWithCode(code);
    expect(linked.success).toBe(true);
    const sessionB = await b.remote.getUserSession();
    expect(sessionB.userId).toBe(sessionA.userId);
    expect(a.remote.hasSession()).toBe(true);
    expect(b.remote.hasSession()).toBe(true);
  };

  const serverWords = async (
    device: Device,
    languageCode: string
  ): Promise<WordMap | undefined> => {
    const raw = await device.remote.getValue<unknown>(languageCode, PROGRESS_KEY);
    if (raw === undefined) return undefined;
    const parsed = parseProgressBlob(raw);
    if (parsed === null) throw new Error('server blob is not a valid progress blob');
    return parsed.words;
  };

  beforeEach(() => {
    jest.resetModules(); // a fresh in-memory db per test
    localStorage.clear();
    fault = null;
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}'));
      if (fault === 'throw') throw new TypeError('Failed to fetch');
      if (fault === 'http500') return response({ success: false, error: 'boom' }, 500);
      if (fault === 'put500' && body.action === 'set') {
        return response({ success: false, error: 'boom' }, 500);
      }
      const path = url.endsWith('/api/storage')
        ? '../../../../api/storage'
        : '../../../../api/users';
      const handler = (await import(path)).default;
      const r = res();
      await handler({ method: 'POST', body, headers: { 'x-forwarded-for': '70.0.0.3' } }, r);
      return response(r._json, r._status);
    }) as unknown as typeof fetch;
    a = makeDevice('device-a');
    b = makeDevice('device-b');
  });

  afterEach(() => {
    fault = null;
    a.sync.dispose();
    b.sync.dispose();
    jest.restoreAllMocks();
  });

  it('progress made on A shows on B after linking', async () => {
    await linkDevices();
    const aWords = words(
      entry('es_hola', { xp: 40, consecutiveCorrect: 2 }),
      entry('es_adios', { xp: 5, timesIncorrect: 2 })
    );
    a.local.set('es', clone(aWords));

    const upload = await a.sync.syncLanguage('es');
    expect(upload.status).toBe('uploaded');
    expect(await serverWords(b, 'es')).toEqual(aWords);

    expect(b.local.get('es')).toBeUndefined();
    const download = await b.sync.syncLanguage('es');
    expect(download.status).toBe('merged');
    expect(download.takenFromRemote).toBe(2);
    expect(download.uploaded).toBe(false);
    expect(b.local.get('es')).toEqual(aWords);
    expect(b.putSpy).not.toHaveBeenCalled();
  });

  it('different words on each device end as the union on both, nothing lost', async () => {
    await linkDevices();
    const onlyA = words(entry('es_a1', { xp: 11 }), entry('es_a2', { xp: 12 }));
    const onlyB = words(entry('es_b1', { xp: 21 }), entry('es_b2', { xp: 22 }));
    a.local.set('es', clone(onlyA));
    b.local.set('es', clone(onlyB));

    expect((await a.sync.syncLanguage('es')).status).toBe('uploaded');
    expect((await b.sync.syncLanguage('es')).status).toBe('uploaded');
    expect((await a.sync.syncLanguage('es')).status).toBe('merged');

    const union = { ...onlyA, ...onlyB };
    expect(a.local.get('es')).toEqual(union);
    expect(b.local.get('es')).toEqual(union);
    expect(await serverWords(a, 'es')).toEqual(union);
  });

  it.each([
    ['B', 'device B'],
    ['A', 'device A'],
  ])('same word on both: the later lastPracticed (%s) wins whole on both devices', async winner => {
    await linkDevices();
    const early = entry('es_gato', {
      xp: 90,
      timesCorrect: 9,
      lastPracticed: iso(NOW - 3 * HOUR),
      consecutiveCorrect: 5,
      streakUpdatedAt: iso(NOW - 3 * HOUR),
      directions: {
        'term-to-definition': {
          xp: 90,
          timesCorrect: 9,
          timesIncorrect: 0,
          lastPracticed: iso(NOW - 3 * HOUR),
        },
      },
    });
    const late = entry('es_gato', {
      xp: 20,
      timesCorrect: 2,
      timesIncorrect: 1,
      lastPracticed: iso(NOW - HOUR),
      consecutiveCorrect: 1,
      streakUpdatedAt: iso(NOW - HOUR),
      directions: {
        'definition-to-term': {
          xp: 20,
          timesCorrect: 2,
          timesIncorrect: 1,
          lastPracticed: iso(NOW - HOUR),
        },
      },
    });
    a.local.set('es', words(winner === 'A' ? late : early));
    b.local.set('es', words(winner === 'A' ? early : late));

    await a.sync.syncLanguage('es');
    await b.sync.syncLanguage('es');
    await a.sync.syncLanguage('es');

    expect(a.local.get('es')).toEqual(words(late));
    expect(b.local.get('es')).toEqual(words(late));
    const finalEntry = (a.local.get('es') as WordMap).es_gato;
    expect(finalEntry.consecutiveCorrect).toBe(1);
    expect(finalEntry.directions).not.toHaveProperty('term-to-definition');
    expect(finalEntry.directions).toHaveProperty('definition-to-term');
    expect(await serverWords(a, 'es')).toEqual(words(late));
  });

  it('never mixes languages: B syncing es gets no de words, and server buckets stay separate', async () => {
    await linkDevices();
    const es = words(entry('es_casa'), entry('es_perro'));
    const de = words(entry('de_haus'), entry('de_hund'));
    a.local.set('es', clone(es));
    a.local.set('de', clone(de));
    await a.sync.syncLanguage('es');
    await a.sync.syncLanguage('de');

    await b.sync.syncLanguage('es');

    expect(b.local.get('es')).toEqual(es);
    expect(b.local.has('de')).toBe(false);
    expect(Object.keys(b.local.get('es') as WordMap).some(id => id.startsWith('de_'))).toBe(false);
    expect(await serverWords(b, 'es')).toEqual(es);
    expect(await serverWords(b, 'de')).toEqual(de);
    expect(Object.keys((await serverWords(b, 'es')) as WordMap).sort()).toEqual([
      'es_casa',
      'es_perro',
    ]);
    expect(Object.keys((await serverWords(b, 'de')) as WordMap).sort()).toEqual([
      'de_haus',
      'de_hund',
    ]);
  });

  it('after convergence a further sync on either device makes no putValue call', async () => {
    await linkDevices();
    a.local.set('es', words(entry('es_a', { xp: 1 })));
    b.local.set('es', words(entry('es_b', { xp: 2 })));
    await a.sync.syncLanguage('es');
    await b.sync.syncLanguage('es');
    await a.sync.syncLanguage('es');
    await b.sync.syncLanguage('es');
    expect(a.local.get('es')).toEqual(b.local.get('es'));

    a.putSpy.mockClear();
    b.putSpy.mockClear();
    const results: SyncResult[] = [
      await a.sync.syncLanguage('es'),
      await b.sync.syncLanguage('es'),
      await a.sync.syncLanguage('es'),
    ];
    expect(results.map(r => r.status)).toEqual(['unchanged', 'unchanged', 'unchanged']);
    expect(a.putSpy).not.toHaveBeenCalled();
    expect(b.putSpy).not.toHaveBeenCalled();
  });

  describe('a failed sync leaves local progress byte-identical and the server untouched', () => {
    const bWords = words(entry('es_b1', { xp: 7 }), entry('es_b2', { xp: 8 }));

    const serverBlob = (): Promise<unknown> => a.remote.getValue<unknown>('es', PROGRESS_KEY);

    it.each<[string, Fault]>([
      ['fetch throws', 'throw'],
      ['server answers 500', 'http500'],
    ])('read fails: %s', async (_label, mode) => {
      await linkDevices();
      a.local.set('es', words(entry('es_a1')));
      await a.sync.syncLanguage('es');
      b.local.set('es', clone(bWords));
      const before = b.localJson();
      const serverBefore = JSON.stringify(await serverBlob());

      fault = mode;
      const result = await b.sync.syncLanguage('es');
      fault = null;

      expect(result.status).toBe('failed');
      expect(result.uploaded).toBe(false);
      expect(b.localJson()).toBe(before);
      expect(b.putSpy).not.toHaveBeenCalled();
      expect(JSON.stringify(await serverBlob())).toBe(serverBefore);
      expect(b.warn).toHaveBeenCalled();
    });

    it('upload fails after a successful read: local stays identical, server keeps its blob', async () => {
      await linkDevices();
      a.local.set('es', words(entry('es_a1')));
      await a.sync.syncLanguage('es');
      // B already holds A's word plus its own, so nothing is merged in and only the upload fails
      b.local.set('es', words(entry('es_a1'), entry('es_b1', { xp: 7 })));
      const before = b.localJson();
      const serverBefore = JSON.stringify(await serverBlob());

      fault = 'put500';
      const result = await b.sync.syncLanguage('es');
      fault = null;

      expect(result.status).toBe('failed');
      expect(b.putSpy).toHaveBeenCalledTimes(1);
      expect(b.localJson()).toBe(before);
      expect(JSON.stringify(await serverBlob())).toBe(serverBefore);
    });

    const goodBlob = (): unknown => ({
      schema: 1,
      deviceId: 'x',
      updatedAt: iso(NOW),
      words: words(entry('es_a1')),
    });
    const corrupt: Array<[string, unknown]> = [
      ['garbage string', 'not a progress blob'],
      ['array', [1, 2, 3]],
      ['wrong schema number', { ...(goodBlob() as object), schema: 2 }],
      ['missing schema', { deviceId: 'x', words: words(entry('es_a1')) }],
      ['words is an array', { schema: 1, deviceId: 'x', updatedAt: iso(NOW), words: [] }],
    ];

    it.each(corrupt)('unreadable blob (%s) is neither merged nor overwritten', async (_l, blob) => {
      await linkDevices();
      await a.remote.putValue('es', PROGRESS_KEY, blob);
      b.local.set('es', clone(bWords));
      const before = b.localJson();
      const serverBefore = JSON.stringify(await serverBlob());

      const result = await b.sync.syncLanguage('es');

      expect(result.status).toBe('failed');
      expect(result.uploaded).toBe(false);
      expect(b.localJson()).toBe(before);
      expect(b.putSpy).not.toHaveBeenCalled();
      expect(JSON.stringify(await serverBlob())).toBe(serverBefore);
      expect(b.warn).toHaveBeenCalled();
    });
  });

  describe('blob size against the real 1 MiB server cap', () => {
    /** One word whose note is padded so the whole blob is exactly `target` UTF-8 bytes. */
    const wordsOfBlobSize = (target: number): WordMap => {
      const base = words(entry('es_big', { customNotes: '' }));
      const { bytes } = buildProgressBlob(base, 'device-a', NOW);
      const padded = words(entry('es_big', { customNotes: 'n'.repeat(target - bytes) }));
      expect(buildProgressBlob(padded, 'device-a', NOW).bytes).toBe(target);
      return padded;
    };

    it('uploads a blob of exactly MAX_BLOB_BYTES through the real handler', async () => {
      await linkDevices();
      const big = wordsOfBlobSize(MAX_BLOB_BYTES);
      a.local.set('es', clone(big));

      const result = await a.sync.syncLanguage('es');

      expect(result.status).toBe('uploaded');
      expect(a.putSpy).toHaveBeenCalledTimes(1);
      expect(await serverWords(b, 'es')).toEqual(big);
      expect((await b.sync.syncLanguage('es')).status).toBe('merged');
      expect(b.local.get('es')).toEqual(big);
    });

    it('does not attempt an upload of MAX_BLOB_BYTES + 1', async () => {
      await linkDevices();
      a.local.set('es', wordsOfBlobSize(MAX_BLOB_BYTES + 1));
      const before = a.localJson();
      const fetchCallsBefore = (global.fetch as jest.Mock).mock.calls.length;

      const result = await a.sync.syncLanguage('es');

      expect(result.status).toBe('failed');
      expect(result.uploaded).toBe(false);
      expect(a.putSpy).not.toHaveBeenCalled();
      const setCalls = (global.fetch as jest.Mock).mock.calls
        .slice(fetchCallsBefore)
        .filter(([, init]) => JSON.parse(String(init?.body)).action === 'set');
      expect(setCalls).toHaveLength(0);
      expect(a.localJson()).toBe(before);
      expect(await serverWords(b, 'es')).toBeUndefined();
      expect(a.warn).toHaveBeenCalled();
    });
  });
});
