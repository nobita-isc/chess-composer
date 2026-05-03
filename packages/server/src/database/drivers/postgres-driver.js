/**
 * postgres-driver.js
 * Async DatabaseDriver implementation backed by node-postgres (pg.Pool).
 * Converts `?` placeholders to `$N` via param-adapter before each query.
 * Transactions: BEGIN/COMMIT/ROLLBACK via a dedicated pool client.
 *   Single-level only — nested transaction() calls are NOT supported.
 *
 * Security: DATABASE_URL is read at connect time. Never log the raw URL.
 */

import pg from 'pg';
import { adaptParams } from './param-adapter.js';

const { Pool } = pg;

export class PostgresDriver {
  constructor() {
    /** @type {pg.Pool|null} */
    this.pool = null;
  }

  /**
   * Create the connection pool and verify connectivity.
   * Fails loudly if the database is unreachable.
   * @param {{ databaseUrl: string }} config
   */
  async connect(config) {
    this.pool = new Pool({
      connectionString: config.databaseUrl,
      max: 10
    });

    // Verify connectivity at startup — fail fast.
    try {
      const client = await this.pool.connect();
      client.release();
    } catch (err) {
      await this.pool.end().catch(() => {});
      this.pool = null;
      throw new Error(`PostgresDriver: failed to connect — ${err.message}`);
    }
  }

  /**
   * Execute a SELECT query.
   * @param {string} sql
   * @param {any[]} [params]
   * @returns {Promise<object[]>}
   */
  async query(sql, params = []) {
    const { sql: pgSql } = adaptParams(sql);
    const res = await this.pool.query(pgSql, params);
    return res.rows;
  }

  /**
   * Execute a SELECT and return the first row or null.
   * @param {string} sql
   * @param {any[]} [params]
   * @returns {Promise<object|null>}
   */
  async queryOne(sql, params = []) {
    const rows = await this.query(sql, params);
    return rows[0] ?? null;
  }

  /**
   * Execute a SELECT and return the first column of the first row.
   * @param {string} sql
   * @param {any[]} [params]
   * @returns {Promise<any>}
   */
  async queryScalar(sql, params = []) {
    const row = await this.queryOne(sql, params);
    if (!row) return null;
    return row[Object.keys(row)[0]];
  }

  /**
   * Execute an INSERT/UPDATE/DELETE.
   * For inserts needing the generated id, use RETURNING in the SQL and call query().
   * @param {string} sql
   * @param {any[]} [params]
   * @returns {Promise<{ changes: number, lastInsertId: null }>}
   */
  async run(sql, params = []) {
    const { sql: pgSql } = adaptParams(sql);
    const res = await this.pool.query(pgSql, params);
    return { changes: res.rowCount ?? 0, lastInsertId: null };
  }

  /**
   * Execute one or more SQL statements (no params, no results).
   * @param {string} sql
   * @returns {Promise<void>}
   */
  async exec(sql) {
    await this.pool.query(sql);
  }

  /**
   * Run an async function inside a BEGIN/COMMIT transaction.
   * Automatically ROLLBACKs on error. Single-level only.
   *
   * @param {(driver: PostgresDriver) => Promise<any>} fn
   * @returns {Promise<any>}
   */
  async transaction(fn) {
    const client = await this.pool.connect();

    // Thin wrapper so fn() calls route through the dedicated client.
    const clientDriver = {
      query: async (sql, params = []) => {
        const { sql: pgSql } = adaptParams(sql);
        const res = await client.query(pgSql, params);
        return res.rows;
      },
      queryOne: async (sql, params = []) => {
        const { sql: pgSql } = adaptParams(sql);
        const res = await client.query(pgSql, params);
        return res.rows[0] ?? null;
      },
      queryScalar: async (sql, params = []) => {
        const { sql: pgSql } = adaptParams(sql);
        const res = await client.query(pgSql, params);
        const row = res.rows[0];
        return row ? row[Object.keys(row)[0]] : null;
      },
      run: async (sql, params = []) => {
        const { sql: pgSql } = adaptParams(sql);
        const res = await client.query(pgSql, params);
        return { changes: res.rowCount ?? 0, lastInsertId: null };
      },
      exec: async (sql) => { await client.query(sql); }
    };

    try {
      await client.query('BEGIN');
      const result = await fn(clientDriver);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Drain and close the connection pool.
   * @returns {Promise<void>}
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}
