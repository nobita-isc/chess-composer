/**
 * SqliteDatabase.js (Server Version)
 * better-sqlite3 database wrapper for Node.js server
 *
 * This is a port of the client-side sql.js version to use better-sqlite3
 * which provides synchronous, faster database access in Node.js.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SqliteDatabase {
  constructor() {
    this.db = null;
    this.initialized = false;
    this.themeIndex = null;  // In-memory theme -> puzzle IDs index for fast lookups
  }

  /**
   * Initialize the database connection
   * @param {string} dbPath - Path to .db file (default: ../data/puzzles.db)
   */
  initialize(dbPath = null) {
    if (this.initialized) {
      return;
    }

    const resolvedPath = dbPath || path.join(__dirname, '../../data/puzzles.db');

    try {
      this.db = new Database(resolvedPath, {
        readonly: false,
        fileMustExist: true
      });

      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');

      this.initialized = true;

      // Build theme index for fast lookups
      this.buildThemeIndex();

    } catch (error) {
      throw new Error(`Failed to initialize database: ${error.message}`);
    }
  }

  /**
   * Build in-memory theme index for fast puzzle lookups
   * Maps theme -> array of { id, rating, popularity }
   */
  buildThemeIndex() {
    this.themeIndex = new Map();

    const stmt = this.db.prepare('SELECT id, themes, rating, popularity FROM puzzles');
    const rows = stmt.all();

    for (const row of rows) {
      const themes = row.themes ? row.themes.split(',') : [];
      for (const theme of themes) {
        if (!this.themeIndex.has(theme)) {
          this.themeIndex.set(theme, []);
        }
        this.themeIndex.get(theme).push({
          id: row.id,
          rating: row.rating,
          popularity: row.popularity
        });
      }
    }
  }

  /**
   * Add a puzzle to the theme index (for newly created puzzles)
   * @param {string} id - Puzzle ID
   * @param {string} themesStr - Comma-separated themes
   * @param {number} rating - Puzzle rating
   * @param {number} popularity - Puzzle popularity
   */
  addToThemeIndex(id, themesStr, rating, popularity) {
    if (!this.themeIndex) return;

    const themes = themesStr ? themesStr.split(',') : [];
    for (const theme of themes) {
      if (!this.themeIndex.has(theme)) {
        this.themeIndex.set(theme, []);
      }
      this.themeIndex.get(theme).push({ id, rating, popularity });
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
    const stmt = this.db.prepare(`SELECT * FROM puzzles WHERE id IN (${placeholders})`);
    return stmt.all(...ids);
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
    return stmt.all(...params);
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
    const stmt = this.db.prepare(sql);
    return stmt.get(...params) || null;
  }

  /**
   * Execute a SQL statement (INSERT, UPDATE, DELETE, CREATE)
   * @param {string} sql - SQL statement
   * @param {array} params - Bound parameters
   * @returns {object} - { changes: number, lastInsertRowid: number }
   */
  run(sql, params = []) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare(sql);
    return stmt.run(...params);
  }

  /**
   * Execute multiple SQL statements
   * @param {string} sql - SQL statements (can be multiple separated by ;)
   */
  exec(sql) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    this.db.exec(sql);
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
