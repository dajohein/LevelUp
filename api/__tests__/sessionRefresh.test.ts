import { createHmac } from 'crypto';
import usersHandler from '../users.js';
import storageHandler from '../storage.js';
import { createSessionToken, readSessionToken, verifySessionToken } from '../_auth.js';

const SECRET = 'session-refresh-test-secret';
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const GRACE = 30 * DAY; // the default refresh grace
const T0 = 1_800_000_000_000; // a fixed "now" for the boundary tests

// Set at load time, not in beforeAll: some tokens below are built while the suite is collected
const savedSecret = process.env.SESSION_SECRET;
process.env.SESSION_SECRET = SECRET;
afterAll(() => {
  if (savedSecret === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = savedSecret;
});
afterEach(() => {
  jest.useRealTimers();
  delete process.env.SESSION_REFRESH_GRACE_MS;
});

/** A token with an arbitrary payload, correctly signed: for payloads createSessionToken refuses. */
const signedToken = (payload: string) => {
  const encoded = Buffer.from(payload).toString('base64url');
  return `${encoded}.${createHmac('sha256', SECRET).update(encoded).digest('base64url')}`;
};
const claimsOf = (token: string) =>
  JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8')) as {
    u: string;
    e: number;
    a?: number;
  };

function mockRes() {
  const res: any = { statusCode: 0, body: undefined };
  res.status = (c: number) => ((res.statusCode = c), res);
  res.json = (b: unknown) => ((res.body = b), res);
  res.setHeader = () => res;
  res.end = () => res;
  return res;
}
const post = async (handler: any, body: any, ip: string) => {
  const res = mockRes();
  await handler(
    { method: 'POST', body, query: {}, headers: { 'x-forwarded-for': ip } } as any,
    res
  );
  return res;
};
async function newUser(ip: string) {
  const res = await post(usersHandler, { action: 'create' }, ip);
  return res.body.data as { userId: string; sessionToken: string };
}
const authenticate = (sessionToken: unknown, ip: string) =>
  post(usersHandler, { action: 'authenticate', sessionToken }, ip);

describe('verifySessionToken: expiry boundaries', () => {
  const token = createSessionToken('alice', HOUR, T0, T0 + 100 * DAY); // e = T0 + 1h
  const e = T0 + HOUR;

  it('is valid up to and including its expiry, and not one millisecond later', () => {
    expect(verifySessionToken(token, e)).toBe('alice');
    expect(verifySessionToken(token, e + 1)).toBeNull();
  });

  it('with grace, is valid up to and including e + grace, and not one millisecond later', () => {
    expect(verifySessionToken(token, e + GRACE, GRACE)).toBe('alice');
    expect(verifySessionToken(token, e + GRACE + 1, GRACE)).toBeNull();
  });

  it('ttl of zero and one millisecond behave', () => {
    expect(verifySessionToken(createSessionToken('a', 0, T0), T0)).toBe('a');
    expect(verifySessionToken(createSessionToken('a', 0, T0), T0 + 1)).toBeNull();
    expect(verifySessionToken(createSessionToken('a', 1, T0), T0 + 1)).toBe('a');
  });

  it('refuses unusable comparison arguments instead of letting NaN skip the check', () => {
    const expired = createSessionToken('alice', 1000, 1000, 10 * DAY);
    expect(verifySessionToken(expired, 100_000, NaN)).toBeNull();
    expect(verifySessionToken(expired, NaN)).toBeNull();
    expect(verifySessionToken(expired, 100_000, -1)).toBeNull();
    expect(verifySessionToken(expired, Infinity)).toBeNull();
  });
});

