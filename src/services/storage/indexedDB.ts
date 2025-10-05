/**
 * IndexedDB wrapper for enhanced storage system
 * Provides a simple interface for IndexedDB operations
 */

export interface IndexedDBOptions {
  dbName: string;
  version: number;
  storeName: string;
}

export interface IndexedDBResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class IndexedDBWrapper {
  private dbName: string;
  private version: number;
  private storeName: string;
  private db: IDBDatabase | null = null;

  constructor(options: IndexedDBOptions = {
    dbName: 'LevelUpStorage',
    version: 1,
    storeName: 'storage'
  }) {
    this.dbName = options.dbName;
    this.version = options.version;
    this.storeName = options.storeName;
  }

  /**
   * Initialize IndexedDB connection
   */
  async init(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!('indexedDB' in window)) {
        console.warn('IndexedDB not supported');
        resolve(false);
        return;
      }

      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('IndexedDB open error:', request.error);
        resolve(false);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('category', 'category', { unique: false });
        }
      };
    });
  }

  /**
   * Store data in IndexedDB
   */
  async set<T>(key: string, data: T, category: string = 'default'): Promise<IndexedDBResult<void>> {
    if (!this.db) {
      const initialized = await this.init();
      if (!initialized) {
        return { success: false, error: 'IndexedDB not available' };
      }
    }

    return new Promise((resolve) => {
      if (!this.db) {
        resolve({ success: false, error: 'Database not initialized' });
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const record = {
        key,
        data,
        category,
        timestamp: Date.now(),
        size: JSON.stringify(data).length
      };

      const request = store.put(record);

      request.onsuccess = () => {
        resolve({ success: true });
      };

      request.onerror = () => {
        resolve({ success: false, error: request.error?.message || 'Store failed' });
      };
    });
  }

  /**
   * Retrieve data from IndexedDB
   */
  async get<T>(key: string): Promise<IndexedDBResult<T>> {
    if (!this.db) {
      const initialized = await this.init();
      if (!initialized) {
        return { success: false, error: 'IndexedDB not available' };
      }
    }

    return new Promise((resolve) => {
      if (!this.db) {
        resolve({ success: false, error: 'Database not initialized' });
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          resolve({ success: true, data: result.data });
        } else {
          resolve({ success: false, error: 'Key not found' });
        }
      };

      request.onerror = () => {
        resolve({ success: false, error: request.error?.message || 'Get failed' });
      };
    });
  }

  /**
   * Delete data from IndexedDB
   */
  async delete(key: string): Promise<IndexedDBResult<void>> {
    if (!this.db) {
      const initialized = await this.init();
      if (!initialized) {
        return { success: false, error: 'IndexedDB not available' };
      }
    }

    return new Promise((resolve) => {
      if (!this.db) {
        resolve({ success: false, error: 'Database not initialized' });
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onsuccess = () => {
        resolve({ success: true });
      };

      request.onerror = () => {
        resolve({ success: false, error: request.error?.message || 'Delete failed' });
      };
    });
  }

  /**
   * Get all keys
   */
  async getAllKeys(): Promise<IndexedDBResult<string[]>> {
    if (!this.db) {
      const initialized = await this.init();
      if (!initialized) {
        return { success: false, error: 'IndexedDB not available' };
      }
    }

    return new Promise((resolve) => {
      if (!this.db) {
        resolve({ success: false, error: 'Database not initialized' });
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAllKeys();

      request.onsuccess = () => {
        resolve({ success: true, data: request.result as string[] });
      };

      request.onerror = () => {
        resolve({ success: false, error: request.error?.message || 'Get keys failed' });
      };
    });
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<IndexedDBResult<{
    itemCount: number;
    totalSize: number;
    categories: Record<string, number>;
  }>> {
    if (!this.db) {
      const initialized = await this.init();
      if (!initialized) {
        return { success: false, error: 'IndexedDB not available' };
      }
    }

    return new Promise((resolve) => {
      if (!this.db) {
        resolve({ success: false, error: 'Database not initialized' });
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const records = request.result;
        let totalSize = 0;
        const categories: Record<string, number> = {};

        records.forEach(record => {
          totalSize += record.size || 0;
          categories[record.category] = (categories[record.category] || 0) + 1;
        });

        resolve({
          success: true,
          data: {
            itemCount: records.length,
            totalSize,
            categories
          }
        });
      };

      request.onerror = () => {
        resolve({ success: false, error: request.error?.message || 'Get stats failed' });
      };
    });
  }

  /**
   * Clear old data based on age
   */
  async cleanup(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<IndexedDBResult<number>> {
    if (!this.db) {
      const initialized = await this.init();
      if (!initialized) {
        return { success: false, error: 'IndexedDB not available' };
      }
    }

    return new Promise((resolve) => {
      if (!this.db) {
        resolve({ success: false, error: 'Database not initialized' });
        return;
      }

      const cutoffTime = Date.now() - maxAge;
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      
      const range = IDBKeyRange.upperBound(cutoffTime);
      const request = index.openCursor(range);
      
      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          resolve({ success: true, data: deletedCount });
        }
      };

      request.onerror = () => {
        resolve({ success: false, error: request.error?.message || 'Cleanup failed' });
      };
    });
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export singleton instance
export const indexedDBStorage = new IndexedDBWrapper();