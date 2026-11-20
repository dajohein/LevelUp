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
import {
  createSessionToken,
  readSessionToken,
  isSessionActive,
  readSessionVersion,
  resolveCorsOrigin,
} from './_auth.js';
import { clientAddress, envPositiveInt } from './_config.js';

interface UserRequest {
  action:
    | 'create'
    | 'get'
    | 'update'
    | 'authenticate'
    | 'generateCode'
    | 'linkDevice'
    | 'revokeSessions'
    | 'signOutEverywhere';
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

export type UserProfile = {
  id: string;
  username: string;
  email?: string;
  preferences: unknown;
  createdAt: number;
  lastActive: number;
  sessionVersion?: number;
};

interface UserResponse {
  success: boolean;
  data?: {
    userId?: string;
    sessionToken?: string;
    accountCode?: string;
    user?: any;
    linkedDevices?: number;
    sessionVersion?: number;
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
//   levelup:rl:<bucket>:<n>     -> fixed-window rate-limit counter (TTL)
//   levelup:fail:<scope>:<n>    -> fixed-window count of FAILED link redemptions (TTL); a
//                                  success hands its own attempt back (DECR) and never resets it
const userKey = (id: string) => `${KEY_PREFIX}user:${id}`;
const codeKey = (code: string) => `${KEY_PREFIX}code:${code}`;
const userCodeKey = (id: string) => `${KEY_PREFIX}usercode:${id}`;

// Security limits (env-driven). A malformed value falls back to the default and is logged
// (see envPositiveInt); it never disables a limit.
const MAX_REVOKES_PER_WINDOW = () => envPositiveInt('REVOKE_MAX_PER_WINDOW', 5); // per account
const MAX_CODE_ATTEMPTS = () => envPositiveInt('ACCOUNT_CODE_MAX_ATTEMPTS', 5); // per code
const MAX_USER_LINK_ATTEMPTS = () => envPositiveInt('ACCOUNT_LINK_MAX_ATTEMPTS_PER_USER', 10); // failed redemptions per account and window
const MAX_IP_LINK_FAILURES = () => envPositiveInt('ACCOUNT_LINK_MAX_FAILED_PER_IP', 10); // failed redemptions per client address and window
const MAX_GLOBAL_LINK_FAILURES = () => envPositiveInt('ACCOUNT_LINK_MAX_FAILED_GLOBAL', 1000); // failed redemptions for everyone per window
const MAX_RATE_LIMIT_ATTEMPTS = () => envPositiveInt('RATE_LIMIT_MAX_ATTEMPTS', 10); // per client per window
const MAX_USER_GENERATE_ATTEMPTS = () => envPositiveInt('ACCOUNT_CODE_GENERATE_MAX_PER_USER', 10); // per account code generations
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
  'revokeSessions',
  'signOutEverywhere',
];
const MAX_USERNAME_LENGTH = 64;
const MAX_EMAIL_LENGTH = 254;
const MAX_PREFERENCES_BYTES = 16 * 1024;
const ACCOUNT_CODE_LENGTH = 10;
const ACCOUNT_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
// Codes are 10 characters. 8-character codes (issued before the length change) stay redeemable
// until their TTL (default 1 hour) has passed after the deploy: a one-time compatibility window.
// Remove the `{8}` branch once ACCOUNT_CODE_EXPIRY_MS has elapsed since the release.
const ACCOUNT_CODE_PATTERN = /^(?:[2-9A-HJ-NP-Z]{10}|[2-9A-HJ-NP-Z]{8})$/;

// Helper function to generate cryptographically secure account code
function generateAccountCode(): string {
  // Use crypto.randomBytes for cryptographically secure randomness
  // Generate 8 random bytes (64 bits) to encode 10 characters from a 32-character alphabet (50 bits)
  const bytes = randomBytes(8);
  const alphabet = ACCOUNT_CODE_ALPHABET;
  let result = '';
  let value = 0;
  let bits = 0;

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      result += alphabet[(value >> (bits - 5)) & 31];
      bits -= 5;
      if (result.length === ACCOUNT_CODE_LENGTH) {
        return result;
      }
    }
  }

  return result.substring(0, ACCOUNT_CODE_LENGTH);
}