describe('verifySessionToken: payload validation', () => {
  const now = T0;
  it.each([
    ['non-finite expiry (1e309 parses to Infinity)', '{"u":"alice","e":1e309}'],
    ['float expiry', `{"u":"alice","e":${now + 1000.5}}`],
    ['negative expiry', '{"u":"alice","e":-1000}'],
    ['zero expiry', '{"u":"alice","e":0}'],
    ['string expiry', `{"u":"alice","e":"${now + 1000}"}`],
    ['null expiry', '{"u":"alice","e":null}'],
    ['missing expiry', '{"u":"alice"}'],
    ['empty user id', `{"u":"","e":${now + 1000}}`],
    ['numeric user id', `{"u":7,"e":${now + 1000}}`],
    ['missing user id', `{"e":${now + 1000}}`],
    ['non-finite absolute expiry', `{"u":"alice","e":${now + 1000},"a":1e309}`],
    ['string absolute expiry', `{"u":"alice","e":${now + 1000},"a":"x"}`],
    ['negative absolute expiry', `{"u":"alice","e":${now + 1000},"a":-5}`],
    ['not an object', '"just a string"'],
    ['not JSON', 'nope'],
  ])('rejects a correctly signed token with %s', (_name, payload) => {
    expect(verifySessionToken(signedToken(payload), now)).toBeNull();
  });

  it('accepts a well-formed signed token and ignores unknown claims', () => {
    expect(
      verifySessionToken(signedToken(`{"u":"alice","e":${now + 1000},"role":"admin"}`), now)
    ).toBe('alice');
  });

  it('rejects a token past the absolute end of its session, with or without grace', () => {
    const token = signedToken(`{"u":"alice","e":${now + 5 * DAY},"a":${now - 1}}`);
    expect(verifySessionToken(token, now)).toBeNull();
    expect(verifySessionToken(token, now, GRACE)).toBeNull();
  });

  it('reports the absolute expiry, and null for a token issued before it existed', () => {
    const modern = createSessionToken('alice', HOUR, now, now + 5 * DAY);
    expect(readSessionToken(modern, now)).toEqual({
      userId: 'alice',
      absoluteExpiry: now + 5 * DAY,
    });
    expect(readSessionToken(signedToken(`{"u":"alice","e":${now + 1000}}`), now)).toEqual({
      userId: 'alice',
      absoluteExpiry: null,
    });
  });

  it('never accepts unsigned, tampered or foreign tokens', () => {
    const good = createSessionToken('alice', HOUR, now);
    const [payload, signature] = good.split('.');
    const flipped = signature.slice(0, -1) + (signature.endsWith('A') ? 'B' : 'A');
    const otherSecret = (() => {
      const encoded = Buffer.from(`{"u":"alice","e":${now + HOUR}}`).toString('base64url');
      return `${encoded}.${createHmac('sha256', 'another-secret').update(encoded).digest('base64url')}`;
    })();
    const changedAfterSigning = `${Buffer.from(`{"u":"mallory","e":${now + HOUR}}`).toString('base64url')}.${signature}`;
    for (const bad of [
      flipped,
      signature.toLowerCase() === signature ? signature.toUpperCase() : signature.toLowerCase(),
      `${payload}.${signature.slice(0, 10)}`,
      otherSecret,
      changedAfterSigning,
      `${payload}.${signature}.extra`,
      `${payload}.`,
      `.${signature}`,
      payload,
      '',
      'a.b.c',
      'f3a1c2d4-1111-2222-3333-444455556666',
      undefined,
      null,
      42,
      {},
    ]) {
      expect(verifySessionToken(bad, now)).toBeNull();
    }
    expect(verifySessionToken(good, now)).toBe('alice');
  });
});

