/**
 * PrintPreview.js
 * Client-side print preview for exercises
 * Renders static chess boards using CSS (compatible with browser print)
 */

import { Chess } from 'chess.js';
import { PIECE_IMAGES, generateBoardHTML } from '../puzzles/staticBoard.js';

/**
 * Open print preview in a new window
 * @param {object} exercise - Exercise with puzzles
 */
export function openPrintPreview(exercise) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to open the print preview');
    return;
  }

  const html = generatePrintHTML(exercise);
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Parse UCI move (e.g., "e2e4") and convert to { from, to, promotion }
 */
function parseUciMove(uci) {
  if (!uci || uci.length < 4) return null;
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci[4] : undefined
  };
}

/**
 * Prepare puzzle position by playing the opponent's first move
 * Returns { chess, lastMoveSan, playerColor, flipped }
 */
function preparePuzzlePosition(puzzle) {
  const chess = new Chess(puzzle.fen);
  const moves = puzzle.moves ? puzzle.moves.split(' ') : [];

  let lastMoveSan = null;

  // Play the first move (opponent's move) if available
  if (moves.length > 0) {
    const uciMove = parseUciMove(moves[0]);
    if (uciMove) {
      const move = chess.move(uciMove);
      if (move) {
        lastMoveSan = move.san;
      }
    }
  }

  // After opponent's move, it's the player's turn
  const playerColor = chess.turn(); // 'w' or 'b'
  const flipped = playerColor === 'b'; // Rotate board if black to move

  return {
    chess,
    lastMoveSan,
    playerColor,
    flipped
  };
}

/**
 * Generate the print preview HTML
 */
