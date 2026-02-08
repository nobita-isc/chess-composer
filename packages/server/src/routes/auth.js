/**
 * Auth Routes
 * POST /api/auth/login - Login with credentials
 * POST /api/auth/refresh - Refresh access token
 * GET /api/auth/me - Get current user profile
 */

import { Hono } from 'hono';
import { authService } from '../auth/AuthService.js';
import { authRequired } from '../middleware/authMiddleware.js';

const auth = new Hono();

auth.post('/login', async (c) => {
  try {
    const { username, password } = await c.req.json();
    const result = await authService.login(username, password);

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 401);
    }

    return c.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ success: false, error: 'Login failed' }, 500);
  }
});

auth.post('/refresh', async (c) => {
  try {
    const { refresh_token } = await c.req.json();

    if (!refresh_token) {
      return c.json({ success: false, error: 'Refresh token is required' }, 400);
    }

    const result = authService.refreshAccessToken(refresh_token);

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 401);
    }

    return c.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Token refresh error:', error);
    return c.json({ success: false, error: 'Token refresh failed' }, 500);
  }
});

auth.get('/me', authRequired(), async (c) => {
  try {
    const user = c.get('user');
    return c.json({ success: true, data: user });
  } catch (error) {
    console.error('Get user profile error:', error);
    return c.json({ success: false, error: 'Failed to get user profile' }, 500);
  }
});

export default auth;
