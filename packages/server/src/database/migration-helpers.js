/**
 * migration-helpers.js
 * Shared helpers for portable schema migrations (SQLite + Postgres).
 *
 * Problem: try/catch around ALTER TABLE inside a Postgres transaction poisons
 * the entire TX — every subsequent statement fails with "transaction aborted".
 * Solution: check column existence BEFORE attempting ALTER, using driver-specific
 * mechanisms that don't raise errors when the column already exists.
 */

/**
 * Detect driver type from a db instance passed to a migration fn.
 * Works with both SqliteDatabase facade and raw driver objects.
 * @param {object} db
 * @returns {'postgres'|'sqlite'}
 */
function detectDriver(db) {
  // Raw SqliteDriver / PostgresDriver have a 'name' property
  if (db.name === 'postgres') return 'postgres';
  if (db.name === 'sqlite') return 'sqlite';
  // SqliteDatabase facade: driver set means postgres path
  if (db.driver) return 'postgres';
  return 'sqlite';
}

/**
 * Add a column to a table only if it does not already exist.
 * - Postgres: uses `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (PG 9.6+). No error raised.
 * - SQLite:  queries `PRAGMA table_info` first; runs ALTER only when absent.
 *
 * @param {object} db        - db handle passed to migrate(db)
 * @param {string} table     - table name (unquoted)
 * @param {string} column    - column name
 * @param {string} type      - SQL type, e.g. 'TEXT', 'INTEGER DEFAULT 0'
 * @returns {Promise<boolean>} true if column was added, false if it already existed
 */
export async function addColumnIfNotExists(db, table, column, type) {
  const driver = detectDriver(db);

  if (driver === 'postgres') {
    // PG 9.6+ supports IF NOT EXISTS on ADD COLUMN — no TX poisoning.
    await db.exec(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${type}`);
    // No way to know if it was new or pre-existing from this API, return true as best-effort.
    return true;
  }

  // SQLite: PRAGMA table_info returns one row per column.
  // db.query() is our async wrapper method; fall back to db.prepare().all() for
  // raw better-sqlite3 instances (used in tests and legacy migration calls).
  let rows;
  if (typeof db.query === 'function') {
    rows = await db.query(`PRAGMA table_info(${table})`);
  } else {
    rows = db.prepare(`PRAGMA table_info(${table})`).all();
  }
  const exists = rows.some(r => r.name === column);
  if (exists) return false;

  if (typeof db.exec === 'function') {
    await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  } else {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
  }
  return true;
}
