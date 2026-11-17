import usersHandler from '../users.js';
import storageHandler from '../storage.js';
import { clientAddress, envPositiveInt, isProduction } from '../_config.js';
import { createSessionToken } from '../_auth.js';

function mockRes() {
  const res: any = { statusCode: 0, body: undefined, headers: {} as Record<string, string> };
  res.status = (c: number) => ((res.statusCode = c), res);
  res.json = (b: unknown) => ((res.body = b), res);
  res.setHeader = (k: string, v: string) => ((res.headers[k] = v), res);
  res.end = () => res;
  return res;
}
const callUsers = async (body: any, headers: Record<string, string> = {}) => {
  const res = mockRes();
  await usersHandler(
    {
      method: 'POST',
      body,
      query: {},
      headers: { 'x-forwarded-for': '9.9.9.9', ...headers },
    } as any,
    res
  );
  return res;
};
const callStorage = async (body: any) => {
  const res = mockRes();
  await storageHandler({ method: 'POST', body, query: {}, headers: {} } as any, res);
  return res;
};

describe('config helpers', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('envPositiveInt uses the default when unset and falls back (loudly) on bad values', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    delete process.env.X_TEST;
    expect(envPositiveInt('X_TEST', 7)).toBe(7);
    process.env.X_TEST = '12';
    expect(envPositiveInt('X_TEST', 7)).toBe(12);
    expect(spy).not.toHaveBeenCalled();
    for (const bad of ['10/h', 'abc', '0', '-3', '1.5', 'NaN']) {
      process.env.X_TEST = bad;
      expect(envPositiveInt('X_TEST', 7)).toBe(7);
    }
    expect(spy).toHaveBeenCalledTimes(6);
    spy.mockRestore();
  });

  it('a bad rate-limit value keeps the limit in force instead of disabling it', async () => {
    process.env.RATE_LIMIT_MAX_ATTEMPTS = '10/h';
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    let last = 0;
    for (let i = 0; i < 12; i++) {
      last = (
        await callUsers(
          { action: 'linkDevice', accountCode: 'ZZZZZZZZ' },
          { 'x-forwarded-for': '20.0.0.1' }
        )
      ).statusCode;
    }
    spy.mockRestore();
    expect(last).toBe(429);
  });

  it('isProduction is true for NODE_ENV or VERCEL_ENV production', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.VERCEL_ENV;
    expect(isProduction()).toBe(false);
    process.env.VERCEL_ENV = 'production';
    expect(isProduction()).toBe(true);
    process.env.VERCEL_ENV = 'preview';
    process.env.NODE_ENV = 'production';
    expect(isProduction()).toBe(true);
  });

  it('clientAddress takes the first valid entry and caps junk', () => {
    expect(clientAddress({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })).toBe('1.2.3.4');
    expect(
      clientAddress({ 'x-vercel-forwarded-for': '2001:db8::1', 'x-forwarded-for': '1.1.1.1' })
    ).toBe('2001:db8::1');
    expect(clientAddress({ 'x-forwarded-for': 'x'.repeat(5000) })).toBe('unknown');
    expect(clientAddress({ 'x-forwarded-for': '1.2.3.4\nevil' })).toBe('unknown');
    expect(clientAddress({})).toBe('unknown');
  });
});

