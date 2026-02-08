/**
 * authMiddleware.js
 * JWT authentication middleware for Hono
 */

import { authService } from '../auth/AuthService.js';

export function authRequired() {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');
    const queryToken = c.req.query('token');

    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (queryToken) {
      token = queryToken;
    }

    if (!token) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }
    const decoded = authService.verifyToken(token);

    if (!decoded) {
      return c.json({ success: false, error: 'Invalid or expired token' }, 401);
    }

    c.set('user', {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      student_id: decoded.student_id
    });

    await next();
  };
}
