// server/models/garmentCache.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class GarmentCache {
  constructor() {
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dbPath = path.join(dataDir, 'garments.db');
    this.db = new sqlite3.Database(this.dbPath, (err) => {
      if (err) {
        console.error('DB connection error:', err);
      } else {
        console.log('✅ Garment cache database ready');
        this.createTables();
      }
    });
  }

  createTables() {
    this.db.serialize(() => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS garments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cache_key TEXT UNIQUE NOT NULL,
          task_id TEXT NOT NULL,
          model_path TEXT NOT NULL,
          thumbnail_url TEXT,
          original_filename TEXT,
          garment_type TEXT,
          generation_options TEXT,
          credits_used INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL,
          accessed_count INTEGER DEFAULT 0,
          last_accessed_at INTEGER
        )
      `, (err) => { if (err) console.error('Error creating table:', err); });

      this.db.run(`CREATE INDEX IF NOT EXISTS idx_cache_key ON garments(cache_key)`,
        (err) => { if (err) console.error('Error creating index:', err); });

      this.db.run(`CREATE INDEX IF NOT EXISTS idx_expires_at ON garments(expires_at)`,
        (err) => { if (err) console.error('Error creating index:', err); });
    });
  }

  async get(cacheKey) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM garments WHERE cache_key = ? AND expires_at > ?',
        [cacheKey, Date.now()],
        (err, row) => {
          if (err) return reject(err);
          if (!row) return resolve(null);
          this.db.run(
            'UPDATE garments SET accessed_count = accessed_count + 1, last_accessed_at = ? WHERE id = ?',
            [Date.now(), row.id]
          );
          resolve({ ...row, generation_options: JSON.parse(row.generation_options || '{}') });
        }
      );
    });
  }

  async save(data) {
    return new Promise((resolve, reject) => {
      const now = Date.now();
      const expiresAt = now + (30 * 24 * 60 * 60 * 1000); // 30 days
      this.db.run(
        `INSERT INTO garments (cache_key, task_id, model_path, thumbnail_url, original_filename,
         garment_type, generation_options, credits_used, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.cacheKey, data.taskId, data.modelPath, data.thumbnailUrl,
          data.originalFilename, data.garmentType,
          JSON.stringify(data.generationOptions || {}),
          data.creditsUsed || 0, now, expiresAt
        ],
        function(err) {
          if (err) return reject(err);
          resolve({ id: this.lastID });
        }
      );
    });
  }

  async getAll(limit = 50) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM garments WHERE expires_at > ? ORDER BY created_at DESC LIMIT ?',
        [Date.now(), limit],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows.map(r => ({ ...r, generation_options: JSON.parse(r.generation_options || '{}') })));
        }
      );
    });
  }

  async getStats() {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT COUNT(*) as total_garments, SUM(accessed_count) as total_accesses
         FROM garments WHERE expires_at > ?`,
        [Date.now()],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });
  }
}

module.exports = new GarmentCache();