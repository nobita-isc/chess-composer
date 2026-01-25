/**
 * SqliteDatabase.js
 * sql.js (SQLite WebAssembly) database wrapper for browser
 *
 * Features:
 * - IndexedDB caching for database file (avoids re-downloading 400MB+ on refresh)
 * - IndexedDB caching for theme index (avoids re-building index on refresh)
 * - sql.js loaded from CDN
 */

// Load sql.js from CDN
const SQL_JS_CDN = 'https://sql.js.org/dist/sql-wasm.js';
const CACHE_DB_NAME = 'chess-puzzle-cache';
const CACHE_DB_VERSION = 1;
const DB_STORE_NAME = 'database';
const INDEX_STORE_NAME = 'themeIndex';

async function loadSqlJs() {
  // Check if already loaded
  if (window.initSqlJs) {
    return window.initSqlJs;
  }

  // Load script dynamically
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SQL_JS_CDN;
    script.onload = () => {
      if (window.initSqlJs) {
        resolve(window.initSqlJs);
      } else {
        reject(new Error('initSqlJs not found after loading sql.js'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load sql.js from CDN'));
    document.head.appendChild(script);
  });
}

/**
 * IndexedDB helper for caching
 */
class CacheManager {
  constructor() {
    this.db = null;
  }

  async open() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CACHE_DB_NAME, CACHE_DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store for database binary
        if (!db.objectStoreNames.contains(DB_STORE_NAME)) {
          db.createObjectStore(DB_STORE_NAME);
        }

        // Store for theme index
        if (!db.objectStoreNames.contains(INDEX_STORE_NAME)) {
          db.createObjectStore(INDEX_STORE_NAME);
        }
      };
    });
  }

  async get(storeName, key) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async set(storeName, key, value) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value, key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async delete(storeName, key) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

const cacheManager = new CacheManager();

export class SqliteDatabase {
  constructor() {
    this.db = null;
    this.SQL = null;
    this.initialized = false;
    this.themeIndex = null;  // In-memory theme -> puzzle IDs index for fast lookups
  }

  /**
   * Initialize sql.js and load the database file
   * @param {string} dbPath - Path to pre-built .db file
   * @param {function} onProgress - Optional callback for progress updates
   */
  async initialize(dbPath = '/database/puzzles.db', onProgress = null) {
    if (this.initialized) {
      return;
    }

    const updateProgress = (msg) => {
      if (onProgress) onProgress(msg);
    };

    updateProgress('Loading SQL engine...');

    try {
      // Load sql.js from CDN
      const initSqlJs = await loadSqlJs();

      // Initialize sql.js with WASM
      this.SQL = await initSqlJs({
        locateFile: file => `https://sql.js.org/dist/${file}`
      });

      // Try to load database from cache first
      updateProgress('Checking cache...');
      let buffer = await this.loadFromCache(dbPath);

      if (buffer) {
        updateProgress('Loading from cache...');
      } else {
        updateProgress('Downloading puzzle database...');

        // Fetch the pre-built database
        const response = await fetch(dbPath);

        if (!response.ok) {
          throw new Error(`Failed to load database: ${response.status} ${response.statusText}`);
        }

        buffer = await response.arrayBuffer();
        const size = (buffer.byteLength / 1024 / 1024).toFixed(2);
        updateProgress(`Database downloaded (${size} MB). Caching...`);

        // Cache for future use
        await this.saveToCache(dbPath, buffer);
      }

      // Create database from buffer
      this.db = new this.SQL.Database(new Uint8Array(buffer));
      this.initialized = true;

      // Try to load theme index from cache
      updateProgress('Loading search index...');
      const cachedIndex = await this.loadIndexFromCache(dbPath);

      if (cachedIndex) {
        this.themeIndex = new Map(cachedIndex);
        updateProgress('Search index loaded from cache.');
      } else {
        // Build in-memory theme index for fast lookups
        updateProgress('Building search index (first time only)...');
        await this.buildThemeIndex(onProgress);

        // Cache the theme index
        await this.saveIndexToCache(dbPath);
      }

    } catch (error) {
      throw error;
    }
  }

  /**
   * Load database from IndexedDB cache
   */
  async loadFromCache(dbPath) {
    try {
      const cached = await cacheManager.get(DB_STORE_NAME, dbPath);
      if (cached && cached.data) {
        return cached.data;
      }
    } catch (e) {
      // Cache miss or error, will download fresh
    }
    return null;
  }

  /**
   * Save database to IndexedDB cache
   */
  async saveToCache(dbPath, buffer) {
    try {
      await cacheManager.set(DB_STORE_NAME, dbPath, {
        data: buffer,
        timestamp: Date.now()
      });
    } catch (e) {
      // Caching failed, but we can continue
    }
  }

