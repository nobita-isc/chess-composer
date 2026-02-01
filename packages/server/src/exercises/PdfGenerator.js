/**
 * PdfGenerator.js
 * Generate PDF documents for chess exercises with proper piece drawings
 */

import PDFDocument from 'pdfkit';
import { Chess } from 'chess.js';

// Board square colors
const LIGHT_SQUARE = '#F0D9B5';
const DARK_SQUARE = '#B58863';

export class PdfGenerator {
  /**
   * Generate exercise PDF
   */
  async generateExercisePdf(exercise, options = {}) {
    const { includeAnswerSheet = true } = options;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        this.renderHeader(doc, exercise);

        const puzzlesPerPage = 2;
        const puzzles = exercise.puzzles || [];

        for (let i = 0; i < puzzles.length; i++) {
          if (i > 0 && i % puzzlesPerPage === 0) {
            doc.addPage();
          } else if (i % puzzlesPerPage === 1) {
            doc.y = 400;
          }
          this.renderPuzzle(doc, puzzles[i], i + 1);
        }

        if (includeAnswerSheet) {
          doc.addPage();
          this.renderAnswerSheet(doc, puzzles);
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  renderHeader(doc, exercise) {
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text('Chess Exercises', { align: 'center' });

    doc.moveDown(0.5);

    doc.fontSize(14)
       .font('Helvetica')
       .text(exercise.name || exercise.week_label, { align: 'center' });

    doc.moveDown(0.3);

    const puzzleCount = exercise.puzzles?.length || 0;
    doc.fontSize(12)
       .fillColor('#666666')
       .text(`${puzzleCount} puzzles`, { align: 'center' });

    doc.fillColor('#000000');
    doc.moveDown(2);
  }

  renderPuzzle(doc, puzzle, number) {
    const startY = doc.y;
    const boardSize = 200;
    const squareSize = boardSize / 8;
    const leftMargin = 70;

    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text(`Puzzle ${number}`, leftMargin, startY);

    const chess = new Chess(puzzle.fen);
    const turn = chess.turn() === 'w' ? 'White' : 'Black';

    doc.fontSize(10)
       .font('Helvetica')
       .text(`${turn} to move`, leftMargin, startY + 18);

    if (puzzle.rating) {
      doc.text(`Rating: ${puzzle.rating}`, leftMargin + 100, startY + 18);
    }

    const boardY = startY + 40;
    this.drawBoard(doc, puzzle.fen, leftMargin, boardY, boardSize);
    this.drawCoordinates(doc, leftMargin, boardY, boardSize, squareSize);

    const answerY = boardY + boardSize + 25;
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#000000')
       .text('Your answer: _______________________________________________', leftMargin, answerY);

    doc.y = answerY + 30;
  }

  drawBoard(doc, fen, x, y, size) {
    const squareSize = size / 8;
    const chess = new Chess(fen);
    const board = chess.board();

    // Draw squares
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isLight = (row + col) % 2 === 0;
        const squareX = x + col * squareSize;
        const squareY = y + row * squareSize;

        doc.rect(squareX, squareY, squareSize, squareSize)
           .fill(isLight ? LIGHT_SQUARE : DARK_SQUARE);
      }
    }

    // Draw border
    doc.lineWidth(1.5)
       .rect(x, y, size, size)
       .stroke('#333333');

    // Draw pieces
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece) {
          const squareX = x + col * squareSize;
          const squareY = y + row * squareSize;
          this.drawPiece(doc, piece.type, piece.color === 'w', squareX, squareY, squareSize);
        }
      }
    }
  }

  drawPiece(doc, pieceType, isWhite, squareX, squareY, squareSize) {
    const cx = squareX + squareSize / 2;
    const cy = squareY + squareSize / 2;
    const scale = squareSize / 50;

    const fill = isWhite ? '#FFFFFF' : '#1a1a1a';
    const stroke = '#000000';
    const lineWidth = 1;

    doc.save();
    doc.translate(cx, cy);
    doc.scale(scale);

    switch (pieceType) {
      case 'k':
        this.drawKing(doc, fill, stroke, lineWidth);
        break;
      case 'q':
        this.drawQueen(doc, fill, stroke, lineWidth);
        break;
      case 'r':
        this.drawRook(doc, fill, stroke, lineWidth);
        break;
      case 'b':
        this.drawBishop(doc, fill, stroke, lineWidth);
        break;
      case 'n':
        this.drawKnight(doc, fill, stroke, lineWidth);
        break;
      case 'p':
        this.drawPawn(doc, fill, stroke, lineWidth);
        break;
    }

    doc.restore();
  }

  drawKing(doc, fill, stroke, lineWidth) {
    // Cross
    doc.lineWidth(lineWidth * 2);
    doc.moveTo(0, -20).lineTo(0, -14);
    doc.moveTo(-3, -17).lineTo(3, -17);
    doc.stroke(stroke);

    // Head/crown
    doc.lineWidth(lineWidth);
    doc.moveTo(-9, -12)
       .lineTo(-9, -6)
       .lineTo(-5, -9)
       .lineTo(0, -6)
       .lineTo(5, -9)
       .lineTo(9, -6)
       .lineTo(9, -12)
       .closePath()
       .fillAndStroke(fill, stroke);

    // Body
    doc.moveTo(-10, -6)
       .lineTo(-8, 8)
       .lineTo(8, 8)
       .lineTo(10, -6)
       .closePath()
       .fillAndStroke(fill, stroke);

    // Base
    doc.moveTo(-12, 8)
       .lineTo(-14, 16)
       .lineTo(14, 16)
       .lineTo(12, 8)
       .closePath()
       .fillAndStroke(fill, stroke);
  }

  drawQueen(doc, fill, stroke, lineWidth) {
    doc.lineWidth(lineWidth);

    // Crown points with circles
    const points = [
      { x: -12, y: -16 },
      { x: -6, y: -20 },
      { x: 0, y: -16 },
      { x: 6, y: -20 },
      { x: 12, y: -16 }
    ];
    points.forEach(p => {
      doc.circle(p.x, p.y, 2).fillAndStroke(fill, stroke);
    });

    // Crown body
    doc.moveTo(-14, -12)
       .lineTo(-12, -6)
       .lineTo(-6, -10)
       .lineTo(0, -6)
       .lineTo(6, -10)
       .lineTo(12, -6)
       .lineTo(14, -12)
       .lineTo(10, 6)
       .lineTo(-10, 6)
       .closePath()
       .fillAndStroke(fill, stroke);

    // Base
    doc.moveTo(-12, 6)
       .lineTo(-14, 16)
       .lineTo(14, 16)
       .lineTo(12, 6)
       .closePath()
       .fillAndStroke(fill, stroke);
  }

  drawRook(doc, fill, stroke, lineWidth) {
    doc.lineWidth(lineWidth);

    // Battlements
    doc.moveTo(-12, -16)
       .lineTo(-12, -10)
       .lineTo(-7, -10)
       .lineTo(-7, -16)
       .lineTo(-3, -16)
       .lineTo(-3, -10)
       .lineTo(3, -10)
       .lineTo(3, -16)
       .lineTo(7, -16)
       .lineTo(7, -10)
       .lineTo(12, -10)
       .lineTo(12, -16)
       .lineTo(14, -16)
       .lineTo(14, -6)
       .lineTo(-14, -6)
       .lineTo(-14, -16)
       .closePath()
       .fillAndStroke(fill, stroke);

    // Body
    doc.moveTo(-10, -6)
       .lineTo(-10, 8)
       .lineTo(10, 8)
       .lineTo(10, -6)
       .closePath()
       .fillAndStroke(fill, stroke);

    // Base
    doc.moveTo(-14, 8)
       .lineTo(-14, 16)
       .lineTo(14, 16)
       .lineTo(14, 8)
       .closePath()
       .fillAndStroke(fill, stroke);
  }

  drawBishop(doc, fill, stroke, lineWidth) {
    doc.lineWidth(lineWidth);

    // Top ball
    doc.circle(0, -18, 3).fillAndStroke(fill, stroke);

    // Mitre (pointed hat)
    doc.moveTo(0, -15)
       .lineTo(-10, 4)
       .lineTo(-8, 6)
       .lineTo(8, 6)
       .lineTo(10, 4)
       .closePath()
       .fillAndStroke(fill, stroke);

    // Slot
    const slotFill = fill === '#FFFFFF' ? '#000000' : '#FFFFFF';
    doc.moveTo(-1, -8)
       .lineTo(2, -2)
       .lineTo(0, -2)
       .lineTo(-3, -8)
       .closePath()
       .fill(slotFill);

    // Collar
    doc.ellipse(0, 8, 10, 4).fillAndStroke(fill, stroke);

    // Base
    doc.moveTo(-12, 10)
       .lineTo(-12, 16)
       .lineTo(12, 16)
       .lineTo(12, 10)
       .closePath()
       .fillAndStroke(fill, stroke);
  }

  drawKnight(doc, fill, stroke, lineWidth) {
    doc.lineWidth(lineWidth);

    // Horse head - simplified shape
    doc.moveTo(-4, -18)
       .lineTo(-2, -20)
       .lineTo(4, -18)
       .lineTo(10, -14)
       .lineTo(14, -8)
       .lineTo(14, -4)
       .lineTo(12, 0)
       .lineTo(14, 4)
       .lineTo(12, 8)
       .lineTo(10, 8)
       .lineTo(10, 16)
       .lineTo(-10, 16)
       .lineTo(-10, 8)
       .lineTo(-8, 4)
       .lineTo(-12, 0)
       .lineTo(-10, -8)
       .lineTo(-8, -14)
       .closePath()
       .fillAndStroke(fill, stroke);

    // Eye
    const eyeFill = fill === '#FFFFFF' ? '#000000' : '#FFFFFF';
    doc.circle(6, -10, 2).fill(eyeFill);

    // Nostril
    doc.circle(12, -2, 1.5).fill(eyeFill);
  }

  drawPawn(doc, fill, stroke, lineWidth) {
    doc.lineWidth(lineWidth);

    // Head
    doc.circle(0, -12, 7).fillAndStroke(fill, stroke);

    // Neck/body
    doc.moveTo(-5, -6)
       .lineTo(-8, 6)
       .lineTo(8, 6)
       .lineTo(5, -6)
       .closePath()
       .fillAndStroke(fill, stroke);

    // Base
    doc.moveTo(-10, 6)
       .lineTo(-12, 16)
       .lineTo(12, 16)
       .lineTo(10, 6)
       .closePath()
       .fillAndStroke(fill, stroke);
  }

  drawCoordinates(doc, x, y, size, squareSize) {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('#333333');

    for (let i = 0; i < 8; i++) {
      const fileX = x + i * squareSize + squareSize / 2 - 3;
      doc.text(files[i], fileX, y + size + 5, { lineBreak: false });
    }

    for (let i = 0; i < 8; i++) {
      const rankY = y + i * squareSize + squareSize / 2 - 5;
      doc.text(ranks[i], x - 12, rankY, { lineBreak: false });
    }

    doc.fillColor('#000000');
  }

  renderAnswerSheet(doc, puzzles) {
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text('Answer Sheet', { align: 'center' });

    doc.moveDown();

    doc.fontSize(11)
       .font('Helvetica')
       .fillColor('#666666')
       .text('Write your moves in standard algebraic notation (e.g., Nf3, Bxc6, O-O)', { align: 'center' });

    doc.moveDown(2);

    const boxWidth = 450;
    const leftMargin = 70;

    doc.fillColor('#000000');

    for (let i = 0; i < puzzles.length; i++) {
      if (doc.y + 50 > 750) {
        doc.addPage();
        doc.y = 50;
      }

      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text(`${i + 1}.`, leftMargin, doc.y, { continued: false });

      doc.font('Helvetica').fontSize(10);

      const lineY = doc.y + 5;
      doc.moveTo(leftMargin + 30, lineY)
         .lineTo(leftMargin + boxWidth, lineY)
         .lineWidth(0.5)
         .stroke('#CCCCCC');

      doc.moveDown(2);
    }

    doc.moveDown(2);
    doc.fontSize(9)
       .fillColor('#999999')
       .text('Name: _________________________  Date: _____________', { align: 'center' });
  }
}

export const pdfGenerator = new PdfGenerator();
