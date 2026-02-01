/**
 * puzzles.js - Puzzle API routes
 */

import { Hono } from 'hono';
import { databaseGenerator } from '../database/DatabaseGenerator.js';
import { reportManager } from '../reports/PuzzleReportManager.js';
import { puzzleCreationService } from '../puzzles/PuzzleCreationService.js';

const puzzles = new Hono();

/**
 * POST /api/puzzles
 * Create a new custom puzzle
 */
puzzles.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { id, fen, moves, source, themes, rating, game_url } = body;

    // Basic validation
    if (!fen || !moves) {
      return c.json({ success: false, error: 'FEN and moves are required' }, 400);
    }

    if (!Array.isArray(moves) || moves.length === 0) {
      return c.json({ success: false, error: 'Moves must be a non-empty array' }, 400);
    }

    if (!moves.every(m => typeof m === 'string' && m.trim())) {
      return c.json({ success: false, error: 'All moves must be non-empty strings in SAN notation' }, 400);
    }

    // Generate ID if not provided
    const puzzleId = id || puzzleCreationService.generatePuzzleId(source || 'custom');

    // Create puzzle via service
    const result = puzzleCreationService.createPuzzle({
      id: puzzleId,
      fen,
      moves,
      source: source || 'manual',
      themes: themes || [],
      rating,
      game_url
    });

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400);
    }

    return c.json({ success: true, data: result.data }, 201);
  } catch (error) {
    return c.json({ success: false, error: 'Failed to create puzzle' }, 500);
  }
});

/**
 * GET /api/puzzles/custom/stats
 * Get statistics about custom puzzles
 */
puzzles.get('/custom/stats', (c) => {
  try {
    const stats = puzzleCreationService.getCustomPuzzleStats();
    return c.json({ success: true, data: stats });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * POST /api/puzzles/generate
 * Generate puzzles with filters
 */
puzzles.post('/generate', async (c) => {
  try {
    const body = await c.req.json();
    const {
      theme = null,
      count = 10,
      minRating = 1000,
      maxRating = 3000,
      minPopularity = 80
    } = body;

    // Validate count
    if (count < 1 || count > 20) {
      return c.json({ success: false, error: 'Count must be between 1 and 20' }, 400);
    }

    // Update blocked IDs in generator
    databaseGenerator.setBlockedIds(reportManager.getBlockedPuzzleIds());

    // Generate puzzles
    const puzzleData = databaseGenerator.generatePuzzles(theme, count, {
      minRating,
      maxRating,
      minPopularity
    });

    return c.json({
      success: true,
      data: puzzleData,
      meta: {
        count: puzzleData.length,
        filters: { theme, count, minRating, maxRating, minPopularity }
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /api/puzzles/:id
 * Get a specific puzzle by ID
 */
puzzles.get('/:id', (c) => {
  try {
    const id = c.req.param('id');
    const puzzle = reportManager.getPuzzleInfo(id);

    if (!puzzle) {
      return c.json({ success: false, error: 'Puzzle not found' }, 404);
    }

    return c.json({ success: true, data: puzzle });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * PUT /api/puzzles/:id/block
 * Block a puzzle from quiz generation
 */
puzzles.put('/:id/block', (c) => {
  try {
    const id = c.req.param('id');
    const result = reportManager.blockPuzzle(id);

    if (result.success) {
      return c.json({ success: true, data: { puzzleId: id, blocked: true } });
    } else {
      return c.json({ success: false, error: result.error }, 400);
    }
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * PUT /api/puzzles/:id/unblock
 * Unblock a puzzle
 */
puzzles.put('/:id/unblock', (c) => {
  try {
    const id = c.req.param('id');
    const result = reportManager.unblockPuzzle(id);

    if (result.success) {
      return c.json({ success: true, data: { puzzleId: id, blocked: false } });
    } else {
      return c.json({ success: false, error: result.error }, 400);
    }
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * PUT /api/puzzles/:id/fen
 * Update puzzle FEN
 */
puzzles.put('/:id/fen', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { fen } = body;

    if (!fen) {
      return c.json({ success: false, error: 'FEN is required' }, 400);
    }

    const result = reportManager.updatePuzzleFEN(id, fen);

    if (result.success) {
      return c.json({ success: true, data: { puzzleId: id, fen } });
    } else {
      return c.json({ success: false, error: result.error }, 400);
    }
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default puzzles;