/**
 * How long after expiry a signed token can still be exchanged for a new one (default 30 days).
 * Capped, so a mistyped value cannot turn the refresh into an open-ended window.
 */
const MAX_REFRESH_GRACE_MS = 90 * 24 * 60 * 60 * 1000;
const refreshGraceMs = () =>
  Math.min(
    envPositiveInt('SESSION_REFRESH_GRACE_MS', 30 * 24 * 60 * 60 * 1000),
    MAX_REFRESH_GRACE_MS
  );

const sessionTtlMs = () => envPositiveInt('SESSION_TOKEN_TTL_MS', 24 * 60 * 60 * 1000);

function createSession(userId: string, sessionVersion = 1): string {
  return createSessionToken(userId, sessionTtlMs(), undefined, undefined, sessionVersion);
}

// Fixed-window rate limit: allows `max` attempts per window per identifier.
// The window number is part of the key and EXPIRE is always (re)applied, so a request that
// dies between INCR and EXPIRE can only leave a harmless stale bucket behind. The client
// is never locked out beyond the current window.
const windowKey = (prefix: string, identifier: string, windowMs: number) =>
  `${KEY_PREFIX}${prefix}:${identifier}:${Math.floor(Date.now() / windowMs)}`;

async function isRateLimited(
  identifier: string,
  max = MAX_RATE_LIMIT_ATTEMPTS()
): Promise<boolean> {
  const db = await getDb();
  const window = RATE_LIMIT_WINDOW();
  const key = windowKey('rl', identifier, window);
  const attempts = await db.incr(key);
  await db.expire(key, Math.ceil((window * 2) / 1000));
  return attempts > max;
}

/**
 * Counts one link redemption in a fixed window BEFORE it is evaluated (INCR is atomic, so a burst
 * of parallel guesses cannot all slip under the limit). `undo()` hands the attempt back when the
 * redemption succeeds, so only FAILED redemptions stay counted and a success never resets what
 * others (or earlier failures) have accumulated. The window is fixed: EXPIRE does not slide it.
 */
