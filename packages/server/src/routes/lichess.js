/**
 * lichess.js - Lichess API proxy routes
 * Fetches puzzle data from Lichess for import
 */

import { Hono } from 'hono';

const lichess = new Hono();

/**
 * GET /api/lichess/puzzle/:id
 * Fetch puzzle data from Lichess API
 */
lichess.get('/puzzle/:id', async (c) => {
  try {
    const puzzleId = c.req.param('id');

    if (!puzzleId || !/^[a-zA-Z0-9]+$/.test(puzzleId)) {
      return c.json({ success: false, error: 'Invalid puzzle ID format' }, 400);
    }

    // Fetch from Lichess API
    const response = await fetch(`https://lichess.org/api/puzzle/${puzzleId}`);

    if (!response.ok) {
      if (response.status === 404) {
        return c.json({ success: false, error: 'Puzzle not found on Lichess' }, 404);
      }
      return c.json({ success: false, error: 'Failed to fetch from Lichess' }, 502);
    }

    const data = await response.json();

    // Transform Lichess format to our format
    const puzzle = {
      id: data.puzzle.id,
      fen: data.game.pgn ? null : data.puzzle.initialPly, // Lichess uses different formats
      rating: data.puzzle.rating,
      themes: data.puzzle.themes || [],
      solution: data.puzzle.solution || [], // UCI moves from Lichess
      plays: data.puzzle.plays,
      game_url: `https://lichess.org/${data.game.id}`
    };

    // Get FEN from game data if available
    if (data.game && data.game.pgn) {
      // Parse PGN to get the initial position - simplified approach
      // In practice, we'd need to replay the game to the puzzle position
      puzzle.note = 'FEN extraction from PGN not implemented - please enter FEN manually';
    }

    return c.json({ success: true, data: puzzle });
  } catch (error) {
    console.error('Lichess fetch error:', error);
    return c.json({ success: false, error: 'Failed to communicate with Lichess API' }, 502);
  }
});

/**
 * GET /api/lichess/daily
 * Get the daily puzzle from Lichess
 */
lichess.get('/daily', async (c) => {
  try {
    const response = await fetch('https://lichess.org/api/puzzle/daily');

    if (!response.ok) {
      return c.json({ success: false, error: 'Failed to fetch daily puzzle' }, 502);
    }

    const data = await response.json();

    return c.json({
      success: true,
      data: {
        id: data.puzzle.id,
        rating: data.puzzle.rating,
        themes: data.puzzle.themes || [],
        solution: data.puzzle.solution || []
      }
    });
  } catch (error) {
    console.error('Lichess daily fetch error:', error);
    return c.json({ success: false, error: 'Failed to fetch daily puzzle' }, 502);
  }
});

export default lichess;
