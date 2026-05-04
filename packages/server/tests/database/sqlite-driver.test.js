/**
 * sqlite-driver.test.js
 * Unit tests for SqliteDriver: CRUD operations and transaction semantics.
 * Uses a real in-memory SQLite database (no mocks).
 */

import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { SqliteDriver } from '../../src/database/drivers/sqlite-driver.js';
import os from 'os';
import path from 'path';
import fs from 'fs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a temp SQLite file path (driver requires fileMustExist=true, so we
 * create the file via better-sqlite3 before handing it to SqliteDriver).
 */
function makeTempDb() {
  const tmpFile = path.join(os.tmpdir(), `chess-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  // Pre-create an empty file so SqliteDriver's fileMustExist:true succeeds
  fs.writeFileSync(tmpFile, '');
  return tmpFile;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('SqliteDriver', () => {
  let driver;
  let tmpFile;

  beforeEach(async () => {
    tmpFile = makeTempDb();
    driver = new SqliteDriver();
    await driver.connect({ sqlitePath: tmpFile });

    // Create a simple test table
    await driver.exec(`
      CREATE TABLE IF NOT EXISTS items (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT    NOT NULL,
        val  INTEGER NOT NULL DEFAULT 0
      )
    `);
  });

  afterEach(async () => {
    await driver.close();
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
  });

  // ── connect / close ────────────────────────────────────────────────────────

  it('connects and closes without error', async () => {
    // If we get here, connect() in beforeEach succeeded
    expect(driver.db).not.toBeNull();
    await driver.close();
    expect(driver.db).toBeNull();
    // re-open so afterEach close() is safe
    driver = new SqliteDriver();
    await driver.connect({ sqlitePath: tmpFile });
  });

  // ── exec ──────────────────────────────────────────────────────────────────

  it('exec creates tables without error', async () => {
    await driver.exec('CREATE TABLE IF NOT EXISTS dummy (x INTEGER)');
    const rows = await driver.query("SELECT name FROM sqlite_master WHERE type='table' AND name='dummy'");
    expect(rows).toHaveLength(1);
  });

  // ── run (INSERT) ──────────────────────────────────────────────────────────

  it('run INSERT returns changes=1 and lastInsertId', async () => {
    const result = await driver.run("INSERT INTO items (name, val) VALUES (?, ?)", ['alpha', 10]);
    expect(result.changes).toBe(1);
    expect(result.lastInsertId).toBe(1);
  });

  it('run INSERT auto-increments lastInsertId', async () => {
    await driver.run("INSERT INTO items (name, val) VALUES (?, ?)", ['a', 1]);
    const result = await driver.run("INSERT INTO items (name, val) VALUES (?, ?)", ['b', 2]);
    expect(result.lastInsertId).toBe(2);
  });

  // ── query (SELECT) ────────────────────────────────────────────────────────

  it('query returns all matching rows', async () => {
    await driver.run("INSERT INTO items (name, val) VALUES (?, ?)", ['x', 1]);
    await driver.run("INSERT INTO items (name, val) VALUES (?, ?)", ['y', 2]);
    const rows = await driver.query('SELECT * FROM items ORDER BY id');
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('x');
    expect(rows[1].name).toBe('y');
  });

  it('query returns empty array when no rows match', async () => {
    const rows = await driver.query('SELECT * FROM items WHERE id = ?', [999]);
    expect(rows).toEqual([]);
  });

  // ── queryOne ──────────────────────────────────────────────────────────────

  it('queryOne returns first row', async () => {
    await driver.run("INSERT INTO items (name, val) VALUES (?, ?)", ['solo', 42]);
    const row = await driver.queryOne('SELECT * FROM items WHERE name = ?', ['solo']);
    expect(row).not.toBeNull();
    expect(row.val).toBe(42);
  });

  it('queryOne returns null when no row found', async () => {
    const row = await driver.queryOne('SELECT * FROM items WHERE id = ?', [0]);
    expect(row).toBeNull();
  });

  // ── queryScalar ───────────────────────────────────────────────────────────

  it('queryScalar returns single value', async () => {
    await driver.run("INSERT INTO items (name, val) VALUES (?, ?)", ['p', 7]);
    await driver.run("INSERT INTO items (name, val) VALUES (?, ?)", ['q', 3]);
    const count = await driver.queryScalar('SELECT count(*) AS n FROM items');
    expect(Number(count)).toBe(2);
  });

  it('queryScalar returns null when no rows', async () => {
    const val = await driver.queryScalar('SELECT val FROM items WHERE id = ?', [999]);
    expect(val).toBeNull();
  });

  // ── run (UPDATE / DELETE) ─────────────────────────────────────────────────

  it('run UPDATE returns correct changes count', async () => {
    await driver.run("INSERT INTO items (name, val) VALUES (?, ?)", ['u', 1]);
    await driver.run("INSERT INTO items (name, val) VALUES (?, ?)", ['u', 2]);
    const result = await driver.run("UPDATE items SET val = ? WHERE name = ?", [99, 'u']);
    expect(result.changes).toBe(2);
  });

  it('run DELETE returns correct changes count', async () => {
    await driver.run("INSERT INTO items (name, val) VALUES (?, ?)", ['del', 5]);
    const result = await driver.run("DELETE FROM items WHERE name = ?", ['del']);
    expect(result.changes).toBe(1);
    const rows = await driver.query('SELECT * FROM items');
    expect(rows).toHaveLength(0);
  });

  // ── transaction — commit ──────────────────────────────────────────────────

  it('transaction commits successfully', async () => {
    await driver.transaction(async (tx) => {
      await tx.run("INSERT INTO items (name, val) VALUES (?, ?)", ['txA', 100]);
      await tx.run("INSERT INTO items (name, val) VALUES (?, ?)", ['txB', 200]);
    });

    const rows = await driver.query('SELECT name FROM items ORDER BY id');
    expect(rows.map(r => r.name)).toEqual(['txA', 'txB']);
  });

  it('transaction returns value from callback', async () => {
    const result = await driver.transaction(async (tx) => {
      await tx.run("INSERT INTO items (name, val) VALUES (?, ?)", ['ret', 55]);
      return 'done';
    });
    expect(result).toBe('done');
  });

  // ── transaction — rollback ────────────────────────────────────────────────

  it('transaction rolls back on error', async () => {
    await expect(
      driver.transaction(async (tx) => {
        await tx.run("INSERT INTO items (name, val) VALUES (?, ?)", ['willRollback', 1]);
        // Force error: insert into non-existent table
        await tx.run("INSERT INTO nonexistent_table (x) VALUES (?)", [1]);
      })
    ).rejects.toThrow();

    // Row from the failed transaction must not exist
    const rows = await driver.query("SELECT * FROM items WHERE name = ?", ['willRollback']);
    expect(rows).toHaveLength(0);
  });
});
