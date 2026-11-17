/**
 * Vercel Serverless API for User Management
 *
 * Handles user creation, profile management, session handling and device linking.
 */

// TypeScript interfaces for Vercel runtime
interface VercelRequest {
  method?: string;
  body: any;
  query: { [key: string]: string | string[] };
  headers: { [key: string]: string };
}

interface VercelResponse {
  status(code: number): VercelResponse;
  json(object: any): VercelResponse;
  setHeader(name: string, value: string): VercelResponse;
  end(): VercelResponse;
}
import { randomBytes, randomUUID } from 'crypto';
import { getDb, KEY_PREFIX } from './_db.js';
import { createSessionToken, verifySessionToken, resolveCorsOrigin } from './_auth.js';
import { clientAddress, envPositiveInt } from './_config.js';

interface UserRequest {
  action: 'create' | 'get' | 'update' | 'authenticate' | 'generateCode' | 'linkDevice';
  userId?: string;
  sessionToken?: string;
  accountCode?: string;
  userData?: {
    username?: string;
    email?: string;
    preferences?: any;
    lastActive?: number;
  };
}

type UserProfile = {
  id: string;
  username: string;
  email?: string;
  preferences: unknown;
  createdAt: number;
  lastActive: number;
};

interface UserResponse {
  success: boolean;
  data?: {
    userId?: string;
    sessionToken?: string;
    accountCode?: string;
    user?: any;
    linkedDevices?: number;
  };
  error?: string;
  metadata?: {
    timestamp: number;
    action: string;
  };
}

// Redis layout (see _db.ts):
//   levelup:user:<id>           -> user profile (JSON)
//   levelup:code:<CODE>         -> { userId, used, createdAt }, expires via TTL
//   levelup:usercode:<id>       -> the user's current unused code (so a new one replaces it)
//   levelup:codeattempts:<CODE> -> failed/total link attempts for one code (TTL)
//   levelup:rl:<bucket>         -> fixed-window rate-limit counter (TTL)
const userKey = (id: string) => `${KEY_PREFIX}user:${id}`;
const codeKey = (code: string) => `${KEY_PREFIX}code:${code}`;
const userCodeKey = (id: string) => `${KEY_PREFIX}usercode:${id}`;
const codeAttemptsKey = (code: string) => `${KEY_PREFIX}codeattempts:${code}`;

// Security limits (env-driven). A malformed value falls back to the default and is logged
// (see envPositiveInt); it never disables a limit.
const MAX_CODE_ATTEMPTS = () => envPositiveInt('ACCOUNT_CODE_MAX_ATTEMPTS', 5); // per code
const MAX_RATE_LIMIT_ATTEMPTS = () => envPositiveInt('RATE_LIMIT_MAX_ATTEMPTS', 10); // per client per window
const MAX_CREATE_ATTEMPTS = () => envPositiveInt('CREATE_MAX_PER_WINDOW', 30); // new accounts per client per window
const RATE_LIMIT_WINDOW = () => envPositiveInt('RATE_LIMIT_WINDOW_MS', 60 * 60 * 1000); // default 1 hour
const CODE_EXPIRY = () => envPositiveInt('ACCOUNT_CODE_EXPIRY_MS', 60 * 60 * 1000); // default 1 hour

const KNOWN_ACTIONS: ReadonlyArray<string> = [
  'create',
  'get',
  'update',
  'authenticate',
  'generateCode',
  'linkDevice',
];
const MAX_USERNAME_LENGTH = 64;
const MAX_EMAIL_LENGTH = 254;
const MAX_PREFERENCES_BYTES = 16 * 1024;
const ACCOUNT_CODE_PATTERN = /^[2-9A-HJ-NP-Z]{8}$/;

