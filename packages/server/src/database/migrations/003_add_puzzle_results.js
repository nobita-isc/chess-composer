/**
 * Migration: Add puzzle_results column to student_exercises
 * Stores per-puzzle grades as comma-separated values (1=correct, 0=wrong, empty=not graded)
 * Example: "1,0,1,1,0,0,0,0,1,0" for 10 puzzles
 */

export function migrate(db) {
  // Check if column already exists
  const tableInfo = db.prepare('PRAGMA table_info(student_exercises)').all();
  const hasColumn = tableInfo.some(col => col.name === 'puzzle_results');

  if (!hasColumn) {
    db.exec(`
      ALTER TABLE student_exercises ADD COLUMN puzzle_results TEXT;
    `);
    console.log('   Added puzzle_results column');
  } else {
    console.log('   puzzle_results column already exists');
  }
}

export function rollback(db) {
  // SQLite doesn't support DROP COLUMN directly, so we'd need to recreate the table
  // For simplicity, we'll leave the column in place during rollback
}
