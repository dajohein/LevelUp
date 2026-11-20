import usersHandler from '../users.js';
import { getDb, KEY_PREFIX } from '../_db.js';

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

const createUser = async (ip = '10.0.0.1') => {
  const res = await callUsers({ action: 'create' }, { 'x-forwarded-for': ip });
  expect(res.statusCode).toBe(200);
  return res.body.data as { userId: string; sessionToken: string };
};

describe('Issue #72: account linking code hardening', () => {
  const savedEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  describe('code length and entropy', () => {
    it('generates 10-character codes matching the base32-like pattern', async () => {
      const { sessionToken } = await createUser('50.0.0.1');
      const codes = new Set<string>();

      for (let i = 0; i < 5; i++) {
        const res = await callUsers(
          { action: 'generateCode', sessionToken },
          { 'x-forwarded-for': `50.0.1.${i}` }
        );
        expect(res.statusCode).toBe(200);
        const code = res.body.data.accountCode;
        expect(code).toHaveLength(10);
        expect(code).toMatch(/^[2-9A-HJ-NP-Z]{10}$/);
        codes.add(code);
      }

      // All generated codes should be unique
      expect(codes.size).toBe(5);
    });
  });

  describe('identical failure responses (no information disclosure)', () => {
    it('returns the exact same 400 error body regardless of why linkDevice failed', async () => {
      const { sessionToken, userId } = await createUser('51.0.0.1');
      const genRes = await callUsers(
        { action: 'generateCode', sessionToken },
        { 'x-forwarded-for': '51.0.0.2' }
      );
      const validCode = genRes.body.data.accountCode;

      // Generate a second code so validCode becomes superseded
      const genRes2 = await callUsers(
        { action: 'generateCode', sessionToken },
        { 'x-forwarded-for': '51.0.0.3' }
      );
      const newestCode = genRes2.body.data.accountCode;

      const cases = [
        { label: 'non-string code', body: { accountCode: 1234567890 } },
        { label: 'short code', body: { accountCode: 'SHORT' } },
        { label: 'old 8-character code', body: { accountCode: 'A3B7K9M2' } },
        { label: 'unknown 10-character code', body: { accountCode: 'ZZZZZZZZZZ' } },
        { label: 'superseded code', body: { accountCode: validCode } },
      ];

      for (const c of cases) {
        const res = await callUsers(
          { action: 'linkDevice', ...c.body },
          { 'x-forwarded-for': '51.0.1.1' }
        );
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toBe('Invalid or expired account code');
        expect(res.body.metadata?.action).toBe('linkDevice');
      }

      // Successful link of the newest code
      const linkSuccess = await callUsers(
        { action: 'linkDevice', accountCode: newestCode },
        { 'x-forwarded-for': '51.0.1.2' }
      );
      expect(linkSuccess.statusCode).toBe(200);
      expect(linkSuccess.body.success).toBe(true);
      expect(linkSuccess.body.data.userId).toBe(userId);

      // Re-use of consumed code produces the same failure
      const reuse = await callUsers(
        { action: 'linkDevice', accountCode: newestCode },
        { 'x-forwarded-for': '51.0.1.3' }
      );
      expect(reuse.statusCode).toBe(400);
      expect(reuse.body.error).toBe('Invalid or expired account code');
    });
  });

  describe('per-account code generation limit', () => {
    it('limits code generation per user account across rotating client IPs', async () => {
      process.env.ACCOUNT_CODE_GENERATE_MAX_PER_USER = '4';
      const { sessionToken } = await createUser('52.0.0.1');

      const statuses: number[] = [];
      for (let i = 0; i < 6; i++) {
        const res = await callUsers(
          { action: 'generateCode', sessionToken },
          { 'x-forwarded-for': `52.0.0.${10 + i}` }
        );
        statuses.push(res.statusCode);
      }

      // First 4 succeed, 5th and 6th hit 429 per-account generation limit
      expect(statuses.slice(0, 4)).toEqual([200, 200, 200, 200]);
      expect(statuses[4]).toBe(429);
      expect(statuses[5]).toBe(429);
    });

    it('distinct user accounts do not lock each other out behind the same IP', async () => {
      process.env.ACCOUNT_CODE_GENERATE_MAX_PER_USER = '2';
      const userA = await createUser('53.0.0.1');
      const userB = await createUser('53.0.0.2');

      const sharedNatIp = '53.0.0.99';

      // User A uses up their 2 attempts
      expect(
        (
          await callUsers(
            { action: 'generateCode', sessionToken: userA.sessionToken },
            { 'x-forwarded-for': sharedNatIp }
          )
        ).statusCode
      ).toBe(200);
      expect(
        (
          await callUsers(
            { action: 'generateCode', sessionToken: userA.sessionToken },
            { 'x-forwarded-for': sharedNatIp }
          )
        ).statusCode
      ).toBe(200);
      expect(
        (
          await callUsers(
            { action: 'generateCode', sessionToken: userA.sessionToken },
            { 'x-forwarded-for': sharedNatIp }
          )
        ).statusCode
      ).toBe(429);

      // User B behind the same NAT IP is still able to generate a code
      const resB = await callUsers(
        { action: 'generateCode', sessionToken: userB.sessionToken },
        { 'x-forwarded-for': sharedNatIp }
      );
      expect(resB.statusCode).toBe(200);
    });
  });

  describe('per-code attempt lockout (independent of client address)', () => {
    it('deletes the code once max attempts per code are exceeded across rotating IPs', async () => {
      process.env.ACCOUNT_CODE_MAX_ATTEMPTS = '3';
      const { sessionToken, userId } = await createUser('54.0.0.1');
      const genRes = await callUsers(
        { action: 'generateCode', sessionToken },
        { 'x-forwarded-for': '54.0.0.2' }
      );
      const code = genRes.body.data.accountCode;

      // Invalidate the pointer so attempts are treated as failed attempts on this code
      const db = await getDb();
      await db.del(`${KEY_PREFIX}usercode:${userId}`);

      // 3 attempts from 3 distinct IPs
      for (let i = 0; i < 3; i++) {
        const res = await callUsers(
          { action: 'linkDevice', accountCode: code },
          { 'x-forwarded-for': `54.0.1.${i}` }
        );
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('Invalid or expired account code');
      }

      // The 4th attempt exceeds max attempts (3) and deletes the code
      const res4 = await callUsers(
        { action: 'linkDevice', accountCode: code },
        { 'x-forwarded-for': '54.0.1.4' }
      );
      expect(res4.statusCode).toBe(400);
      expect(res4.body.error).toBe('Invalid or expired account code');

      // The code key is deleted from database
      expect(await db.get(`${KEY_PREFIX}code:${code}`)).toBeNull();
    });
  });

  describe('per-account attempt lockout on device linking', () => {
    it('locks out the account when cumulative link attempts exceed account threshold', async () => {
      process.env.ACCOUNT_CODE_MAX_ATTEMPTS = '10';
      process.env.ACCOUNT_LINK_MAX_ATTEMPTS_PER_USER = '3';
      const { sessionToken, userId } = await createUser('55.0.0.1');

      const genRes = await callUsers(
        { action: 'generateCode', sessionToken },
        { 'x-forwarded-for': '55.0.0.2' }
      );
      const code = genRes.body.data.accountCode;

      // Invalidate pointer to trigger failed attempts
      const db = await getDb();
      await db.del(`${KEY_PREFIX}usercode:${userId}`);

      // 3 attempts across rotating IPs
      for (let i = 0; i < 3; i++) {
        const res = await callUsers(
          { action: 'linkDevice', accountCode: code },
          { 'x-forwarded-for': `55.0.1.${i}` }
        );
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('Invalid or expired account code');
      }

      // 4th attempt exceeds the per-account limit of 3
      const res4 = await callUsers(
        { action: 'linkDevice', accountCode: code },
        { 'x-forwarded-for': '55.0.1.4' }
      );
      expect(res4.statusCode).toBe(400);
      expect(res4.body.error).toBe('Invalid or expired account code');

      // Code is deleted and user pointer is deleted
      expect(await db.get(`${KEY_PREFIX}code:${code}`)).toBeNull();
      expect(await db.get(`${KEY_PREFIX}usercode:${userId}`)).toBeNull();
    });
  });
});
