/**
 * Migration: Add source field to puzzles table
 * Tracks origin of puzzles: 'lichess', 'manual', 'lichess_import', 'interactive', 'pgn'
 */

export function migrate(db) {
  // Check if column already exists
  const tableInfo = db.prepare("PRAGMA table_info(puzzles)").all();
  const hasSource = tableInfo.some(col => col.name === 'source');

  if (!hasSource) {
    db.exec(`
      ALTER TABLE puzzles ADD COLUMN source TEXT DEFAULT 'lichess';
    `);
    console.log('   Added source column to puzzles table');
  } else {
    console.log('   Source column already exists');
  }

  // Create index if not exists
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_puzzles_source ON puzzles(source);`);
    console.log('   Created index on source column');
  } catch (error) {
    // Index might already exist
  }
}

export function rollback(db) {
  // SQLite doesn't support DROP COLUMN easily, so we'd need to recreate the table
  console.log('   Rollback not implemented - manual intervention required');
}
