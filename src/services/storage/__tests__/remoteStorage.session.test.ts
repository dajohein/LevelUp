import { RemoteStorageService, RemoteSessionError } from '../remoteStorage';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const KEY = 'levelup_remote_session';

function response(body: unknown, status: number) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 401 ? 'Unauthorized' : 'OK',
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

describe('remote session recovery (real API handlers behind fetch)', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    localStorage.clear();
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    fetchMock = jest.fn(async (url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}'));
      const path = url.endsWith('/api/storage')
        ? '../../../../api/storage'
        : '../../../../api/users';
      const handler = (await import(path)).default;
      const r = res();
      await handler({ method: 'POST', body, headers: { 'x-forwarded-for': '70.0.0.1' } }, r);
      return response(r._json, r._status);
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  const createServerSession = async () => {
    const created = await new RemoteStorageService({ retries: 1 }).getUserSession();
    const { createSessionToken } = await import('../../../../api/_auth');
    return { created, createSessionToken };
  };

  it('restores a session whose token expired, and stores the refreshed token', async () => {
    const { created, createSessionToken } = await createServerSession();
    const expired = createSessionToken(created.userId, HOUR, Date.now() - 2 * DAY);
    localStorage.setItem(KEY, JSON.stringify({ userId: created.userId, sessionToken: expired }));

    const service = new RemoteStorageService({ retries: 1 });
    const code = await service.generateAccountCode();

    expect(code.code).toHaveLength(8);
    const stored = JSON.parse(localStorage.getItem(KEY) as string);
    expect(stored.userId).toBe(created.userId);
    expect(stored.sessionToken).not.toBe(expired);
  });

  it('a session the server cannot recover raises a RemoteSessionError and keeps the stored session', async () => {
    const stored = { userId: 'someone', sessionToken: 'f3a1c2d4-1111-2222-3333-444455556666' };
    localStorage.setItem(KEY, JSON.stringify(stored));
    fetchMock.mockClear();

    const service = new RemoteStorageService({ retries: 3 });
    await expect(service.generateAccountCode()).rejects.toBeInstanceOf(RemoteSessionError);

    // nothing is silently replaced or deleted
    expect(JSON.parse(localStorage.getItem(KEY) as string)).toEqual(stored);
    // and a 401 is not retried with backoff (it would only make the screen hang)
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('a network failure is not mistaken for a lost session', async () => {
    localStorage.setItem(KEY, JSON.stringify({ userId: 'u', sessionToken: 't' }));
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const service = new RemoteStorageService({ retries: 1 });
    const error = await service.generateAccountCode().catch(e => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(RemoteSessionError);
  });

  it('resetSession starts over with a new guest session on request only', async () => {
    localStorage.setItem(KEY, JSON.stringify({ userId: 'someone', sessionToken: 'garbage' }));
    const service = new RemoteStorageService({ retries: 1 });
    await expect(service.generateAccountCode()).rejects.toBeInstanceOf(RemoteSessionError);

    await service.resetSession();
    expect(localStorage.getItem(KEY)).toBeNull();

    const code = await service.generateAccountCode();
    expect(code.code).toHaveLength(8);
    expect(JSON.parse(localStorage.getItem(KEY) as string).userId).not.toBe('someone');
  });

  it('resetSession never touches local progress', async () => {
    localStorage.setItem('levelup_word_progress', '{"de":{"w":{"xp":10}}}');
    localStorage.setItem(KEY, JSON.stringify({ userId: 'x', sessionToken: 'y' }));
    await new RemoteStorageService({ retries: 1 }).resetSession();
    expect(localStorage.getItem('levelup_word_progress')).toBe('{"de":{"w":{"xp":10}}}');
  });

  it('the code lifetime comes from the server, not a fixed 24 hours', async () => {
    const service = new RemoteStorageService({ retries: 1 });
    const before = Date.now();
    const { expires } = await service.generateAccountCode();
    const lifetime = expires - before;
    // the API default is 1 hour; it must not be reported as a day
    expect(lifetime).toBeGreaterThan(55 * 60 * 1000);
    expect(lifetime).toBeLessThan(65 * 60 * 1000);
  });
  describe('hasSession()', () => {
    const lose = async (service: RemoteStorageService) => {
      localStorage.setItem(KEY, JSON.stringify({ userId: 'someone', sessionToken: 'garbage' }));
      await expect(service.getUserSession()).rejects.toBeInstanceOf(RemoteSessionError);
    };

    it('is false before any session, and never creates one or calls the network', () => {
      const service = new RemoteStorageService({ retries: 1 });
      fetchMock.mockClear();
      expect(service.hasSession()).toBe(false);
      expect(service.hasSession()).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(localStorage.getItem(KEY)).toBeNull();
    });

    it('does not restore a stored session by itself', () => {
      localStorage.setItem(KEY, JSON.stringify({ userId: 'u', sessionToken: 't' }));
      const service = new RemoteStorageService({ retries: 1 });
      fetchMock.mockClear();
      expect(service.hasSession()).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('is true once a session is established, and false again after resetSession()', async () => {
      const service = new RemoteStorageService({ retries: 1 });
      await service.getUserSession();
      fetchMock.mockClear();
      expect(service.hasSession()).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();

      await service.resetSession();
      expect(service.hasSession()).toBe(false);
    });

    it('is false after the server refused the stored session', async () => {
      const service = new RemoteStorageService({ retries: 1 });
      await lose(service);
      fetchMock.mockClear();
      expect(service.hasSession()).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('is true after a lost session is replaced by linking a device, which then is used', async () => {
      const { created } = await createServerSession();
      const owner = new RemoteStorageService({ retries: 1 });
      localStorage.setItem(
        KEY,
        JSON.stringify({ userId: created.userId, sessionToken: created.sessionToken })
      );
      const { code } = await owner.generateAccountCode();

      localStorage.clear();
      const service = new RemoteStorageService({ retries: 1 });
      await lose(service);
      expect(service.hasSession()).toBe(false);

      const linked = await service.linkDeviceWithCode(code);
      expect(linked.success).toBe(true);
      expect(service.hasSession()).toBe(true);

      // an explicit call now uses the linked session instead of throwing the stale lost-session
      fetchMock.mockClear();
      const session = await service.getUserSession();
      expect(session.userId).toBe(created.userId);
      expect(session.isGuest).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(JSON.parse(localStorage.getItem(KEY) as string).userId).toBe(created.userId);

      await service.putValue('es', 'k', { a: 1 });
      await expect(service.getValue('es', 'k')).resolves.toEqual({ a: 1 });
    });
  });
});
