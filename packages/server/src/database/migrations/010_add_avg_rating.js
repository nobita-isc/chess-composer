/**
 * Migration: Add avg_rating column to weekly_exercises
 * Stores the average puzzle rating so it doesn't need recalculating on every query.
 * Backfills existing exercises from their puzzle data.
 */

export function migrate(db) {
  const tableInfo = db.prepare('PRAGMA table_info(weekly_exercises)').all();
  const hasColumn = tableInfo.some(col => col.name === 'avg_rating');

  if (!hasColumn) {
    db.exec(`ALTER TABLE weekly_exercises ADD COLUMN avg_rating INTEGER;`);
    console.log('   Added avg_rating column');

    // Backfill existing exercises
    const exercises = db.prepare('SELECT id, puzzle_ids FROM weekly_exercises').all();
    const updateStmt = db.prepare('UPDATE weekly_exercises SET avg_rating = ? WHERE id = ?');

    for (const exercise of exercises) {
      const puzzleIds = exercise.puzzle_ids.split(',').filter(Boolean);
      if (puzzleIds.length === 0) continue;

      const placeholders = puzzleIds.map(() => '?').join(',');
      const puzzles = db.prepare(
        `SELECT rating FROM puzzles WHERE id IN (${placeholders})`
      ).all(...puzzleIds);

      if (puzzles.length > 0) {
        const totalRating = puzzles.reduce((sum, p) => sum + (p.rating || 0), 0);
        const avgRating = Math.round(totalRating / puzzles.length);
        updateStmt.run(avgRating, exercise.id);
      }
    }
    console.log(`   Backfilled avg_rating for ${exercises.length} exercises`);
  } else {
    console.log('   avg_rating column already exists');
  }
}

export function rollback(db) {
  // SQLite doesn't support DROP COLUMN directly
}
