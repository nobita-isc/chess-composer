/**
 * Migration 007: Chess Lessons Platform
 * Creates tables for courses, lessons, content items, assignments, progress, and gamification.
 */

export function migrate(db) {
  // Courses
  db.exec(`
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      thumbnail_url TEXT,
      skill_level TEXT DEFAULT 'beginner' CHECK(skill_level IN ('beginner', 'intermediate', 'advanced')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Lessons within courses
  db.exec(`
    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      title TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    )
  `);

  // Content items within lessons (video, pdf, puzzle, quiz)
  db.exec(`
    CREATE TABLE IF NOT EXISTS lesson_content (
      id TEXT PRIMARY KEY,
      lesson_id TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      content_type TEXT NOT NULL CHECK(content_type IN ('video', 'pdf', 'puzzle', 'quiz')),
      title TEXT NOT NULL,
      video_url TEXT,
      file_path TEXT,
      file_size INTEGER,
      duration_min INTEGER,
      puzzle_id TEXT,
      puzzle_fen TEXT,
      puzzle_moves TEXT,
      quiz_data TEXT,
      xp_reward INTEGER DEFAULT 10,
      created_at TEXT NOT NULL,
      FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
    )
  `);

  // Course assignments to students
  db.exec(`
    CREATE TABLE IF NOT EXISTS course_assignments (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      assigned_at TEXT NOT NULL,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      UNIQUE(course_id, student_id)
    )
  `);

  // Per-content-item progress tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS lesson_progress (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      content_id TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      puzzle_result TEXT,
      completed_at TEXT,
      xp_earned INTEGER DEFAULT 0,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (content_id) REFERENCES lesson_content(id) ON DELETE CASCADE,
      UNIQUE(student_id, content_id)
    )
  `);

  // Student gamification stats
  db.exec(`
    CREATE TABLE IF NOT EXISTS student_gamification (
      student_id TEXT PRIMARY KEY,
      total_xp INTEGER DEFAULT 0,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_activity_date TEXT,
      badges TEXT DEFAULT '[]',
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    )
  `);

  // Indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_lesson_content_lesson ON lesson_content(lesson_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_course_assignments_student ON course_assignments(student_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_course_assignments_course ON course_assignments(course_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_lesson_progress_student ON lesson_progress(student_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_lesson_progress_content ON lesson_progress(content_id)`);

  console.log('   Created lessons platform tables (courses, lessons, lesson_content, course_assignments, lesson_progress, student_gamification)');
}
