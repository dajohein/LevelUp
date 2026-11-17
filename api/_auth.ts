/**
 * Stateless session tokens shared by the serverless API functions.
 *
 * Each Vercel function runs in its own isolate, so an in-memory session Map in
 * api/users.ts cannot be seen by api/storage.ts. Tokens are therefore
 * HMAC-signed (`<base64url payload>.<base64url signature>`) and can be
 * verified by any function that knows SESSION_SECRET.
 */
import { createHmac, timingSafeEqual } from 'crypto';
import { envPositiveInt, isProduction } from './_config.js';

const DAY_MS = 24 * 60 * 60 * 1000;

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

/** Absolute lifetime of a session, however often it is refreshed (default 90 days). */
const maxSessionAgeMs = () => envPositiveInt('SESSION_MAX_AGE_MS', 90 * DAY_MS);

/**
 * Creates a signed token. `u` is the user, `e` the expiry of this token and `a` the absolute end
 * of the whole session: a refresh issues a new `e` but inherits `a`, so a session (and a stolen
 * token) cannot be kept alive forever by refreshing it. `e` never exceeds `a`.
 */
export function createSessionToken(
  userId: string,
  ttlMs: number,
  now = Date.now(),
  absoluteExpiry: number = now + maxSessionAgeMs()
): string {
  const e = Math.min(now + ttlMs, absoluteExpiry);
  const payload = Buffer.from(JSON.stringify({ u: userId, e, a: absoluteExpiry })).toString(
    'base64url'
  );
  return `${payload}.${sign(payload)}`;
}

export interface SessionClaims {
  userId: string;
  /** End of the whole session, or null for a token issued before sessions had an absolute age */
  absoluteExpiry: number | null;
}

/** A finite, positive whole number of epoch milliseconds. */
const isTimestamp = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

/**
 * Returns the claims of a validly signed token that has not expired, otherwise null.
 *
 * By default the token must be unexpired. `graceMs` also accepts a token that expired up to that
 * long ago; only the session refresh in `authenticate` uses it, so that a client that was offline
 * or closed for a while can recover. Two things never bend: the signature (an unsigned, tampered
 * or forged token is never accepted) and the absolute end of the session (`a`).
 */
export function readSessionToken(
  token: unknown,
  now = Date.now(),
  graceMs = 0
): SessionClaims | null {
  if (typeof token !== 'string') return null;
  // NaN would make every comparison below false and so skip the expiry check
  if (!Number.isFinite(now) || !Number.isFinite(graceMs) || graceMs < 0) return null;
  const [payload, signature, ...rest] = token.split('.');
  if (!payload || !signature || rest.length > 0) return null;

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const { u, e, a } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof u !== 'string' || u.length === 0 || !isTimestamp(e)) return null;
    if (a !== undefined && !isTimestamp(a)) return null;
    if (e + graceMs < now) return null; // expired beyond what the caller tolerates
    if (a !== undefined && a < now) return null; // the session itself is over
    return { userId: u, absoluteExpiry: a ?? null };
  } catch {
    return null;
  }
}

/** Returns the userId for a valid, unexpired token, otherwise null. */
export function verifySessionToken(token: unknown, now = Date.now(), graceMs = 0): string | null {
  return readSessionToken(token, now, graceMs)?.userId ?? null;
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
