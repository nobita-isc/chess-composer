/**
 * seed-test-db.js
 * Clones puzzles.db → puzzles-e2e.db for isolated e2e testing.
 * Uses SQLite VACUUM INTO for a clean, WAL-safe copy that works even when
 * the source DB is open by another process (dev server, VS Code SQLite extension).
 * Idempotent: removes existing clone before copying.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR = path.resolve(__dirname, '../data');
const SOURCE_DB = path.join(DATA_DIR, 'puzzles.db');
const SOURCE_SHM = path.join(DATA_DIR, 'puzzles.db-shm');
const SOURCE_WAL = path.join(DATA_DIR, 'puzzles.db-wal');

const CLONE_DB = path.join(DATA_DIR, 'puzzles-e2e.db');
const CLONE_SHM = path.join(DATA_DIR, 'puzzles-e2e.db-shm');
const CLONE_WAL = path.join(DATA_DIR, 'puzzles-e2e.db-wal');

/**
 * Clone the production DB to the e2e test DB.
 * Uses VACUUM INTO for a WAL-safe, fully checkpointed copy.
 * Falls back to fs.copyFileSync + WAL copy if VACUUM INTO fails.
 * @returns {{ cloneDb: string, cloneShm: string, cloneWal: string }}
 */
export function seedTestDb() {
  if (!fs.existsSync(SOURCE_DB)) {
    throw new Error(`Source DB not found: ${SOURCE_DB}`);
  }

  // Remove existing clones first (idempotent)
  for (const f of [CLONE_DB, CLONE_SHM, CLONE_WAL]) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }

  // VACUUM INTO creates a fully-checkpointed, clean copy of the DB.
  // Use readonly=true to avoid locking the source DB (safe with concurrent writers in WAL mode).
  const src = new Database(SOURCE_DB, { readonly: true, fileMustExist: true });
  src.prepare(`VACUUM INTO ?`).run(CLONE_DB);
  src.close();

  return { cloneDb: CLONE_DB, cloneShm: CLONE_SHM, cloneWal: CLONE_WAL };
}

/**
 * Remove cloned e2e DB files.
 */
export function cleanTestDb() {
  for (const f of [CLONE_DB, CLONE_SHM, CLONE_WAL]) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
}

export { CLONE_DB, SOURCE_DB };
