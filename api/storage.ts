/**
 * Vercel Serverless API for User Data Storage
 * 
 * Provides secure, scalable storage for user progress with language isolation
 * Compatible with existing enhanced storage architecture
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

// Types for API requests/responses
interface StorageRequest {
  action: 'get' | 'set' | 'delete' | 'list';
  userId: string;
  languageCode?: string;
  key?: string;
  data?: any;
  options?: {
    compress?: boolean;
    ttl?: number;
  };
}

interface StorageResponse {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    size?: number;
    compressed?: boolean;
    timestamp?: number;
    languageCode?: string;
    tier: 'remote';
  };
}

// Simple in-memory storage for development/testing
// In production, this would be replaced with a proper database
const storage = new Map<string, any>();

// Helper function to generate storage key with language isolation
function getStorageKey(userId: string, languageCode: string, key: string): string {
  return `user:${userId}:lang:${languageCode}:${key}`;
}

// Helper function to validate language code
function isValidLanguageCode(lang: string): boolean {
  return /^[a-z]{2}(-[A-Z]{2})?$/.test(lang);
}

// Helper function to compress data (basic implementation)
function compressData(data: any): string {
  return JSON.stringify(data);
}

// Helper function to decompress data
function decompressData(data: string): any {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS configuration via environment (Twelve-Factor)
  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '*').split(',');
  const origin = (req.headers['origin'] as string) || '*';
  const corsOrigin = allowedOrigins.includes('*') || allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || '*';
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
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
    const request: StorageRequest = req.body;
    const defaultCompress = (process.env.STORAGE_COMPRESS_DEFAULT === 'true');
    
    // Validate required fields
    if (!request.userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    // Validate language code if provided
    if (request.languageCode && !isValidLanguageCode(request.languageCode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid language code format'
      });
    }

    const response: StorageResponse = {
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
          response.data = request.options?.compress ? decompressData(stored.data) : stored.data;
          response.metadata = {
            timestamp: Date.now(),
            tier: 'remote' as const,
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
        const compress = request.options?.compress ?? defaultCompress;
        const dataToStore = compress ? compressData(request.data) : request.data;
        
        const storedItem = {
          data: dataToStore,
          compressed: compress,
          timestamp: Date.now(),
          ttl: request.options?.ttl,
          languageCode: request.languageCode
        };

        storage.set(storageKey, storedItem);
        
        response.success = true;
        response.metadata = {
          timestamp: Date.now(),
          tier: 'remote' as const,
          size: JSON.stringify(dataToStore).length,
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
          timestamp: Date.now(),
          tier: 'remote' as const,
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
        const keys: string[] = [];
        
        for (const [key] of storage) {
          if (key.startsWith(prefix)) {
            keys.push(key.substring(prefix.length));
          }
        }
        
        response.success = true;
        response.data = keys;
        response.metadata = {
          timestamp: Date.now(),
          tier: 'remote' as const,
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
}