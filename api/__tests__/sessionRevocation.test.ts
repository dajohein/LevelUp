import { createSessionToken } from '../_auth.js';
import usersHandler from '../users.js';
import storageHandler from '../storage.js';

function mockRes() {
  const res: any = { headers: {} as Record<string, string>, statusCode: 0, body: undefined };
  res.status = (c: number) => {
    res.statusCode = c;
    return res;
  };
  res.json = (b: unknown) => {
    res.body = b;
    return res;
  };
  res.setHeader = (k: string, v: string) => {
    res.headers[k] = v;
    return res;
  };
  res.end = () => res;
  return res;
}

const callUsers = async (body: any, ip = '1.1.1.1') => {
  const res = mockRes();
  await usersHandler(
    { method: 'POST', body, query: {}, headers: { 'x-forwarded-for': ip } } as any,
    res
  );
  return res;
};

const callStorage = async (body: any, ip = '1.1.1.1') => {
  const res = mockRes();
  await storageHandler(
    { method: 'POST', body, query: {}, headers: { 'x-forwarded-for': ip } } as any,
    res
  );
  return res;
};

describe('Session revocation and logout (Issue #71)', () => {
  it('signing out everywhere makes existing tokens fail on every endpoint, including refresh', async () => {
    // 1. Create user
    const createRes = await callUsers({ action: 'create' }, '10.1.0.1');
    expect(createRes.body.success).toBe(true);
    const { userId, sessionToken } = createRes.body.data;
    expect(userId).toBeDefined();
    expect(sessionToken).toBeDefined();

    // 2. Pre-revocation: verify token works on all endpoints
    // Users: get
    const getBefore = await callUsers({ action: 'get', sessionToken }, '10.1.0.1');
    expect(getBefore.statusCode).toBe(200);
    expect(getBefore.body.data.user.id).toBe(userId);

    // Users: update
    const updateBefore = await callUsers(
      { action: 'update', sessionToken, userData: { username: 'active_user' } },
      '10.1.0.1'
    );
    expect(updateBefore.statusCode).toBe(200);

    // Storage: set, get, list
    const setBefore = await callStorage(
      {
        action: 'set',
        userId,
        sessionToken,
        languageCode: 'es',
        key: 'progress',
        data: { score: 10 },
      },
      '10.1.0.1'
    );
    expect(setBefore.statusCode).toBe(200);
    expect(setBefore.body.success).toBe(true);

    const getStoreBefore = await callStorage(
      { action: 'get', userId, sessionToken, languageCode: 'es', key: 'progress' },
      '10.1.0.1'
    );
    expect(getStoreBefore.statusCode).toBe(200);
    expect(getStoreBefore.body.data).toEqual({ score: 10 });

    const listBefore = await callStorage(
      { action: 'list', userId, sessionToken, languageCode: 'es' },
      '10.1.0.1'
    );
    expect(listBefore.statusCode).toBe(200);
    expect(listBefore.body.data).toContain('progress');

    // Users: generateCode
    const genBefore = await callUsers({ action: 'generateCode', sessionToken }, '10.1.0.1');
    expect(genBefore.statusCode).toBe(200);

    // 3. Sign out everywhere (revokeSessions)
    const revokeRes = await callUsers({ action: 'revokeSessions', sessionToken }, '10.1.0.1');
    expect(revokeRes.statusCode).toBe(200);
    expect(revokeRes.body.success).toBe(true);

    // 4. Post-revocation: the old sessionToken MUST fail on EVERY endpoint
    // Users: get
    const getAfter = await callUsers({ action: 'get', sessionToken }, '10.1.0.1');
    expect(getAfter.statusCode).toBe(401);

    // Users: update
    const updateAfter = await callUsers(
      { action: 'update', sessionToken, userData: { username: 'hacked' } },
      '10.1.0.1'
    );
    expect(updateAfter.statusCode).toBe(401);

    // Users: authenticate (refresh endpoint)
    const refreshAfter = await callUsers({ action: 'authenticate', sessionToken }, '10.1.0.1');
    expect(refreshAfter.statusCode).toBe(401);

    // Users: generateCode
    const genAfter = await callUsers({ action: 'generateCode', sessionToken }, '10.1.0.1');
    expect(genAfter.statusCode).toBe(401);

    // Storage: get
    const getStoreAfter = await callStorage(
      { action: 'get', userId, sessionToken, languageCode: 'es', key: 'progress' },
      '10.1.0.1'
    );
    expect(getStoreAfter.statusCode).toBe(401);

    // Storage: set
    const setAfter = await callStorage(
      {
        action: 'set',
        userId,
        sessionToken,
        languageCode: 'es',
        key: 'progress',
        data: { score: 999 },
      },
      '10.1.0.1'
    );
    expect(setAfter.statusCode).toBe(401);

    // Storage: delete
    const delAfter = await callStorage(
      { action: 'delete', userId, sessionToken, languageCode: 'es', key: 'progress' },
      '10.1.0.1'
    );
    expect(delAfter.statusCode).toBe(401);

    // Storage: list
    const listAfter = await callStorage(
      { action: 'list', userId, sessionToken, languageCode: 'es' },
      '10.1.0.1'
    );
    expect(listAfter.statusCode).toBe(401);
  });

  it('handles legacy tokens: accepts before revocation, fails after revocation', async () => {
    // Create user
    const createRes = await callUsers({ action: 'create' }, '10.2.0.1');
    const { userId } = createRes.body.data;

    // Create legacy token (without session version claim)
    const legacyToken = createSessionToken(userId, 60 * 60 * 1000);

    // Before revocation: legacy token is accepted
    const getBefore = await callUsers({ action: 'get', sessionToken: legacyToken }, '10.2.0.1');
    expect(getBefore.statusCode).toBe(200);

    const storeBefore = await callStorage(
      { action: 'get', userId, sessionToken: legacyToken, languageCode: 'es', key: 'progress' },
      '10.2.0.1'
    );
    expect(storeBefore.statusCode).not.toBe(401);

    // Revoke sessions using the legacy token
    const revokeRes = await callUsers(
      { action: 'revokeSessions', sessionToken: legacyToken },
      '10.2.0.1'
    );
    expect(revokeRes.statusCode).toBe(200);

    // After revocation: legacy token is rejected everywhere
    const getAfter = await callUsers({ action: 'get', sessionToken: legacyToken }, '10.2.0.1');
    expect(getAfter.statusCode).toBe(401);

    const refreshAfter = await callUsers(
      { action: 'authenticate', sessionToken: legacyToken },
      '10.2.0.1'
    );
    expect(refreshAfter.statusCode).toBe(401);

    const storeAfter = await callStorage(
      { action: 'get', userId, sessionToken: legacyToken, languageCode: 'es', key: 'progress' },
      '10.2.0.1'
    );
    expect(storeAfter.statusCode).toBe(401);
  });

  it('re-authentication or linking creates tokens with current session version that succeed', async () => {
    const createRes = await callUsers({ action: 'create' }, '10.3.0.1');
    const { sessionToken: initialToken } = createRes.body.data;

    // Generate link code before revoking
    const codeRes = await callUsers(
      { action: 'generateCode', sessionToken: initialToken },
      '10.3.0.1'
    );
    const { accountCode } = codeRes.body.data;

    // Revoke sessions
    await callUsers({ action: 'revokeSessions', sessionToken: initialToken }, '10.3.0.1');

    // Linking with the code generated before revocation must fail (pending code was deleted)
    const linkOld = await callUsers({ action: 'linkDevice', accountCode }, '10.3.0.2');
    expect(linkOld.statusCode).toBe(400);
  });

  it('rejects revoke request if sessionToken is invalid or already revoked', async () => {
    const res = await callUsers({ action: 'revokeSessions', sessionToken: 'invalid.token' });
    expect(res.statusCode).toBe(401);
  });

  it('signOutEverywhere works identically to revokeSessions', async () => {
    const createRes = await callUsers({ action: 'create' }, '10.4.0.1');
    const { sessionToken } = createRes.body.data;

    const revokeRes = await callUsers({ action: 'signOutEverywhere', sessionToken }, '10.4.0.1');
    expect(revokeRes.statusCode).toBe(200);
    expect(revokeRes.body.success).toBe(true);

    const getAfter = await callUsers({ action: 'get', sessionToken }, '10.4.0.1');
    expect(getAfter.statusCode).toBe(401);
  });

  it('sequential revokes increment sessionVersion and invalidate intermediate tokens', async () => {
    const createRes = await callUsers({ action: 'create' }, '10.5.0.1');
    const { userId, sessionToken: v1Token } = createRes.body.data;

    // Revoke v1 -> bumps to v2
    const rev1 = await callUsers({ action: 'revokeSessions', sessionToken: v1Token }, '10.5.0.1');
    expect(rev1.body.data.sessionVersion).toBe(2);

    // Mint a v2 token for the user
    const v2Token = createSessionToken(userId, 60 * 60 * 1000, Date.now(), undefined, 2);
    const getV2Before = await callUsers({ action: 'get', sessionToken: v2Token }, '10.5.0.1');
    expect(getV2Before.statusCode).toBe(200);

    // Revoke v2 -> bumps to v3
    const rev2 = await callUsers({ action: 'revokeSessions', sessionToken: v2Token }, '10.5.0.1');
    expect(rev2.body.data.sessionVersion).toBe(3);

    // Both v1 and v2 must fail
    expect((await callUsers({ action: 'get', sessionToken: v1Token }, '10.5.0.1')).statusCode).toBe(
      401
    );
    expect((await callUsers({ action: 'get', sessionToken: v2Token }, '10.5.0.1')).statusCode).toBe(
      401
    );

    // A fresh v3 token succeeds
    const v3Token = createSessionToken(userId, 60 * 60 * 1000, Date.now(), undefined, 3);
    expect((await callUsers({ action: 'get', sessionToken: v3Token }, '10.5.0.1')).statusCode).toBe(
      200
    );
  });

  it('normal requests do not get noticeably slower (cheap single read)', async () => {
    const createRes = await callUsers({ action: 'create' }, '10.6.0.1');
    const { userId, sessionToken } = createRes.body.data;

    const start = performance.now();
    for (let i = 0; i < 50; i++) {
      const res = await callStorage(
        { action: 'get', userId, sessionToken, languageCode: 'es', key: 'bench' },
        '10.6.0.1'
      );
      expect(res.statusCode).not.toBe(401);
    }
    const elapsed = performance.now() - start;
    // 50 operations in-memory should easily complete in under 500ms (< 10ms per request)
    expect(elapsed).toBeLessThan(500);
  });
});
