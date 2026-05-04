/**
 * SqliteDatabase.js (Server Version)
 * better-sqlite3 database wrapper for Node.js server.
 *
 * Phase 1 note: This file now branches on DATABASE_DRIVER env var.
 *   - driver=sqlite (default): original sync behaviour unchanged. `this.driver` is null.
 *   - driver=postgres: `this.driver` is a PostgresDriver instance. Sync methods throw
 *     "not yet wired" — Phase 2 converts all callers to async.
 *
 * The class name and singleton export are intentionally preserved for back-compat.
 * Rename deferred to a later cleanup pass.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDatabaseConfig } from './database-config.js';
import { createDriver } from './DatabaseDriver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SqliteDatabase {
  constructor() {
    // SQLite path: better-sqlite3 instance (sqlite driver only)
    this.db = null;
    this.initialized = false;
    this.themeIndex = null;

    // Postgres path: async driver instance (postgres driver only)
    this.driver = null;
  }

  /**
   * Initialize the database connection.
   * Reads DATABASE_DRIVER from env to decide which path to take.
   * @param {string|null} dbPath - Override path to .db file (sqlite only)
   */
  initialize(dbPath = null) {
    if (this.initialized) return;

    const config = getDatabaseConfig();

    if (config.driver === 'postgres') {
      this._initPostgres(config);
      return;
    }

    // --- SQLite path (default) — sync ---
    const resolvedPath = dbPath
      || config.sqlitePath
      || path.join(__dirname, '../../data/puzzles.db');

    try {
      this.db = new Database(resolvedPath, {
        readonly: false,
        fileMustExist: true
      });

      this.db.pragma('journal_mode = WAL');
      this.initialized = true;
      // Theme index built separately via buildThemeIndex() or puzzle-theme-index.js
      this.buildThemeIndex();
    } catch (error) {
      throw new Error(`Failed to initialize database: ${error.message}`);
    }
  }

  /**
   * Postgres init — async, called from initialize() when driver=postgres.
   * Sets this.initialized synchronously so isReady() reflects boot state.
   * Callers that need readiness should await db.initAsync().
   * @param {object} config
   */
  _initPostgres(config) {
    // Mark as initialized eagerly; driver connect is async — see initAsync().
    this.initialized = true;
    this._pendingInit = createDriver(config).then(driver => {
      this.driver = driver;
    }).catch(err => {
      this.initialized = false;
      throw err;
    });
  }

  /**
   * Await async driver init (postgres path only).
   * No-op for sqlite path. Safe to call on either path.
   * @returns {Promise<void>}
   */
  async initAsync() {
    if (this._pendingInit) await this._pendingInit;
  }

  // ---------------------------------------------------------------------------
  // Theme index (sqlite path — untouched for Phase 1)
  // ---------------------------------------------------------------------------

  buildThemeIndex() {
    this.themeIndex = new Map();
    const stmt = this.db.prepare('SELECT id, themes, rating, popularity FROM puzzles');
    const rows = stmt.all();
    for (const row of rows) {
      const themes = row.themes ? row.themes.split(',') : [];
      for (const theme of themes) {
        if (!this.themeIndex.has(theme)) this.themeIndex.set(theme, []);
        this.themeIndex.get(theme).push({
          id: row.id,
          rating: row.rating,
          popularity: row.popularity
        });
      }
    }
  }

  addToThemeIndex(id, themesStr, rating, popularity) {
    if (!this.themeIndex) return;
    const themes = themesStr ? themesStr.split(',') : [];
    for (const theme of themes) {
      if (!this.themeIndex.has(theme)) this.themeIndex.set(theme, []);
      this.themeIndex.get(theme).push({ id, rating, popularity });
    }
  }

  getPuzzleIdsByTheme(theme, { minRating = 0, maxRating = 5000, minPopularity = 0 } = {}) {
    if (!this.themeIndex) return [];
    const puzzles = this.themeIndex.get(theme) || [];
    return puzzles
      .filter(p => p.rating >= minRating && p.rating <= maxRating && p.popularity >= minPopularity)
      .map(p => p.id);
  }

  getPuzzlesByIds(ids) {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(',');
    const stmt = this.db.prepare(`SELECT * FROM puzzles WHERE id IN (${placeholders})`);
    return stmt.all(...ids);
  }

  // ---------------------------------------------------------------------------
  // Async query methods — delegate to driver (postgres) or better-sqlite3 (sqlite)
  // ---------------------------------------------------------------------------

  async query(sql, params = []) {
    if (this.driver) return this.driver.query(sql, params);
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  async queryScalar(sql, params = []) {
    if (this.driver) return this.driver.queryScalar(sql, params);
    if (!this.db) throw new Error('Database not initialized');
    const results = await this.query(sql, params);
    if (results.length === 0) return null;
    const firstKey = Object.keys(results[0])[0];
    return results[0][firstKey];
  }

  async queryOne(sql, params = []) {
    if (this.driver) return this.driver.queryOne(sql, params);
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare(sql);
    return stmt.get(...params) || null;
  }

  async run(sql, params = []) {
    if (this.driver) return this.driver.run(sql, params);
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare(sql);
    return stmt.run(...params);
  }

  async exec(sql) {
    if (this.driver) return this.driver.exec(sql);
    if (!this.db) throw new Error('Database not initialized');
    this.db.exec(sql);
  }

  /**
   * Run an async function inside a transaction.
   * Delegates to the active driver (postgres or sqlite).
   * For the sqlite path, uses manual BEGIN/COMMIT/ROLLBACK via exec() so that
   * the async fn is properly awaited before COMMIT fires.
   * @param {(driver: object) => Promise<any>} fn
   * @returns {Promise<any>}
   */
  async transaction(fn) {
    if (this.driver) return this.driver.transaction(fn);
    if (!this.db) throw new Error('Database not initialized');

    // SQLite path: manual BEGIN/COMMIT/ROLLBACK — allows proper async/await.
    // better-sqlite3's db.transaction() wrapper is fully synchronous and cannot
    // await Promise-returning callbacks; use exec() instead.
    const self = this;
    const shim = {
      async query(sql, params = []) { return self.db.prepare(sql).all(...params); },
      async queryOne(sql, params = []) { return self.db.prepare(sql).get(...params) ?? null; },
      async queryScalar(sql, params = []) {
        const row = self.db.prepare(sql).get(...params);
        return row ? row[Object.keys(row)[0]] : null;
      },
      async run(sql, params = []) {
        const r = self.db.prepare(sql).run(...params);
        return { changes: r.changes, lastInsertId: r.lastInsertRowid != null ? Number(r.lastInsertRowid) : null };
      },
      async exec(sql) { self.db.exec(sql); }
    };

    this.db.exec('BEGIN');
    try {
      const result = await fn(shim);
      this.db.exec('COMMIT');
      return result;
    } catch (err) {
      try { this.db.exec('ROLLBACK'); } catch { /* ignore rollback error */ }
      throw err;
    }
  }

  isReady() {
    return this.initialized && (this.db !== null || this.driver !== null);
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    if (this.driver) {
      this.driver.close().catch(() => {});
      this.driver = null;
    }
    this.initialized = false;
  }
}

// Singleton instance for the application
export const database = new SqliteDatabase();

export default SqliteDatabase;
