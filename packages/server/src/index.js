/**
 * Chess Composer Server
 * Hono-based REST API with better-sqlite3 database
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { databaseGenerator } from './database/DatabaseGenerator.js';
import { database } from './database/SqliteDatabase.js';
import { reportManager } from './reports/PuzzleReportManager.js';
import { migrate as migrateSources } from './database/migrations/001_add_source_field.js';

import puzzles from './routes/puzzles.js';
import themes from './routes/themes.js';
import reports from './routes/reports.js';
import lichess from './routes/lichess.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

// Initialize database and services
function initializeServices() {
  console.log('Initializing database...');
  const dbInitialized = databaseGenerator.initialize();

  if (!dbInitialized) {
    console.error('Failed to initialize database');
    process.exit(1);
  }

  console.log('Database initialized successfully');

  // Run migrations
  console.log('Running database migrations...');
  try {
    migrateSources(database.db);
    console.log('Migrations completed');
  } catch (error) {
    console.error('Migration error:', error.message);
  }

  console.log('Initializing report manager...');
  reportManager.initialize();
  console.log('Report manager initialized');

  // Connect report manager to generator for blocked puzzle filtering
  databaseGenerator.setBlockedIds(reportManager.getBlockedPuzzleIds());

  // Log stats
  const stats = databaseGenerator.getStats();
  console.log(`Loaded ${stats.totalPuzzles.toLocaleString()} puzzles with ${stats.totalThemes} themes`);
}

// Initialize on startup
initializeServices();

// Routes
app.route('/api/puzzles', puzzles);
app.route('/api/themes', themes);
app.route('/api/reports', reports);
app.route('/api/lichess', lichess);

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({ success: false, error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({ success: false, error: 'Internal server error' }, 500);
});

// Start server
const port = parseInt(process.env.PORT || '3001');

console.log(`Starting server on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port
});

console.log(`Server running at http://localhost:${port}`);