// Helper function to generate cryptographically secure account code
function generateAccountCode(): string {
  // Use crypto.randomBytes for cryptographically secure randomness

  // Generate 6 random bytes and encode as base32-like string
  // This gives us 8 characters from a 32-character alphabet
  const bytes = randomBytes(6);

  // Use a custom alphabet excluding confusing characters (0, O, I, 1, etc.)
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';

  // Convert bytes to base32-like encoding
  let value = 0;
  let bits = 0;

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      result += alphabet[(value >> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  // Add remaining bits if any
  if (bits > 0) {
    result += alphabet[(value << (5 - bits)) & 31];
  }

  // Return first 8 characters for consistent length
  return result.substring(0, 8);
}

// Sessions are stateless signed tokens (see ./_auth.ts) so api/storage can verify them too
function validateSession(token: string): string | null {
  return verifySessionToken(token);
}

/** How long after expiry a signed token can still be exchanged for a new one (default 30 days). */
const refreshGraceMs = () => envPositiveInt('SESSION_REFRESH_GRACE_MS', 30 * 24 * 60 * 60 * 1000);

function createSession(userId: string): string {
  const ttlMs = envPositiveInt('SESSION_TOKEN_TTL_MS', 24 * 60 * 60 * 1000);
  return createSessionToken(userId, ttlMs);
}

// Fixed-window rate limit: allows `max` attempts per window per identifier.
// The window number is part of the key and EXPIRE is always (re)applied, so a request that
// dies between INCR and EXPIRE can only leave a harmless stale bucket behind. The client
// is never locked out beyond the current window.
async function isRateLimited(
  identifier: string,
  max = MAX_RATE_LIMIT_ATTEMPTS()
): Promise<boolean> {
  const db = await getDb();
  const window = RATE_LIMIT_WINDOW();
  const key = `${KEY_PREFIX}rl:${identifier}:${Math.floor(Date.now() / window)}`;
  const attempts = await db.incr(key);
  await db.expire(key, Math.ceil((window * 2) / 1000));
  return attempts > max;
}

// Client identity for rate limiting (parsed, validated and length-capped, see _config.ts)
function getClientIdentifier(req: VercelRequest): string {
  return clientAddress(req.headers);
}

/** Validates the client-supplied profile fields; returns an error message or null. */
function validateUserData(userData: UserRequest['userData']): string | null {
  if (userData === undefined) return null;
  if (typeof userData !== 'object' || userData === null) return 'userData must be an object';
  const { username, email, preferences } = userData;
  if (
    username !== undefined &&
    (typeof username !== 'string' || username.length > MAX_USERNAME_LENGTH)
  )
    return `username must be a string of at most ${MAX_USERNAME_LENGTH} characters`;
  if (email !== undefined && (typeof email !== 'string' || email.length > MAX_EMAIL_LENGTH))
    return `email must be a string of at most ${MAX_EMAIL_LENGTH} characters`;
  if (
    preferences !== undefined &&
    Buffer.byteLength(JSON.stringify(preferences ?? null), 'utf8') > MAX_PREFERENCES_BYTES
  )
    return 'preferences are too large';
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS via environment configuration
  const corsOrigin = resolveCorsOrigin(req.headers['origin'] as string | undefined);
  res.setHeader('Vary', 'Origin');
  if (corsOrigin) res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
    });
  }

  // An empty or non-object body is a client error, not a 500 (and not an error-log entry)
  if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) {
    return res.status(400).json({ success: false, error: 'Request body must be a JSON object' });
  }

  try {
    const db = await getDb();
    const request: UserRequest = req.body;
    const response: UserResponse = {
      success: false,
      metadata: {
        timestamp: Date.now(),
        action: KNOWN_ACTIONS.includes(request.action) ? request.action : 'unknown',
      },
    };

    switch (request.action) {
      case 'create': {
        if (await isRateLimited(`create_${getClientIdentifier(req)}`, MAX_CREATE_ATTEMPTS())) {
          response.error = 'Too many accounts created. Please try again later.';
          return res.status(429).json(response);
        }
        const invalid = validateUserData(request.userData);
        if (invalid) {
          response.error = invalid;
          return res.status(400).json(response);
        }
        const userId = randomUUID();
        const user: UserProfile = {
          id: userId,
          username: request.userData?.username || `user_${userId.slice(0, 8)}`,
          preferences: request.userData?.preferences || {},
          createdAt: Date.now(),
          lastActive: Date.now(),
        };
        if (request.userData?.email !== undefined) user.email = request.userData.email;

        await db.hset(userKey(userId), user);
        const sessionToken = createSession(userId);

        response.success = true;
        response.data = {
          userId,
          sessionToken,
          user,
        };
        break;
      }

      case 'get': {
        const userId = validateSession(request.sessionToken || '');
        if (!userId) {
          response.error = 'Valid sessionToken is required';
          return res.status(401).json(response);
        }

        const user = await db.hgetall<UserProfile>(userKey(userId));
        if (!user) {
          response.error = 'User not found';
          return res.status(404).json(response);
        }

        response.success = true;
        response.data = { user };
        break;
      }

      case 'update': {
        const userId = validateSession(request.sessionToken || '');
        if (!userId) {
          response.error = 'Valid sessionToken is required';
          return res.status(401).json(response);
        }

        const invalidUpdate = validateUserData(request.userData);
        if (invalidUpdate) {
          response.error = invalidUpdate;
          return res.status(400).json(response);
        }
        if (request.userData?.username !== undefined && !request.userData.username.trim()) {
          response.error = 'username must not be empty';
          return res.status(400).json(response);
        }
        if (!(await db.hgetall(userKey(userId)))) {
          response.error = 'User not found';
          return res.status(404).json(response);
        }

        // Write only the fields being changed (HSET is per-field), so concurrent updates
        // and `authenticate` heartbeats never overwrite each other with a stale snapshot.
        // `id` and `createdAt` are never client-writable.
        const changes: Record<string, unknown> = { lastActive: Date.now() };
        for (const field of ['username', 'email', 'preferences'] as const) {
          if (request.userData?.[field] !== undefined) changes[field] = request.userData[field];
        }
        await db.hset(userKey(userId), changes);
        const updatedUser = await db.hgetall<UserProfile>(userKey(userId));

        response.success = true;
        response.data = { user: updatedUser };
        break;
      }

      case 'authenticate': {
        if (!request.sessionToken) {
          response.error = 'sessionToken is required for authentication';
          return res.status(400).json(response);
        }

        // The one place an expired token is still honoured: a validly signed token that expired
        // within the refresh grace period is exchanged for a fresh one. Without this a client that
        // was away for longer than the token lifetime could never recover its session.
        const userId = verifySessionToken(request.sessionToken, Date.now(), refreshGraceMs());
        if (!userId) {
          response.error = 'Invalid or expired session';
          return res.status(401).json(response);
        }

        if (!(await db.hgetall(userKey(userId)))) {
          response.error = 'User not found';
          return res.status(404).json(response);
        }

        // Touch only lastActive (single-field write; see `update`)
        await db.hset(userKey(userId), { lastActive: Date.now() });
        const user = await db.hgetall<UserProfile>(userKey(userId));

        response.success = true;
        response.data = {
          userId,
          user,
          // A fresh token on every authenticate keeps an active session alive
          sessionToken: createSession(userId),
        };
        break;
      }

      case 'generateCode': {
        if (!request.sessionToken) {
          response.error = 'sessionToken is required to generate account code';
          return res.status(400).json(response);
        }

        const userId = validateSession(request.sessionToken);
        if (!userId) {
          response.error = 'Invalid or expired session';
          return res.status(401).json(response);
        }

        // Check rate limiting for code generation
        const clientId = getClientIdentifier(req);
        if (await isRateLimited(`generate_${clientId}`)) {
          response.error = 'Too many code generation attempts. Please try again later.';
          return res.status(429).json(response);
        }

        const expirySeconds = Math.ceil(CODE_EXPIRY() / 1000);
        const previousCode = await db.get<string>(userCodeKey(userId));

        // NX: never overwrite a live code that belongs to someone else (a 40-bit collision is
        // unlikely, but a plain SET would silently hand the other user's code to this one)
        let accountCode = '';
        for (let attempt = 0; attempt < 5 && !accountCode; attempt++) {
          const candidate = generateAccountCode();
          const stored = await db.set(
            codeKey(candidate),
            { userId, createdAt: Date.now() },
            { ex: expirySeconds, nx: true }
          );
          if (stored) accountCode = candidate;
        }
        if (!accountCode) {
          throw new Error('Could not generate a unique account code');
        }
        // The pointer is what makes a code redeemable: linkDevice requires the code to match
        // it. One SET replaces the previous pointer, so the newest code always wins, even if
        // two generateCode calls race (the loser's code simply never validates).
        await db.set(userCodeKey(userId), accountCode, { ex: expirySeconds });
        // Hygiene only. Security does not depend on this delete.
        if (previousCode && previousCode !== accountCode) {
          await db.del(codeKey(previousCode), codeAttemptsKey(previousCode));
        }

        response.success = true;
        response.data = {
          accountCode,
          expiresIn: CODE_EXPIRY() / 1000, // Return seconds for client
        } as any; // Type assertion for Vercel response compatibility
        break;
      }

      case 'linkDevice': {
        // Rate limit first, so malformed and unknown guesses all count against the client
        const clientId = getClientIdentifier(req);
        if (await isRateLimited(`link_${clientId}`)) {
          response.error = 'Too many linking attempts. Please try again later.';
          return res.status(429).json(response);
        }

        // Every failure below returns this same message so a response never reveals whether a
        // code is unknown, expired, superseded, used or exhausted.
        const invalidCode = () => {
          response.error = 'Invalid or expired account code';
          return res.status(400).json(response);
        };

        if (typeof request.accountCode !== 'string') return invalidCode();
        // Normalize the code (uppercase, remove spaces), then require the exact code format
        const normalizedCode = request.accountCode.toUpperCase().replace(/\s/g, '');
        if (!ACCOUNT_CODE_PATTERN.test(normalizedCode)) return invalidCode();

        const codeData = await db.get<{ userId: string }>(codeKey(normalizedCode));
        if (!codeData) return invalidCode(); // unknown or expired (TTL elapsed)

        // Check code-specific attempt limit (EXPIRE always re-applied, see isRateLimited)
        const codeAttempts = await db.incr(codeAttemptsKey(normalizedCode));
        await db.expire(codeAttemptsKey(normalizedCode), Math.ceil(CODE_EXPIRY() / 1000));
        if (codeAttempts > MAX_CODE_ATTEMPTS()) {
          await db.del(codeKey(normalizedCode), codeAttemptsKey(normalizedCode));
          return invalidCode();
        }

        // Only the user's most recently generated code is redeemable
        const currentCode = await db.get<string>(userCodeKey(codeData.userId));
        if (currentCode !== normalizedCode) return invalidCode();

        // Single use: DEL is atomic, so only one concurrent request can consume the code.
        // The user's pointer is left to expire: it now names a consumed code, which can
        // never validate again, and deleting it here could race with a newer generateCode.
        // Look the user up first: if the account is gone or the read fails, the one-time code
        // must not be burned without issuing a session.
        const user = await db.hgetall<UserProfile>(userKey(codeData.userId));
        if (!user) return invalidCode();

        const consumed = await db.del(codeKey(normalizedCode));
        if (!consumed) return invalidCode();
        await db.del(codeAttemptsKey(normalizedCode));

        // Create new session for this device
        const newSessionToken = createSession(codeData.userId);

        response.success = true;
        response.data = {
          userId: codeData.userId,
          sessionToken: newSessionToken,
          user,
        };
        break;
      }

      default:
        response.error = 'Unknown action';
        return res.status(400).json(response);
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error('User API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      metadata: {
        timestamp: Date.now(),
        action: 'unknown',
      },
    });
  }
}
