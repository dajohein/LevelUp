import usersHandler from '../users.js';

function mockRes() {
  const res: any = { statusCode: 0, body: undefined };
  res.status = (c: number) => ((res.statusCode = c), res);
  res.json = (b: unknown) => ((res.body = b), res);
  res.setHeader = () => res;
  res.end = () => res;
  return res;
}
const call = async (body: any, ip = '1.1.1.1') => {
  const res = mockRes();
  await usersHandler(
    { method: 'POST', body, query: {}, headers: { 'x-forwarded-for': ip } } as any,
    res
  );
  return res;
};

async function newUser() {
  const res = await call({ action: 'create' });
  return res.body.data as { userId: string; sessionToken: string };
}

describe('users API (Redis-backed)', () => {
  it('requires a valid session token for get/update', async () => {
    const { userId, sessionToken } = await newUser();
    expect((await call({ action: 'get', userId })).statusCode).toBe(401);
    expect((await call({ action: 'get', sessionToken })).body.data.user.id).toBe(userId);
  });

  it('does not let update overwrite the user id', async () => {
    const { userId, sessionToken } = await newUser();
    const res = await call({
      action: 'update',
      sessionToken,
      userData: { id: 'evil', username: 'x' },
    });
    expect(res.body.data.user).toMatchObject({ id: userId, username: 'x' });
  });

  it('links a device with a single-use code', async () => {
    const { userId, sessionToken } = await newUser();
    const { accountCode } = (await call({ action: 'generateCode', sessionToken }, '2.2.2.2')).body
      .data;

    const first = await call({ action: 'linkDevice', accountCode }, '3.3.3.3');
    expect(first.body.success).toBe(true);
    expect(first.body.data.userId).toBe(userId);

    const second = await call({ action: 'linkDevice', accountCode }, '3.3.3.3');
    expect(second.statusCode).toBe(400);
  });

  it('only one of two concurrent link requests consumes the code', async () => {
    const { sessionToken } = await newUser();
    const { accountCode } = (await call({ action: 'generateCode', sessionToken }, '4.4.4.4')).body
      .data;
    const results = await Promise.all([
      call({ action: 'linkDevice', accountCode }, '5.5.5.5'),
      call({ action: 'linkDevice', accountCode }, '6.6.6.6'),
    ]);
    expect(results.filter(r => r.body.success).length).toBe(1);
  });

  it('generating a new code invalidates the previous one', async () => {
    const { sessionToken } = await newUser();
    const a = (await call({ action: 'generateCode', sessionToken }, '7.7.7.7')).body.data
      .accountCode;
    const b = (await call({ action: 'generateCode', sessionToken }, '7.7.7.7')).body.data
      .accountCode;
    expect((await call({ action: 'linkDevice', accountCode: a }, '8.8.8.8')).statusCode).toBe(400);
    expect((await call({ action: 'linkDevice', accountCode: b }, '9.9.9.9')).body.success).toBe(
      true
    );
  });

  it('rate limits repeated link attempts from one client', async () => {
    const attempts = [];
    for (let i = 0; i < 12; i++)
      attempts.push(await call({ action: 'linkDevice', accountCode: 'ZZZZZZZZ' }, '10.0.0.1'));
    expect(attempts[attempts.length - 1].statusCode).toBe(429);
  });

  it('authenticate does not discard a profile update (only lastActive is written)', async () => {
    const { sessionToken } = await newUser();
    await call({ action: 'update', sessionToken, userData: { username: 'renamed' } });
    const auth = await call({ action: 'authenticate', sessionToken });
    expect(auth.body.data.user.username).toBe('renamed');
    expect((await call({ action: 'get', sessionToken })).body.data.user.username).toBe('renamed');
  });

  it('keeps concurrent update and authenticate from clobbering each other', async () => {
    const { sessionToken } = await newUser();
    await Promise.all([
      call({ action: 'authenticate', sessionToken }),
      call({ action: 'update', sessionToken, userData: { username: 'concurrent' } }),
      call({ action: 'authenticate', sessionToken }),
    ]);
    expect((await call({ action: 'get', sessionToken })).body.data.user.username).toBe(
      'concurrent'
    );
  });

  it('after racing generateCode calls only the newest pointer is redeemable', async () => {
    const { sessionToken } = await newUser();
    const codes = await Promise.all(
      ['11.0.0.1', '11.0.0.2', '11.0.0.3'].map(
        async ip => (await call({ action: 'generateCode', sessionToken }, ip)).body.data.accountCode
      )
    );
    const redeemed = [];
    for (const [i, accountCode] of codes.entries()) {
      redeemed.push(
        (await call({ action: 'linkDevice', accountCode }, `12.0.0.${i}`)).body.success
      );
    }
    expect(redeemed.filter(Boolean).length).toBe(1);
  });

  it('a consumed code never becomes redeemable again after a newer one is generated', async () => {
    const { sessionToken } = await newUser();
    const a = (await call({ action: 'generateCode', sessionToken }, '13.0.0.1')).body.data
      .accountCode;
    expect((await call({ action: 'linkDevice', accountCode: a }, '13.0.0.2')).body.success).toBe(
      true
    );
    const b = (await call({ action: 'generateCode', sessionToken }, '13.0.0.1')).body.data
      .accountCode;
    expect((await call({ action: 'linkDevice', accountCode: a }, '13.0.0.3')).statusCode).toBe(400);
    expect((await call({ action: 'linkDevice', accountCode: b }, '13.0.0.4')).body.success).toBe(
      true
    );
  });

  it('rate limit window resets: a stale counter never locks a client out', async () => {
    const realNow = Date.now;
    try {
      let t = realNow.call(Date);
      Date.now = () => t;
      for (let i = 0; i < 12; i++)
        await call({ action: 'linkDevice', accountCode: 'ZZZZZZZZ' }, '14.0.0.1');
      expect(
        (await call({ action: 'linkDevice', accountCode: 'ZZZZZZZZ' }, '14.0.0.1')).statusCode
      ).toBe(429);
      t += 24 * 60 * 60 * 1000;
      expect(
        (await call({ action: 'linkDevice', accountCode: 'ZZZZZZZZ' }, '14.0.0.1')).statusCode
      ).toBe(400);
    } finally {
      Date.now = realNow;
    }
  });
});
