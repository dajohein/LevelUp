import { RemoteStorageService, RemoteNetworkError } from '../remoteStorage';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const SESSION_KEY = 'levelup_remote_session';
const ONE_MIB = 1024 * 1024;

function response(body: unknown, status: number) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 413 ? 'Payload Too Large' : 'OK',
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

describe('RemoteStorageService getValue/putValue (real API handlers behind fetch)', () => {
  let fetchMock: jest.Mock;
  let service: RemoteStorageService;

  beforeEach(() => {
    jest.resetModules(); // a fresh in-memory db per test
    localStorage.clear();
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    fetchMock = jest.fn(async (url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}'));
      const path = url.endsWith('/api/storage')
        ? '../../../../api/storage'
        : '../../../../api/users';
      const handler = (await import(path)).default;
      const r = res();
      await handler({ method: 'POST', body, headers: { 'x-forwarded-for': '70.0.0.2' } }, r);
      return response(r._json, r._status);
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    service = new RemoteStorageService({ retries: 1 });
  });

  it('round-trips a JSON object', async () => {
    const value = { w1: { xp: 10, nested: [1, 2, { a: 'b' }] }, name: 'héllo' };
    await service.putValue('es', 'word_progress', value);
    expect(await service.getValue('es', 'word_progress')).toEqual(value);
  });

  it('returns undefined for a key that does not exist', async () => {
    expect(await service.getValue('es', 'nothing_here')).toBeUndefined();
  });

  it('never mixes two languages that use the same key', async () => {
    await service.putValue('es', 'progress', { lang: 'es' });
    expect(await service.getValue('de', 'progress')).toBeUndefined();

    await service.putValue('de', 'progress', { lang: 'de' });
    expect(await service.getValue('es', 'progress')).toEqual({ lang: 'es' });
    expect(await service.getValue('de', 'progress')).toEqual({ lang: 'de' });
  });

  it('ignores the current-language singleton', async () => {
    service.setCurrentLanguage('de');
    await service.putValue('es', 'progress', { lang: 'es' });

    expect(await service.getValue('es', 'progress')).toEqual({ lang: 'es' });
    expect(await service.getValue('de', 'progress')).toBeUndefined();
    // the singleton-based API sees the value under es only
    service.setCurrentLanguage('es');
    const viaSingleton = await service.get<unknown>('progress', { compress: false });
    expect(viaSingleton.data).toEqual({ lang: 'es' });
    service.setCurrentLanguage('de');
    expect((await service.get<unknown>('progress', { compress: false })).success).toBe(false);
  });

  it('stores the value as sent, without wrapping or compression', async () => {
    const big = { text: 'x'.repeat(5000) }; // above the 1024 threshold the old set() compresses at
    await service.putValue('es', 'k', big);
    const setCall = fetchMock.mock.calls
      .map(([, init]) => JSON.parse(String(init?.body)))
      .find(b => b.action === 'set');
    expect(setCall.data).toEqual(big);
    expect(setCall.options.compress).toBe(false);
  });

  describe('size limit', () => {
    // The server stores `data` as sent (compress false) and measures
    // Buffer.byteLength(JSON.stringify(data)). A string of n ASCII characters stringifies to
    // n + 2 bytes (the two quotes), so n = ONE_MIB - 2 gives exactly 1 MiB of JSON.
    const payload = (jsonBytes: number) => 'a'.repeat(jsonBytes - 2);

    it('accepts exactly 1 MiB of JSON bytes', async () => {
      const value = payload(ONE_MIB);
      expect(Buffer.byteLength(JSON.stringify(value), 'utf8')).toBe(ONE_MIB);
      await service.putValue('es', 'big', value);
      expect(await service.getValue('es', 'big')).toBe(value);
    });

    it('throws for 1 MiB + 1 byte and stores nothing', async () => {
      const value = payload(ONE_MIB + 1);
      expect(Buffer.byteLength(JSON.stringify(value), 'utf8')).toBe(ONE_MIB + 1);
      await expect(service.putValue('es', 'big', value)).rejects.toThrow(/413/);
      expect(await service.getValue('es', 'big')).toBeUndefined();
    });
  });

  describe('key limit per language bucket', () => {
    it('accepts the 500th key and throws on the 501st', async () => {
      for (let i = 1; i <= 500; i++) {
        await service.putValue('es', `k${i}`, i);
      }
      await expect(service.putValue('es', 'k501', 501)).rejects.toThrow(/413/);
      expect(await service.getValue('es', 'k501')).toBeUndefined();
      // an existing key can still be overwritten, and another language has its own bucket
      await service.putValue('es', 'k1', 'again');
      expect(await service.getValue('es', 'k1')).toBe('again');
      await service.putValue('de', 'k501', 501);
      expect(await service.getValue('de', 'k501')).toBe(501);
    }, 60_000);
  });

  describe('validation happens before any network call', () => {
    const badLanguages = ['', 'ES', 'esp', 'e', 'es_ES', 'es-es', '../de', 'es ', 'en-USA'];
    it.each(badLanguages)('rejects language code %j', async lang => {
      await expect(service.putValue(lang, 'k', 1)).rejects.toThrow('Invalid language code format');
      await expect(service.getValue(lang, 'k')).rejects.toThrow('Invalid language code format');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('accepts both language code shapes the server accepts', async () => {
      await service.putValue('en-US', 'k', 1);
      expect(await service.getValue('en-US', 'k')).toBe(1);
    });

    it('rejects an empty key and a 129-character key, accepts 1 and 128', async () => {
      await expect(service.putValue('es', '', 1)).rejects.toThrow(/1-128/);
      await expect(service.getValue('es', '')).rejects.toThrow(/1-128/);
      await expect(service.putValue('es', 'k'.repeat(129), 1)).rejects.toThrow(/1-128/);
      await expect(service.getValue('es', 'k'.repeat(129))).rejects.toThrow(/1-128/);
      expect(fetchMock).not.toHaveBeenCalled();

      await service.putValue('es', 'k', 1);
      await service.putValue('es', 'k'.repeat(128), 2);
      expect(await service.getValue('es', 'k'.repeat(128))).toBe(2);
    });
  });

  describe('deleteValue', () => {
    it('removes the value for that language only', async () => {
      await service.putValue('es', 'progress', { lang: 'es' });
      await service.putValue('de', 'progress', { lang: 'de' });

      await service.deleteValue('es', 'progress');

      expect(await service.getValue('es', 'progress')).toBeUndefined();
      expect(await service.getValue('de', 'progress')).toEqual({ lang: 'de' });
    });

    it('ignores the current-language singleton', async () => {
      await service.putValue('es', 'progress', 1);
      service.setCurrentLanguage('de');
      await service.deleteValue('es', 'progress');
      expect(await service.getValue('es', 'progress')).toBeUndefined();
    });

    it('resolves when the key does not exist', async () => {
      await expect(service.deleteValue('es', 'never-written')).resolves.toBeUndefined();
    });

    it('validates the language and key before any request', async () => {
      await expect(service.deleteValue('xx-yy-zz', 'k')).rejects.toThrow(
        'Invalid language code format'
      );
      await expect(service.deleteValue('es', '')).rejects.toThrow(/1-128/);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('throws when the network fails, so a caller never assumes it was deleted', async () => {
      await service.putValue('es', 'progress', 1);
      fetchMock.mockRejectedValueOnce(new TypeError('offline'));
      await expect(service.deleteValue('es', 'progress')).rejects.toBeInstanceOf(
        RemoteNetworkError
      );
      expect(await service.getValue('es', 'progress')).toBe(1);
    });
  });

  it('throws RemoteNetworkError when the network fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(service.putValue('es', 'k', 1)).rejects.toBeInstanceOf(RemoteNetworkError);
    await expect(service.getValue('es', 'k')).rejects.toBeInstanceOf(RemoteNetworkError);
  });

  it('refreshes an expired session transparently', async () => {
    const created = await new RemoteStorageService({ retries: 1 }).getUserSession();
    await service.putValue('es', 'k', { v: 1 }); // adopts the stored session
    const { createSessionToken } = await import('../../../../api/_auth');
    const expired = createSessionToken(created.userId, HOUR, Date.now() - 2 * DAY);
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ userId: created.userId, sessionToken: expired })
    );

    const fresh = new RemoteStorageService({ retries: 1 });
    expect(await fresh.getValue('es', 'k')).toEqual({ v: 1 });
    await fresh.putValue('es', 'k2', 2);
    const stored = JSON.parse(localStorage.getItem(SESSION_KEY) as string);
    expect(stored.userId).toBe(created.userId);
    expect(stored.sessionToken).not.toBe(expired);
  });
});
