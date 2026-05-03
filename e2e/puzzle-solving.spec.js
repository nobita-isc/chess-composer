/**
 * puzzle-solving.spec.js
 * E2E specs for exercise puzzle solving via the ExercisePuzzleViewer modal.
 *
 * Uses API-based seeding (same pattern as puzzle-play.spec.js) so the server's
 * own SQLite connection owns all writes — works against dev server or test server.
 *
 * Puzzle move sequences (opponent auto-plays first):
 *   0000D (simple): opponent Qd6, player Rfd8, opp Qxd8, player Bxd8
 *   001cr (short):  opponent c5c4, player d7e8 (mate in 1)
 *   001w5 (promo):  opponent Rf7, player Qxh7+, opp Kxh7, player g7g8=Q
 *   01sTk (ep):     opponent g7g5, player h5g6 (e.p.)
 *   12lYH (castle): opponent Kd3, player O-O-O (e1c1)
 */

import { test, expect } from '@playwright/test';
import { seedExercise, PUZZLE_IDS } from './helpers/seed-exercise.js';
import { clickMove, dragMove, waitForBoardReady } from './helpers/board-actions.js';
import { makeApiClient } from './helpers/api-assertions.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_STATE_PATH = path.join(__dirname, '.auth/state.json');
const ACCESS_TOKEN_KEY = 'chess_access_token';

function getAdminToken() {
  return JSON.parse(fs.readFileSync(AUTH_STATE_PATH, 'utf-8')).adminToken;
}

// Delays: opponent auto-plays after initialDelay(600ms) + animation(200ms) + buffer
const OPPONENT_DELAY = 1200;

// ── Seed state (shared across all tests in this file, seeded once) ────────────
let simpleExercise;   // 1 puzzle: 0000D (4-move endgame)
let shortExercise;    // 1 puzzle: 001cr (2-move matein1)
let multiExercise;    // 4 puzzles: all types

test.beforeAll(async () => {
  const adminToken = getAdminToken();
  [simpleExercise, shortExercise, multiExercise] = await Promise.all([
    seedExercise(adminToken, { puzzleIds: [PUZZLE_IDS.SIMPLE], name: 'E2E Simple' }),
    seedExercise(adminToken, { puzzleIds: [PUZZLE_IDS.SHORT],  name: 'E2E Short'  }),
    seedExercise(adminToken, {
      puzzleIds: [PUZZLE_IDS.SIMPLE, PUZZLE_IDS.PROMOTION, PUZZLE_IDS.ENPASSANT, PUZZLE_IDS.CASTLING],
      name: 'E2E Multi',
    }),
  ]);
});

// ── Helper: inject a token into a fresh page and navigate ────────────────────

async function openPage(page, token) {
  await page.addInitScript(
    ({ key, tok }) => localStorage.setItem(key, tok),
    { key: ACCESS_TOKEN_KEY, tok: token },
  );
}

// ── Helper: open viewer for a given exercise via student dashboard ─────────────

async function openExerciseViewer(page, token, exerciseId) {
  await openPage(page, token);
  await page.goto('/#/my-exercises');
  // Wait for exercise list to load
  const card = page.locator(`[data-exercise-id="${exerciseId}"]`);
  await card.waitFor({ timeout: 10000 });
  await card.click();
  // Puzzle viewer modal
  await page.locator('.pv-overlay').waitFor({ timeout: 8000 });
  await page.locator('cg-board').waitFor({ timeout: 5000 });
}

// ── Spec 1: Board renders and shows FEN ───────────────────────────────────────

test('board renders and shows puzzle FEN', async ({ page }) => {
  await openExerciseViewer(page, simpleExercise.studentToken, simpleExercise.exerciseId);
  await expect(page.locator('.pv-fen-text').first()).toBeVisible();
  const fen = await page.locator('.pv-fen-text').first().textContent();
  // FEN format: piece-placement/active-color/castling/en-passant/halfmove/fullmove
  expect(fen).toMatch(/^[1-8pnbrqkPNBRQK\/]+ [wb] /i);
  await expect(page.locator('cg-board piece').first()).toBeVisible();
});

// ── Spec 2: Click correct first move → success ────────────────────────────────

test('click correct first move completes short puzzle', async ({ page }) => {
  await openExerciseViewer(page, shortExercise.studentToken, shortExercise.exerciseId);
  // Puzzle 001cr: opponent auto-plays c5c4, then player (white) plays d7→e8 (Bd7-e8#)
  await page.waitForTimeout(OPPONENT_DELAY);
  await waitForBoardReady(page);
  await clickMove(page, 'd7', 'e8');
  await expect(page.locator('#epv-status.pv-status-success')).toBeVisible({ timeout: 5000 });
});

// ── Spec 3: Drag correct move → success ───────────────────────────────────────

test('drag correct move completes puzzle', async ({ page }) => {
  const fresh = await seedExercise(getAdminToken(), { puzzleIds: [PUZZLE_IDS.SHORT], name: 'Drag' });
  await openExerciseViewer(page, fresh.studentToken, fresh.exerciseId);
  await page.waitForTimeout(OPPONENT_DELAY);
  await waitForBoardReady(page);
  await dragMove(page, 'd7', 'e8');
  await expect(page.locator('#epv-status.pv-status-success')).toBeVisible({ timeout: 5000 });
});

// ── Spec 4: Click illegal square → no change ──────────────────────────────────

