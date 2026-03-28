/**
 * Migration 008: Puzzle Composer Fields
 * Adds puzzle_instruction, puzzle_hints (JSON), and puzzle_video_url to lesson_content.
 * Supports chess.com-style puzzle challenges with per-move hints and explanations.
 */

export function migrate(db) {
  const columns = [
    { name: 'puzzle_instruction', sql: 'ALTER TABLE lesson_content ADD COLUMN puzzle_instruction TEXT' },
    { name: 'puzzle_hints', sql: 'ALTER TABLE lesson_content ADD COLUMN puzzle_hints TEXT' },
    { name: 'puzzle_video_url', sql: 'ALTER TABLE lesson_content ADD COLUMN puzzle_video_url TEXT' }
  ]

  for (const col of columns) {
    try {
      db.exec(col.sql)
    } catch (err) {
      if (!err.message?.includes('duplicate column')) throw err
    }
  }

  console.log('   Added puzzle composer fields (puzzle_instruction, puzzle_hints, puzzle_video_url) to lesson_content')
}
