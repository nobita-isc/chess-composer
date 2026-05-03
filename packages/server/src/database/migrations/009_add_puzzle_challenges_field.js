/**
 * Migration 009: Puzzle Challenges (multi-puzzle per content item)
 * Adds puzzle_challenges JSON column to lesson_content.
 * Portable: SQLite + Postgres. Uses addColumnIfNotExists to avoid TX poisoning on PG.
 */

import { addColumnIfNotExists } from '../migration-helpers.js';

export async function migrate(db) {
  const added = await addColumnIfNotExists(db, 'lesson_content', 'puzzle_challenges', 'TEXT');
  console.log(added ? '   Added puzzle_challenges column to lesson_content' : '   puzzle_challenges column already exists');
}
