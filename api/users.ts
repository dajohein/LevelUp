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
import { randomUUID } from 'crypto';

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

// Simple in-memory storage for development
// In production, replace with proper database
const users = new Map<string, any>();
const sessions = new Map<string, { userId: string; expires: number }>();
const accountCodes = new Map<string, { 
  userId: string; 
  expires: number; 
  used: boolean;
  attempts: number;
  createdAt: number;
}>();
const rateLimitMap = new Map<string, { attempts: number; lastAttempt: number }>();

// Security constants
const MAX_CODE_ATTEMPTS = 5; // Max attempts per code
const MAX_RATE_LIMIT_ATTEMPTS = 10; // Max attempts per IP per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const CODE_EXPIRY = 60 * 60 * 1000; // 1 hour (reduced from 24 hours)

// Helper function to generate cryptographically secure account code
function generateAccountCode(): string {
  // Use crypto.randomBytes for cryptographically secure randomness
  const crypto = require('crypto');
  
  // Generate 6 random bytes and encode as base32-like string
  // This gives us 8 characters from a 32-character alphabet
  const bytes = crypto.randomBytes(6);
  
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

// Helper function to generate session token
function generateSessionToken(): string {
  return randomUUID();
}

// Helper function to validate session
function validateSession(token: string): string | null {
  const session = sessions.get(token);
  if (!session || session.expires < Date.now()) {
    if (session) sessions.delete(token);
    return null;
  }
  return session.userId;
}

// Helper function to create session
function createSession(userId: string): string {
  const token = generateSessionToken();
  const expires = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
  sessions.set(token, { userId, expires });
  return token;
}

// Helper function to check rate limiting
function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const rateLimit = rateLimitMap.get(identifier);
  
  if (!rateLimit) {
    rateLimitMap.set(identifier, { attempts: 1, lastAttempt: now });
    return false;
  }
  
  // Reset counter if window expired
  if (now - rateLimit.lastAttempt > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(identifier, { attempts: 1, lastAttempt: now });
    return false;
  }
  
  // Check if over limit
  if (rateLimit.attempts >= MAX_RATE_LIMIT_ATTEMPTS) {
    return true;
  }
  
  // Increment counter
  rateLimit.attempts++;
  rateLimit.lastAttempt = now;
  rateLimitMap.set(identifier, rateLimit);
  
  return false;
}

// Helper function to get client identifier (IP-based)
function getClientIdentifier(req: any): string {
  // In production, use proper IP detection with proxy headers
  return req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         'unknown';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
  }

  try {
    const request: UserRequest = req.body;
    const response: UserResponse = {
      success: false,
      metadata: {
        timestamp: Date.now(),
        action: request.action
      }
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
          lastActive: Date.now()
        };

        users.set(userId, user);
        const sessionToken = createSession(userId);

        response.success = true;
        response.data = {
          userId,
          sessionToken,
          user
        };
        break;
      }

      case 'get': {
        if (!request.userId && !request.sessionToken) {
          response.error = 'userId or sessionToken is required';
          return res.status(400).json(response);
        }

        let userId = request.userId;
        
        // If session token provided, validate and get userId
        if (request.sessionToken && !userId) {
          const validatedUserId = validateSession(request.sessionToken);
          if (!validatedUserId) {
            response.error = 'Invalid or expired session';
            return res.status(401).json(response);
          }
          userId = validatedUserId;
        }

        const user = users.get(userId!);
        if (!user) {
          response.error = 'User not found';
          return res.status(404).json(response);
        }

        response.success = true;
        response.data = { user };
        break;
      }

      case 'update': {
        if (!request.userId && !request.sessionToken) {
          response.error = 'userId or sessionToken is required';
          return res.status(400).json(response);
        }

        let userId = request.userId;
        
        if (request.sessionToken && !userId) {
          const validatedUserId = validateSession(request.sessionToken);
          if (!validatedUserId) {
            response.error = 'Invalid or expired session';
            return res.status(401).json(response);
          }
          userId = validatedUserId;
        }

        const user = users.get(userId!);
        if (!user) {
          response.error = 'User not found';
          return res.status(404).json(response);
        }

        // Update user data
        const updatedUser = {
          ...user,
          ...request.userData,
          lastActive: Date.now()
        };

        users.set(userId!, updatedUser);

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

        const user = users.get(userId);
        if (!user) {
          response.error = 'User not found';
          return res.status(404).json(response);
        }

        // Update last active
        user.lastActive = Date.now();
        users.set(userId, user);

        response.success = true;
        response.data = {
          userId,
          user
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
        if (isRateLimited(`generate_${clientId}`)) {
          response.error = 'Too many code generation attempts. Please try again later.';
          return res.status(429).json(response);
        }

        // Invalidate any existing unused codes for this user (security best practice)
        for (const [code, data] of accountCodes.entries()) {
          if (data.userId === userId && !data.used) {
            accountCodes.delete(code);
          }
        }

        // Generate cryptographically secure account code
        const accountCode = generateAccountCode();
        const expires = Date.now() + CODE_EXPIRY; // 1 hour
        
        accountCodes.set(accountCode, { 
          userId, 
          expires, 
          used: false,
          attempts: 0,
          createdAt: Date.now()
        });

        response.success = true;
        response.data = { 
          accountCode,
          expiresIn: CODE_EXPIRY / 1000 // Return seconds for client
        };
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
        if (isRateLimited(`link_${clientId}`)) {
          response.error = 'Too many linking attempts. Please try again later.';
          return res.status(429).json(response);
        }

        const codeData = accountCodes.get(normalizedCode);
        if (!codeData) {
          response.error = 'Invalid account code';
          return res.status(400).json(response);
        }

        // Check code-specific attempt limit
        codeData.attempts = (codeData.attempts || 0) + 1;
        if (codeData.attempts > MAX_CODE_ATTEMPTS) {
          accountCodes.delete(normalizedCode);
          response.error = 'Too many attempts for this code. Code has been invalidated.';
          return res.status(400).json(response);
        }

        if (codeData.expires < Date.now()) {
          accountCodes.delete(normalizedCode);
          response.error = 'Account code has expired';
          return res.status(400).json(response);
        }

        if (codeData.used) {
          response.error = 'Account code has already been used';
          return res.status(400).json(response);
        }

        // Mark code as used and update attempts
        codeData.used = true;
        accountCodes.set(normalizedCode, codeData);
        
        // Clean up the code after successful use (single-use only)
        setTimeout(() => {
          accountCodes.delete(normalizedCode);
        }, 5000); // 5 second grace period for response

        // Get the user associated with the code
        const user = users.get(codeData.userId);
        if (!user) {
          response.error = 'Associated user not found';
          return res.status(404).json(response);
        }

        // Create new session for this device
        const newSessionToken = createSession(codeData.userId);

        // Count linked devices (sessions)
        let linkedDevices = 0;
        for (const [_, sessionData] of sessions) {
          if (sessionData.userId === codeData.userId && sessionData.expires > Date.now()) {
            linkedDevices++;
          }
        }

        response.success = true;
        response.data = {
          userId: codeData.userId,
          sessionToken: newSessionToken,
          user,
          linkedDevices
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
        action: req.body?.action || 'unknown'
      }
    });
  }
}