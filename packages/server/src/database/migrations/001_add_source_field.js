/**
 * Migration 001: Add source field to puzzles table
 * Tracks origin of puzzles: 'lichess', 'manual', 'lichess_import', 'interactive', 'pgn'
 * Portable: SQLite + Postgres. Uses addColumnIfNotExists to avoid TX poisoning on PG.
 */

import { addColumnIfNotExists } from '../migration-helpers.js';

export async function migrate(db) {
  const added = await addColumnIfNotExists(db, 'puzzles', 'source', `TEXT DEFAULT 'lichess'`);
  console.log(added ? '   Added source column to puzzles table' : '   Source column already exists');

  await db.exec(`CREATE INDEX IF NOT EXISTS idx_puzzles_source ON puzzles(source)`);
  console.log('   Created index on source column');
}

export async function rollback(db) {
  console.log('   Rollback not implemented - manual intervention required');
}
