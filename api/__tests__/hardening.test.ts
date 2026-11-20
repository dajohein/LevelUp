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
      clientAddress({ 'x-vercel-forwarded-for': '1.2.3.4', 'x-forwarded-for': '1.1.1.1' })
    ).toBe('1.2.3.4');
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

  it('rate limits account creation per client at exactly the limit', async () => {
    const codes: number[] = [];
    for (let i = 0; i < 32; i++) {
      codes.push(
        (await callUsers({ action: 'create' }, { 'x-forwarded-for': '31.0.0.1' })).statusCode
      );
    }
    // the default is 30 per window: the 30th succeeds and the 31st is refused
    expect(codes.slice(0, 30).every(code => code === 200)).toBe(true);
    expect(codes[30]).toBe(429);
    expect(codes[31]).toBe(429);
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

// Storage calls now require the account to exist (a deleted user's token is refused)
async function seedUsers(...ids: string[]) {
  const { getDb, userKey } = await import('../_db.js');
  const db = await getDb();
  for (const id of ids) await db.hset(userKey(id), { id, sessionVersion: 1 });
}

describe('storage API hardening', () => {
  beforeAll(() => seedUsers('hard-user'));
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

describe('review follow-ups: config', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('buckets IPv6 clients by /64, so rotating the low 64 bits gains nothing', () => {
    const a = clientAddress({ 'x-forwarded-for': '2001:db8:1:2:aaaa:bbbb:cccc:dddd' });
    const b = clientAddress({ 'x-forwarded-for': '2001:0DB8:1:2::1' });
    const other = clientAddress({ 'x-forwarded-for': '2001:db8:1:3::1' });
    expect(a).toBe(b);
    expect(other).not.toBe(a);
    expect(a).toBe('2001:0db8:0001:0002::/64');
  });

  it('treats an IPv4-mapped IPv6 address as the IPv4 address and rejects malformed ones', () => {
    expect(clientAddress({ 'x-forwarded-for': '::ffff:1.2.3.4' })).toBe('1.2.3.4');
    for (const bad of ['1:2:3', '1::2::3', 'zzzz::1', '1.2.3', '999.1.1.1.1', '1'.repeat(46)]) {
      expect(clientAddress({ 'x-forwarded-for': bad })).toBe('unknown');
    }
  });

  it('isProduction allow-lists development and test', () => {
    delete process.env.VERCEL_ENV;
    for (const [env, expected] of [
      ['development', false],
      ['test', false],
      ['production', true],
      ['staging', true],
      ['', true],
    ] as const) {
      process.env.NODE_ENV = env;
      expect(isProduction()).toBe(expected);
    }
    delete (process.env as Record<string, string | undefined>).NODE_ENV;
    expect(isProduction()).toBe(true);
    // `vercel dev` sets VERCEL_ENV=development and may leave NODE_ENV unset
    process.env.VERCEL_ENV = 'development';
    expect(isProduction()).toBe(false);
    process.env.VERCEL_ENV = 'production';
    process.env.NODE_ENV = 'development';
    process.env.VERCEL_ENV = 'production';
    expect(isProduction()).toBe(true);
  });

  it('envPositiveInt accepts plain decimal digits only and logs a bad value once', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    process.env.Y_TEST = '0x10';
    expect(envPositiveInt('Y_TEST', 5)).toBe(5);
    expect(envPositiveInt('Y_TEST', 5)).toBe(5);
    expect(spy).toHaveBeenCalledTimes(1);
    process.env.Y_TEST = '1e3';
    expect(envPositiveInt('Y_TEST', 5)).toBe(5);
    process.env.Y_TEST = '007';
    expect(envPositiveInt('Y_TEST', 5)).toBe(7);
    spy.mockRestore();
  });
});

describe('review follow-ups: users', () => {
  it('returns 400, not 500, for an empty or non-object body', async () => {
    for (const body of [undefined, null, 'x', [1]]) {
      const res = mockRes();
      await usersHandler({ method: 'POST', body, query: {}, headers: {} } as any, res);
      expect(res.statusCode).toBe(400);
    }
  });

  it('rejects an empty username on update', async () => {
    const created = (await callUsers({ action: 'create' }, { 'x-forwarded-for': '40.0.0.1' })).body
      .data;
    for (const username of ['', '   ']) {
      const res = await callUsers({
        action: 'update',
        sessionToken: created.sessionToken,
        userData: { username },
      });
      expect(res.statusCode).toBe(400);
    }
    const ok = await callUsers({
      action: 'update',
      sessionToken: created.sessionToken,
      userData: { username: 'x' },
    });
    expect(ok.statusCode).toBe(200);
  });

  it('rejects update fields of the wrong type', async () => {
    const created = (await callUsers({ action: 'create' }, { 'x-forwarded-for': '40.0.0.2' })).body
      .data;
    const res = await callUsers({
      action: 'update',
      sessionToken: created.sessionToken,
      userData: { email: 12 },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('review follow-ups: storage', () => {
  beforeAll(() => seedUsers('followup-user'));
  const token = createSessionToken('followup-user', 10000);
  const base = { userId: 'followup-user', sessionToken: token, languageCode: 'es' };

  it('returns 400 for a missing body', async () => {
    const res = mockRes();
    await storageHandler({ method: 'POST', body: undefined, query: {}, headers: {} } as any, res);
    expect(res.statusCode).toBe(400);
  });

  it('caps the number of keys per language, but still allows updating an existing key', async () => {
    const lang = { ...base, languageCode: 'fr' };
    for (let i = 0; i < 500; i++) {
      const res = await callStorage({ ...lang, action: 'set', key: `k${i}`, data: i });
      if (res.statusCode !== 200) throw new Error(`key ${i} rejected: ${res.statusCode}`);
    }
    expect(
      (await callStorage({ ...lang, action: 'set', key: 'one-too-many', data: 1 })).statusCode
    ).toBe(413);
    expect(
      (await callStorage({ ...lang, action: 'set', key: 'k0', data: 'updated' })).statusCode
    ).toBe(200);
  });

  it('reports corrupt stored data as an error instead of a successful empty read', async () => {
    const { getDb } = await import('../_db.js');
    const db = await getDb();
    await db.hset('levelup:data:followup-user:de', {
      broken: { data: '{not json', compressed: true, timestamp: Date.now(), languageCode: 'de' },
    });
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await callStorage({ ...base, languageCode: 'de', action: 'get', key: 'broken' });
    spy.mockRestore();
    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

describe('limit boundaries', () => {
  beforeAll(() => seedUsers('boundary-user'));
  const token = createSessionToken('boundary-user', 10000);
  const base = { userId: 'boundary-user', sessionToken: token, languageCode: 'es' };
  const MIB = 1024 * 1024;

  it('accepts a value of exactly 1 MiB and rejects one byte more', async () => {
    // JSON.stringify adds two quote characters
    const exact = 'x'.repeat(MIB - 2);
    const options = { compress: false };
    expect(
      (await callStorage({ ...base, action: 'set', key: 'exact', data: exact, options })).statusCode
    ).toBe(200);
    expect(
      (await callStorage({ ...base, action: 'set', key: 'over', data: exact + 'x', options }))
        .statusCode
    ).toBe(413);
  });

  it('applies the limit to the compressed form too', async () => {
    const res = await callStorage({
      ...base,
      action: 'set',
      key: 'compressed',
      data: 'x'.repeat(MIB - 2),
      options: { compress: true },
    });
    expect(res.statusCode).toBe(413);
  });

  it('accepts preferences of exactly 16 KiB and rejects one byte more', async () => {
    const ip = { 'x-forwarded-for': '41.0.0.1' };
    // {"x":"..."} is 8 bytes of structure around the string
    const exact = { x: 'a'.repeat(16 * 1024 - 8) };
    expect(
      (await callUsers({ action: 'create', userData: { preferences: exact } }, ip)).statusCode
    ).toBe(200);
    const over = { x: 'a'.repeat(16 * 1024 - 7) };
    expect(
      (await callUsers({ action: 'create', userData: { preferences: over } }, ip)).statusCode
    ).toBe(400);
  });

  it('enforces the profile limits on update as well as create', async () => {
    const created = (await callUsers({ action: 'create' }, { 'x-forwarded-for': '41.0.0.2' })).body
      .data;
    const res = await callUsers({
      action: 'update',
      sessionToken: created.sessionToken,
      userData: { preferences: { x: '界'.repeat(6000) } },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('clientAddress: table-driven forms', () => {
  const label = (value: string) => clientAddress({ 'x-forwarded-for': value });

  it.each([
    // IPv4
    ['1.2.3.4', '1.2.3.4'],
    ['255.255.255.255', '255.255.255.255'],
    ['0.0.0.0', '0.0.0.0'],
    // IPv6: same /64 -> same label, however it is written
    ['2001:db8:1:2:aaaa:bbbb:cccc:dddd', '2001:0db8:0001:0002::/64'],
    ['2001:DB8:1:2::1', '2001:0db8:0001:0002::/64'],
    ['2001:0db8:0001:0002:0000:0000:0000:0001', '2001:0db8:0001:0002::/64'],
    // "::" inside the /64 itself, at the start, and standing for exactly one group
    ['2001:db8::1', '2001:0db8:0000:0000::/64'],
    ['::1', '0000:0000:0000:0000::/64'],
    ['::', '0000:0000:0000:0000::/64'],
    ['1:2:3:4:5:6:7::', '0001:0002:0003:0004::/64'],
    ['1:2:3::5:6:7:8', '0001:0002:0003:0000::/64'],
    // embedded dotted IPv4 (NAT64 and similar) is part of the lower 64 bits
    ['64:ff9b::192.0.2.1', '0064:ff9b:0000:0000::/64'],
    ['2001:db8:1:2::192.0.2.1', '2001:0db8:0001:0002::/64'],
    // IPv4-mapped, dotted or hex, is the IPv4 address
    ['::ffff:192.0.2.1', '192.0.2.1'],
    ['::ffff:c000:0201', '192.0.2.1'],
    ['0:0:0:0:0:ffff:1.2.3.4', '1.2.3.4'],
  ])('%s -> %s', (input, expected) => {
    expect(label(input)).toBe(expected);
  });

  it.each([
    '999.1.1.1',
    '256.0.0.1',
    '1.256.1.1',
    '1.2.3',
    '1.2.3.4.5',
    '01.2.3.4',
    'ffff:1.2.3.4',
    ':ffff:1.2.3.4',
    ':::ffff:1.2.3.4',
    '0:ffff:1.2.3.4',
    '0:0:0:0:0:0:0:ffff:1.2.3.4',
    '::ffff:999.999.999.999',
    '1::2::3',
    '1:2:3',
    '1:2:3:4:5:6:7:8:9',
    ':1::2',
    '1::2:',
    '12345::1',
    'zzzz::1',
    'fe80::1%eth0',
    '[::1]:443',
    '',
    '1'.repeat(46),
  ])('malformed %j -> unknown', input => {
    expect(label(input)).toBe('unknown');
  });

  it('two addresses in different /64s never share a label', () => {
    expect(label('2001:db8:1:2::1')).not.toBe(label('2001:db8:1:3::1'));
    expect(label('2001:db8:1:2::1')).not.toBe(label('2001:db8:2:2::1'));
  });

  it('uses only the first entry of a list and the first of an array header', () => {
    expect(label('1.2.3.4, 5.6.7.8')).toBe('1.2.3.4');
    expect(clientAddress({ 'x-forwarded-for': ['9.9.9.9', '8.8.8.8'] })).toBe('9.9.9.9');
  });
});
