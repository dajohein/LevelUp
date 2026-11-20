import { createSessionToken, verifySessionToken, resolveCorsOrigin } from '../_auth.js';
import handler from '../storage.js';

function mockRes() {
  const res: any = { headers: {} as Record<string, string>, statusCode: 0, body: undefined };
  res.status = (c: number) => ((res.statusCode = c), res);
  res.json = (b: unknown) => ((res.body = b), res);
  res.setHeader = (k: string, v: string) => ((res.headers[k] = v), res);
  res.end = () => res;
  return res;
}
const call = async (body: any, headers: Record<string, string> = {}) => {
  const res = mockRes();
  await handler({ method: 'POST', body, query: {}, headers } as any, res);
  return res;
};

describe('session tokens', () => {
  it('round-trips a valid token', () => {
    expect(verifySessionToken(createSessionToken('u1', 1000))).toBe('u1');
  });
  it('rejects expired, tampered and malformed tokens', () => {
    expect(verifySessionToken(createSessionToken('u1', 1000, Date.now() - 5000))).toBeNull();
    const [payload, sig] = createSessionToken('u1', 1000).split('.');
    const forged = Buffer.from(JSON.stringify({ u: 'victim', e: Date.now() + 1e6 })).toString(
      'base64url'
    );
    expect(verifySessionToken(`${forged}.${sig}`)).toBeNull();
    expect(verifySessionToken(`${payload}.`)).toBeNull();
    expect(verifySessionToken('garbage')).toBeNull();
    expect(verifySessionToken(undefined)).toBeNull();
  });
});

describe('CORS', () => {
  const orig = process.env.CORS_ALLOWED_ORIGINS;
  afterEach(() => {
    process.env.CORS_ALLOWED_ORIGINS = orig;
  });
  it('fails closed when unset and echoes only allow-listed origins', () => {
    delete process.env.CORS_ALLOWED_ORIGINS;
    expect(resolveCorsOrigin('https://evil.example')).toBeNull();
    process.env.CORS_ALLOWED_ORIGINS = 'https://a.example, https://b.example';
    expect(resolveCorsOrigin('https://b.example')).toBe('https://b.example');
    expect(resolveCorsOrigin('https://evil.example')).toBeNull();
  });
});

// Storage calls now require the account to exist (a deleted user's token is refused)
async function seedUsers(...ids: string[]) {
  const { getDb, userKey } = await import('../_db.js');
  const db = await getDb();
  for (const id of ids) await db.hset(userKey(id), { id, sessionVersion: 1 });
}

describe('storage handler auth', () => {
  beforeAll(() => seedUsers('u1', 'u2', 'u3'));
  it('rejects requests without a token', async () => {
    const res = await call({ action: 'get', userId: 'u1', languageCode: 'es', key: 'k' });
    expect(res.statusCode).toBe(401);
  });
  it("rejects a valid token for a different user's data", async () => {
    const token = createSessionToken('attacker', 10000);
    const res = await call({
      action: 'get',
      userId: 'victim',
      sessionToken: token,
      languageCode: 'es',
      key: 'k',
    });
    expect(res.statusCode).toBe(401);
  });
  it('allows set/get for the token owner', async () => {
    const token = createSessionToken('u1', 10000);
    const base = { userId: 'u1', sessionToken: token, languageCode: 'es', key: 'progress' };
    expect((await call({ ...base, action: 'set', data: { a: 1 } })).body.success).toBe(true);
    expect((await call({ ...base, action: 'get' })).body.data).toEqual({ a: 1 });
  });

  it('list returns live keys, honours delete, and ignores expired TTL entries', async () => {
    const token = createSessionToken('u2', 10000);
    const base = { userId: 'u2', sessionToken: token, languageCode: 'es' };
    await call({ ...base, action: 'set', key: 'keep', data: 1 });
    await call({ ...base, action: 'set', key: 'drop', data: 2 });
    await call({ ...base, action: 'set', key: 'short', data: 3, options: { ttl: 1 } });
    await call({ ...base, action: 'delete', key: 'drop' });
    await new Promise(r => setTimeout(r, 5));

    const listed = (await call({ ...base, action: 'list' })).body.data as string[];
    expect(listed.sort()).toEqual(['keep']);
    expect((await call({ ...base, action: 'get', key: 'short' })).statusCode).toBe(404);
  });

  it('concurrent sets and deletes of different keys keep list consistent', async () => {
    const token = createSessionToken('u3', 10000);
    const base = { userId: 'u3', sessionToken: token, languageCode: 'es' };
    await Promise.all([
      call({ ...base, action: 'set', key: 'a', data: 1 }),
      call({ ...base, action: 'set', key: 'b', data: 2 }),
      call({ ...base, action: 'delete', key: 'a' }),
      call({ ...base, action: 'set', key: 'c', data: 3 }),
    ]);
    const listed = (await call({ ...base, action: 'list' })).body.data as string[];
    for (const key of listed) {
      expect((await call({ ...base, action: 'get', key })).statusCode).toBe(200);
    }
    expect(listed).toEqual(expect.arrayContaining(['b', 'c']));
  });
});
