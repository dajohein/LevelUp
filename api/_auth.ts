/**
 * Stateless session tokens shared by the serverless API functions.
 *
 * Each Vercel function runs in its own isolate, so an in-memory session Map in
 * api/users.ts cannot be seen by api/storage.ts. Tokens are therefore
 * HMAC-signed (`<base64url payload>.<base64url signature>`) and can be
 * verified by any function that knows SESSION_SECRET.
 */
import { createHmac, timingSafeEqual } from 'crypto';
import { isProduction } from './_config.js';

const DEV_FALLBACK_SECRET = 'levelup-insecure-dev-secret';

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (isProduction()) {
    throw new Error('SESSION_SECRET must be set in production');
  }
  return DEV_FALLBACK_SECRET;
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

export function createSessionToken(userId: string, ttlMs: number, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ u: userId, e: now + ttlMs })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

/**
 * Returns the userId for a validly signed token, otherwise null.
 *
 * By default the token must be unexpired. `graceMs` also accepts a token that expired up to that
 * long ago; only the session refresh in `authenticate` uses it, so that a client that was offline
 * or closed for a while can recover. The signature is always required: an unsigned, tampered or
 * forged token is never accepted, with or without grace.
 */
export function verifySessionToken(token: unknown, now = Date.now(), graceMs = 0): string | null {
  if (typeof token !== 'string') return null;
  const [payload, signature, ...rest] = token.split('.');
  if (!payload || !signature || rest.length > 0) return null;

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const { u, e } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof u !== 'string' || typeof e !== 'number' || e + graceMs < now) return null;
    return u;
  } catch {
    return null;
  }
}

/** Fixed CORS policy: only echo origins on the allow-list ('*' only if explicitly configured). */
export function resolveCorsOrigin(origin: string | undefined): string | null {
  const allowed = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (allowed.includes('*')) return '*';
  if (origin && allowed.includes(origin)) return origin;
  return null;
}
