/**
 * Migration 008: Puzzle Composer Fields
 * Adds puzzle_instruction, puzzle_hints (JSON), and puzzle_video_url to lesson_content.
 * Portable: SQLite + Postgres. Uses addColumnIfNotExists to avoid TX poisoning on PG.
 */

import { addColumnIfNotExists } from '../migration-helpers.js';

const COLUMNS = [
  { column: 'puzzle_instruction', type: 'TEXT' },
  { column: 'puzzle_hints',       type: 'TEXT' },
  { column: 'puzzle_video_url',   type: 'TEXT' },
];

export async function migrate(db) {
  for (const { column, type } of COLUMNS) {
    await addColumnIfNotExists(db, 'lesson_content', column, type);
  }
  console.log('   Added puzzle composer fields (puzzle_instruction, puzzle_hints, puzzle_video_url) to lesson_content');
}
