/**
 * User Management Routes (Admin only)
 * POST /api/users - Create user
 * GET /api/users - List all users
 * GET /api/users/:id - Get user by ID
 * PUT /api/users/:id - Update user
 * DELETE /api/users/:id - Delete user
 */

import { Hono } from 'hono';
import { userService } from '../users/UserService.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const users = new Hono();

users.use('*', requireRole('admin'));

users.post('/', async (c) => {
  try {
    const { username, password, role, student_id } = await c.req.json();

    if (!username || !password || !role) {
      return c.json({ success: false, error: 'Username, password, and role are required' }, 400);
    }

    const result = await userService.createUser({ username, password, role, student_id });

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400);
    }

    return c.json({ success: true, data: result.data }, 201);
  } catch (error) {
    return c.json({ success: false, error: 'Failed to create user' }, 500);
  }
});

users.get('/', async (c) => {
  try {
    const allUsers = userService.getAllUsers();
    return c.json({ success: true, data: allUsers });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch users' }, 500);
  }
});

users.get('/:id', async (c) => {
  try {
    const result = userService.getUserProfile(c.req.param('id'));

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 404);
    }

    return c.json({ success: true, data: result.data });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch user' }, 500);
  }
});

users.put('/:id', async (c) => {
  try {
    const data = await c.req.json();
    const result = await userService.updateUser(c.req.param('id'), data);

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400);
    }

    return c.json({ success: true, data: result.data });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to update user' }, 500);
  }
});

users.delete('/:id', async (c) => {
  try {
    const result = userService.deleteUser(c.req.param('id'));

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400);
    }

    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to delete user' }, 500);
  }
});

export default users;
