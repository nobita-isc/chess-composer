/**
 * SqliteDatabase.js
 * sql.js (SQLite WebAssembly) database wrapper for browser
 *
 * sql.js is loaded from CDN because it has compatibility issues with ESM bundlers.
 */

// Load sql.js from CDN
const SQL_JS_CDN = 'https://sql.js.org/dist/sql-wasm.js';

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

      updateProgress('Downloading puzzle database...');

      // Fetch the pre-built database
      const response = await fetch(dbPath);

      if (!response.ok) {
        throw new Error(`Failed to load database: ${response.status} ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      const size = (buffer.byteLength / 1024 / 1024).toFixed(2);
      updateProgress(`Database downloaded (${size} MB). Initializing...`);

      // Create database from buffer
      this.db = new this.SQL.Database(new Uint8Array(buffer));
      this.initialized = true;

      // Verify database
      const puzzleCount = this.queryScalar('SELECT COUNT(*) FROM puzzles');
      const themeCount = this.queryScalar('SELECT COUNT(*) FROM themes');

      // Build in-memory theme index for fast lookups
      updateProgress('Building search index...');
      await this.buildThemeIndex(onProgress);

    } catch (error) {
      throw error;
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