async function startLinkAttempt(scope: string, windowMs = RATE_LIMIT_WINDOW()) {
  const db = await getDb();
  const key = windowKey('fail', scope, windowMs);
  const count = await db.incr(key);
  await db.expire(key, Math.ceil((windowMs * 2) / 1000));
  return { count, undo: () => db.decr(key) };
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
          sessionVersion: 1,
        };
        if (request.userData?.email !== undefined) user.email = request.userData.email;

        await db.hset(userKey(userId), user);
        const sessionToken = createSession(userId, 1);

        response.success = true;
        response.data = {
          userId,
          sessionToken,
          user,
        };
        break;
      }

      case 'get': {
        const claims = readSessionToken(request.sessionToken);
        if (!claims) {
          response.error = 'Valid sessionToken is required';
          return res.status(401).json(response);
        }

        const user = await db.hgetall<UserProfile>(userKey(claims.userId));
        if (!user) {
          response.error = 'User not found';
          return res.status(404).json(response);
        }

        if (!isSessionActive(claims, user)) {
          response.error = 'Invalid or expired session';
          return res.status(401).json(response);
        }

        response.success = true;
        response.data = { user };
        break;
      }

      case 'update': {
        const claims = readSessionToken(request.sessionToken);
        if (!claims) {
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
        const user = await db.hgetall<UserProfile>(userKey(claims.userId));
        if (!user) {
          response.error = 'User not found';
          return res.status(404).json(response);
        }
        if (!isSessionActive(claims, user)) {
          response.error = 'Invalid or expired session';
          return res.status(401).json(response);
        }

        // Write only the fields being changed (HSET is per-field), so concurrent updates
        // and `authenticate` heartbeats never overwrite each other with a stale snapshot.
        // `id` and `createdAt` are never client-writable.
        const changes: Record<string, unknown> = { lastActive: Date.now() };
        for (const field of ['username', 'email', 'preferences'] as const) {
          if (request.userData?.[field] !== undefined) changes[field] = request.userData[field];
        }
        await db.hset(userKey(claims.userId), changes);
        const updatedUser = await db.hgetall<UserProfile>(userKey(claims.userId));

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
        const now = Date.now();
        const claims = readSessionToken(request.sessionToken, now, refreshGraceMs());
        const user = claims ? await db.hgetall<UserProfile>(userKey(claims.userId)) : null;
        // A missing user gets the same answer as a bad token: this must not reveal which user ids exist
        if (!claims || !user || !isSessionActive(claims, user)) {
          response.error = 'Invalid or expired session';
          return res.status(401).json(response);
        }
        const userId = claims.userId;

        // Touch only lastActive (single-field write; see `update`)
        await db.hset(userKey(userId), { lastActive: Date.now() });
        const updatedUser = await db.hgetall<UserProfile>(userKey(userId));
        // isSessionActive passed above, so the version is readable
        const activeVersion = readSessionVersion(user) ?? 1;

        response.success = true;
        response.data = {
          userId,
          user: updatedUser,
          // A fresh token keeps an active session alive, but it inherits the absolute end of the
          // session, so refreshing can never extend it past that. A token issued before sessions
          // had an absolute age gets one (grandfathered) full window.
          sessionToken: createSessionToken(
            userId,
            sessionTtlMs(),
            now,
            claims.absoluteExpiry ?? undefined,
            activeVersion
          ),
        };
        break;
      }

      case 'generateCode': {
        if (!request.sessionToken) {
          response.error = 'sessionToken is required to generate account code';
          return res.status(400).json(response);
        }

        const claims = readSessionToken(request.sessionToken);
        if (!claims) {
          response.error = 'Invalid or expired session';
          return res.status(401).json(response);
        }

        const user = await db.hgetall<UserProfile>(userKey(claims.userId));
        if (!user || !isSessionActive(claims, user)) {
          response.error = 'Invalid or expired session';
          return res.status(401).json(response);
        }
        const userId = claims.userId;

        // Check rate limiting for code generation (per client IP and per user account)
        const clientId = getClientIdentifier(req);
        // A request refused by one limit must not use up the other, so an account hitting its own
        // limit does not also burn the shared client-address budget (and the reverse).
        const userLimited = await isRateLimited(`gen_user_${userId}`, MAX_USER_GENERATE_ATTEMPTS());
        if (userLimited) {
          response.error = 'Too many code generation attempts. Please try again later.';
          return res.status(429).json(response);
        }
        if (await isRateLimited(`generate_${clientId}`)) {
          await db.decr(windowKey('rl', `gen_user_${userId}`, RATE_LIMIT_WINDOW()));
          response.error = 'Too many code generation attempts. Please try again later.';
          return res.status(429).json(response);
        }

        const expirySeconds = Math.ceil(CODE_EXPIRY() / 1000);
        const previousCode = await db.get<string>(userCodeKey(userId));

        // NX: never overwrite a live code that belongs to someone else (a 50-bit collision is
        // practically impossible, but a plain SET would silently hand the other user's code to this one)
        let accountCode = '';
        for (let attempt = 0; attempt < 5 && !accountCode; attempt++) {
          const candidate = generateAccountCode();
          const stored = await db.set(
            codeKey(candidate),
            { userId, createdAt: Date.now(), sessionVersion: readSessionVersion(user) ?? 1 },
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
          await db.del(codeKey(previousCode));
        }

        response.success = true;
        response.data = {
          accountCode,
          expiresIn: CODE_EXPIRY() / 1000, // Return seconds for client
        } as any; // Type assertion for Vercel response compatibility
        break;
      }

      case 'linkDevice': {
        // Only FAILED redemptions count. Every request takes one attempt up front from a
        // per-client-address and a global budget (the guesses at unknown codes, which never reach
        // an account, are what these see); a success gives its attempt back at the end.
        const clientId = getClientIdentifier(req);
        const ipAttempt = await startLinkAttempt(`ip_${clientId}`);
        const globalAttempt = await startLinkAttempt('global');
        if (
          ipAttempt.count > MAX_IP_LINK_FAILURES() ||
          globalAttempt.count > MAX_GLOBAL_LINK_FAILURES()
        ) {
          response.error = 'Too many linking attempts. Please try again later.';
          return res.status(429).json(response);
        }
        const giveBack: Array<() => Promise<unknown>> = [ipAttempt.undo, globalAttempt.undo];

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

        const codeData = await db.get<{ userId: string; sessionVersion?: number }>(
          codeKey(normalizedCode)
        );
        if (!codeData) return invalidCode(); // unknown or expired (TTL elapsed)

        // A live code: count this attempt against the code and its account (fixed windows,
        // independent of the client address) and lock the code once either budget is spent.
        const codeAttempt = await startLinkAttempt(`code_${normalizedCode}`, CODE_EXPIRY());
        const userAttempt = await startLinkAttempt(`user_${codeData.userId}`);
        giveBack.push(codeAttempt.undo, userAttempt.undo);
        if (
          codeAttempt.count > MAX_CODE_ATTEMPTS() ||
          userAttempt.count > MAX_USER_LINK_ATTEMPTS()
        ) {
          await db.del(codeKey(normalizedCode), userCodeKey(codeData.userId));
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

        // A code is bound to the session version it was minted at (a code without the field was
        // minted at version 1). If the account was signed out everywhere since, or the version is
        // unreadable, the code is dead: this also closes the race where a generateCode that read
        // the profile before a revoke stores its code after it.
        const activeVersion = readSessionVersion(user);
        if (activeVersion === null || (codeData.sessionVersion ?? 1) !== activeVersion) {
          return invalidCode();
        }

        const consumed = await db.del(codeKey(normalizedCode));
        if (!consumed) return invalidCode();
        // A success is not a failure: hand every attempt back (nothing is reset, so failures
        // accumulated earlier in the window stay counted)
        await Promise.all(giveBack.map(undo => undo()));

        // Create new session for this device with the user's active session version
        const newSessionToken = createSession(codeData.userId, activeVersion);

        response.success = true;
        response.data = {
          userId: codeData.userId,
          sessionToken: newSessionToken,
          user,
        };
        break;
      }

      case 'signOutEverywhere':
      case 'revokeSessions': {
        if (!request.sessionToken) {
          response.error = 'sessionToken is required to revoke sessions';
          return res.status(400).json(response);
        }

        const claims = readSessionToken(request.sessionToken);
        if (!claims) {
          response.error = 'Invalid or expired session';
          return res.status(401).json(response);
        }

        const user = await db.hgetall<UserProfile>(userKey(claims.userId));
        if (!user || !isSessionActive(claims, user)) {
          response.error = 'Invalid or expired session';
          return res.status(401).json(response);
        }
        const userId = claims.userId;

        // Too many sign-outs per account and hour: a stolen token must not be able to loop this
        if (await isRateLimited(`revoke_${userId}`, MAX_REVOKES_PER_WINDOW())) {
          response.error = 'Too many sign-out requests. Please try again later.';
          return res.status(429).json(response);
        }

        // HINCRBY is atomic, so concurrent revokes can never lose a bump. A profile without the
        // field is version 1 and HINCRBY would start it at 0 -> 1 (no change): bump once more.
        let nextVersion = await db.hincrby(userKey(userId), 'sessionVersion', 1);
        if (nextVersion <= 1) {
          nextVersion = await db.hincrby(userKey(userId), 'sessionVersion', 1);
        }
        await db.hset(userKey(userId), { lastActive: Date.now() });

        // Invalidate any pending unused link code for this user, and clear the per-account
        // generation and failed-link counters so the user can start over right away (the revoke
        // itself is rate limited above, so this cannot be used to reset them in a loop)
        const previousCode = await db.get<string>(userCodeKey(userId));
        if (previousCode) {
          await db.del(
            userCodeKey(userId),
            codeKey(previousCode),
            windowKey('fail', `code_${previousCode}`, CODE_EXPIRY())
          );
        }
        await db.del(
          windowKey('rl', `gen_user_${userId}`, RATE_LIMIT_WINDOW()),
          windowKey('fail', `user_${userId}`, RATE_LIMIT_WINDOW())
        );

        response.success = true;
        // The caller signs out the OTHER sessions: it gets a token at the new version (same absolute
        // session end), so the account stays reachable and its remote data is never orphaned.
        response.data = {
          userId,
          sessionVersion: nextVersion,
          sessionToken: createSessionToken(
            userId,
            sessionTtlMs(),
            undefined,
            claims.absoluteExpiry ?? undefined,
            nextVersion
          ),
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
