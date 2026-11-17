import usersHandler from '../users.js';
import storageHandler from '../storage.js';
import { createSessionToken, verifySessionToken } from '../_auth.js';

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
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

async function newUser(ip: string) {
  const res = await post(usersHandler, { action: 'create' }, ip);
  return res.body.data as { userId: string; sessionToken: string };
}

describe('session refresh through authenticate', () => {
  it('an expired token is exchanged for a fresh one within the grace period', async () => {
    const { userId } = await newUser('60.0.0.1');
    const expired = createSessionToken(userId, HOUR, Date.now() - 2 * DAY); // expired a day ago

    const res = await post(
      usersHandler,
      { action: 'authenticate', sessionToken: expired },
      '60.0.0.2'
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.data.userId).toBe(userId);
    const fresh = res.body.data.sessionToken as string;
    expect(fresh).toEqual(expect.any(String));
    expect(fresh).not.toBe(expired);
    expect(verifySessionToken(fresh)).toBe(userId); // genuinely valid now
  });

  it('the refreshed token works for storage, the expired one does not', async () => {
    const { userId } = await newUser('60.0.0.3');
    const expired = createSessionToken(userId, HOUR, Date.now() - 2 * DAY);
    const base = { userId, languageCode: 'de', action: 'list' };

    expect(
      (await post(storageHandler, { ...base, sessionToken: expired }, '60.0.0.4')).statusCode
    ).toBe(401);

    const refreshed = (
      await post(usersHandler, { action: 'authenticate', sessionToken: expired }, '60.0.0.5')
    ).body.data.sessionToken;
    expect(
      (await post(storageHandler, { ...base, sessionToken: refreshed }, '60.0.0.4')).statusCode
    ).toBe(200);
  });

  it('a token that expired longer ago than the grace period cannot be refreshed', async () => {
    const { userId } = await newUser('60.0.0.6');
    const ancient = createSessionToken(userId, HOUR, Date.now() - 90 * DAY);
    const res = await post(
      usersHandler,
      { action: 'authenticate', sessionToken: ancient },
      '60.0.0.7'
    );
    expect(res.statusCode).toBe(401);
    expect(res.body.data?.sessionToken).toBeUndefined();
  });

  it('an expired token is accepted only by authenticate, never by other actions', async () => {
    const { userId } = await newUser('60.0.0.8');
    const expired = createSessionToken(userId, HOUR, Date.now() - 2 * DAY);
    for (const action of ['get', 'update', 'generateCode']) {
      const res = await post(
        usersHandler,
        { action, sessionToken: expired, userData: { username: 'x' } },
        '60.0.0.9'
      );
      expect(res.statusCode).toBe(401);
    }
  });

  it('forged, tampered and unsigned tokens are never refreshed', async () => {
    const { userId, sessionToken } = await newUser('60.0.0.10');
    const [payload] = sessionToken.split('.');
    const tampered = `${payload}.${'A'.repeat(43)}`;
    const oldDemoToken = 'f3a1c2d4-1111-2222-3333-444455556666'; // the pre-signed-token demo format
    for (const token of [tampered, oldDemoToken, 'a.b.c', '', undefined]) {
      const res = await post(
        usersHandler,
        { action: 'authenticate', sessionToken: token },
        '60.0.0.11'
      );
      expect([400, 401]).toContain(res.statusCode);
      expect(res.body.data?.sessionToken).toBeUndefined();
    }
    expect(userId).toBeDefined();
  });

  it('a valid token also gets a fresh one (sliding session), keeping the same user', async () => {
    const { userId, sessionToken } = await newUser('60.0.0.12');
    const res = await post(usersHandler, { action: 'authenticate', sessionToken }, '60.0.0.13');
    expect(res.statusCode).toBe(200);
    expect(verifySessionToken(res.body.data.sessionToken)).toBe(userId);
  });

  it('a refreshed token for a user that no longer exists is refused', async () => {
    const ghost = createSessionToken('no-such-user', HOUR, Date.now() - 2 * DAY);
    const res = await post(
      usersHandler,
      { action: 'authenticate', sessionToken: ghost },
      '60.0.0.14'
    );
    expect(res.statusCode).toBe(404);
  });
});