describe('session refresh through authenticate', () => {
  it('exchanges an expired token for a fresh one within the grace period', async () => {
    const { userId } = await newUser('60.0.0.1');
    const expired = createSessionToken(userId, HOUR, Date.now() - 2 * DAY);

    const res = await authenticate(expired, '60.0.0.2');

    expect(res.statusCode).toBe(200);
    expect(res.body.data.userId).toBe(userId);
    const fresh = res.body.data.sessionToken as string;
    expect(fresh).not.toBe(expired);
    expect(verifySessionToken(fresh)).toBe(userId);
  });

  it('honours the grace boundary exactly: e + grace is refreshed, one millisecond later is not', async () => {
    const { userId } = await newUser('60.0.0.3');
    jest.useFakeTimers().setSystemTime(T0);
    const atBoundary = createSessionToken(userId, 0, T0 - GRACE, T0 + 80 * DAY); // e = T0 - GRACE
    const pastBoundary = createSessionToken(userId, 0, T0 - GRACE - 1, T0 + 80 * DAY);

    expect((await authenticate(atBoundary, '60.0.0.4')).statusCode).toBe(200);
    expect((await authenticate(pastBoundary, '60.0.0.4')).statusCode).toBe(401);
  });

  it('a token that expired longer ago than the grace period cannot be refreshed', async () => {
    const { userId } = await newUser('60.0.0.5');
    const ancient = createSessionToken(userId, HOUR, Date.now() - 90 * DAY);
    const res = await authenticate(ancient, '60.0.0.6');
    expect(res.statusCode).toBe(401);
    expect(res.body.data?.sessionToken).toBeUndefined();
  });

  it('caps a mistyped grace setting: a huge value does not open an endless window', async () => {
    process.env.SESSION_REFRESH_GRACE_MS = String(Number.MAX_SAFE_INTEGER);
    const { userId } = await newUser('60.0.0.7');
    const longGone = createSessionToken(
      userId,
      HOUR,
      Date.now() - 200 * DAY,
      Date.now() + 80 * DAY
    );
    expect((await authenticate(longGone, '60.0.0.8')).statusCode).toBe(401);
  });

  it('a refreshed token works for every storage action; the expired one for none', async () => {
    const { userId } = await newUser('60.0.0.9');
    const expired = createSessionToken(userId, HOUR, Date.now() - 2 * DAY);
    const refreshed = (await authenticate(expired, '60.0.0.10')).body.data.sessionToken;

    for (const action of ['list', 'get', 'set', 'delete']) {
      const body = { userId, languageCode: 'de', action, key: 'k', data: 1 };
      expect(
        (await post(storageHandler, { ...body, sessionToken: expired }, '60.0.0.11')).statusCode
      ).toBe(401);
      expect(
        [200, 404].includes(
          (await post(storageHandler, { ...body, sessionToken: refreshed }, '60.0.0.11')).statusCode
        )
      ).toBe(true);
    }
  });

  it('an expired token is accepted only by authenticate, never by other user actions', async () => {
    const { userId } = await newUser('60.0.0.12');
    const expired = createSessionToken(userId, HOUR, Date.now() - 2 * DAY);
    for (const action of ['get', 'update', 'generateCode']) {
      const res = await post(
        usersHandler,
        { action, sessionToken: expired, userData: { username: 'x' } },
        '60.0.0.13'
      );
      expect(res.statusCode).toBe(401);
    }
  });

  it('forged, tampered and unsigned tokens are never refreshed', async () => {
    const { sessionToken } = await newUser('60.0.0.14');
    const [payload] = sessionToken.split('.');
    const tampered = `${payload}.${'A'.repeat(43)}`;
    for (const token of [
      tampered,
      'f3a1c2d4-1111-2222-3333-444455556666',
      'a.b.c',
      '',
      undefined,
    ]) {
      const res = await authenticate(token, '60.0.0.15');
      expect([400, 401]).toContain(res.statusCode);
      expect(res.body.data?.sessionToken).toBeUndefined();
    }
  });

  it('a valid token is replaced by a different, full-lifetime one (sliding session)', async () => {
    const { userId, sessionToken } = await newUser('60.0.0.16');
    jest.useFakeTimers().setSystemTime(Date.now() + 2 * HOUR);
    const res = await authenticate(sessionToken, '60.0.0.17');

    const fresh = res.body.data.sessionToken as string;
    expect(res.statusCode).toBe(200);
    expect(fresh).not.toBe(sessionToken);
    expect(verifySessionToken(fresh)).toBe(userId);
    // a 24 h token: still valid just inside, gone just outside
    const now = Date.now();
    expect(verifySessionToken(fresh, now + 24 * HOUR)).toBe(userId);
    expect(verifySessionToken(fresh, now + 24 * HOUR + 1)).toBeNull();
  });

  it('a missing user gets the same answer as a bad token (no user-id oracle)', async () => {
    const ghost = createSessionToken('no-such-user', HOUR, Date.now() - 2 * DAY);
    const missing = await authenticate(ghost, '60.0.0.18');
    const forged = await authenticate('forged.token', '60.0.0.19');
    expect(missing.statusCode).toBe(401);
    expect(missing.statusCode).toBe(forged.statusCode);
    expect(missing.body.error).toBe(forged.body.error);
  });
});

