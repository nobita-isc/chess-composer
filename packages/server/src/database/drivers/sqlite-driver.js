/**
 * sqlite-driver.js
 * Async DatabaseDriver implementation backed by better-sqlite3.
 * All methods return Promises (sync calls wrapped in Promise.resolve).
 * Transactions: uses better-sqlite3 db.transaction() — single-level only.
 *   Nested transactions are NOT supported; document callers accordingly.
 */

import Database from 'better-sqlite3';

export class SqliteDriver {
  constructor() {
    /** @type {import('better-sqlite3').Database|null} */
    this.db = null;
  }

  /**
   * Open the database file.
   * @param {{ sqlitePath: string }} config
   */
  async connect(config) {
    this.db = new Database(config.sqlitePath, {
      readonly: false,
      fileMustExist: true
    });
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  /**
   * Execute a SELECT query.
   * @param {string} sql
   * @param {any[]} [params]
   * @returns {Promise<object[]>}
   */
  async query(sql, params = []) {
    const stmt = this.db.prepare(sql);
    return Promise.resolve(stmt.all(...params));
  }

  /**
   * Execute a SELECT query and return the first row or null.
   * @param {string} sql
   * @param {any[]} [params]
   * @returns {Promise<object|null>}
   */
  async queryOne(sql, params = []) {
    const stmt = this.db.prepare(sql);
    return Promise.resolve(stmt.get(...params) ?? null);
  }

  /**
   * Execute a SELECT query and return the first column of the first row.
   * @param {string} sql
   * @param {any[]} [params]
   * @returns {Promise<any>}
   */
  async queryScalar(sql, params = []) {
    const stmt = this.db.prepare(sql);
    const row = stmt.get(...params);
    if (!row) return Promise.resolve(null);
    return Promise.resolve(row[Object.keys(row)[0]]);
  }

  /**
   * Execute an INSERT/UPDATE/DELETE statement.
   * @param {string} sql
   * @param {any[]} [params]
   * @returns {Promise<{ changes: number, lastInsertId: number|null }>}
   */
  async run(sql, params = []) {
    const stmt = this.db.prepare(sql);
    const result = stmt.run(...params);
    return Promise.resolve({
      changes: result.changes,
      lastInsertId: result.lastInsertRowid != null
        ? Number(result.lastInsertRowid)
        : null
    });
  }

  /**
   * Execute one or more SQL statements (no params, no results).
   * @param {string} sql
   * @returns {Promise<void>}
   */
  async exec(sql) {
    this.db.exec(sql);
    return Promise.resolve();
  }

  /**
   * Run an async function inside a transaction.
   * Manually issues BEGIN/COMMIT/ROLLBACK so async callbacks are fully awaited.
   * NOTE: single-level only — do not nest transaction() calls.
   *
   * @param {(driver: SqliteDriver) => Promise<any>} fn
   * @returns {Promise<any>}
   */
  async transaction(fn) {
    this.db.exec('BEGIN');
    try {
      const result = await fn(this);
      this.db.exec('COMMIT');
      return result;
    } catch (err) {
      try { this.db.exec('ROLLBACK'); } catch { /* ignore rollback error */ }
      throw err;
    }
  }

  /**
   * Close the database connection.
   * @returns {Promise<void>}
   */
  async close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    return Promise.resolve();
  }
}
