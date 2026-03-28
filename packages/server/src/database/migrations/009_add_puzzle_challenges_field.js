/**
 * Migration 009: Puzzle Challenges (multi-puzzle per content item)
 * Adds puzzle_challenges JSON column to lesson_content.
 * Stores an array of puzzle objects within a single content item.
 */

export function migrate(db) {
  try {
    db.exec('ALTER TABLE lesson_content ADD COLUMN puzzle_challenges TEXT')
  } catch (err) {
    if (!err.message?.includes('duplicate column')) throw err
  }
  console.log('   Added puzzle_challenges column to lesson_content')
}
