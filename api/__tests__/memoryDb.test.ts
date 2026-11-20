import { MemoryDb } from '../_memoryDb.js';

describe('MemoryDb', () => {
  afterEach(() => jest.useRealTimers());

  it('set with nx only writes when the key is free', async () => {
    const db = new MemoryDb();
    expect(await db.set('k', 1, { nx: true })).toBe('OK');
    expect(await db.set('k', 2, { nx: true })).toBeNull();
    expect(await db.get('k')).toBe(1);
  });

  it('expires after exactly `ex` seconds (not milliseconds), and nx then succeeds again', async () => {
    const start = Date.now();
    jest.useFakeTimers().setSystemTime(start);
    const db = new MemoryDb();
    await db.set('short', 1, { ex: 1 });

    jest.setSystemTime(start + 500);
    expect(await db.get('short')).toBe(1);
    expect(await db.set('short', 2, { nx: true })).toBeNull();

    jest.setSystemTime(start + 1001);
    expect(await db.get('short')).toBeNull();
    expect(await db.set('short', 2, { nx: true })).toBe('OK');
    expect(await db.get('short')).toBe(2);
  });

  it('incr counts from zero and keeps the expiry, expire applies to existing keys only', async () => {
    const db = new MemoryDb();
    expect(await db.incr('c')).toBe(1);
    expect(await db.incr('c')).toBe(2);
    expect(await db.expire('missing', 10)).toBe(0);
    expect(await db.expire('c', 10)).toBe(1);
  });

  it('hashes: hset reports added fields, hget/hgetall round-trip JSON, hdel cleans up', async () => {
    const db = new MemoryDb();
    expect(await db.hset('h', { a: { n: 1 }, b: 'two' })).toBe(2);
    expect(await db.hset('h', { a: { n: 2 } })).toBe(0); // overwrite, nothing added
    expect(await db.hget('h', 'a')).toEqual({ n: 2 });
    expect(await db.hget('h', 'nope')).toBeNull();
    expect(await db.hgetall('h')).toEqual({ a: { n: 2 }, b: 'two' });
    expect(await db.hlen('h')).toBe(2);

    expect(await db.hdel('h', 'a', 'b')).toBe(2);
    expect(await db.hlen('h')).toBe(0);
    expect(await db.hgetall('h')).toBeNull();
    expect(await db.hlen('missing')).toBe(0);
  });

  it('a __proto__ field is just a field', async () => {
    const db = new MemoryDb();
    await db.hset('h', JSON.parse('{"__proto__": {"polluted": true}}'));
    const all = await db.hgetall<Record<string, unknown>>('h');
    expect(Object.keys(all ?? {})).toEqual(['__proto__']);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('sets: sadd, srem and smembers', async () => {
    const db = new MemoryDb();
    expect(await db.sadd('s', 'a', 'b', 'a')).toBe(2);
    expect((await db.smembers('s')).sort()).toEqual(['a', 'b']);
    expect(await db.srem('s', 'a', 'zzz')).toBe(1);
    expect(await db.smembers('s')).toEqual(['b']);
  });
});
