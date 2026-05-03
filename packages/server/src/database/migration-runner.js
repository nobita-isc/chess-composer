/**
 * migration-runner.js
 * Idempotent migration runner for SQLite and Postgres.
 * Tracks applied migrations in schema_migrations table.
 * Each migration runs inside a transaction.
 */

import { createRequire } from 'module';
import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const MIGRATIONS_TABLE = 'schema_migrations';

/**
 * Ensure the schema_migrations tracking table exists.
 * @param {object} db - database instance (SqliteDatabase or driver)
 */
async function ensureMigrationsTable(db) {
  await db.exec(
    `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`
  );
}

/**
 * Get set of already-applied migration versions.
 * @param {object} db
 * @returns {Promise<Set<string>>}
 */
async function getAppliedVersions(db) {
  const rows = await db.query(`SELECT version FROM ${MIGRATIONS_TABLE}`);
  return new Set(rows.map(r => r.version));
}

/**
 * List migration files sorted alphabetically (without .js extension = version key).
 * @returns {Array<{ version: string, file: string }>}
 */
function listMigrationFiles() {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.js'))
    .sort();
  return files.map(f => ({ version: f.replace(/\.js$/, ''), file: path.join(MIGRATIONS_DIR, f) }));
}

/**
 * Run all pending migrations in order, each inside a transaction.
 * Idempotent: already-applied migrations are skipped.
 * @param {object} db - database instance (SqliteDatabase)
 */
export async function runMigrations(db) {
  await ensureMigrationsTable(db);
  const applied = await getAppliedVersions(db);
  const pending = listMigrationFiles().filter(m => !applied.has(m.version));

  if (pending.length === 0) {
    console.log('   No pending migrations');
    return;
  }

  for (const { version, file } of pending) {
    console.log(`   Applying migration: ${version}`);
    const mod = await import(`file://${file}`);
    const migrate = mod.migrate;
    if (typeof migrate !== 'function') {
      throw new Error(`Migration ${version} does not export a migrate() function`);
    }

    await db.transaction(async (txDriver) => {
      await migrate(txDriver);
      const now = new Date().toISOString();
      await txDriver.run(
        `INSERT INTO ${MIGRATIONS_TABLE} (version, applied_at) VALUES (?, ?)`,
        [version, now]
      );
    });

    console.log(`   Applied: ${version}`);
  }

  console.log(`   Migrations complete (${pending.length} applied)`);
}
