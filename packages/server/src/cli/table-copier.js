/**
 * table-copier.js
 * Streams rows from SQLite → Postgres in batches using parameterized multi-row INSERTs.
 * Uses ON CONFLICT (pk) DO NOTHING for idempotency.
 *
 * IMPORTANT: sqliteRawDb must be the raw better-sqlite3 Database instance (not async wrapper)
 * so that .prepare(...).iterate() cursor is available. pgDriver is the async PostgresDriver.
 */

import { report, complete } from './progress-reporter.js';

const PG_MAX_PARAMS = 60000; // leave headroom below hard 65535 limit

/**
 * Get column names for a SQLite table via PRAGMA table_info.
 * @param {import('better-sqlite3').Database} sqliteRawDb
 * @param {string} table
 * @returns {string[]}
 */
function getColumns(sqliteRawDb, table) {
  const rows = sqliteRawDb.prepare(`PRAGMA table_info(${table})`).all();
  if (rows.length === 0) throw new Error(`Table "${table}" not found in SQLite (PRAGMA returned no rows)`);
  return rows.map(r => r.name);
}

/**
 * Count rows in a SQLite table synchronously.
 * @param {import('better-sqlite3').Database} sqliteRawDb
 * @param {string} table
 * @returns {number}
 */
function countRows(sqliteRawDb, table) {
  const row = sqliteRawDb.prepare(`SELECT count(*) AS n FROM "${table}"`).get();
  return Number(row.n);
}

/**
 * Build a multi-row INSERT SQL with $N Postgres placeholders.
 * @param {string} table
 * @param {string[]} columns
 * @param {string[]} pk - conflict target column(s)
 * @param {number} rowCount - number of rows in this batch
 * @returns {string}
 */
function buildInsertSql(table, columns, pk, rowCount) {
  const colList = columns.map(c => `"${c}"`).join(', ');
  const conflictCols = pk.map(c => `"${c}"`).join(', ');
  const colCount = columns.length;

  const valuePlaceholders = [];
  for (let r = 0; r < rowCount; r++) {
    const params = columns.map((_, c) => `$${r * colCount + c + 1}`);
    valuePlaceholders.push(`(${params.join(', ')})`);
  }

  return (
    `INSERT INTO "${table}" (${colList}) VALUES ${valuePlaceholders.join(', ')} ` +
    `ON CONFLICT (${conflictCols}) DO NOTHING`
  );
}

/**
 * Flush one batch of rows to Postgres.
 * @param {object} pgDriver
 * @param {string} table
 * @param {string[]} columns
 * @param {string[]} pk
 * @param {object[]} rows
 * @returns {Promise<number>} number of rows inserted (after ON CONFLICT filtering)
 */
async function flushBatch(pgDriver, table, columns, pk, rows) {
  if (rows.length === 0) return 0;
  const sql = buildInsertSql(table, columns, pk, rows.length);
  const flatParams = rows.flatMap(row => columns.map(col => {
    const v = row[col];
    // Convert undefined to null — pg driver rejects undefined
    return v === undefined ? null : v;
  }));
  const result = await pgDriver.run(sql, flatParams);
  return result.changes ?? 0;
}

/**
 * Copy all rows from one SQLite table to Postgres in streaming batches.
 *
 * @param {{
 *   sqliteRawDb: import('better-sqlite3').Database,
 *   pgDriver: object,
 *   table: { name: string, pk: string[] },
 *   batchSize: number,
 *   dryRun?: boolean,
 * }} opts
 * @returns {Promise<{ inserted: number, total: number }>}
 */
export async function copyTable({ sqliteRawDb, pgDriver, table, batchSize, dryRun = false }) {
  const { name, pk } = table;
  const columns = getColumns(sqliteRawDb, name);
  const total = countRows(sqliteRawDb, name);

  // Cap batch size so total param count stays under PG_MAX_PARAMS
  const cappedBatchSize = Math.min(batchSize, Math.floor(PG_MAX_PARAMS / columns.length));

  if (total === 0) {
    complete(name, 0, 0);
    return { inserted: 0, total: 0 };
  }

  const iter = sqliteRawDb.prepare(`SELECT * FROM "${name}"`).iterate();
  let batch = [];
  let done = 0;
  let inserted = 0;

  for (const row of iter) {
    batch.push(row);

    if (batch.length >= cappedBatchSize) {
      if (!dryRun) {
        inserted += await flushBatch(pgDriver, name, columns, pk, batch);
      } else {
        inserted += batch.length; // dry-run: count as if inserted
      }
      done += batch.length;
      batch = [];
      report(name, done, total);
    }
  }

  // Flush remainder
  if (batch.length > 0) {
    if (!dryRun) {
      inserted += await flushBatch(pgDriver, name, columns, pk, batch);
    } else {
      inserted += batch.length;
    }
    done += batch.length;
  }

  complete(name, inserted, total);
  return { inserted, total };
}