  /**
   * Load theme index from IndexedDB cache
   */
  async loadIndexFromCache(dbPath) {
    try {
      const cached = await cacheManager.get(INDEX_STORE_NAME, dbPath);
      if (cached && cached.data) {
        return cached.data;
      }
    } catch (e) {
      // Cache miss or error
    }
    return null;
  }

  /**
   * Save theme index to IndexedDB cache
   */
  async saveIndexToCache(dbPath) {
    try {
      // Convert Map to array for storage
      const indexArray = Array.from(this.themeIndex.entries());
      await cacheManager.set(INDEX_STORE_NAME, dbPath, {
        data: indexArray,
        timestamp: Date.now()
      });
    } catch (e) {
      // Caching failed, but we can continue
    }
  }

  /**
   * Clear all cached data (useful for forcing refresh)
   */
  async clearCache(dbPath = '/database/puzzles.db') {
    try {
      await cacheManager.delete(DB_STORE_NAME, dbPath);
      await cacheManager.delete(INDEX_STORE_NAME, dbPath);
    } catch (e) {
      // Ignore errors
    }
  }

  /**
   * Build in-memory theme index for fast puzzle lookups
   * Maps theme -> array of puzzle IDs
   */
  async buildThemeIndex(onProgress = null) {
    this.themeIndex = new Map();

    // Process in batches to avoid blocking UI
    const batchSize = 100000;  // Larger batches = fewer UI updates but faster
    const totalCount = this.queryScalar('SELECT COUNT(*) FROM puzzles');
    let offset = 0;

    while (offset < totalCount) {
      // Allow UI to update between batches
      await new Promise(resolve => setTimeout(resolve, 10));

      const rows = this.query(`
        SELECT id, themes, rating, popularity
        FROM puzzles
        LIMIT ${batchSize} OFFSET ${offset}
      `);

      for (const row of rows) {
        const themes = row.themes ? row.themes.split(',') : [];
        for (const theme of themes) {
          if (!this.themeIndex.has(theme)) {
            this.themeIndex.set(theme, []);
          }
          // Store puzzle ID with rating/popularity for filtering
          this.themeIndex.get(theme).push({
            id: row.id,
            rating: row.rating,
            popularity: row.popularity
          });
        }
      }

      offset += batchSize;
      const progress = Math.min(100, Math.round((offset / totalCount) * 100));
      if (onProgress) onProgress(`Building search index... ${progress}%`);
    }
  }

  /**
   * Get puzzle IDs for a theme (fast, uses in-memory index)
   */
  getPuzzleIdsByTheme(theme, { minRating = 0, maxRating = 5000, minPopularity = 0 } = {}) {
    if (!this.themeIndex) return [];

    const puzzles = this.themeIndex.get(theme) || [];
    return puzzles
      .filter(p => p.rating >= minRating && p.rating <= maxRating && p.popularity >= minPopularity)
      .map(p => p.id);
  }

  /**
   * Get puzzles by IDs (batch fetch)
   */
  getPuzzlesByIds(ids) {
    if (ids.length === 0) return [];

    const placeholders = ids.map(() => '?').join(',');
    return this.query(`SELECT * FROM puzzles WHERE id IN (${placeholders})`, ids);
  }

  /**
   * Execute a SELECT query and return results as array of objects
   * @param {string} sql - SQL query
   * @param {array} params - Bound parameters
   * @returns {array} - Array of row objects
   */
  query(sql, params = []) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }

    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();

    return results;
  }

  /**
   * Execute a query returning a single scalar value
   * @param {string} sql - SQL query
   * @param {array} params - Bound parameters
   * @returns {any} - Single value or null
   */
  queryScalar(sql, params = []) {
    const results = this.query(sql, params);
    if (results.length === 0) return null;
    const firstKey = Object.keys(results[0])[0];
    return results[0][firstKey];
  }

  /**
   * Execute a query and return the first row
   * @param {string} sql - SQL query
   * @param {array} params - Bound parameters
   * @returns {object|null} - First row or null
   */
  queryOne(sql, params = []) {
    const results = this.query(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Execute a SQL statement (INSERT, UPDATE, DELETE, CREATE)
   * @param {string} sql - SQL statement
   * @param {array} params - Bound parameters
   * @returns {number} - Number of rows affected
   */
  run(sql, params = []) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      this.db.run(sql, params);
      return this.db.getRowsModified();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Execute multiple SQL statements
   * @param {string} sql - SQL statements (can be multiple separated by ;)
   */
  exec(sql) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      this.db.exec(sql);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if database is ready
   */
  isReady() {
    return this.initialized && this.db !== null;
  }

  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }
}

// Singleton instance for the application
export const database = new SqliteDatabase();

export default SqliteDatabase;
