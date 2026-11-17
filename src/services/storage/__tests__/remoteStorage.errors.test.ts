import { RemoteNetworkError, RemoteSessionError, RemoteStorageService } from '../remoteStorage';

const KEY = 'levelup_remote_session';
const STORED = { userId: 'u1', sessionToken: 'tok-1', isGuest: true };

const reply = (status: number, body: unknown = {}) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as Response;

const authenticated = (over: object = {}) =>
  reply(200, { success: true, data: { userId: 'u1', sessionToken: 'tok-2', ...over } });
const created = (id = 'g1') =>
  reply(200, { success: true, data: { userId: id, sessionToken: `tok-${id}` } });

const actionOf = (call: unknown[]) => JSON.parse(String((call[1] as RequestInit).body)).action;
const calls = (fetchMock: jest.Mock, action: string) =>
  fetchMock.mock.calls.filter(call => actionOf(call) === action).length;

describe('RemoteStorageService error handling and session state', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const store = () => localStorage.setItem(KEY, JSON.stringify(STORED));
  const stored = () => JSON.parse(localStorage.getItem(KEY) as string);

  describe('which refusals mean the session is lost', () => {
    it.each([401, 404])('%i from authenticate is a lost session', async status => {
      store();
      fetchMock.mockResolvedValue(reply(status));
      await expect(
        new RemoteStorageService({ retries: 3 }).getUserSession()
      ).rejects.toBeInstanceOf(RemoteSessionError);
      expect(fetchMock).toHaveBeenCalledTimes(1); // refused, not retried
      expect(stored()).toEqual(STORED); // nothing deleted or replaced
    });

    it('a 400 is a malformed request, not a lost session', async () => {
      store();
      fetchMock.mockResolvedValue(reply(400));
      const error = await new RemoteStorageService({ retries: 1 }).getUserSession().catch(e => e);
      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeInstanceOf(RemoteSessionError);
      expect(stored()).toEqual(STORED);
    });

    it('a success without a user id is a lost session', async () => {
      store();
      fetchMock.mockResolvedValue(reply(200, { success: true, data: {} }));
      await expect(
        new RemoteStorageService({ retries: 1 }).getUserSession()
      ).rejects.toBeInstanceOf(RemoteSessionError);
    });
  });

  describe('retries', () => {
    it.each([500, 429, 408])('a %i is retried and can then succeed', async status => {
      jest.useFakeTimers();
      store();
      fetchMock.mockResolvedValueOnce(reply(status)).mockResolvedValueOnce(authenticated());
      const pending = new RemoteStorageService({ retries: 2 }).getUserSession();
      await jest.advanceTimersByTimeAsync(2000);
      await expect(pending).resolves.toMatchObject({ userId: 'u1', sessionToken: 'tok-2' });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('a 5xx that keeps failing is retried up to the limit, then reported as is', async () => {
      jest.useFakeTimers();
      store();
      fetchMock.mockResolvedValue(reply(500));
      const pending = new RemoteStorageService({ retries: 3 }).getUserSession().catch(e => e);
      await jest.advanceTimersByTimeAsync(10_000);
      const error = await pending;
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(error).not.toBeInstanceOf(RemoteSessionError);
      expect(error).not.toBeInstanceOf(RemoteNetworkError);
    });

    it('other 4xx (403, 422) are not retried', async () => {
      for (const status of [403, 422]) {
        fetchMock.mockReset();
        fetchMock.mockResolvedValue(reply(status));
        store();
        await new RemoteStorageService({ retries: 3 }).getUserSession().catch(() => undefined);
        expect(fetchMock).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('no answer from the server', () => {
    it('a failed fetch is a network error, retried, and leaves the stored session alone', async () => {
      jest.useFakeTimers();
      store();
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
      const pending = new RemoteStorageService({ retries: 2 }).getUserSession().catch(e => e);
      await jest.advanceTimersByTimeAsync(5000);

      const error = await pending;
      expect(error).toBeInstanceOf(RemoteNetworkError);
      expect(error).not.toBeInstanceOf(RemoteSessionError);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(stored()).toEqual(STORED);
    });

    it('a timeout is a network error too', async () => {
      store();
      fetchMock.mockRejectedValue(new DOMException('signal timed out', 'TimeoutError'));
      await expect(
        new RemoteStorageService({ retries: 1 }).getUserSession()
      ).rejects.toBeInstanceOf(RemoteNetworkError);
    });

    it('being offline is a network error without trying', async () => {
      store();
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      window.dispatchEvent(new Event('offline'));
      const service = new RemoteStorageService({ retries: 1 });
      window.dispatchEvent(new Event('offline'));
      await expect(service.getUserSession()).rejects.toBeInstanceOf(RemoteNetworkError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('failing to create a guest because the network is down stays a network error', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
      await expect(
        new RemoteStorageService({ retries: 1 }).getUserSession()
      ).rejects.toBeInstanceOf(RemoteNetworkError);
    });

    it('failing to create a guest because the server errs is the generic failure', async () => {
      fetchMock.mockResolvedValue(reply(500));
      const error = await new RemoteStorageService({ retries: 1 }).getUserSession().catch(e => e);
      expect(error.message).toBe('Failed to initialize user session');
      expect(error).not.toBeInstanceOf(RemoteNetworkError);
    });
  });

  describe('keeping the refreshed session', () => {
    it('keeps the guest flag it was stored with, and the new token', async () => {
      store();
      fetchMock.mockResolvedValue(authenticated());
      const session = await new RemoteStorageService({ retries: 1 }).getUserSession();
      expect(session).toMatchObject({ userId: 'u1', sessionToken: 'tok-2', isGuest: true });
      expect(stored()).toEqual({ userId: 'u1', sessionToken: 'tok-2', isGuest: true });
    });

    it('keeps the old token when the server sends none', async () => {
      store();
      fetchMock.mockResolvedValue(
        reply(200, { success: true, data: { userId: 'u1' } }) // no sessionToken
      );
      const session = await new RemoteStorageService({ retries: 1 }).getUserSession();
      expect(session.sessionToken).toBe('tok-1');
    });

    it('a storage that refuses the write does not fail the call (best effort)', async () => {
      store();
      fetchMock.mockResolvedValue(authenticated());
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('quota exceeded', 'QuotaExceededError');
      });
      const service = new RemoteStorageService({ retries: 1 });
      await expect(service.getUserSession()).resolves.toMatchObject({ sessionToken: 'tok-2' });
      // and the session is usable straight away, not only on the second attempt
      await expect(service.getUserSession()).resolves.toMatchObject({ sessionToken: 'tok-2' });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('creating a guest also survives a storage that refuses the write', async () => {
      fetchMock.mockResolvedValue(created());
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('blocked', 'SecurityError');
      });
      await expect(
        new RemoteStorageService({ retries: 1 }).getUserSession()
      ).resolves.toMatchObject({
        userId: 'g1',
      });
    });
  });

  describe('concurrency', () => {
    it('two callers at once create one guest, not two', async () => {
      let release!: (r: Response) => void;
      fetchMock.mockImplementation(() => new Promise<Response>(resolve => (release = resolve)));
      const service = new RemoteStorageService({ retries: 1 });

      const first = service.getUserSession();
      const second = service.getUserSession();
      release(created('only'));

      const [a, b] = await Promise.all([first, second]);
      expect(calls(fetchMock, 'create')).toBe(1);
      expect(a.userId).toBe('only');
      expect(b).toBe(a);
      expect(stored().userId).toBe('only');
    });

    it('a restore still in flight when the session is reset cannot bring the old session back', async () => {
      store();
      let release!: (r: Response) => void;
      fetchMock.mockImplementationOnce(() => new Promise<Response>(resolve => (release = resolve)));
      const service = new RemoteStorageService({ retries: 1 });

      const restoring = service.getUserSession().catch(e => e);
      await service.resetSession();
      release(authenticated()); // the stale authenticate answers after the reset

      expect(await restoring).toBeInstanceOf(Error);
      expect(localStorage.getItem(KEY)).toBeNull(); // not written back
      // a fresh call really starts over instead of finding the resurrected account
      fetchMock.mockResolvedValue(created('fresh'));
      await expect(service.getUserSession()).resolves.toMatchObject({ userId: 'fresh' });
    });
  });

  describe('a lost session is not asked about again until reset', () => {
    it('later calls fail at once without another request, and a reset clears it', async () => {
      store();
      fetchMock.mockResolvedValue(reply(401));
      const service = new RemoteStorageService({ retries: 1 });
      await expect(service.getUserSession()).rejects.toBeInstanceOf(RemoteSessionError);
      await expect(service.getUserSession()).rejects.toBeInstanceOf(RemoteSessionError);
      await expect(service.getUserSession()).rejects.toBeInstanceOf(RemoteSessionError);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      await service.resetSession();
      fetchMock.mockResolvedValue(created('after'));
      await expect(service.getUserSession()).resolves.toMatchObject({ userId: 'after' });
    });

    it('linking a device with a code replaces a lost session', async () => {
      store();
      fetchMock.mockResolvedValueOnce(reply(401));
      const service = new RemoteStorageService({ retries: 1 });
      await expect(service.getUserSession()).rejects.toBeInstanceOf(RemoteSessionError);

      fetchMock.mockResolvedValueOnce(
        reply(200, { success: true, data: { userId: 'linked', sessionToken: 'tok-linked' } })
      );
      await service.linkDeviceWithCode('abcd2345');
      fetchMock.mockClear();

      await expect(service.getUserSession()).resolves.toMatchObject({ userId: 'linked' });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(stored().userId).toBe('linked');
    });
  });

  describe('account code lifetime', () => {
    it('is taken from the server response', async () => {
      store();
      fetchMock
        .mockResolvedValueOnce(authenticated())
        .mockResolvedValueOnce(
          reply(200, { success: true, data: { accountCode: 'ABCD2345', expiresIn: 120 } })
        );
      const before = Date.now();
      const { expires } = await new RemoteStorageService({ retries: 1 }).generateAccountCode();
      expect(expires - before).toBeGreaterThan(115_000);
      expect(expires - before).toBeLessThan(125_000); // 2 minutes, not 1 hour and not 24
    });

    it('falls back to one hour only when the server says nothing usable', async () => {
      for (const expiresIn of [undefined, 'soon', -5, 0]) {
        fetchMock.mockReset();
        store();
        fetchMock
          .mockResolvedValueOnce(authenticated())
          .mockResolvedValueOnce(
            reply(200, { success: true, data: { accountCode: 'ABCD2345', expiresIn } })
          );
        const before = Date.now();
        const { expires } = await new RemoteStorageService({ retries: 1 }).generateAccountCode();
        expect(expires - before).toBeGreaterThan(3_590_000);
        expect(expires - before).toBeLessThan(3_610_000);
      }
    });
  });
});
