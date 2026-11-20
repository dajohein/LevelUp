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