describe('absolute session age', () => {
  it('a refresh inherits the absolute end of the session and never extends it', async () => {
    const { userId } = await newUser('61.0.0.1');
    jest.useFakeTimers().setSystemTime(T0);
    const absolute = T0 + 3 * DAY;
    const token = createSessionToken(userId, HOUR, T0 - 2 * DAY, absolute); // expired 2 d ago

    const fresh = (await authenticate(token, '61.0.0.2')).body.data.sessionToken as string;

    expect(claimsOf(fresh).a).toBe(absolute); // inherited, not renewed
    expect(claimsOf(fresh).e).toBe(T0 + 24 * HOUR); // a normal 24 h token, inside the session
  });

  it('caps the refreshed token at the end of the session', async () => {
    const { userId } = await newUser('61.0.0.3');
    jest.useFakeTimers().setSystemTime(T0);
    const absolute = T0 + 6 * HOUR; // less than one token lifetime left
    const fresh = (
      await authenticate(createSessionToken(userId, HOUR, T0 - DAY, absolute), '61.0.0.4')
    ).body.data.sessionToken as string;
    expect(claimsOf(fresh).e).toBe(absolute);
  });

  it('cannot be chained forever: once the session is over, even a fresh-looking token is refused', async () => {
    const { userId } = await newUser('61.0.0.5');
    jest.useFakeTimers().setSystemTime(T0);
    const absolute = T0 + 3 * DAY;
    let token = createSessionToken(userId, HOUR, T0, absolute);

    // keep refreshing every day, as an attacker holding the token would
    for (let day = 1; day <= 2; day++) {
      jest.setSystemTime(T0 + day * DAY);
      const res = await authenticate(token, '61.0.0.6');
      expect(res.statusCode).toBe(200);
      token = res.body.data.sessionToken;
    }
    jest.setSystemTime(absolute + 1);
    expect((await authenticate(token, '61.0.0.7')).statusCode).toBe(401);
    // and every other action refuses it too
    expect(
      (
        await post(
          storageHandler,
          { userId, languageCode: 'de', action: 'list', sessionToken: token },
          '61.0.0.8'
        )
      ).statusCode
    ).toBe(401);
  });

  it('a token issued before sessions had an absolute age is grandfathered one full window', async () => {
    const { userId } = await newUser('61.0.0.9');
    jest.useFakeTimers().setSystemTime(T0);
    const legacy = signedToken(`{"u":"${userId}","e":${T0 - DAY}}`); // no `a`

    const res = await authenticate(legacy, '61.0.0.10');

    expect(res.statusCode).toBe(200);
    expect(claimsOf(res.body.data.sessionToken).a).toBe(T0 + 90 * DAY);
  });

  it('new sessions (create) start with the default absolute age', async () => {
    jest.useFakeTimers().setSystemTime(T0);
    const created = await post(usersHandler, { action: 'create' }, '61.0.0.11');
    expect(claimsOf(created.body.data.sessionToken).a).toBe(T0 + 90 * DAY);
  });
});
