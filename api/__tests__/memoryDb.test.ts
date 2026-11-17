import { MemoryDb } from '../_memoryDb.js';

describe('MemoryDb', () => {
  it('set with nx only writes when the key is free, and respects expiry', async () => {
    const db = new MemoryDb();
    expect(await db.set('k', 1, { nx: true })).toBe('OK');
    expect(await db.set('k', 2, { nx: true })).toBeNull();
    expect(await db.get('k')).toBe(1);

    await db.set('short', 1, { ex: 1 });
    jest.useFakeTimers().setSystemTime(Date.now() + 5000);
    try {
      expect(await db.set('short', 2, { nx: true })).toBe('OK');
    } finally {
      jest.useRealTimers();
    }
  });

  it('hlen counts fields and drops with hdel', async () => {
    const db = new MemoryDb();
    await db.hset('h', { a: 1, b: 2 });
    expect(await db.hlen('h')).toBe(2);
    await db.hdel('h', 'a');
    expect(await db.hlen('h')).toBe(1);
    expect(await db.hlen('missing')).toBe(0);
  });
});
