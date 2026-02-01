/**
 * themes.js - Theme API routes
 */

import { Hono } from 'hono';
import { databaseGenerator } from '../database/DatabaseGenerator.js';

const themes = new Hono();

/**
 * GET /api/themes
 * Get all available themes
 */
themes.get('/', (c) => {
  try {
    const themeList = databaseGenerator.getAvailableThemes();

    return c.json({
      success: true,
      data: themeList
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /api/themes/categories
 * Get themes grouped by category
 */
themes.get('/categories', (c) => {
  try {
    const data = databaseGenerator.getThemesWithCategories();

    return c.json({
      success: true,
      data
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /api/themes/stats
 * Get statistics about themes
 */
themes.get('/stats', (c) => {
  try {
    const stats = databaseGenerator.getStats();

    return c.json({
      success: true,
      data: stats
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default themes;
