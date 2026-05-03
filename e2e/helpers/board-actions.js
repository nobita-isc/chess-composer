/**
 * board-actions.js
 * Playwright helpers for interacting with Chessground boards.
 *
 * Chessground renders pieces using CSS transform: translate(Xpx, Ypx) on `piece` elements
 * inside `cg-board`. Squares are 1/8 of the board width/height.
 * Board origin (a1) depends on orientation (white = bottom-left, black = top-left).
 *
 * Square coordinate system for white orientation:
 *   col: a=0, b=1 ... h=7  →  x = boardLeft + (col + 0.5) * squareSize
 *   row: 1=7, 2=6 ... 8=0  →  y = boardTop  + (7 - row + 0.5) * squareSize
 */

const FILE_MAP = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7 };

/**
 * Compute the center pixel of a square given the board's bounding rect.
 * @param {DOMRect} rect - board bounding rect
 * @param {string} sq - algebraic square e.g. "e4"
 * @param {'white'|'black'} orientation
 * @returns {{ x: number, y: number }}
 */
function squareCenter(rect, sq, orientation) {
  const file = FILE_MAP[sq[0]];
  const rank = parseInt(sq[1], 10) - 1; // 0-based: a1=0, a8=7
  const size = rect.width / 8;

  let col, row;
  if (orientation === 'white') {
    col = file;
    row = 7 - rank;
  } else {
    col = 7 - file;
    row = rank;
  }

  return {
    x: rect.left + (col + 0.5) * size,
    y: rect.top  + (row + 0.5) * size,
  };
}

/**
 * Get the board bounding rect and orientation from the DOM.
 * Falls back to 'white' if orientation class is absent.
 * @param {import('@playwright/test').Page} page
 * @param {string} [boardSelector='cg-board']
 */
async function getBoardInfo(page, boardSelector = 'cg-board') {
  return page.evaluate((sel) => {
    const board = document.querySelector(sel);
    if (!board) throw new Error(`Board element not found: ${sel}`);
    const rect = board.getBoundingClientRect();
    // cg-wrap holds orientation class: 'orientation-white' | 'orientation-black'
    const wrap = board.closest('.cg-wrap') || board.parentElement;
    const orientation = wrap?.classList.contains('orientation-black') ? 'black' : 'white';
    return { rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }, orientation };
  }, boardSelector);
}

/**
 * Click a square to select/move a piece.
 * Chessground uses two-click move: first click selects, second click places.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} from - source square e.g. "d3"
 * @param {string} to   - destination square e.g. "d6"
 * @param {string} [boardSelector='cg-board']
 */
export async function clickMove(page, from, to, boardSelector = 'cg-board') {
  const { rect, orientation } = await getBoardInfo(page, boardSelector);
  const fromPx = squareCenter(rect, from, orientation);
  const toPx   = squareCenter(rect, to,   orientation);

  await page.mouse.click(fromPx.x, fromPx.y);
  // Small settle time — no sleep; rely on Playwright's internal scheduling
  await page.mouse.click(toPx.x, toPx.y);
}

/**
 * Drag a piece from `from` to `to` using pointer events (steps>=10).
 * Safer than page.dragTo() for canvas-like libs.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} from
 * @param {string} to
 * @param {string} [boardSelector='cg-board']
 */
export async function dragMove(page, from, to, boardSelector = 'cg-board') {
  const { rect, orientation } = await getBoardInfo(page, boardSelector);
  const fromPx = squareCenter(rect, from, orientation);
  const toPx   = squareCenter(rect, to,   orientation);

  await page.mouse.move(fromPx.x, fromPx.y);
  await page.mouse.down();
  await page.mouse.move(toPx.x, toPx.y, { steps: 12 });
  await page.mouse.up();
}

/**
 * After a pawn reaches the 8th rank, pick a promotion piece from the overlay.
 * Chessground renders `cg-promotion` with role buttons.
 * Falls back to clicking the first visible promotion piece if role attr absent.
 *
 * @param {import('@playwright/test').Page} page
 * @param {'q'|'r'|'b'|'n'} piece - promotion piece letter
 */
export async function promotionPick(page, piece) {
  const roleMap = { q: 'queen', r: 'rook', b: 'bishop', n: 'knight' };
  const role = roleMap[piece] || 'queen';

  // Chessground promotion overlay: piece elements with data-role or class matching the piece
  const promotionPiece = page.locator(`cg-board piece.${role}, [data-role="${role}"]`).first();
  if (await promotionPiece.isVisible({ timeout: 3000 }).catch(() => false)) {
    await promotionPiece.click();
    return;
  }

  // Fallback: click the first piece that appears in the promotion overlay area
  const overlay = page.locator('cg-promotion, .cg-promotion, [class*="promotion"]').first();
  await overlay.waitFor({ state: 'visible', timeout: 3000 });
  await overlay.locator('piece').first().click();
}

/**
 * Wait until the board is interactive (movable pieces exist).
 * Useful after opponent auto-move delay.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} [boardSelector='cg-board']
 */
export async function waitForBoardReady(page, boardSelector = 'cg-board') {
  // Chessground adds movable class to pieces the player can drag/click
  await page.locator(`${boardSelector} piece`).first().waitFor({ state: 'visible', timeout: 8000 });
}
