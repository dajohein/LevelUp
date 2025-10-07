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