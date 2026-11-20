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

  describe('the revoking device keeps access (H1)', () => {
    it('revokeSessions returns a token at the new version; old tokens die, the new one works everywhere', async () => {
      const { userId, sessionToken: oldToken } = (await callUsers({ action: 'create' }, '10.7.0.1'))
        .body.data;
      await callStorage(
        {
          action: 'set',
          userId,
          sessionToken: oldToken,
          languageCode: 'es',
          key: 'progress',
          data: { score: 1 },
        },
        '10.7.0.1'
      );

      const revoke = await callUsers(
        { action: 'revokeSessions', sessionToken: oldToken },
        '10.7.0.1'
      );
      expect(revoke.statusCode).toBe(200);
      const newToken = revoke.body.data.sessionToken;
      expect(typeof newToken).toBe('string');
      expect(newToken).not.toBe(oldToken);

      expect(
        (await callUsers({ action: 'get', sessionToken: oldToken }, '10.7.0.1')).statusCode
      ).toBe(401);
      expect(
        (await callUsers({ action: 'get', sessionToken: newToken }, '10.7.0.1')).statusCode
      ).toBe(200);
      // the remote data written before the revoke is still reachable from the revoking device
      const read = await callStorage(
        { action: 'get', userId, sessionToken: newToken, languageCode: 'es', key: 'progress' },
        '10.7.0.1'
      );
      expect(read.statusCode).toBe(200);
      expect(read.body.data).toEqual({ score: 1 });
      // and it can still hand out a link code
      expect(
        (await callUsers({ action: 'generateCode', sessionToken: newToken }, '10.7.0.1')).statusCode
      ).toBe(200);
    });

    it('a legacy profile without sessionVersion is revoked (HINCRBY would otherwise stay at 1)', async () => {
      const { getDb, userKey } = await import('../_db.js');
      const { userId } = (await callUsers({ action: 'create' }, '10.7.1.1')).body.data;
      await (await getDb()).hdel(userKey(userId), 'sessionVersion');
      const legacy = createSessionToken(userId, 60 * 60 * 1000);
      expect(
        (await callUsers({ action: 'get', sessionToken: legacy }, '10.7.1.1')).statusCode
      ).toBe(200);

      const revoke = await callUsers(
        { action: 'revokeSessions', sessionToken: legacy },
        '10.7.1.1'
      );
      expect(revoke.body.data.sessionVersion).toBe(2);
      expect(
        (await callUsers({ action: 'get', sessionToken: legacy }, '10.7.1.1')).statusCode
      ).toBe(401);
      expect(
        (
          await callUsers(
            { action: 'get', sessionToken: revoke.body.data.sessionToken },
            '10.7.1.1'
          )
        ).statusCode
      ).toBe(200);
    });
  });

  describe('revoke is a compare-and-increment', () => {
    it('refuses a request whose token was revoked between the session check and the bump', async () => {
      const { getDb, userKey } = await import('../_db.js');
      const { userId, sessionToken } = (await callUsers({ action: 'create' }, '10.9.0.1')).body
        .data;
      const db = await getDb();
      const realIncr = db.incr.bind(db);
      let winner: any;
      // the first request has passed isSessionActive (version 1); before it bumps, another device
      // finishes its own revocation (version 2)
      const spy = jest.spyOn(db, 'incr').mockImplementationOnce(async (key: string) => {
        winner = await callUsers({ action: 'revokeSessions', sessionToken }, '10.9.0.2');
        return realIncr(key);
      });
      try {
        const loser = await callUsers({ action: 'revokeSessions', sessionToken }, '10.9.0.1');
        expect(winner.statusCode).toBe(200);
        expect(loser.statusCode).toBe(401);
        expect(loser.body.data?.sessionToken).toBeUndefined();
      } finally {
        spy.mockRestore();
      }
      // the version was bumped once (to 2), and the winner's token still works
      expect((await db.hget(userKey(userId), 'sessionVersion')) as number).toBe(2);
      const ok = await callUsers(
        { action: 'get', sessionToken: winner.body.data.sessionToken },
        '10.9.0.3'
      );
      expect(ok.statusCode).toBe(200);
    });
  });

  describe('isSessionActive fails closed (H2)', () => {
    const setField = async (userId: string, value: unknown) => {
      const { getDb, userKey } = await import('../_db.js');
      const db = await getDb();
      if (value === undefined) await db.hdel(userKey(userId), 'sessionVersion');
      else await db.hset(userKey(userId), { sessionVersion: value });
    };

    it.each([
      ['a string', 'abc'],
      ['a numeric string', '2'],
      ['zero', 0],
      ['negative', -3],
      ['a float', 1.5],
      ['null', null],
    ])('denies every endpoint when the stored sessionVersion is %s', async (_label, value) => {
      const { userId, sessionToken } = (await callUsers({ action: 'create' }, '10.8.0.1')).body
        .data;
      await setField(userId, value);

      for (const action of ['get', 'update', 'authenticate', 'generateCode', 'revokeSessions']) {
        const res = await callUsers(
          { action, sessionToken, userData: { username: 'x' } },
          '10.8.0.1'
        );
        expect([action, res.statusCode]).toEqual([action, 401]);
      }
      const store = await callStorage(
        { action: 'get', userId, sessionToken, languageCode: 'es', key: 'progress' },
        '10.8.0.1'
      );
      expect(store.statusCode).toBe(401);
    });

    it('a profile that lost its sessionVersion does not accept a token with v > 1', async () => {
      const { userId } = (await callUsers({ action: 'create' }, '10.8.1.1')).body.data;
      await setField(userId, undefined);
      const v2 = createSessionToken(userId, 60 * 60 * 1000, Date.now(), undefined, 2);
      expect((await callUsers({ action: 'get', sessionToken: v2 }, '10.8.1.1')).statusCode).toBe(
        401
      );
      expect(
        (
          await callStorage(
            { action: 'get', userId, sessionToken: v2, languageCode: 'es', key: 'progress' },
            '10.8.1.1'
          )
        ).statusCode
      ).toBe(401);
    });

    it('a deleted user is not active on the storage endpoints', async () => {
      const { getDb, userKey } = await import('../_db.js');
      const { userId, sessionToken } = (await callUsers({ action: 'create' }, '10.8.2.1')).body
        .data;
      await (await getDb()).del(userKey(userId));
      for (const action of ['get', 'set', 'delete', 'list']) {
        const res = await callStorage(
          { action, userId, sessionToken, languageCode: 'es', key: 'progress', data: { a: 1 } },
          '10.8.2.1'
        );
        expect([action, res.statusCode]).toEqual([action, 401]);
      }
    });
  });

  describe('revoke races (M3)', () => {
    it('two concurrent revokes with the same token: one wins, the other is refused, one bump', async () => {
      const { userId, sessionToken } = (await callUsers({ action: 'create' }, '10.9.0.1')).body
        .data;
      const [a, b] = await Promise.all([
        callUsers({ action: 'revokeSessions', sessionToken }, '10.9.0.1'),
        callUsers({ action: 'revokeSessions', sessionToken }, '10.9.0.1'),
      ]);
      expect([a.statusCode, b.statusCode].sort()).toEqual([200, 401]);
      const { getDb, userKey } = await import('../_db.js');
      expect((await (await getDb()).hget(userKey(userId), 'sessionVersion')) as number).toBe(2);
    });

    it('a code minted around a revoke does not survive it, even if stored after the bump', async () => {
      const { getDb, KEY_PREFIX } = await import('../_db.js');
      const db = await getDb();
      const { userId, sessionToken } = (await callUsers({ action: 'create' }, '10.9.1.1')).body
        .data;
      // generateCode read the profile at version 1 ...
      const code = (await callUsers({ action: 'generateCode', sessionToken }, '10.9.1.1')).body.data
        .accountCode;
      const staleRecord = await db.get<Record<string, unknown>>(`${KEY_PREFIX}code:${code}`);
      // ... the revoke bumped the version and cleaned up ...
      await callUsers({ action: 'revokeSessions', sessionToken }, '10.9.1.1');
      // ... and the slow generateCode then stored its code and pointer after the bump
      await db.set(`${KEY_PREFIX}code:${code}`, staleRecord, { ex: 600 });
      await db.set(`${KEY_PREFIX}usercode:${userId}`, code, { ex: 600 });

      const link = await callUsers({ action: 'linkDevice', accountCode: code }, '10.9.1.2');
      expect(link.statusCode).toBe(400);
      expect(link.body.data?.sessionToken).toBeUndefined();
    });

    it('a code generated after the revoke links and yields a token at the new version', async () => {
      const { sessionToken } = (await callUsers({ action: 'create' }, '10.9.2.1')).body.data;
      const revoke = await callUsers({ action: 'revokeSessions', sessionToken }, '10.9.2.1');
      const gen = await callUsers(
        { action: 'generateCode', sessionToken: revoke.body.data.sessionToken },
        '10.9.2.1'
      );
      const link = await callUsers(
        { action: 'linkDevice', accountCode: gen.body.data.accountCode },
        '10.9.2.2'
      );
      expect(link.statusCode).toBe(200);
      expect(
        (await callUsers({ action: 'get', sessionToken: link.body.data.sessionToken }, '10.9.2.2'))
          .statusCode
      ).toBe(200);
    });
  });

  it('rate-limits revokeSessions per account (L4)', async () => {
    const { sessionToken } = (await callUsers({ action: 'create' }, '10.10.0.1')).body.data;
    let token = sessionToken;
    for (let i = 0; i < 5; i++) {
      const res = await callUsers({ action: 'revokeSessions', sessionToken: token }, '10.10.0.1');
      expect(res.statusCode).toBe(200);
      token = res.body.data.sessionToken;
    }
    const sixth = await callUsers({ action: 'revokeSessions', sessionToken: token }, '10.10.0.1');
    expect(sixth.statusCode).toBe(429);
  });
});
