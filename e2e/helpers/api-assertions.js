/**
 * api-assertions.js
 * Thin wrappers around Playwright's request context for backend assertions.
 * All requests go to the test API server (port 3001).
 */

const API_BASE = 'http://localhost:3001/api';

/**
 * Create an authenticated request context for direct API calls.
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} token - JWT bearer token
 */
export function makeApiClient(request, token) {
  const headers = { Authorization: `Bearer ${token}` };

  return {
    /**
     * GET /api/student-exercises/:id
     * Returns the student_exercises row for a given assignment ID.
     */
    async getAssignment(assignmentId) {
      const res = await request.get(`${API_BASE}/student-exercises/${assignmentId}`, { headers });
      if (!res.ok()) throw new Error(`GET assignment failed: ${res.status()}`);
      const body = await res.json();
      return body.data;
    },

    /**
     * GET /api/exercises/:id
     * Returns the weekly exercise with puzzles array.
     */
    async getExercise(exerciseId) {
      const res = await request.get(`${API_BASE}/exercises/${exerciseId}`, { headers });
      if (!res.ok()) throw new Error(`GET exercise failed: ${res.status()}`);
      const body = await res.json();
      return body.data;
    },

    /**
     * GET /api/students/:id/exercises
     * Returns all assignments for a student.
     */
    async getStudentExercises(studentId) {
      const res = await request.get(`${API_BASE}/students/${studentId}/exercises`, { headers });
      if (!res.ok()) throw new Error(`GET student exercises failed: ${res.status()}`);
      const body = await res.json();
      return body.data;
    },

    /**
     * Raw GET for custom endpoint assertions.
     */
    async get(path) {
      const res = await request.get(`${API_BASE}${path}`, { headers });
      return { ok: res.ok(), status: res.status(), body: await res.json().catch(() => null) };
    },
  };
}
