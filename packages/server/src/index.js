/**
 * Chess Composer Server
 * Hono-based REST API with better-sqlite3 database
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { databaseGenerator } from './database/DatabaseGenerator.js';
import { database } from './database/SqliteDatabase.js';
import { reportManager } from './reports/PuzzleReportManager.js';
import { runMigrations } from './database/migration-runner.js';

import { authRequired } from './middleware/authMiddleware.js';
import auth from './routes/auth.js';
import usersRoute from './routes/users.js';
import puzzles from './routes/puzzles.js';
import themes from './routes/themes.js';
import reports from './routes/reports.js';
import lichess from './routes/lichess.js';
import students from './routes/students.js';
import exercises from './routes/exercises.js';
import studentExercises from './routes/student-exercises.js';
import coursesRoute from './routes/courses.js';
import lessonContentRoute from './routes/lesson-content.js';
import videosRoute from './routes/videos.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

// Initialize database and services
async function initializeServices() {
  // Banner: surface the active DB target loud and early so accidental main-DB writes from e2e are obvious.
  const driver = (process.env.DATABASE_DRIVER || 'sqlite').toLowerCase();
  const dbTarget = driver === 'postgres'
    ? (process.env.DATABASE_URL || '').replace(/:([^@]+)@/, ':***@')
    : (process.env.SQLITE_PATH || 'packages/server/data/puzzles.db (default)');
  const envBadge = process.env.NODE_ENV === 'test' ? '🧪 TEST' : '🟢 DEV/PROD';
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  ${envBadge}  driver=${driver}  db=${dbTarget}`);
  console.log('═══════════════════════════════════════════════════════════════');

  console.log('Initializing database...');
  const dbInitialized = databaseGenerator.initialize();

  if (!dbInitialized) {
    console.error('Failed to initialize database');
    process.exit(1);
  }

  // For postgres path: wait for async driver connect before proceeding.
  await database.initAsync();
  console.log('Database initialized successfully');

  // Run migrations
  console.log('Running database migrations...');
  try {
    await runMigrations(database);
    console.log('Migrations completed');
  } catch (error) {
    console.error('Migration error:', error.message);
  }

  console.log('Initializing report manager...');
  await reportManager.initialize();
  console.log('Report manager initialized');

  // Connect report manager to generator for blocked puzzle filtering
  databaseGenerator.setBlockedIds(reportManager.getBlockedPuzzleIds());

  // Log stats
  const stats = await databaseGenerator.getStats();
  console.log(`Loaded ${stats.totalPuzzles.toLocaleString()} puzzles with ${stats.totalThemes} themes`);
}

// Initialize on startup
await initializeServices();

// Auth routes (public - no middleware)
app.route('/api/auth', auth);

// Protected routes (require authentication)
app.use('/api/*', authRequired());
app.route('/api/users', usersRoute);
app.route('/api/puzzles', puzzles);
app.route('/api/themes', themes);
app.route('/api/reports', reports);
app.route('/api/lichess', lichess);
app.route('/api/students', students);
app.route('/api/exercises', exercises);
app.route('/api/student-exercises', studentExercises);
app.route('/api/courses', coursesRoute);
app.route('/api', lessonContentRoute);
app.route('/api/videos', videosRoute);

// Serve uploaded video library files with range request support
app.get('/uploads/videos/:filename', (c) => {
  const filename = c.req.param('filename')
  const baseDir = path.resolve(path.join(__dirname, '../uploads/videos'))
  const filePath = path.resolve(path.join(baseDir, filename))
  if (!filePath.startsWith(baseDir + path.sep)) return c.json({ error: 'Forbidden' }, 403)
  if (!fs.existsSync(filePath)) return c.json({ error: 'Not found' }, 404)
  const ext = path.extname(filename).toLowerCase()
  const mimeTypes = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime' }
  const stat = fs.statSync(filePath)
  const range = c.req.header('Range')

  if (range && (ext === '.mp4' || ext === '.webm' || ext === '.mov')) {
    const parts = range.replace(/bytes=/, '').split('-')
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1
    const chunk = end - start + 1
    const stream = fs.createReadStream(filePath, { start, end })
    return new Response(stream, {
      status: 206,
      headers: { 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': chunk.toString(), 'Content-Type': mimeTypes[ext] || 'video/mp4' }
    })
  }

  const data = fs.readFileSync(filePath)
  return new Response(data, { headers: { 'Content-Type': mimeTypes[ext] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Content-Length': stat.size.toString() } })
})

// Serve uploaded course files with range request support (for video seeking)
app.get('/uploads/courses/:filename', (c) => {
  const filename = c.req.param('filename')
  const baseDir = path.resolve(path.join(__dirname, '../uploads/courses'))
  const filePath = path.resolve(path.join(baseDir, filename))
  if (!filePath.startsWith(baseDir + path.sep)) return c.json({ error: 'Forbidden' }, 403)
  if (!fs.existsSync(filePath)) return c.json({ error: 'Not found' }, 404)
  const ext = path.extname(filename).toLowerCase()
  const mimeTypes = { '.mp4': 'video/mp4', '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webm': 'video/webm' }
  const stat = fs.statSync(filePath)
  const range = c.req.header('Range')

  if (range && (ext === '.mp4' || ext === '.webm')) {
    const parts = range.replace(/bytes=/, '').split('-')
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1
    const chunk = end - start + 1
    const stream = fs.createReadStream(filePath, { start, end })
    return new Response(stream, {
      status: 206,
      headers: { 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': chunk.toString(), 'Content-Type': mimeTypes[ext] }
    })
  }

  const data = fs.readFileSync(filePath)
  return new Response(data, { headers: { 'Content-Type': mimeTypes[ext] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Content-Length': stat.size.toString() } })
})

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
