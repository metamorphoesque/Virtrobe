// src/utils/ai/meshCache.js
// ============================================
// IndexedDB cache for generated meshes
// ============================================

const DB_NAME = 'VirtuobeCache';
const DB_VERSION = 1;
const STORE_NAME = 'meshes';
const MAX_CACHE_SIZE = 50;

class MeshCache {
  constructor() {
    this.db = null;
  }

  async init() {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ MeshCache initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'hash' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('📦 Created mesh cache store');
        }
      };
    });
  }

  async generateHash(imageFile) {
    const arrayBuffer = await imageFile.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async get(hash) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(hash);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          console.log('💾 Cache HIT:', hash.substring(0, 8));
          resolve(result.meshData);
        } else {
          console.log('❌ Cache MISS:', hash.substring(0, 8));
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async set(hash, meshData) {
    if (!this.db) await this.init();

    await this.enforceMaxSize();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const cacheEntry = {
        hash,
        meshData,
        timestamp: Date.now()
      };

      const request = store.put(cacheEntry);

      request.onsuccess = () => {
        console.log('💾 Cached:', hash.substring(0, 8));
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  async enforceMaxSize() {
    const count = await this.count();

    if (count >= MAX_CACHE_SIZE) {
      console.log('🧹 Cache full, evicting oldest...');

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('timestamp');

        const request = index.openCursor();

        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            store.delete(cursor.primaryKey);
            console.log('🗑️ Evicted oldest entry');
            resolve();
          }
        };

        request.onerror = () => reject(request.error);
      });
    }
  }

  async count() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clear() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('🧹 Cache cleared');
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getStats() {
    const count = await this.count();
    const sizeEstimate = count * 5;

    return {
      entries: count,
      maxEntries: MAX_CACHE_SIZE,
      estimatedSizeMB: sizeEstimate,
      percentFull: (count / MAX_CACHE_SIZE) * 100
    };
  }
}

export const meshCache = new MeshCache();