describe('users API hardening', () => {
  it('an attacker-chosen suffix in x-forwarded-for does not buy a fresh rate-limit bucket', async () => {
    let last = 0;
    for (let i = 0; i < 12; i++) {
      last = (
        await callUsers(
          { action: 'linkDevice', accountCode: 'ZZZZZZZZ' },
          { 'x-forwarded-for': `30.0.0.1, spoof-${i}` }
        )
      ).statusCode;
    }
    expect(last).toBe(429);
  });

  it('rate limits account creation per client', async () => {
    const codes: number[] = [];
    for (let i = 0; i < 32; i++) {
      codes.push(
        (await callUsers({ action: 'create' }, { 'x-forwarded-for': '31.0.0.1' })).statusCode
      );
    }
    expect(codes[0]).toBe(200);
    expect(codes[codes.length - 1]).toBe(429);
  });

  it('rejects oversized or mistyped profile fields', async () => {
    const ip = { 'x-forwarded-for': '32.0.0.1' };
    expect(
      (await callUsers({ action: 'create', userData: { username: 'a'.repeat(65) } }, ip)).statusCode
    ).toBe(400);
    expect((await callUsers({ action: 'create', userData: { email: 42 } }, ip)).statusCode).toBe(
      400
    );
    expect(
      (
        await callUsers(
          { action: 'create', userData: { preferences: { x: 'y'.repeat(20000) } } },
          ip
        )
      ).statusCode
    ).toBe(400);
  });

  it('enforces the preferences limit in UTF-8 bytes', async () => {
    const ip = { 'x-forwarded-for': '35.0.0.1' };
    // 6,000 characters but ~18,000 bytes
    const res = await callUsers(
      { action: 'create', userData: { preferences: { x: '界'.repeat(6000) } } },
      ip
    );
    expect(res.statusCode).toBe(400);
  });

  it('linkDevice returns one generic error for malformed, unknown and non-string codes', async () => {
    const ip = { 'x-forwarded-for': '33.0.0.1' };
    const bodies = await Promise.all(
      [
        { accountCode: 12345 },
        { accountCode: { a: 1 } },
        { accountCode: 'short' },
        { accountCode: 'ZZZZZZZZ' },
      ].map(async b => (await callUsers({ action: 'linkDevice', ...b }, ip)).body)
    );
    for (const body of bodies) {
      expect(body.error).toBe('Invalid or expired account code');
    }
  });

  it('an already-used code looks the same as an unknown one', async () => {
    const created = (await callUsers({ action: 'create' }, { 'x-forwarded-for': '34.0.0.1' })).body
      .data;
    const code = (
      await callUsers(
        { action: 'generateCode', sessionToken: created.sessionToken },
        { 'x-forwarded-for': '34.0.0.2' }
      )
    ).body.data.accountCode;
    expect(
      (
        await callUsers(
          { action: 'linkDevice', accountCode: code },
          { 'x-forwarded-for': '34.0.0.3' }
        )
      ).body.success
    ).toBe(true);
    const reuse = await callUsers(
      { action: 'linkDevice', accountCode: code },
      { 'x-forwarded-for': '34.0.0.3' }
    );
    expect(reuse.statusCode).toBe(400);
    expect(reuse.body.error).toBe('Invalid or expired account code');
  });

  it('sets Vary: Origin and does not echo the action name', async () => {
    const res = await callUsers({ action: '<script>alert(1)</script>' });
    expect(res.headers.Vary).toBe('Origin');
    expect(JSON.stringify(res.body)).not.toContain('<script>');
  });
});

describe('storage API hardening', () => {
  const token = createSessionToken('hard-user', 10000);
  const base = { userId: 'hard-user', sessionToken: token, languageCode: 'es' };

  it('rejects non-string and oversized keys', async () => {
    expect((await callStorage({ ...base, action: 'set', key: { a: 1 }, data: 1 })).statusCode).toBe(
      400
    );
    expect(
      (await callStorage({ ...base, action: 'set', key: 'k'.repeat(129), data: 1 })).statusCode
    ).toBe(400);
    expect(
      (await callStorage({ ...base, action: 'set', key: 'k'.repeat(128), data: 1 })).statusCode
    ).toBe(200);
  });

  it('rejects a non-numeric ttl instead of storing a value that never expires', async () => {
    const res = await callStorage({
      ...base,
      action: 'set',
      key: 'ttl',
      data: 1,
      options: { ttl: '1000' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects oversized values', async () => {
    const res = await callStorage({
      ...base,
      action: 'set',
      key: 'big',
      data: 'x'.repeat(1024 * 1024 + 1),
      options: { compress: false },
    });
    expect(res.statusCode).toBe(413);
  });

  it('enforces the value limit in UTF-8 bytes, not UTF-16 code units', async () => {
    // 400,000 characters but 1,200,000 bytes
    const res = await callStorage({
      ...base,
      action: 'set',
      key: 'wide',
      data: '界'.repeat(400000),
      options: { compress: false },
    });
    expect(res.statusCode).toBe(413);
  });

  it('sets Vary: Origin', async () => {
    const res = await callStorage({ ...base, action: 'list' });
    expect(res.headers.Vary).toBe('Origin');
  });
});
