/**
 * themes.js - Theme API routes
 */

import { Hono } from 'hono';
import { databaseGenerator } from '../database/DatabaseGenerator.js';

const themes = new Hono();

themes.get('/', async (c) => {
  try {
    const themeList = await databaseGenerator.getAvailableThemes();
    return c.json({ success: true, data: themeList });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

themes.get('/categories', async (c) => {
  try {
    const data = await databaseGenerator.getThemesWithCategories();
    return c.json({ success: true, data });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

themes.get('/stats', async (c) => {
  try {
    const stats = await databaseGenerator.getStats();
    return c.json({ success: true, data: stats });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default themes;
