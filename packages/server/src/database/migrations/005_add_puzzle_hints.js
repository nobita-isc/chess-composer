/**
 * Migration: Add puzzle_hints column to student_exercises
 * Stores per-puzzle hint usage as comma-separated values (1=used hint, 0=no hint)
 * Example: "0,1,0,0,1,0,0,0,0,0" for 10 puzzles where hints were used on puzzles 2 and 5
 */

export function migrate(db) {
  const tableInfo = db.prepare('PRAGMA table_info(student_exercises)').all();
  const hasColumn = tableInfo.some(col => col.name === 'puzzle_hints');

  if (!hasColumn) {
    db.exec(`
      ALTER TABLE student_exercises ADD COLUMN puzzle_hints TEXT;
    `);
    console.log('   Added puzzle_hints column');
  } else {
    console.log('   puzzle_hints column already exists');
  }
}

export function rollback(db) {
  // SQLite doesn't support DROP COLUMN directly
}
