/**
 * Vercel Serverless API for Usinterface UserResponse {
  success: boolean;
  data?: {
    userId?: string;
    sessionToken?: string;
    accountCode?: string;
    expiresIn?: number; // Added for account code expiration
    user?: any;
    linkedDevices?: number;
  };
  error?: string;
  metadata: {
    timestamp: number;
    action: string;
  };
}* 
 * Handles user authentication, profile management, and session handling
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

// Security constants (env-driven)
const MAX_CODE_ATTEMPTS = Number(process.env.ACCOUNT_CODE_MAX_ATTEMPTS || 5); // Max attempts per code
const MAX_RATE_LIMIT_ATTEMPTS = Number(process.env.RATE_LIMIT_MAX_ATTEMPTS || 10); // Max attempts per IP per window
const RATE_LIMIT_WINDOW = Number(process.env.RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000); // default 1 hour
const CODE_EXPIRY = Number(process.env.ACCOUNT_CODE_EXPIRY_MS || 60 * 60 * 1000); // default 1 hour

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

function createSession(userId: string): string {
  const ttlMs = Number(process.env.SESSION_TOKEN_TTL_MS || 24 * 60 * 60 * 1000);
  return createSessionToken(userId, ttlMs);
}

// Fixed-window rate limit: allows MAX_RATE_LIMIT_ATTEMPTS per window per identifier
async function isRateLimited(identifier: string): Promise<boolean> {
  const db = await getDb();
  const key = `${KEY_PREFIX}rl:${identifier}`;
  const attempts = await db.incr(key);
  if (attempts === 1) {
    await db.expire(key, Math.ceil(RATE_LIMIT_WINDOW / 1000));
  }
  return attempts > MAX_RATE_LIMIT_ATTEMPTS;
}

// Helper function to get client identifier (IP-based)
function getClientIdentifier(req: any): string {
  // In production, use proper IP detection with proxy headers
  return (
    req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS via environment configuration
  const corsOrigin = resolveCorsOrigin(req.headers['origin'] as string | undefined);
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

  try {
    const db = await getDb();
    const request: UserRequest = req.body;
    const response: UserResponse = {
      success: false,
      metadata: {
        timestamp: Date.now(),
        action: request.action,
      },
    };

    switch (request.action) {
      case 'create': {
        const userId = randomUUID();
        const user = {
          id: userId,
          username: request.userData?.username || `user_${userId.slice(0, 8)}`,
          email: request.userData?.email,
          preferences: request.userData?.preferences || {},
          createdAt: Date.now(),
          lastActive: Date.now(),
        };

        await db.set(userKey(userId), user);
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

        const user = await db.get<any>(userKey(userId));
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

        const user = await db.get<any>(userKey(userId));
        if (!user) {
          response.error = 'User not found';
          return res.status(404).json(response);
        }

        // Update user data
        const updatedUser = {
          ...user,
          ...request.userData,
          id: user.id,
          lastActive: Date.now(),
        };

        await db.set(userKey(userId), updatedUser);

        response.success = true;
        response.data = { user: updatedUser };
        break;
      }

      case 'authenticate': {
        if (!request.sessionToken) {
          response.error = 'sessionToken is required for authentication';
          return res.status(400).json(response);
        }

        const userId = validateSession(request.sessionToken);
        if (!userId) {
          response.error = 'Invalid or expired session';
          return res.status(401).json(response);
        }

        const user = await db.get<any>(userKey(userId));
        if (!user) {
          response.error = 'User not found';
          return res.status(404).json(response);
        }

        // Update last active
        user.lastActive = Date.now();
        await db.set(userKey(userId), user);

        response.success = true;
        response.data = {
          userId,
          user,
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

        // Invalidate any existing unused code for this user (security best practice)
        const previousCode = await db.get<string>(userCodeKey(userId));
        if (previousCode) {
          await db.del(codeKey(previousCode), codeAttemptsKey(previousCode));
        }

        const accountCode = generateAccountCode();
        const expirySeconds = Math.ceil(CODE_EXPIRY / 1000);
        await db.set(
          codeKey(accountCode),
          { userId, used: false, createdAt: Date.now() },
          { ex: expirySeconds }
        );
        await db.set(userCodeKey(userId), accountCode, { ex: expirySeconds });

        response.success = true;
        response.data = {
          accountCode,
          expiresIn: CODE_EXPIRY / 1000, // Return seconds for client
        } as any; // Type assertion for Vercel response compatibility
        break;
      }

      case 'linkDevice': {
        if (!request.accountCode) {
          response.error = 'accountCode is required to link device';
          return res.status(400).json(response);
        }

        // Normalize the code (uppercase, remove spaces)
        const normalizedCode = request.accountCode.toUpperCase().replace(/\s/g, '');

        // Check rate limiting for link attempts
        const clientId = getClientIdentifier(req);
        if (await isRateLimited(`link_${clientId}`)) {
          response.error = 'Too many linking attempts. Please try again later.';
          return res.status(429).json(response);
        }

        const codeData = await db.get<{ userId: string; used: boolean }>(codeKey(normalizedCode));
        if (!codeData) {
          // Unknown or expired (TTL elapsed)
          response.error = 'Invalid or expired account code';
          return res.status(400).json(response);
        }

        // Check code-specific attempt limit
        const codeAttempts = await db.incr(codeAttemptsKey(normalizedCode));
        if (codeAttempts === 1) {
          await db.expire(codeAttemptsKey(normalizedCode), Math.ceil(CODE_EXPIRY / 1000));
        }
        if (codeAttempts > MAX_CODE_ATTEMPTS) {
          await db.del(codeKey(normalizedCode), codeAttemptsKey(normalizedCode));
          response.error = 'Too many attempts for this code. Code has been invalidated.';
          return res.status(400).json(response);
        }

        if (codeData.used) {
          response.error = 'Account code has already been used';
          return res.status(400).json(response);
        }

        // Single use: consume the code now
        // DEL is atomic: only one concurrent request can consume the code
        const consumed = await db.del(codeKey(normalizedCode));
        if (!consumed) {
          response.error = 'Account code has already been used';
          return res.status(400).json(response);
        }
        await db.del(userCodeKey(codeData.userId), codeAttemptsKey(normalizedCode));

        const user = await db.get<any>(userKey(codeData.userId));
        if (!user) {
          response.error = 'Associated user not found';
          return res.status(404).json(response);
        }

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
        response.error = `Unknown action: ${request.action}`;
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
        action: req.body?.action || 'unknown',
      },
    });
  }
}
