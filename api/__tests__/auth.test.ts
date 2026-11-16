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

describe('storage handler auth', () => {
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
});
