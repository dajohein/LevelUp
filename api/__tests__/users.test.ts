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
});
