/**
 * count-verifier.js
 * Compares per-table row counts between SQLite and Postgres.
 * Used as final step in migrate-to-postgres to confirm data integrity.
 * Never reads row contents — counts only.
 */

/**
 * Count rows in a SQLite table synchronously via raw better-sqlite3.
 * @param {import('better-sqlite3').Database} sqliteRawDb
 * @param {string} table
 * @returns {number}
 */
function sqliteCount(sqliteRawDb, table) {
  const row = sqliteRawDb.prepare(`SELECT count(*) AS n FROM "${table}"`).get();
  return Number(row.n);
}

/**
 * Count rows in a Postgres table via async pgDriver.
 * @param {object} pgDriver
 * @param {string} table
 * @returns {Promise<number>}
 */
async function pgCount(pgDriver, table) {
  const row = await pgDriver.queryOne(`SELECT count(*) AS n FROM "${table}"`);
  return Number(row?.n ?? 0);
}

/**
 * Compare row counts for each table between SQLite and Postgres.
 * Runs Postgres queries concurrently for speed.
 *
 * @param {import('better-sqlite3').Database} sqliteRawDb - raw better-sqlite3 instance
 * @param {object} pgDriver - PostgresDriver instance
 * @param {Array<{ name: string }>} tables - ordered table list from manifest
 * @returns {Promise<Array<{ table: string, sqliteCount: number, pgCount: number, match: boolean }>>}
 */
export async function verifyCounts(sqliteRawDb, pgDriver, tables) {
  // Fetch SQLite counts synchronously (no I/O wait needed — local file)
  const sqliteCounts = tables.map(t => ({ name: t.name, count: sqliteCount(sqliteRawDb, t.name) }));

  // Fetch Postgres counts concurrently
  const pgCounts = await Promise.all(
    tables.map(async t => ({ name: t.name, count: await pgCount(pgDriver, t.name) }))
  );

  const pgMap = new Map(pgCounts.map(r => [r.name, r.count]));

  return sqliteCounts.map(({ name, count: sc }) => {
    const pc = pgMap.get(name) ?? 0;
    return {
      table: name,
      sqliteCount: sc,
      pgCount: pc,
      match: sc === pc,
    };
  });
}
