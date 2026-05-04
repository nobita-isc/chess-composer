/**
 * migrate-to-postgres.js
 * CLI entry point: one-way SQLite → Postgres data migration.
 *
 * Usage:
 *   node src/cli/migrate-to-postgres.js [options]
 *
 * Options:
 *   --source-sqlite=<path>   Path to SQLite .db file (default: SQLITE_PATH env or data/puzzles.db)
 *   --target-url=<url>       Postgres connection URL (default: DATABASE_URL env)
 *   --batch-size=<n>         Rows per INSERT batch (default: 1000; auto-capped by column count)
 *   --table=<name>           Copy a single table only
 *   --verify-only            Skip copy; run count verification only
 *   --dry-run                Parse + connect but do not write to Postgres
 *   --allow-non-empty        Proceed even if Postgres already has data
 *   --help                   Print this help
 *
 * Exit codes: 0 = success/match, 1 = count mismatch, 2 = connection/fatal error
 *
 * SECURITY: row contents are never logged. Only table names and counts are printed.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { PostgresDriver } from '../database/drivers/postgres-driver.js';
import { runMigrations } from '../database/migration-runner.js';
import { getOrderedTables, getSerialPkTables, getTable, assertCompleteness } from './table-manifest.js';
import { copyTable } from './table-copier.js';
import { verifyCounts } from './count-verifier.js';
import { info } from './progress-reporter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_SQLITE = path.join(__dirname, '../../../data/puzzles.db');
const DEFAULT_BATCH_SIZE = 1000;

// ---------------------------------------------------------------------------
// Argv parser (no external deps)
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    sourceSqlite: process.env.SQLITE_PATH || DEFAULT_SQLITE,
    targetUrl: process.env.DATABASE_URL || null,
    batchSize: DEFAULT_BATCH_SIZE,
    table: null,
    verifyOnly: false,
    dryRun: false,
    allowNonEmpty: false,
    help: false,
  };

  for (const arg of argv.slice(2)) {
    if (arg === '--help' || arg === '-h') { args.help = true; continue; }
    if (arg === '--verify-only')          { args.verifyOnly = true; continue; }
    if (arg === '--dry-run')              { args.dryRun = true; continue; }
    if (arg === '--allow-non-empty')      { args.allowNonEmpty = true; continue; }

    const [key, ...rest] = arg.split('=');
    const val = rest.join('=');

    if (key === '--source-sqlite') { args.sourceSqlite = val; continue; }
    if (key === '--target-url')    { args.targetUrl = val; continue; }
    if (key === '--batch-size')    { args.batchSize = Math.max(1, parseInt(val, 10) || DEFAULT_BATCH_SIZE); continue; }
    if (key === '--table')         { args.table = val; continue; }
  }

  return args;
}

function printHelp() {
  console.log(`
migrate-to-postgres — one-way SQLite → Postgres data migration

Usage:
  node src/cli/migrate-to-postgres.js [options]

Options:
  --source-sqlite=<path>   SQLite source file  (default: SQLITE_PATH env or data/puzzles.db)
  --target-url=<url>       Postgres URL        (default: DATABASE_URL env)
  --batch-size=<n>         Rows per batch      (default: ${DEFAULT_BATCH_SIZE}; auto-capped per column count)
  --table=<name>           Single-table mode
  --verify-only            Count comparison only — no writes
  --dry-run                Connect, plan, but do not insert
  --allow-non-empty        Skip safety check for non-empty Postgres target
  --help                   Print this help

Exit codes:  0 = OK / counts match  |  1 = count mismatch  |  2 = fatal error
`.trim());
}

// ---------------------------------------------------------------------------
// Safety: refuse if PG already has data
// ---------------------------------------------------------------------------

async function checkTargetEmpty(pgDriver, tables) {
  const nonEmpty = [];
  for (const t of tables) {
    const row = await pgDriver.queryOne(`SELECT count(*) AS n FROM "${t.name}"`);
    const n = Number(row?.n ?? 0);
    if (n > 0) nonEmpty.push({ name: t.name, count: n });
  }
  return nonEmpty;
}

// ---------------------------------------------------------------------------
// Sequence reset for BIGSERIAL tables
// ---------------------------------------------------------------------------

async function resetSequences(pgDriver, dryRun) {
  const serialTables = getSerialPkTables();
  for (const t of serialTables) {
    const pk = t.pk[0];
    const sql =
      `SELECT setval(pg_get_serial_sequence('${t.name}', '${pk}'), ` +
      `GREATEST((SELECT COALESCE(MAX("${pk}"), 0) FROM "${t.name}"), 1))`;
    if (!dryRun) {
      await pgDriver.queryOne(sql);
    }
    info(`  Sequence reset: ${t.name}.${pk}${dryRun ? ' (dry-run, skipped)' : ''}`);
  }
}

// ---------------------------------------------------------------------------
// Summary table printer
// ---------------------------------------------------------------------------

function printSummary(results, copyResults) {
  const copyMap = new Map((copyResults || []).map(r => [r.table, r.inserted]));
  const COL = [20, 10, 10, 7, 14];
  const header = ['table', 'sqlite', 'pg', 'match', 'inserted-run'];
  const sep = COL.map(w => '-'.repeat(w)).join('+');

  const pad = (s, w) => String(s).padEnd(w);
  console.log(sep);
  console.log(COL.map((w, i) => pad(header[i], w)).join('|'));
  console.log(sep);
  for (const r of results) {
    const ins = copyMap.has(r.table) ? String(copyMap.get(r.table)) : 'n/a';
    console.log([
      pad(r.table, COL[0]),
      pad(r.sqliteCount, COL[1]),
      pad(r.pgCount, COL[2]),
      pad(r.match ? 'YES' : 'NO', COL[3]),
      pad(ins, COL[4]),
    ].join('|'));
  }
  console.log(sep);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!args.targetUrl) {
    console.error('ERROR: --target-url or DATABASE_URL env is required.');
    process.exit(2);
  }

  // --- Open SQLite (read-only raw instance) ---
  let sqliteRawDb;
  try {
    sqliteRawDb = new Database(args.sourceSqlite, { readonly: true, fileMustExist: true });
  } catch (err) {
    console.error(`ERROR: Cannot open SQLite file "${args.sourceSqlite}": ${err.message}`);
    process.exit(2);
  }

  // --- Open Postgres ---
  const pgDriver = new PostgresDriver();
  try {
    await pgDriver.connect({ databaseUrl: args.targetUrl });
  } catch (err) {
    sqliteRawDb.close();
    console.error(`ERROR: Cannot connect to Postgres: ${err.message}`);
    process.exit(2);
  }

  try {
    // --- Determine table list ---
    const allTables = getOrderedTables();
    assertCompleteness(sqliteRawDb);

    let tables;
    if (args.table) {
      const entry = getTable(args.table);
      if (!entry) {
        console.error(`ERROR: Table "${args.table}" is not in the manifest.`);
        process.exit(2);
      }
      tables = [entry];
    } else {
      tables = allTables;
    }

    // --- Run schema migrations on PG first (creates tables before any other check) ---
    if (!args.verifyOnly && !args.dryRun) {
      info('\nRunning schema migrations on Postgres...');
      await runMigrations(pgDriver);
    }

    // --- Safety: non-empty check (after migrations so tables exist) ---
    // Skip for --dry-run (tables untouched) and --verify-only (no writes planned).
    if (!args.verifyOnly && !args.dryRun && !args.allowNonEmpty) {
      const nonEmpty = await checkTargetEmpty(pgDriver, tables);
      if (nonEmpty.length > 0) {
        console.error('ERROR: Postgres target is not empty. Tables with existing data:');
        for (const t of nonEmpty) console.error(`  ${t.name}: ${t.count} rows`);
        console.error('Use --allow-non-empty to proceed anyway (ON CONFLICT DO NOTHING keeps existing data).');
        process.exit(2);
      }
    }

    // --- Copy tables ---
    const copyResults = [];
    if (!args.verifyOnly) {
      info(`\nCopying ${tables.length} table(s) | batch-size=${args.batchSize}${args.dryRun ? ' | DRY-RUN' : ''}...\n`);
      for (const table of tables) {
        const result = await copyTable({
          sqliteRawDb,
          pgDriver,
          table,
          batchSize: args.batchSize,
          dryRun: args.dryRun,
        });
        copyResults.push({ table: table.name, inserted: result.inserted, total: result.total });
      }

      // --- Reset sequences ---
      info('\nResetting sequences...');
      await resetSequences(pgDriver, args.dryRun);
    }

    // --- Verify counts ---
    info('\nVerifying row counts...');
    let verifyResults;
    if (args.dryRun) {
      // In dry-run, pg side is untouched — skip actual verification
      verifyResults = tables.map(t => {
        const row = sqliteRawDb.prepare(`SELECT count(*) AS n FROM "${t.name}"`).get();
        return { table: t.name, sqliteCount: Number(row.n), pgCount: 0, match: false };
      });
      info('  (dry-run: pg counts not verified)');
    } else {
      verifyResults = await verifyCounts(sqliteRawDb, pgDriver, tables);
    }

    // --- Print summary ---
    console.log('\nMigration summary:');
    printSummary(verifyResults, copyResults);

    const mismatches = verifyResults.filter(r => !r.match);
    if (mismatches.length > 0 && !args.dryRun) {
      console.error(`\nWARNING: ${mismatches.length} table(s) have count mismatches.`);
      process.exitCode = 1;
    } else if (!args.dryRun) {
      console.log('\nAll counts match.');
    }

  } catch (err) {
    console.error(`FATAL: ${err.message}`);
    process.exitCode = 2;
  } finally {
    sqliteRawDb.close();
    await pgDriver.close();
  }
}

main();
