import { remoteStorage } from '../remoteStorage';

// Stub fetch to call local API handlers directly
function createResponse(body: any, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

// Minimal Vercel-like response wrapper
function makeVercelResponse() {
  const res: any = {
    _status: 200,
    _json: null as any,
    status(code: number) { this._status = code; return this; },
    json(obj: any) { this._json = obj; return this; },
    setHeader() { return this; },
    end() { return this; },
  };
  return res;
}

describe('RemoteStorageService integration (local handlers)', () => {
  beforeEach(() => {
    jest.resetModules();
    localStorage.clear();
    // Ensure navigator.onLine exists
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

    // Mock fetch
    global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(init!.body as string) : {};

      if (url.endsWith('/api/storage')) {
        const req: any = { method: 'POST', body, headers: {} };
        const res = makeVercelResponse();
        const handler = (await import('../../../../api/storage')).default;
        await handler(req, res);
        return createResponse(res._json, res._status);
      }

      if (url.endsWith('/api/users')) {
        const req: any = { method: 'POST', body, headers: {} };
        const res = makeVercelResponse();
        const handler = (await import('../../../../api/users')).default;
        await handler(req, res);
        return createResponse(res._json, res._status);
      }

      return createResponse({ success: false, error: 'Unknown endpoint' }, 404);
    }) as any;
  });

  it('initializes user session and performs language-scoped set/get/list/delete', async () => {
    // Ensure language is set
    remoteStorage.setCurrentLanguage('de');

    // Initialize session
    const session = await remoteStorage.getUserSession();
    expect(session.userId).toBeDefined();
    expect(session.sessionToken).toBeDefined();

    // Set word progress for DE
    const deKey = 'word_progress_de';
    const payload = { w1: { xp: 10 }, w2: { xp: 20 } };
    const setRes = await remoteStorage.set(deKey, payload, { compress: false });
    expect(setRes.success).toBe(true);

    // Get word progress for DE
    const getRes = await remoteStorage.get<any>(deKey, { compress: false });
    expect(getRes.success).toBe(true);
    expect(getRes.data).toEqual(payload);
    expect(getRes.metadata?.tier).toBe('remote');
    expect(getRes.metadata?.sessionType).toBeDefined();

    // List keys for DE
    const listRes = await remoteStorage.getKeys('word_progress_.*');
    expect(listRes.success).toBe(true);
    expect(listRes.data).toEqual(expect.arrayContaining([deKey]));

    // Switch to ES, set ES data, ensure isolation
    remoteStorage.setCurrentLanguage('es');
    const esKey = 'word_progress_es';
    const esPayload = { wA: { xp: 5 } };
    const setEs = await remoteStorage.set(esKey, esPayload, { compress: false });
    expect(setEs.success).toBe(true);

    const listEs = await remoteStorage.getKeys('word_progress_.*');
    expect(listEs.success).toBe(true);
    expect(listEs.data).toEqual(expect.arrayContaining([esKey]));
    // Should not include DE key when listing ES
    expect(listEs.data).not.toEqual(expect.arrayContaining([deKey]));

    // Delete ES key
    const delEs = await remoteStorage.delete(esKey);
    expect(delEs.success).toBe(true);

    const listEsAfter = await remoteStorage.getKeys('word_progress_.*');
    expect(listEsAfter.data).not.toEqual(expect.arrayContaining([esKey]));

    // Switch back to DE and confirm DE data remains
    remoteStorage.setCurrentLanguage('de');
    const getDeAgain = await remoteStorage.get<any>(deKey, { compress: false });
    expect(getDeAgain.success).toBe(true);
    expect(getDeAgain.data).toEqual(payload);
  });

  it('handles offline mode gracefully', async () => {
    // Set offline
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    // Trigger offline event so RemoteStorageService updates its internal flag
    window.dispatchEvent(new Event('offline'));

    remoteStorage.setCurrentLanguage('de');
    const res = await remoteStorage.get('word_progress_de');

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Remote storage unavailable/);
    expect(res.metadata?.offline).toBe(true);
  });
});
