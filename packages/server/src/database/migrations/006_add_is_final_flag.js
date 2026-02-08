/**
 * Migration: Add is_final column to student_exercises
 * When is_final = 1, students can no longer solve/modify the exercise.
 */

export function migrate(db) {
  const tableInfo = db.prepare('PRAGMA table_info(student_exercises)').all();
  const hasColumn = tableInfo.some(col => col.name === 'is_final');

  if (!hasColumn) {
    db.exec(`
      ALTER TABLE student_exercises ADD COLUMN is_final INTEGER DEFAULT 0;
    `);
    console.log('   Added is_final column');
  } else {
    console.log('   is_final column already exists');
  }
}

export function rollback(db) {
  // SQLite doesn't support DROP COLUMN directly
}
