/**
 * Redis access for the serverless API (Vercel Marketplace → Upstash Redis).
 *
 * Vercel injects KV_REST_API_URL / KV_REST_API_TOKEN when an Upstash store is
 * connected to the project (UPSTASH_REDIS_REST_* is also accepted). All keys are
 * prefixed so the store can safely be shared with other apps.
 *
 * Outside production, with no Redis configured, a process-local in-memory
 * stand-in is used (local dev and tests). Production fails closed.
 */
import type { Redis } from '@upstash/redis';
import { MemoryDb } from './_memoryDb.js';
import { isProduction } from './_config.js';

export const KEY_PREFIX = 'levelup:';
export const userKey = (id: string) => `${KEY_PREFIX}user:${id}`;

let client: Redis | null = null;

// Shared across handlers so users/storage see the same data when running without Redis
const memoryDb = new MemoryDb();

export async function getDb(): Promise<Redis> {
  if (client) return client;

  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (!isProduction()) {
      return memoryDb as unknown as Redis;
    }
    throw new Error(
      'Redis is not configured: connect an Upstash Redis store to this Vercel project'
    );
  }

  // Loaded lazily: keeps cold starts lean and the ESM-only package out of unit tests
  const { Redis: UpstashRedis } = await import('@upstash/redis');
  client = new UpstashRedis({ url, token });
  return client;
}

// Compare-and-increment of a profile's sessionVersion, atomic on the server (one Lua script).
// Returns the new version, or 0 when the profile is gone, the stored version is unreadable, or it
// is no longer the one the caller presented (somebody else revoked in the meantime).
// A profile without the field is version 1 and moves to 2.
const BUMP_SESSION_VERSION_LUA = `
if redis.call('EXISTS', KEYS[1]) == 0 then return 0 end
local raw = redis.call('HGET', KEYS[1], 'sessionVersion')
local current = 1
if raw ~= false then
  current = tonumber(raw)
  if current == nil or current < 1 or current ~= math.floor(current) then return 0 end
end
if current ~= tonumber(ARGV[1]) then return 0 end
redis.call('HSET', KEYS[1], 'sessionVersion', tostring(current + 1))
return current + 1
`;

export async function bumpSessionVersion(userKeyName: string, expected: number): Promise<number> {
  const db = await getDb();
  if (db === (memoryDb as unknown)) return memoryDb.bumpSessionVersion(userKeyName, expected);
  const result = await db.eval<[number], number>(
    BUMP_SESSION_VERSION_LUA,
    [userKeyName],
    [expected]
  );
  return Number(result) || 0;
}
