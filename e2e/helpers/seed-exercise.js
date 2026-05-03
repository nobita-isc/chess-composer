/**
 * seed-exercise.js
 * Seed exercise data for puzzle-solving e2e tests via the server API.
 * Uses HTTP requests (same pattern as seed-lesson.js) so the server's own
 * SQLite connection owns all writes — no WAL cross-connection visibility issues.
 *
 * Puzzle IDs from real DB:
 *   SIMPLE:    "0000D"  — 4-move endgame, white to move (opponent first)
 *   PROMOTION: "001w5"  — promotion: g7g8q
 *   ENPASSANT: "01sTk"  — en passant capture: h5g6
 *   CASTLING:  "12lYH"  — castling queenside: e1c1
 *   SHORT:     "001cr"  — 2-move puzzle (opp c5c4, player d7e8)
 */

import { tokenFor } from '../../packages/server/test-utils/sign-test-token.js';

const SERVER_BASE = 'http://localhost:3001/api';

// Real puzzle IDs from the DB
export const PUZZLE_IDS = {
  SIMPLE:    '0000D',
  PROMOTION: '001w5',
  ENPASSANT: '01sTk',
  CASTLING:  '12lYH',
  SHORT:     '001cr',
};

async function apiFetch(path, method, token, body) {
  const resp = await fetch(`${SERVER_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await resp.json();
  if (!data.success) {
    throw new Error(`API ${method} ${path} failed (${resp.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

/**
 * Seed an exercise scenario for puzzle-solving e2e tests.
 * Creates: student, user, weekly_exercise, student_exercises assignment.
 * Returns IDs + a fresh student JWT for use in tests.
 *
 * @param {string} adminToken - signed admin JWT from auth state
 * @param {{ puzzleIds?: string[], name?: string }} [opts]
 * @returns {Promise<{
 *   studentId: string,      // students.id
 *   userId: string,         // users.id
 *   studentToken: string,   // signed JWT with student_id
 *   exerciseId: string,     // weekly_exercises.id
 *   assignmentId: string,   // student_exercises.id
 *   puzzleIds: string[],
 * }>}
 */
let _seedCounter = 0;

export async function seedExercise(adminToken, opts = {}) {
  const puzzleIds = opts.puzzleIds || [PUZZLE_IDS.SIMPLE];
  const name = opts.name || 'E2E Exercise';
  // Use counter + timestamp to avoid collisions in parallel Promise.all calls
  const uid = `${Date.now()}_${++_seedCounter}`;

  // 1. Create student profile
  const studentResp = await apiFetch('/students', 'POST', adminToken, {
    name: `E2E Exercise Student ${uid}`,
    email: `e2e_ex_${uid}@test.com`,
    skill_level: 'beginner',
  });
  const studentId = studentResp.data.id;

  // 2. Create a dedicated user account linked to the student profile
  const username = `e2e_ex_${uid}`;
  const userResp = await apiFetch('/users', 'POST', adminToken, {
    username,
    password: 'E2eExercise@2026',
    role: 'student',
    student_id: studentId,
  });
  const userId = userResp.data.id;

  // 3. Sign a student JWT for this user (no live login needed)
  const studentToken = tokenFor({
    id: userId,
    username,
    role: 'student',
    student_id: studentId,
  });

  // 4. Create weekly exercise (admin only)
  const exResp = await apiFetch('/exercises', 'POST', adminToken, {
    puzzleIds,
    name,
    weekStart: '2026-05-01',
  });
  const exerciseId = exResp.data.id;

  // 5. Assign exercise to student
  const assignResp = await apiFetch(`/exercises/${exerciseId}/assign`, 'POST', adminToken, {
    studentIds: [studentId],
  });
  // Response: { data: { assigned: [{ id, student_id, exercise_id, ... }], errors: [] } }
  const assignmentId = assignResp.data?.assigned?.[0]?.id;

  return { studentId, userId, studentToken, exerciseId, assignmentId, puzzleIds };
}
