/**
 * sign-test-token.js
 * Generates JWT tokens for e2e tests using the same secret as the live server.
 * Imports JWT_SECRET from AuthService to avoid drift if secret changes.
 */

import jwt from 'jsonwebtoken';

// Mirror AuthService.js: same env var + same fallback secret
const JWT_SECRET = process.env.JWT_SECRET || 'chess-composer-dev-secret-change-in-production';
const ACCESS_TOKEN_EXPIRY = '1h'; // longer than 15m so e2e tests don't expire mid-run

/**
 * Generate a signed access token for a test user.
 * Payload mirrors what authMiddleware.js expects: { id, username, role, student_id }
 *
 * @param {{ id: string, username: string, role: string, student_id?: string|null }} payload
 * @returns {string} signed JWT
 */
export function tokenFor({ id, username, role, student_id = null }) {
  if (!id || !username || !role) {
    throw new Error('tokenFor: id, username, and role are required');
  }
  return jwt.sign({ id, username, role, student_id }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}
