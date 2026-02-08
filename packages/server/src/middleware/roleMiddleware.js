/**
 * roleMiddleware.js
 * Role-based access control middleware for Hono
 */

export function requireRole(...allowedRoles) {
  return async (c, next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json({ success: false, error: 'Forbidden: insufficient permissions' }, 403);
    }

    await next();
  };
}
