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

  describe('a session that expires while the page stays open', () => {
    const url = (call: unknown[]) => String(call[0]);
    const tokenOf = (call: unknown[]) =>
      JSON.parse(String((call[1] as RequestInit).body)).sessionToken;

    /** A service that already holds a session in memory, as a PWA left running for days would. */
    const openPage = async (service = new RemoteStorageService({ retries: 1 })) => {
      store();
      fetchMock.mockResolvedValueOnce(authenticated({ sessionToken: 'tok-open' }));
      await service.getUserSession();
      fetchMock.mockReset();
      return service;
    };
    const storageOk = (data: unknown) => reply(200, { success: true, data, metadata: {} });

    it('refreshes once and retries the same request with the new token', async () => {
      const service = await openPage();
      fetchMock
        .mockResolvedValueOnce(reply(401)) // storage: token expired
        .mockResolvedValueOnce(authenticated({ sessionToken: 'tok-renewed' })) // authenticate
        .mockResolvedValueOnce(storageOk({ xp: 5 })); // storage again

      const result = await service.get('word_progress_de');

      expect(result).toMatchObject({ success: true, data: { xp: 5 } });
      const sequence = fetchMock.mock.calls.map(
        call => `${url(call).split('/api/')[1]}:${actionOf(call)}:${tokenOf(call)}`
      );
      expect(sequence).toEqual([
        'storage:get:tok-open',
        'users:authenticate:tok-open',
        'storage:get:tok-renewed',
      ]);
      expect(stored().sessionToken).toBe('tok-renewed');
    });

    it('works for every protected call, including generating a code', async () => {
      const service = await openPage();
      fetchMock
        .mockResolvedValueOnce(reply(401))
        .mockResolvedValueOnce(authenticated({ sessionToken: 'tok-renewed' }))
        .mockResolvedValueOnce(
          reply(200, { success: true, data: { accountCode: 'ABCD2345', expiresIn: 3600 } })
        );
      await expect(service.generateAccountCode()).resolves.toMatchObject({ code: 'ABCD2345' });
      expect(tokenOf(fetchMock.mock.calls[2])).toBe('tok-renewed');

      for (const run of [
        (s: RemoteStorageService) => s.set('k', { a: 1 }),
        (s: RemoteStorageService) => s.delete('k'),
        (s: RemoteStorageService) => s.getKeys('.*'),
      ]) {
        fetchMock.mockReset();
        fetchMock
          .mockResolvedValueOnce(reply(401))
          .mockResolvedValueOnce(authenticated({ sessionToken: 'tok-again' }))
          .mockResolvedValueOnce(storageOk([]));
        expect(await run(service)).toMatchObject({ success: true });
        expect(tokenOf(fetchMock.mock.calls[2])).toBe('tok-again');
      }
    });

    it('does not loop: a 401 that survives the refresh is reported, after exactly one retry', async () => {
      const service = await openPage();
      fetchMock
        .mockResolvedValueOnce(reply(401))
        .mockResolvedValueOnce(authenticated({ sessionToken: 'tok-renewed' }))
        .mockResolvedValue(reply(401));
      const result = await service.get('word_progress_de');
      expect(result.success).toBe(false);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('a refused refresh is a lost session and is not retried on every later call', async () => {
      const service = await openPage();
      fetchMock.mockResolvedValueOnce(reply(401)).mockResolvedValueOnce(reply(401)); // storage, authenticate

      await expect(service.generateAccountCode()).rejects.toBeInstanceOf(RemoteSessionError);
      // the saved session is left exactly as it was, for the reset flow
      expect(stored()).toEqual({ ...STORED, sessionToken: 'tok-open' });

      fetchMock.mockClear();
      await expect(service.generateAccountCode()).rejects.toBeInstanceOf(RemoteSessionError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('does not try to refresh for errors that are not an expired token', async () => {
      for (const status of [500, 403, 429]) {
        const service = await openPage();
        fetchMock.mockResolvedValue(reply(status));
        await service.get('word_progress_de');
        expect(fetchMock.mock.calls.some(call => actionOf(call) === 'authenticate')).toBe(false);
      }
    });

    it('calls that fail together share one refresh', async () => {
      const service = await openPage();
      let storageCalls = 0;
      fetchMock.mockImplementation(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body));
        if (body.action === 'authenticate') return authenticated({ sessionToken: 'tok-shared' });
        storageCalls += 1;
        return body.sessionToken === 'tok-shared' ? storageOk([]) : reply(401);
      });

      await Promise.all([service.get('a'), service.get('b'), service.getKeys('.*')]);

      expect(calls(fetchMock, 'authenticate')).toBe(1);
      expect(storageCalls).toBe(6); // three failed, three retried
    });

    it('a network failure during the refresh is a network error, not a lost session', async () => {
      const service = await openPage();
      fetchMock
        .mockResolvedValueOnce(reply(401))
        .mockRejectedValue(new TypeError('Failed to fetch'));
      const error = await service.generateAccountCode().catch(e => e);
      expect(error).toBeInstanceOf(RemoteNetworkError);
      // the session is still usable once the network is back
      fetchMock.mockReset();
      fetchMock
        .mockResolvedValueOnce(reply(401))
        .mockResolvedValueOnce(authenticated({ sessionToken: 'tok-later' }))
        .mockResolvedValueOnce(
          reply(200, { success: true, data: { accountCode: 'LATE2345', expiresIn: 60 } })
        );
      await expect(service.generateAccountCode()).resolves.toMatchObject({ code: 'LATE2345' });
    });
  });
});
