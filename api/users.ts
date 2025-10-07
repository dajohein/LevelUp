/**
 * Vercel Serverless API for User Management
 * 
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
  action: 'create' | 'get' | 'update' | 'authenticate';
  userId?: string;
  sessionToken?: string;
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
    user?: any;
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