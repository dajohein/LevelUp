/**
 * Local Development Server for Testing Server-Side Storage
 * 
 * This script runs a local Express server that mimics the Vercel serverless functions
 * for testing purposes during development
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001; // Use different port from Vite dev server

// Middleware
app.use(cors());
app.use(express.json());

// Simple in-memory storage for development testing
const storage = new Map();
const users = new Map();
const sessions = new Map();
const accountCodes = new Map(); // Enhanced: { userId, expires, used, attempts, createdAt }
const rateLimitMap = new Map(); // Rate limiting storage

// Security constants
const MAX_CODE_ATTEMPTS = 5;
const MAX_RATE_LIMIT_ATTEMPTS = 10;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const CODE_EXPIRY = 60 * 60 * 1000; // 1 hour (reduced from 24 hours)

// Helper functions (same as in the Vercel functions)
function getStorageKey(userId, languageCode, key) {
  return `user:${userId}:lang:${languageCode}:${key}`;
}

function isValidLanguageCode(lang) {
  return /^[a-z]{2}(-[A-Z]{2})?$/.test(lang);
}

function generateSessionToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function validateSession(token) {
  const session = sessions.get(token);
  if (!session || session.expires < Date.now()) {
    if (session) sessions.delete(token);
    return null;
  }
  return session.userId;
}

function createSession(userId) {
  const token = generateSessionToken();
  const expires = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
  sessions.set(token, { userId, expires });
  return token;
}

// Helper function to check rate limiting
function isRateLimited(identifier) {
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

// Helper function to get client identifier
function getClientIdentifier(req) {
  return req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         'localhost';
}

// Helper function to generate cryptographically secure account code
function generateAccountCode() {
  const crypto = require('crypto');
  
  // Generate 6 random bytes and encode as base32-like string
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

// Storage API endpoint
app.post('/api/storage', (req, res) => {
  try {
    const request = req.body;
    
    if (!request.userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    if (request.languageCode && !isValidLanguageCode(request.languageCode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid language code format'
      });
    }

    const response = {
      success: false,
      metadata: {
        timestamp: Date.now(),
        tier: 'remote'
      }
    };

    switch (request.action) {
      case 'get': {
        if (!request.key || !request.languageCode) {
          response.error = 'key and languageCode are required for get operations';
          return res.status(400).json(response);
        }

        const storageKey = getStorageKey(request.userId, request.languageCode, request.key);
        const stored = storage.get(storageKey);
        
        if (stored) {
          response.success = true;
          response.data = stored.data;
          response.metadata = {
            ...response.metadata,
            size: JSON.stringify(stored.data).length,
            compressed: stored.compressed,
            languageCode: request.languageCode
          };
        } else {
          response.error = 'Data not found';
          return res.status(404).json(response);
        }
        break;
      }

      case 'set': {
        if (!request.key || !request.languageCode || request.data === undefined) {
          response.error = 'key, languageCode, and data are required for set operations';
          return res.status(400).json(response);
        }

        const storageKey = getStorageKey(request.userId, request.languageCode, request.key);
        const compress = request.options?.compress || false;
        
        const storedItem = {
          data: request.data,
          compressed: compress,
          timestamp: Date.now(),
          ttl: request.options?.ttl,
          languageCode: request.languageCode
        };

        storage.set(storageKey, storedItem);
        
        response.success = true;
        response.metadata = {
          ...response.metadata,
          size: JSON.stringify(request.data).length,
          compressed: compress,
          languageCode: request.languageCode
        };
        break;
      }

      case 'delete': {
        if (!request.key || !request.languageCode) {
          response.error = 'key and languageCode are required for delete operations';
          return res.status(400).json(response);
        }

        const storageKey = getStorageKey(request.userId, request.languageCode, request.key);
        const existed = storage.has(storageKey);
        storage.delete(storageKey);
        
        response.success = true;
        response.data = { deleted: existed };
        response.metadata = {
          ...response.metadata,
          languageCode: request.languageCode
        };
        break;
      }

      case 'list': {
        if (!request.languageCode) {
          response.error = 'languageCode is required for list operations';
          return res.status(400).json(response);
        }

        const prefix = `user:${request.userId}:lang:${request.languageCode}:`;
        const keys = [];
        
        for (const [key] of storage) {
          if (key.startsWith(prefix)) {
            keys.push(key.substring(prefix.length));
          }
        }
        
        response.success = true;
        response.data = keys;
        response.metadata = {
          ...response.metadata,
          size: keys.length,
          languageCode: request.languageCode
        };
        break;
      }

      default:
        response.error = `Unknown action: ${request.action}`;
        return res.status(400).json(response);
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('Storage API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      metadata: {
        timestamp: Date.now(),
        tier: 'remote'
      }
    });
  }
});

// Users API endpoint
app.post('/api/users', (req, res) => {
  try {
    const request = req.body;
    const response = {
      success: false,
      metadata: {
        timestamp: Date.now(),
        action: request.action
      }
    };

    switch (request.action) {
      case 'create': {
        const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2);
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
        
        if (request.sessionToken && !userId) {
          userId = validateSession(request.sessionToken);
          if (!userId) {
            response.error = 'Invalid or expired session';
            return res.status(401).json(response);
          }
        }

        const user = users.get(userId);
        if (!user) {
          response.error = 'User not found';
          return res.status(404).json(response);
        }

        response.success = true;
        response.data = { user };
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

        // Invalidate any existing unused codes for this user
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
          expiresIn: CODE_EXPIRY / 1000
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
        
        // Clean up the code after successful use
        setTimeout(() => {
          accountCodes.delete(normalizedCode);
        }, 5000); // 5 second grace period

        // Create new session for the linked device
        const newSessionToken = createSession(codeData.userId);
        const user = users.get(codeData.userId);

        if (!user) {
          response.error = 'Original user not found';
          return res.status(404).json(response);
        }

        // For development, simulate linked devices count
        const linkedDevices = 2; // Current device + original device

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
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    storage: {
      entries: storage.size,
      users: users.size,
      sessions: sessions.size
    }
  });
});

// Status endpoint for debugging
app.get('/api/status', (req, res) => {
  const storageEntries = Array.from(storage.entries()).map(([key, value]) => ({
    key,
    size: JSON.stringify(value.data).length,
    timestamp: value.timestamp,
    languageCode: value.languageCode
  }));

  res.json({
    storage: storageEntries,
    users: Array.from(users.values()),
    activeSessions: sessions.size
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Local development storage server running on http://localhost:${PORT}`);
  console.log(`📊 Status endpoint: http://localhost:${PORT}/api/status`);
  console.log(`💚 Health check: http://localhost:${PORT}/api/health`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  POST /api/storage - Storage operations');
  console.log('  POST /api/users - User management');
  console.log('  GET /api/health - Health check');
  console.log('  GET /api/status - Debug status');
});