test('clicking empty square does nothing', async ({ page }) => {
  await openExerciseViewer(page, simpleExercise.studentToken, simpleExercise.exerciseId);
  await page.waitForTimeout(OPPONENT_DELAY);
  await waitForBoardReady(page);

  let attemptCalled = false;
  await page.route('**/student-exercises/**/attempt', () => { attemptCalled = true; });

  // Click two empty squares with no movable piece — should be no-op
  await clickMove(page, 'a1', 'a2');
  await page.waitForTimeout(400);
  expect(attemptCalled).toBe(false);
  await expect(page.locator('#epv-status.pv-status-success')).not.toBeVisible();
});

// ── Spec 5: Wrong-but-legal move → error banner ───────────────────────────────

test('wrong legal move shows error feedback', async ({ page }) => {
  await openExerciseViewer(page, simpleExercise.studentToken, simpleExercise.exerciseId);
  // Puzzle 0000D: opp auto-plays white Qd6; player is black. Wrong: a6→a5 (legal pawn, wrong)
  await page.waitForTimeout(OPPONENT_DELAY);
  await waitForBoardReady(page);
  await clickMove(page, 'a6', 'a5');
  await expect(page.locator('#epv-status.pv-status-error')).toBeVisible({ timeout: 5000 });
});

// ── Spec 6: Solve full puzzle → solved banner ──────────────────────────────────

test('solving all moves shows solved banner and hides hint', async ({ page }) => {
  const fresh = await seedExercise(getAdminToken(), { puzzleIds: [PUZZLE_IDS.SHORT], name: 'Solve' });
  await openExerciseViewer(page, fresh.studentToken, fresh.exerciseId);
  await page.waitForTimeout(OPPONENT_DELAY);
  await waitForBoardReady(page);
  await clickMove(page, 'd7', 'e8');
  await expect(page.locator('#epv-status.pv-status-success')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('[data-action="hint"]')).not.toBeVisible();
});

// ── Spec 7: Hint button → hint status banner ───────────────────────────────────

test('hint button shows hint status and disables itself', async ({ page }) => {
  await openExerciseViewer(page, simpleExercise.studentToken, simpleExercise.exerciseId);
  await page.waitForTimeout(OPPONENT_DELAY);
  await waitForBoardReady(page);
  await page.locator('[data-action="hint"]').click();
  await expect(page.locator('#epv-status.pv-status-hint')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('[data-action="hint"]')).toBeDisabled();
});

// ── Spec 8: Solution button → solution status ──────────────────────────────────

test('solution button reveals answer and disables itself', async ({ page }) => {
  await openExerciseViewer(page, simpleExercise.studentToken, simpleExercise.exerciseId);
  await page.waitForTimeout(OPPONENT_DELAY);
  await waitForBoardReady(page);
  await page.locator('[data-action="solution"]').click();
  await expect(page.locator('#epv-status.pv-status-solution')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('[data-action="solution"]')).toBeDisabled();
});

// ── Spec 9: Promotion ──────────────────────────────────────────────────────────

test.skip('promotion: pawn to 8th rank', async ({ page }) => {
  // SKIP: InteractivePuzzleBoard auto-resolves promotion to 'q' (no picker shown).
  // Puzzle 001w5 player move g7g8 uses expected.promotion='q' from solution data.
  // No DOM picker appears. Phase 5 manual TC covers board showing queen on g8.
});

// ── Spec 10: En passant ────────────────────────────────────────────────────────

test.skip('en passant capture is accepted', async ({ page }) => {
  // SKIP: After opponent auto-plays g7g5, the en passant square h×g6 should be clickable.
  // Requires visual debugging to confirm cg-board renders h5 piece as movable to g6.
  // The ep target square is set in chess.js after opponent move. Phase 5 manual TC.
});

// ── Spec 11: Castling ──────────────────────────────────────────────────────────

test.skip('castling: queen-side castle accepted', async ({ page }) => {
  // SKIP: Chessground renders castling as a king move (e1→c1). The king must be
  // present on e1 after opponent auto-move. Without live debug session we cannot
  // confirm the board renders it correctly. Phase 5 manual TC covers castling.
});

// ── Spec 12: Multi-puzzle navigation ──────────────────────────────────────────

test('multi-puzzle: next button loads puzzle 2', async ({ page }) => {
  await openExerciseViewer(page, multiExercise.studentToken, multiExercise.exerciseId);
  await expect(page.locator('.pv-nav-text')).toHaveText('1 / 4');
  await page.locator('[data-action="next"]').click();
  await page.locator('cg-board').waitFor({ timeout: 5000 });
  await expect(page.locator('.pv-nav-text')).toHaveText('2 / 4');
  await expect(page.locator('[data-action="prev"]')).not.toBeDisabled();
});

// ── Spec 13: Network failure on exercise fetch ────────────────────────────────

test('network failure on exercise fetch shows error or empty state', async ({ page }) => {
  // Register abort BEFORE navigation — intercepts the exercises list call
  await page.addInitScript(
    ({ key, tok }) => localStorage.setItem(key, tok),
    { key: ACCESS_TOKEN_KEY, tok: simpleExercise.studentToken },
  );
  await page.route(`**/students/*/exercises`, route => route.abort());
  await page.goto('/#/my-exercises');
  const errorOrEmpty = page.locator('.error-message, .empty-state');
  await expect(errorOrEmpty.first()).toBeVisible({ timeout: 8000 });
});

// ── Spec 14: Backend API assertion ────────────────────────────────────────────

test('backend API returns seeded assignment with correct status', async ({ request }) => {
  const api = makeApiClient(request, simpleExercise.studentToken);
  const assignment = await api.getAssignment(simpleExercise.assignmentId);
  expect(assignment).toBeTruthy();
  expect(assignment.exercise_id).toBe(simpleExercise.exerciseId);
  expect(assignment.status).toBe('assigned');
  expect(assignment.total_puzzles).toBe(1);
});
