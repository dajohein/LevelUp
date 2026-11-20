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

  describe('exhausting a superseded code', () => {
    it('does not delete the pointer to the account current code', async () => {
      process.env.ACCOUNT_CODE_MAX_ATTEMPTS = '2';
      process.env.ACCOUNT_LINK_MAX_FAILED_PER_IP = '100';
      const { sessionToken, userId } = await createUser('69.0.0.1');
      const gen = await callUsers(
        { action: 'generateCode', sessionToken },
        { 'x-forwarded-for': '69.0.0.2' }
      );
      const current = gen.body.data.accountCode;
      const db = await getDb();
      // a live code that is not the current one (e.g. left over from a racing generateCode)
      await db.set(`${KEY_PREFIX}code:STALEXCDEQ`, { userId, createdAt: Date.now() }, { ex: 600 });
      for (let i = 0; i < 3; i++) {
        const res = await callUsers(
          { action: 'linkDevice', accountCode: 'STALEXCDEQ' },
          { 'x-forwarded-for': `69.0.1.${i}` }
        );
        expect(res.statusCode).toBe(400);
      }
      expect(await db.get(`${KEY_PREFIX}code:STALEXCDEQ`)).toBeNull(); // exhausted: gone
      const link = await callUsers(
        { action: 'linkDevice', accountCode: current },
        { 'x-forwarded-for': '69.0.2.1' }
      );
      expect(link.statusCode).toBe(200);
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

      // The exhausted code is deleted; the pointer is left to expire (it may name a newer code)
      expect(await db.get(`${KEY_PREFIX}code:${code}`)).toBeNull();
    });
  });

  describe('failed-only counting (H3)', () => {
    const plantStaleCode = async (userId: string, code: string) => {
      // A live code that is not the account's current one: redeeming it is a failed attempt
      const db = await getDb();
      await db.set(`${KEY_PREFIX}code:${code}`, { userId, createdAt: Date.now() }, { ex: 600 });
    };
    const newCode = (n: number) => `STALEXCDE${'ABCDEFGH'[n]}`;

    it('a success neither counts nor resets: failures already in the window stay counted', async () => {
      process.env.ACCOUNT_LINK_MAX_ATTEMPTS_PER_USER = '3';
      process.env.ACCOUNT_LINK_MAX_FAILED_PER_IP = '100';
      process.env.ACCOUNT_CODE_GENERATE_MAX_PER_USER = '50';
      const { sessionToken, userId } = await createUser('60.0.0.1');
      const redeem = (code: string, ip: string) =>
        callUsers({ action: 'linkDevice', accountCode: code }, { 'x-forwarded-for': ip });

      // the code is generated first: generating one starts the account's count over
      const gen = await callUsers(
        { action: 'generateCode', sessionToken },
        { 'x-forwarded-for': '60.0.0.2' }
      );
      // two failed redemptions against the account
      for (let i = 0; i < 2; i++) {
        await plantStaleCode(userId, newCode(i));
        expect((await redeem(newCode(i), `60.1.0.${i}`)).statusCode).toBe(400);
      }
      // a successful redemption in between: not counted, and it must not erase the failures
      expect((await redeem(gen.body.data.accountCode, '60.1.0.9')).statusCode).toBe(200);
      // third failure is still within the limit of 3 (the stale code survives, the limit is not hit) ...
      await plantStaleCode(userId, newCode(5));
      expect((await redeem(newCode(5), '60.1.0.5')).statusCode).toBe(400);
      // ... and the fourth failure is over it: the account's code and pointer are locked away.
      // (Had the success reset the count, this fourth failure would only be the second.)
      await plantStaleCode(userId, newCode(6));
      expect((await redeem(newCode(6), '60.1.0.6')).statusCode).toBe(400);
      const db = await getDb();
      expect(await db.get(`${KEY_PREFIX}code:${newCode(6)}`)).toBeNull();
    });

    it('a user who redeems many codes in a row is never locked out by successes alone', async () => {
      process.env.ACCOUNT_LINK_MAX_ATTEMPTS_PER_USER = '2';
      process.env.ACCOUNT_LINK_MAX_FAILED_PER_IP = '2';
      process.env.ACCOUNT_CODE_GENERATE_MAX_PER_USER = '50';
      process.env.RATE_LIMIT_MAX_ATTEMPTS = '50';
      const { sessionToken } = await createUser('61.0.0.1');
      for (let i = 0; i < 6; i++) {
        const gen = await callUsers(
          { action: 'generateCode', sessionToken },
          { 'x-forwarded-for': `61.0.1.${i}` }
        );
        const link = await callUsers(
          { action: 'linkDevice', accountCode: gen.body.data.accountCode },
          { 'x-forwarded-for': '61.0.2.1' } // same client address every time
        );
        expect([i, link.statusCode]).toEqual([i, 200]);
      }
    });
  });

  describe('limiters that see guesses at unknown codes (M1)', () => {
    const guess = (ip: string, code = 'ZZZZZZZZZZ') =>
      callUsers({ action: 'linkDevice', accountCode: code }, { 'x-forwarded-for': ip });

    it('limits failed guesses per client address, then answers 429 (other clients unaffected)', async () => {
      process.env.ACCOUNT_LINK_MAX_FAILED_PER_IP = '3';
      for (let i = 0; i < 3; i++) expect((await guess('62.0.0.1')).statusCode).toBe(400);
      expect((await guess('62.0.0.1')).statusCode).toBe(429);
      expect((await guess('62.0.0.2')).statusCode).toBe(400);
    });

    it('a burst of parallel guesses cannot slip under the limit', async () => {
      process.env.ACCOUNT_LINK_MAX_FAILED_PER_IP = '5';
      const results = await Promise.all(Array.from({ length: 20 }, () => guess('62.1.0.1')));
      const answered = results.filter(r => r.statusCode === 400).length;
      expect(answered).toBe(5);
      expect(results.filter(r => r.statusCode === 429)).toHaveLength(15);
    });

    // A window of its own (Date.now shifted), so counters from other tests do not leak in
    const inOwnWindow = async (hours: number, body: () => Promise<void>) => {
      const spy = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + hours * 3_600_000);
      try {
        await body();
      } finally {
        spy.mockRestore();
      }
    };

    it('one client flooding requests cannot switch off linking for everyone else', async () => {
      process.env.ACCOUNT_LINK_MAX_FAILED_PER_IP = '3';
      // neither the removed hard global limit (old name) nor the warning threshold may block
      process.env.ACCOUNT_LINK_MAX_FAILED_GLOBAL = '5';
      process.env.ACCOUNT_LINK_WARN_FAILED_GLOBAL = '5';
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        await inOwnWindow(40, async () => {
          const { sessionToken } = await createUser('63.9.0.1');
          for (let i = 0; i < 50; i++) await guess('63.0.0.1');
          for (let i = 0; i < 8; i++) expect((await guess(`63.0.1.${i}`)).statusCode).toBe(400);
          const gen = await callUsers(
            { action: 'generateCode', sessionToken },
            { 'x-forwarded-for': '63.9.0.2' }
          );
          const link = await callUsers(
            { action: 'linkDevice', accountCode: gen.body.data.accountCode },
            { 'x-forwarded-for': '63.9.0.3' }
          );
          expect(link.statusCode).toBe(200);
        });
      } finally {
        warn.mockRestore();
      }
    });

    it('logs one warning per window when failures from many addresses pass the threshold', async () => {
      process.env.ACCOUNT_LINK_WARN_FAILED_GLOBAL = '4';
      process.env.ACCOUNT_LINK_MAX_FAILED_PER_IP = '100';
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        await inOwnWindow(80, async () => {
          for (let i = 0; i < 4; i++) expect((await guess(`63.1.0.${i}`)).statusCode).toBe(400);
          expect(warn).not.toHaveBeenCalled(); // at the threshold, not past it
          for (let i = 4; i < 9; i++)
            expect((await guess(`63.1.0.${i}`, 'QQQQQQQQQQ')).statusCode).toBe(400);
          expect(warn).toHaveBeenCalledTimes(1);
          expect(JSON.stringify(warn.mock.calls)).not.toMatch(/ZZZZZZZZZZ|QQQQQQQQQQ|63\.1\.0\./);
        });
      } finally {
        warn.mockRestore();
      }
    });

    it('a request the address limit refuses does not use up the global count', async () => {
      process.env.ACCOUNT_LINK_WARN_FAILED_GLOBAL = '5';
      process.env.ACCOUNT_LINK_MAX_FAILED_PER_IP = '2';
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        await inOwnWindow(120, async () => {
          for (let i = 0; i < 30; i++) await guess('63.2.0.1'); // 2 counted, 28 refused
          for (let i = 0; i < 3; i++) await guess(`63.2.1.${i}`); // 2 + 3 = 5: at the threshold
          expect(warn).not.toHaveBeenCalled();
          await guess('63.2.2.1'); // 6th counted request passes it
          expect(warn).toHaveBeenCalledTimes(1);
        });
      } finally {
        warn.mockRestore();
      }
    });
  });

  describe('per-code limit follows the code lifetime (M)', () => {
    it('is not reset when a wall-clock window boundary passes during the code lifetime', async () => {
      process.env.ACCOUNT_CODE_MAX_ATTEMPTS = '3';
      process.env.ACCOUNT_LINK_MAX_FAILED_PER_IP = '100';
      const win = 60 * 60 * 1000; // default window and code lifetime
      const boundary = (Math.floor(Date.now() / win) + 400) * win;
      const spy = jest.spyOn(Date, 'now').mockReturnValue(boundary - 60_000); // minted 1 minute before
      try {
        const { sessionToken, userId } = await createUser('67.0.0.1');
        const gen = await callUsers(
          { action: 'generateCode', sessionToken },
          { 'x-forwarded-for': '67.0.0.2' }
        );
        const code = gen.body.data.accountCode;
        const db = await getDb();
        await db.del(`${KEY_PREFIX}usercode:${userId}`); // every redemption is a failed attempt
        const redeem = (ip: string) =>
          callUsers({ action: 'linkDevice', accountCode: code }, { 'x-forwarded-for': ip });
        for (let i = 0; i < 3; i++) expect((await redeem(`67.0.1.${i}`)).statusCode).toBe(400);

        spy.mockReturnValue(boundary + 120_000); // next window, the code is still live
        expect(await db.get(`${KEY_PREFIX}code:${code}`)).not.toBeNull();
        expect((await redeem('67.0.1.9')).statusCode).toBe(400);
        // the fourth guess exceeded the 3 allowed for this code: it is gone
        expect(await db.get(`${KEY_PREFIX}code:${code}`)).toBeNull();
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('legacy 8-character codes (M2)', () => {
    it('redeems a code issued before the length change, until its TTL passes', async () => {
      const { userId } = await createUser('64.0.0.1');
      const db = await getDb();
      await db.set(`${KEY_PREFIX}code:ABCD2345`, { userId, createdAt: Date.now() }, { ex: 600 });
      await db.set(`${KEY_PREFIX}usercode:${userId}`, 'ABCD2345', { ex: 600 });
      const link = await callUsers(
        { action: 'linkDevice', accountCode: 'abcd 2345' },
        { 'x-forwarded-for': '64.0.0.2' }
      );
      expect(link.statusCode).toBe(200);
      expect(link.body.data.userId).toBe(userId);
    });

    it.each(['ABCD234', 'ABCD23456', 'ABCD2345G', 'ABCD2345GHJ'])(
      'still rejects the length of %s',
      async code => {
        const link = await callUsers(
          { action: 'linkDevice', accountCode: code },
          { 'x-forwarded-for': '64.0.1.1' }
        );
        expect(link.statusCode).toBe(400);
      }
    );
  });

  describe('generation limits (L3)', () => {
    it('a request refused by the account limit does not use up the client-address budget', async () => {
      process.env.ACCOUNT_CODE_GENERATE_MAX_PER_USER = '1';
      process.env.RATE_LIMIT_MAX_ATTEMPTS = '10';
      const a = await createUser('65.0.0.1');
      const b = await createUser('65.0.0.2');
      const gen = (token: string) =>
        callUsers(
          { action: 'generateCode', sessionToken: token },
          { 'x-forwarded-for': '65.9.9.9' }
        );
      expect((await gen(a.sessionToken)).statusCode).toBe(200);
      for (let i = 0; i < 9; i++) expect((await gen(a.sessionToken)).statusCode).toBe(429);
      expect((await gen(b.sessionToken)).statusCode).toBe(200);
    });

    it('a new code starts the account failed-redemption count over (LOW)', async () => {
      process.env.ACCOUNT_LINK_MAX_ATTEMPTS_PER_USER = '3';
      process.env.ACCOUNT_LINK_MAX_FAILED_PER_IP = '100';
      process.env.ACCOUNT_CODE_GENERATE_MAX_PER_USER = '50';
      const { sessionToken, userId } = await createUser('68.0.0.1');
      const db = await getDb();
      for (let i = 0; i < 3; i++) {
        // stale live codes of the account: each redemption is a failure counted against it
        const stale = `STALEXCDE${'ABC'[i]}`;
        await db.set(`${KEY_PREFIX}code:${stale}`, { userId, createdAt: Date.now() }, { ex: 600 });
        const res = await callUsers(
          { action: 'linkDevice', accountCode: stale },
          { 'x-forwarded-for': `68.0.1.${i}` }
        );
        expect(res.statusCode).toBe(400);
      }
      // account is now at its limit; a fresh code must still link
      const gen = await callUsers(
        { action: 'generateCode', sessionToken },
        { 'x-forwarded-for': '68.0.0.2' }
      );
      const link = await callUsers(
        { action: 'linkDevice', accountCode: gen.body.data.accountCode },
        { 'x-forwarded-for': '68.0.2.1' }
      );
      expect(link.statusCode).toBe(200);
    });

    it('signing out other devices clears the account counters', async () => {
      process.env.ACCOUNT_CODE_GENERATE_MAX_PER_USER = '1';
      const { sessionToken } = await createUser('66.0.0.1');
      const ip = { 'x-forwarded-for': '66.0.0.2' };
      expect((await callUsers({ action: 'generateCode', sessionToken }, ip)).statusCode).toBe(200);
      expect((await callUsers({ action: 'generateCode', sessionToken }, ip)).statusCode).toBe(429);
      const revoke = await callUsers({ action: 'revokeSessions', sessionToken }, ip);
      expect(revoke.statusCode).toBe(200);
      expect(
        (
          await callUsers(
            { action: 'generateCode', sessionToken: revoke.body.data.sessionToken },
            ip
          )
        ).statusCode
      ).toBe(200);
    });
  });
});
