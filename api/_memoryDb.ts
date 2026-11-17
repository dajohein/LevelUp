/**
 * Minimal in-memory stand-in for the subset of the Redis client the API uses.
 * Only used outside production when no Redis env vars are configured (local
 * dev and tests). Values are JSON round-tripped to mimic Upstash serialization.
 */
type Entry = { value: string; expiresAt?: number };

export class MemoryDb {
  private kv = new Map<string, Entry>();
  private sets = new Map<string, Set<string>>();
  private hashes = new Map<string, Map<string, string>>();

  private live(key: string): Entry | undefined {
    const entry = this.kv.get(key);
    if (entry?.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
      this.kv.delete(key);
      return undefined;
    }
    return entry;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.live(key);
    return entry ? (JSON.parse(entry.value) as T) : null;
  }

  async set(
    key: string,
    value: unknown,
    opts?: { ex?: number; nx?: boolean }
  ): Promise<'OK' | null> {
    if (opts?.nx && this.live(key)) return null;
    this.kv.set(key, {
      value: JSON.stringify(value),
      expiresAt: opts?.ex ? Date.now() + opts.ex * 1000 : undefined,
    });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let removed = 0;
    for (const key of keys) {
      if (this.live(key)) removed++;
      this.kv.delete(key);
      if (this.sets.delete(key)) removed++;
      if (this.hashes.delete(key)) removed++;
    }
    return removed;
  }

  async incr(key: string): Promise<number> {
    const next = Number(this.live(key)?.value ?? 0) + 1;
    const existing = this.kv.get(key);
    this.kv.set(key, { value: String(next), expiresAt: existing?.expiresAt });
    return next;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.live(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    const set = this.sets.get(key) ?? new Set<string>();
    const before = set.size;
    members.forEach(m => set.add(m));
    this.sets.set(key, set);
    return set.size - before;
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    const set = this.sets.get(key);
    if (!set) return 0;
    let removed = 0;
    members.forEach(m => set.delete(m) && removed++);
    return removed;
  }

  async smembers(key: string): Promise<string[]> {
    return [...(this.sets.get(key) ?? [])];
  }

  // Hashes: field values are JSON round-tripped like Upstash does
  async hset(key: string, fields: Record<string, unknown>): Promise<number> {
    const hash = this.hashes.get(key) ?? new Map<string, string>();
    let added = 0;
    for (const [field, value] of Object.entries(fields)) {
      if (!hash.has(field)) added++;
      hash.set(field, JSON.stringify(value));
    }
    this.hashes.set(key, hash);
    return added;
  }

  async hget<T>(key: string, field: string): Promise<T | null> {
    const raw = this.hashes.get(key)?.get(field);
    return raw === undefined ? null : (JSON.parse(raw) as T);
  }

  async hgetall<T extends Record<string, unknown>>(key: string): Promise<T | null> {
    const hash = this.hashes.get(key);
    if (!hash || hash.size === 0) return null;
    return Object.fromEntries([...hash].map(([f, v]) => [f, JSON.parse(v)])) as T;
  }

  async hlen(key: string): Promise<number> {
    return this.hashes.get(key)?.size ?? 0;
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    const hash = this.hashes.get(key);
    if (!hash) return 0;
    let removed = 0;
    fields.forEach(f => hash.delete(f) && removed++);
    if (hash.size === 0) this.hashes.delete(key);
    return removed;
  }
}
