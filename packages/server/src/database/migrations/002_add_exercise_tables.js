/**
 * Migration: Add exercise management tables
 * - students: Student profiles
 * - weekly_exercises: Weekly exercise sets
 * - student_exercises: Assignments and grades
 */

export function migrate(db) {
  // Create students table
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      skill_level TEXT DEFAULT 'beginner',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create weekly_exercises table
  db.exec(`
    CREATE TABLE IF NOT EXISTS weekly_exercises (
      id TEXT PRIMARY KEY,
      week_start TEXT NOT NULL,
      week_end TEXT NOT NULL,
      name TEXT,
      puzzle_ids TEXT NOT NULL,
      filters TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create student_exercises table (assignments and grades)
  db.exec(`
    CREATE TABLE IF NOT EXISTS student_exercises (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      score INTEGER,
      total_puzzles INTEGER,
      answer_pdf_path TEXT,
      status TEXT DEFAULT 'assigned',
      assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
      graded_at TEXT,
      notes TEXT,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES weekly_exercises(id) ON DELETE CASCADE
    );
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);
    CREATE INDEX IF NOT EXISTS idx_weekly_exercises_week ON weekly_exercises(week_start);
    CREATE INDEX IF NOT EXISTS idx_student_exercises_student ON student_exercises(student_id);
    CREATE INDEX IF NOT EXISTS idx_student_exercises_exercise ON student_exercises(exercise_id);
    CREATE INDEX IF NOT EXISTS idx_student_exercises_status ON student_exercises(status);
  `);
}

export function rollback(db) {
  db.exec(`
    DROP TABLE IF EXISTS student_exercises;
    DROP TABLE IF EXISTS weekly_exercises;
    DROP TABLE IF EXISTS students;
  `);
}