function generatePrintHTML(exercise) {
  const puzzles = exercise.puzzles || [];

  const puzzlesHTML = puzzles.map((puzzle, index) => {
    // Prepare position by playing opponent's first move
    const { chess, lastMoveSan, playerColor, flipped } = preparePuzzlePosition(puzzle);
    const turnText = playerColor === 'w' ? 'White to move' : 'Black to move';
    const lastMoveText = lastMoveSan ? `After ${lastMoveSan}` : '';

    return `
      <div class="puzzle-item">
        <div class="puzzle-header">
          <span class="puzzle-number">#${index + 1}</span>
          <span class="puzzle-turn ${playerColor === 'w' ? 'white-turn' : 'black-turn'}">${turnText}</span>
        </div>
        <div class="puzzle-meta">
          ${lastMoveText ? `<span class="last-move">${lastMoveText}</span>` : ''}
          ${puzzle.rating ? `<span class="rating">Rating: ${puzzle.rating}</span>` : ''}
        </div>
        ${generateBoardHTML(chess, `board-${index}`, flipped, lastMoveSan)}
        <div class="answer-area">
          <span class="answer-label">Answer:</span>
          <div class="answer-line"></div>
        </div>
      </div>
    `;
  }).join('');

  const answerSheetHTML = puzzles.map((_, index) => `
    <div class="answer-item">
      <span class="num">${index + 1}.</span>
      <div class="line"></div>
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Chess Exercises - ${escapeHtml(exercise.name || exercise.week_label)}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    @page {
      size: A4;
      margin: 8mm;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11pt;
      line-height: 1.3;
      color: #000;
      background: #fff;
    }

    .print-container {
      max-width: 190mm;
      margin: 0 auto;
      padding: 5mm;
    }

    /* Print Actions */
    .print-actions {
      position: fixed;
      top: 15px;
      right: 15px;
      display: flex;
      gap: 10px;
      z-index: 1000;
    }

    .print-actions button {
      padding: 12px 24px;
      font-size: 14px;
      cursor: pointer;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      transition: transform 0.1s;
    }

    .print-actions button:hover {
      transform: scale(1.02);
    }

    .print-btn {
      background: #2196f3;
      color: white;
    }

    .close-btn {
      background: #666;
      color: white;
    }

    /* Header */
    .print-header {
      text-align: center;
      margin-bottom: 6mm;
      padding-bottom: 3mm;
      border-bottom: 1.5pt solid #333;
    }

    .print-header h1 {
      font-size: 18pt;
      margin-bottom: 1mm;
    }

    .print-header .subtitle {
      font-size: 11pt;
      color: #555;
    }

    /* Puzzle Grid */
    .puzzles-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5mm;
    }

    /* Puzzle Item */
    .puzzle-item {
      border: 1pt solid #ccc;
      border-radius: 2mm;
      padding: 3mm;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .puzzle-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1mm;
    }

    .puzzle-number {
      font-weight: bold;
      font-size: 12pt;
    }

    .puzzle-turn {
      font-size: 10pt;
      font-weight: 600;
      padding: 1mm 2mm;
      border-radius: 1mm;
    }

    .puzzle-turn.white-turn {
      background: #fff;
      border: 1pt solid #333;
      color: #000;
    }

    .puzzle-turn.black-turn {
      background: #333;
      color: #fff;
    }

    .puzzle-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2mm;
      font-size: 9pt;
      color: #666;
    }

    .last-move {
      font-style: italic;
    }

    .rating {
      color: #888;
    }

    /* Chess Board */
    .chess-board {
      position: relative;
      width: 100%;
      padding-bottom: 100%;
      border: 1pt solid #333;
      margin-bottom: 2mm;
    }

    .squares {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      grid-template-rows: repeat(8, 1fr);
    }

    .square {
      width: 100%;
      height: 100%;
    }

    .square.light {
      background-color: #f0d9b5;
    }

    .square.dark {
      background-color: #b58863;
    }

    .pieces {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
    }

    .piece {
      position: absolute;
      width: 12.5%;
      height: 12.5%;
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
    }

    .coords {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
    }

    .file-coord {
      position: absolute;
      bottom: 1px;
      transform: translateX(-50%);
      font-size: 7pt;
      color: #666;
    }

    .rank-coord {
      position: absolute;
      left: 2px;
      transform: translateY(-50%);
      font-size: 7pt;
      color: #666;
    }

    /* Answer Area */
    .answer-area {
      display: flex;
      align-items: center;
      gap: 2mm;
      padding-top: 2mm;
      border-top: 0.5pt solid #ddd;
    }

    .answer-label {
      font-size: 9pt;
      color: #666;
      white-space: nowrap;
    }

    .answer-line {
      flex: 1;
      border-bottom: 0.5pt solid #999;
      height: 4mm;
    }

    /* Answer Sheet */
    .answer-sheet {
      page-break-before: always;
      break-before: page;
      padding-top: 8mm;
    }

    .answer-sheet h2 {
      text-align: center;
      font-size: 14pt;
      margin-bottom: 3mm;
    }

    .answer-sheet .instructions {
      text-align: center;
      font-size: 9pt;
      color: #666;
      margin-bottom: 5mm;
    }

    .answer-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3mm 8mm;
    }

    .answer-item {
      display: flex;
      align-items: center;
      gap: 2mm;
      padding: 2mm 0;
    }

    .answer-item .num {
      font-weight: bold;
      min-width: 6mm;
      font-size: 10pt;
    }

    .answer-item .line {
      flex: 1;
      border-bottom: 0.5pt solid #999;
      height: 5mm;
    }

    /* Footer */
    .print-footer {
      margin-top: 8mm;
      padding-top: 4mm;
      border-top: 0.5pt solid #ccc;
      display: flex;
      justify-content: space-between;
      font-size: 10pt;
    }

    .field {
      display: flex;
      align-items: center;
      gap: 2mm;
    }

    .field .line {
      width: 35mm;
      border-bottom: 0.5pt solid #666;
    }

    /* Print-specific */
    @media print {
      .print-actions {
        display: none !important;
      }

      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .print-container {
        padding: 0;
      }
    }

    /* Screen preview styling */
    @media screen {
      body {
        background: #e0e0e0;
        padding: 20px;
      }

      .print-container {
        background: white;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        border-radius: 4px;
        padding: 15mm;
      }
    }
  </style>
</head>
<body>
  <div class="print-actions">
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save PDF</button>
    <button class="close-btn" onclick="window.close()">✕ Close</button>
  </div>

  <div class="print-container">
    <header class="print-header">
      <h1>Chess Exercises</h1>
      <div class="subtitle">${escapeHtml(exercise.name || exercise.week_label)} · ${puzzles.length} puzzles</div>
    </header>

    <div class="puzzles-grid">
      ${puzzlesHTML}
    </div>

    <div class="answer-sheet">
      <h2>Answer Sheet</h2>
      <div class="instructions">Write your moves in standard algebraic notation (e.g., Nf3, Bxc6, O-O)</div>

      <div class="answer-grid">
        ${answerSheetHTML}
      </div>

      <div class="print-footer">
        <div class="field">
          <span>Name:</span>
          <div class="line"></div>
        </div>
        <div class="field">
          <span>Date:</span>
          <div class="line"></div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Open print solutions in a new window
 * @param {object} exercise - Exercise with puzzles
 */
export function openPrintSolutions(exercise) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to open the print preview');
    return;
  }

  const html = generateSolutionsHTML(exercise);
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Convert a puzzle's UCI moves to SAN, skipping the opponent's first move
 * Returns formatted solution string with move numbers
 */
function formatPuzzleSolution(puzzle) {
  const chess = new Chess(puzzle.fen);
  const uciMoves = puzzle.moves ? puzzle.moves.split(' ') : [];

  if (uciMoves.length < 2) return 'N/A';

  // Play opponent's first move to advance position
  const firstMove = parseUciMove(uciMoves[0]);
  if (!firstMove) return 'N/A';

  const opponentResult = chess.move(firstMove);
  if (!opponentResult) return 'N/A';

  // The player's color is whoever moves next
  const playerColor = chess.turn(); // 'w' or 'b'

  // Determine the full move number at this point
  // chess.js fen has move number as 2nd-to-last field
  const fenParts = chess.fen().split(' ');
  let fullMoveNumber = parseInt(fenParts[5], 10) || 1;

  // Convert remaining moves (the solution) to SAN with move numbers
  const solutionUci = uciMoves.slice(1);
  const parts = [];
  let currentTurn = playerColor;

  for (const uci of solutionUci) {
    const parsed = parseUciMove(uci);
    if (!parsed) break;

    try {
      const move = chess.move(parsed);
      if (!move) break;

      if (currentTurn === 'w') {
        parts.push(`${fullMoveNumber}. ${move.san}`);
      } else {
        // If this is the first move and it's black, use "..." notation
        if (parts.length === 0) {
          parts.push(`${fullMoveNumber}... ${move.san}`);
        } else {
          parts.push(move.san);
        }
        fullMoveNumber++;
      }

      currentTurn = currentTurn === 'w' ? 'b' : 'w';
    } catch (error) {
      break;
    }
  }

  return parts.join(' ') || 'N/A';
}

/**
 * Generate the solutions print HTML
 */
function generateSolutionsHTML(exercise) {
  const puzzles = exercise.puzzles || [];

  const solutionsHTML = puzzles.map((puzzle, index) => {
    const solution = formatPuzzleSolution(puzzle);
    return `
      <div class="solution-item">
        <span class="solution-num">${index + 1}.</span>
        <span class="solution-moves">${escapeHtml(solution)}</span>
      </div>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Solutions - ${escapeHtml(exercise.name || exercise.week_label)}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    @page {
      size: A4;
      margin: 15mm;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #000;
      background: #fff;
    }

    .print-container {
      max-width: 190mm;
      margin: 0 auto;
      padding: 5mm;
    }

    .print-actions {
      position: fixed;
      top: 15px;
      right: 15px;
      display: flex;
      gap: 10px;
      z-index: 1000;
    }

    .print-actions button {
      padding: 12px 24px;
      font-size: 14px;
      cursor: pointer;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      transition: transform 0.1s;
    }

    .print-actions button:hover {
      transform: scale(1.02);
    }

    .print-btn {
      background: #2196f3;
      color: white;
    }

    .close-btn {
      background: #666;
      color: white;
    }

    .print-header {
      text-align: center;
      margin-bottom: 8mm;
      padding-bottom: 4mm;
      border-bottom: 1.5pt solid #333;
    }

    .print-header h1 {
      font-size: 18pt;
      margin-bottom: 1mm;
    }

    .print-header .subtitle {
      font-size: 11pt;
      color: #555;
    }

    .solutions-list {
      display: flex;
      flex-direction: column;
      gap: 3mm;
    }

    .solution-item {
      display: flex;
      gap: 3mm;
      padding: 2mm 0;
      border-bottom: 0.5pt solid #eee;
      page-break-inside: avoid;
    }

    .solution-num {
      font-weight: bold;
      min-width: 8mm;
      font-size: 11pt;
    }

    .solution-moves {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 11pt;
    }

    @media print {
      .print-actions {
        display: none !important;
      }

      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .print-container {
        padding: 0;
      }
    }

    @media screen {
      body {
        background: #e0e0e0;
        padding: 20px;
      }

      .print-container {
        background: white;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        border-radius: 4px;
        padding: 15mm;
      }
    }
  </style>
</head>
<body>
  <div class="print-actions">
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save PDF</button>
    <button class="close-btn" onclick="window.close()">✕ Close</button>
  </div>

  <div class="print-container">
    <header class="print-header">
      <h1>Solutions</h1>
      <div class="subtitle">${escapeHtml(exercise.name || exercise.week_label)} · ${puzzles.length} puzzles</div>
    </header>

    <div class="solutions-list">
      ${solutionsHTML}
    </div>
  </div>
</body>
</html>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

export default openPrintPreview;
