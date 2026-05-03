/**
 * seed-lesson.js
 * Seeds course + lesson + puzzle content + student + assignment via server admin API.
 * 100% HTTP — no direct SQLite reads — works regardless of which DB the server uses.
 *
 * Also exports API-based assertion helpers (countProgressViaApi, resetViaApi).
 */

const SERVER_BASE = 'http://localhost:3001/api';

// Single-challenge puzzle: scholar's mate position, white to move, Qxf7#
const SIMPLE_PUZZLE_FEN = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4';
const SIMPLE_PUZZLE_MOVES = 'Qxf7#';

// Black-to-move puzzle
const BLACK_PUZZLE_FEN = 'rnbqkbnr/ppp2ppp/3p4/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 1 3';
const BLACK_PUZZLE_MOVES = 'Qxf3';

// Multi-challenge JSON (stored in puzzle_challenges column)
const MULTI_CHALLENGES = JSON.stringify([
  {
    title: 'Challenge 1 – Bishop strike',
    puzzle_fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq e6 0 4',
    puzzle_moves: 'Bxf7+',
    puzzle_instruction: 'Find the bishop sacrifice',
    puzzle_hints: null,
  },
  {
    title: 'Challenge 2 – Finish it',
    puzzle_fen: 'r1bqkb1r/pppp1Bpp/2n2n2/4p3/4P3/8/PPPP1PPP/RNBQK1NR b KQkq - 0 4',
    puzzle_moves: 'Ke7',
    puzzle_instruction: 'King must move',
    puzzle_hints: null,
  },
]);

async function apiFetch(path, method, token, body = null) {
  const opts = {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const resp = await fetch(`${SERVER_BASE}${path}`, opts);
  const data = await resp.json();
  if (!data.success) throw new Error(`API ${method} ${path} failed (${resp.status}): ${data.error}`);
  return data;
}

/**
 * Seed a complete lesson scenario via the server's admin API.
 * No direct DB access — works with any DB the server is using.
 *
 * @param {string} adminToken - signed admin JWT
 * @returns {Promise<{
 *   courseId, lessonId, contentId, blackContentId, multiContentId,
 *   studentId, userId
 * }>}
 */
export async function seedLesson(adminToken) {
  // 1. Course
  const courseResp = await apiFetch('/courses', 'POST', adminToken, {
    title: 'E2E Lesson Test Course',
    description: 'Puzzle play e2e tests',
    skill_level: 'beginner',
  });
  const courseId = courseResp.data.id;

  // 2. Lesson
  const lessonResp = await apiFetch(`/courses/${courseId}/lessons`, 'POST', adminToken, {
    title: 'Lesson 1 – Tactics',
    order_index: 0,
  });
  const lessonId = lessonResp.data.id;

  // 3a. Single-challenge puzzle content (white to move)
  const contentResp = await apiFetch(`/lessons/${lessonId}/content`, 'POST', adminToken, {
    content_type: 'puzzle',
    title: 'Simple Mating Puzzle',
    puzzle_fen: SIMPLE_PUZZLE_FEN,
    puzzle_moves: SIMPLE_PUZZLE_MOVES,
    xp_reward: 10,
    order_index: 0,
  });
  const contentId = contentResp.data.id;

  // 3b. Black-to-move puzzle
  const blackResp = await apiFetch(`/lessons/${lessonId}/content`, 'POST', adminToken, {
    content_type: 'puzzle',
    title: 'Black to Move Puzzle',
    puzzle_fen: BLACK_PUZZLE_FEN,
    puzzle_moves: BLACK_PUZZLE_MOVES,
    xp_reward: 10,
    order_index: 1,
  });
  const blackContentId = blackResp.data.id;

  // 3c. Multi-challenge puzzle content
  const multiResp = await apiFetch(`/lessons/${lessonId}/content`, 'POST', adminToken, {
    content_type: 'puzzle',
    title: 'Multi-Challenge Puzzle',
    xp_reward: 20,
    order_index: 2,
  });
  const multiContentId = multiResp.data.id;

  // Update multi-content with puzzle_challenges
  await apiFetch(`/content/${multiContentId}`, 'PUT', adminToken, {
    puzzle_challenges: MULTI_CHALLENGES,
  });

  // 4. Create student profile via API
  const studentResp = await apiFetch('/students', 'POST', adminToken, {
    name: 'E2E Lesson Student',
    email: 'e2e-lesson-test@test.com',
    skill_level: 'beginner',
  });
  const studentId = studentResp.data.id;

  // 5. Create a dedicated student user account linked to the student profile
  const username = `e2e_lesson_student_${Date.now()}`;
  const userResp = await apiFetch('/users', 'POST', adminToken, {
    username,
    password: 'E2eLesson@2026',
    role: 'student',
    student_id: studentId,
  });
  const userId = userResp.data.id;

  // 6. Assign course to student
  await apiFetch(`/courses/${courseId}/assign`, 'POST', adminToken, {
    studentIds: [studentId],
  });

  return { courseId, lessonId, contentId, blackContentId, multiContentId, studentId, userId };
}

/**
 * Get content completion status via student API.
 * Returns { completed, puzzle_result } or null if not found.
 * @param {string} studentToken - JWT with student_id
 * @param {string} courseId
 * @param {string} contentId
 */
export async function getContentStatus(studentToken, courseId, contentId) {
  const resp = await fetch(`${SERVER_BASE}/my/courses/${courseId}`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const data = await resp.json();
  if (!data.success) return null;
  const allContent = (data.data.lessons || []).flatMap(l => l.content || []);
  const item = allContent.find(c => c.id === contentId);
  return item ? { completed: item.completed, puzzle_result: item.puzzle_result } : null;
}
