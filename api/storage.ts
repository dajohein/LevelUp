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

import { verifySessionToken, resolveCorsOrigin } from './_auth.js';
import { getDb, KEY_PREFIX } from './_db.js';

// Types for API requests/responses
interface StorageRequest {
  action: 'get' | 'set' | 'delete' | 'list';
  userId: string;
  sessionToken?: string;
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

// Input limits: keys become Redis hash fields and values are stored per user, so bound both.
const MAX_KEY_LENGTH = 128;
const MAX_VALUE_BYTES = 1024 * 1024;

// Redis layout (see _db.ts):
//   levelup:data:<userId>:<lang>  -> hash, field = storage key, value = stored item
// One hash per user+language means set/delete/list are each a single atomic command,
// so there is no separate index that can drift out of sync with the data.
// Per-key TTL is stored as `expiresAt` on the item and enforced on read/list; expired
// items are simply ignored (and overwritten by the next set) rather than deleted, which
// would race with a concurrent set.
function bucketKey(userId: string, languageCode: string): string {
  return `${KEY_PREFIX}data:${userId}:${languageCode}`;
}

interface StoredItem {
  data: any;
  compressed: boolean;
  timestamp: number;
  ttl?: number;
  expiresAt?: number;
  languageCode: string;
}

function isLive(item: StoredItem | null | undefined, now = Date.now()): item is StoredItem {
  return !!item && (item.expiresAt === undefined || item.expiresAt > now);
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

  try {
    const request: StorageRequest = req.body;
    const defaultCompress = process.env.STORAGE_COMPRESS_DEFAULT === 'true';

    // Validate required fields
    if (!request.userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      });
    }

    // Authenticate: the session token must be valid and belong to the requested userId
    const authedUserId = verifySessionToken(request.sessionToken);
    if (!authedUserId || authedUserId !== request.userId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or missing session token',
      });
    }

    // Validate key and payload shape (keys become Redis hash fields, so bound them)
    if (
      request.key !== undefined &&
      (typeof request.key !== 'string' ||
        request.key.length === 0 ||
        request.key.length > MAX_KEY_LENGTH)
    ) {
      return res.status(400).json({
        success: false,
        error: `key must be a string of 1-${MAX_KEY_LENGTH} characters`,
      });
    }
    const ttlOption = request.options?.ttl;
    if (
      ttlOption !== undefined &&
      (typeof ttlOption !== 'number' || !Number.isFinite(ttlOption) || ttlOption <= 0)
    ) {
      return res
        .status(400)
        .json({ success: false, error: 'options.ttl must be a positive number' });
    }

    // Validate language code if provided
    if (request.languageCode && !isValidLanguageCode(request.languageCode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid language code format',
      });
    }

    const db = await getDb();
    const response: StorageResponse = {
      success: false,
      metadata: {
        timestamp: Date.now(),
        tier: 'remote',
      },
    };

    switch (request.action) {
      case 'get': {
        if (!request.key || !request.languageCode) {
          response.error = 'key and languageCode are required for get operations';
          return res.status(400).json(response);
        }

        const candidate = await db.hget<StoredItem>(
          bucketKey(request.userId, request.languageCode),
          request.key
        );
        const stored = isLive(candidate) ? candidate : null;

        if (stored) {
          response.success = true;
          response.data = stored.compressed ? decompressData(stored.data) : stored.data;
          response.metadata = {
            timestamp: Date.now(),
            tier: 'remote' as const,
            size: JSON.stringify(stored.data).length,
            compressed: stored.compressed,
            languageCode: request.languageCode,
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

        const compress = request.options?.compress ?? defaultCompress;
        const dataToStore = compress ? compressData(request.data) : request.data;
        if (JSON.stringify(dataToStore).length > MAX_VALUE_BYTES) {
          response.error = `data is too large (limit ${MAX_VALUE_BYTES} bytes)`;
          return res.status(413).json(response);
        }

        const now = Date.now();
        const ttl = request.options?.ttl;
        const storedItem: StoredItem = {
          data: dataToStore,
          compressed: compress,
          timestamp: now,
          ttl,
          expiresAt: ttl && ttl > 0 ? now + ttl : undefined,
          languageCode: request.languageCode,
        };

        await db.hset(bucketKey(request.userId, request.languageCode), {
          [request.key]: storedItem,
        });

        response.success = true;
        response.metadata = {
          timestamp: Date.now(),
          tier: 'remote' as const,
          size: JSON.stringify(dataToStore).length,
          compressed: compress,
          languageCode: request.languageCode,
        };
        break;
      }

      case 'delete': {
        if (!request.key || !request.languageCode) {
          response.error = 'key and languageCode are required for delete operations';
          return res.status(400).json(response);
        }

        const existed =
          (await db.hdel(bucketKey(request.userId, request.languageCode), request.key)) > 0;

        response.success = true;
        response.data = { deleted: existed };
        response.metadata = {
          timestamp: Date.now(),
          tier: 'remote' as const,
          languageCode: request.languageCode,
        };
        break;
      }

      case 'list': {
        if (!request.languageCode) {
          response.error = 'languageCode is required for list operations';
          return res.status(400).json(response);
        }

        const items =
          (await db.hgetall<Record<string, StoredItem>>(
            bucketKey(request.userId, request.languageCode)
          )) ?? {};
        const now = Date.now();
        const keys = Object.entries(items)
          .filter(([, item]) => isLive(item, now))
          .map(([key]) => key);

        response.success = true;
        response.data = keys;
        response.metadata = {
          timestamp: Date.now(),
          tier: 'remote' as const,
          size: keys.length,
          languageCode: request.languageCode,
        };
        break;
      }

      default:
        response.error = 'Unknown action';
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
        tier: 'remote',
      },
    });
  }
}
