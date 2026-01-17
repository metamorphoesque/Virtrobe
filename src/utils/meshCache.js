// src/utils/meshCache.js
// ============================================
// IndexedDB cache for generated 3D meshes
// Avoid re-generating meshes for same garment images
// ============================================

const DB_NAME = 'VirtualTryOnCache';
const DB_VERSION = 1;
const STORE_NAME = 'meshes';
const MAX_CACHE_SIZE = 50; // Store up to 50 meshes

export class MeshCache {
  constructor() {
    this.db = null;
  }

  /**
   * Initialize IndexedDB
   */
  async init() {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('❌ Failed to open IndexedDB');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ MeshCache initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'hash' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('📦 Created mesh cache store');
        }
      };
    });
  }

  /**
   * Generate hash from image file
   * @param {File} imageFile - Garment image
   * @returns {Promise<string>} - SHA-256 hash
   */
  async generateHash(imageFile) {
    const arrayBuffer = await imageFile.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Check if mesh exists in cache
   * @param {string} hash - Image hash
   * @returns {Promise<Object|null>} - Cached mesh data or null
   */
  async get(hash) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(hash);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          console.log('💾 Cache HIT for hash:', hash.substring(0, 8));
          resolve(result.meshData);
        } else {
          console.log('❌ Cache MISS for hash:', hash.substring(0, 8));
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('❌ Cache read error');
        reject(request.error);
      };
    });
  }

  /**
   * Store mesh in cache
   * @param {string} hash - Image hash
   * @param {Object} meshData - Generated mesh data
   */
  async set(hash, meshData) {
    if (!this.db) await this.init();

    // Check cache size and evict oldest if needed
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
        console.log('💾 Cached mesh with hash:', hash.substring(0, 8));
        resolve();
      };

      request.onerror = () => {
        console.error('❌ Cache write error');
        reject(request.error);
      };
    });
  }

  /**
   * Enforce maximum cache size (LRU eviction)
   */
  async enforceMaxSize() {
    const count = await this.count();
    
    if (count >= MAX_CACHE_SIZE) {
      console.log('🧹 Cache full, evicting oldest entry...');
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('timestamp');
        
        // Get oldest entry
        const request = index.openCursor();
        
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            store.delete(cursor.primaryKey);
            console.log('🗑️ Evicted oldest cache entry');
            resolve();
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    }
  }

  /**
   * Get cache entry count
   */
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

  /**
   * Clear all cached meshes
   */
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

  /**
   * Get cache statistics
   */
  async getStats() {
    const count = await this.count();
    const sizeEstimate = count * 5; // Rough estimate in MB
    
    return {
      entries: count,
      maxEntries: MAX_CACHE_SIZE,
      estimatedSizeMB: sizeEstimate,
      percentFull: (count / MAX_CACHE_SIZE) * 100
    };
  }
}

// Singleton instance
export const meshCache = new MeshCache();