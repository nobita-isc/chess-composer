/**
 * puzzles.js - Puzzle API routes
 */

import { Hono } from 'hono';
import { databaseGenerator } from '../database/DatabaseGenerator.js';
import { reportManager } from '../reports/PuzzleReportManager.js';
import { puzzleCreationService } from '../puzzles/PuzzleCreationService.js';

const puzzles = new Hono();

puzzles.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { id, fen, moves, source, themes, rating, game_url } = body;

    if (!fen || !moves) return c.json({ success: false, error: 'FEN and moves are required' }, 400);
    if (!Array.isArray(moves) || moves.length === 0) return c.json({ success: false, error: 'Moves must be a non-empty array' }, 400);
    if (!moves.every(m => typeof m === 'string' && m.trim())) {
      return c.json({ success: false, error: 'All moves must be non-empty strings in SAN notation' }, 400);
    }

    const puzzleId = id || puzzleCreationService.generatePuzzleId(source || 'custom');
    const result = await puzzleCreationService.createPuzzle({
      id: puzzleId, fen, moves,
      source: source || 'manual',
      themes: themes || [],
      rating, game_url
    });

    if (!result.success) return c.json({ success: false, error: result.error }, 400);
    return c.json({ success: true, data: result.data }, 201);
  } catch (error) {
    return c.json({ success: false, error: 'Failed to create puzzle' }, 500);
  }
});

puzzles.get('/custom/stats', async (c) => {
  try {
    const stats = await puzzleCreationService.getCustomPuzzleStats();
    return c.json({ success: true, data: stats });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

puzzles.post('/generate', async (c) => {
  try {
    const body = await c.req.json();
    const { theme = null, count = 10, minRating = 1000, maxRating = 3000, minPopularity = 80 } = body;

    if (count < 1 || count > 20) return c.json({ success: false, error: 'Count must be between 1 and 20' }, 400);

    databaseGenerator.setBlockedIds(reportManager.getBlockedPuzzleIds());

    const puzzleData = await databaseGenerator.generatePuzzles(theme, count, { minRating, maxRating, minPopularity });

    return c.json({
      success: true,
      data: puzzleData,
      meta: { count: puzzleData.length, filters: { theme, count, minRating, maxRating, minPopularity } }
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

puzzles.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const puzzle = await reportManager.getPuzzleInfo(id);

    if (!puzzle) return c.json({ success: false, error: 'Puzzle not found' }, 404);
    return c.json({ success: true, data: puzzle });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

puzzles.put('/:id/block', async (c) => {
  try {
    const id = c.req.param('id');
    const result = await reportManager.blockPuzzle(id);

    if (result.success) return c.json({ success: true, data: { puzzleId: id, blocked: true } });
    return c.json({ success: false, error: result.error }, 400);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

puzzles.put('/:id/unblock', async (c) => {
  try {
    const id = c.req.param('id');
    const result = await reportManager.unblockPuzzle(id);

    if (result.success) return c.json({ success: true, data: { puzzleId: id, blocked: false } });
    return c.json({ success: false, error: result.error }, 400);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

puzzles.put('/:id/fen', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { fen } = body;

    if (!fen) return c.json({ success: false, error: 'FEN is required' }, 400);

    const result = await reportManager.updatePuzzleFEN(id, fen);

    if (result.success) return c.json({ success: true, data: { puzzleId: id, fen } });
    return c.json({ success: false, error: result.error }, 400);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default puzzles;
