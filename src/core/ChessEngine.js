/**
 * ChessEngine.js
 * Wrapper for Stockfish chess engine using Web Worker
 * Provides position evaluation, best move calculation, and mate detection
 */

export class ChessEngine {
  constructor() {
    this.worker = null;
    this.ready = false;
    this.commandQueue = [];
    this.callbacks = new Map();
    this.messageId = 0;
  }

  /**
   * Initialize the Stockfish engine
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      try {
        // Create Web Worker with Stockfish
        // Using stockfish.js from working CDN
        const workerCode = `
          importScripts('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js');

          let engine;

          // Initialize Stockfish
          if (typeof STOCKFISH === 'function') {
            engine = STOCKFISH();
          } else if (typeof Stockfish === 'function') {
            engine = Stockfish();
          }

          if (engine) {
            engine.onmessage = function(line) {
              postMessage({ type: 'output', data: line });
            };
          }

          self.onmessage = function(e) {
            const { id, command } = e.data;
            if (engine && command) {
              engine.postMessage(command);
            }
          };
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.worker = new Worker(URL.createObjectURL(blob));

        this.worker.onmessage = (e) => {
          const { type, data } = e.data;
          if (type === 'output') {
            this.handleEngineOutput(data);
          }
        };

        this.worker.onerror = (error) => {
          console.error('Stockfish worker error:', error);
          reject(error);
        };

        // Wait for engine to be ready
        this.sendCommand('uci');

        // Set up a timeout to resolve after engine initialization
        const checkReady = setInterval(() => {
          if (this.ready) {
            clearInterval(checkReady);
            console.log('Stockfish engine initialized successfully');
            this.sendCommand('setoption name Skill Level value 20');
            resolve();
          }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkReady);
          if (!this.ready) {
            reject(new Error('Stockfish initialization timeout'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle output from Stockfish engine
   */
  handleEngineOutput(line) {
    console.log('Stockfish:', line);

    if (line === 'uciok') {
      this.sendCommand('isready');
    } else if (line === 'readyok') {
      this.ready = true;
    }

    // Handle bestmove responses
    if (line.startsWith('bestmove')) {
      this.handleBestMove(line);
    }

    // Handle info responses (evaluation, mate detection)
    if (line.startsWith('info')) {
      this.handleInfo(line);
    }
  }

  /**
   * Send command to Stockfish
   */
  sendCommand(command) {
    if (this.worker) {
      const id = this.messageId++;
      this.worker.postMessage({ id, command });
    }
  }

  /**
   * Find best move for a position
   */
  async findBestMove(fen, depth = 15) {
    return new Promise((resolve) => {
      const callbackId = `bestmove_${Date.now()}`;
      let evaluation = {
        bestMove: null,
        evaluation: null,
        mate: null,
        depth: depth
      };

      // Set up callback
      this.callbacks.set(callbackId, (data) => {
        evaluation = { ...evaluation, ...data };
      });

      // Send position and analyze
      this.sendCommand('ucinewgame');
      this.sendCommand(`position fen ${fen}`);
      this.sendCommand(`go depth ${depth}`);

      // Wait for analysis to complete
      const checkInterval = setInterval(() => {
        if (evaluation.bestMove) {
          clearInterval(checkInterval);
          this.callbacks.delete(callbackId);
          resolve(evaluation);
        }
      }, 100);

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        this.callbacks.delete(callbackId);
        if (!evaluation.bestMove) {
          resolve({ error: 'Analysis timeout' });
        }
      }, 30000);
    });
  }

  /**
   * Handle bestmove output
   */
  handleBestMove(line) {
    const match = line.match(/bestmove (\S+)/);
    if (match) {
      const bestMove = match[1];
      // Notify all waiting callbacks
      this.callbacks.forEach((callback) => {
        callback({ bestMove });
      });
    }
  }

  /**
   * Handle info output (evaluation, mate detection)
   */
  handleInfo(line) {
    const evaluation = {};

    // Parse centipawn evaluation
    const cpMatch = line.match(/score cp (-?\d+)/);
    if (cpMatch) {
      evaluation.evaluation = parseInt(cpMatch[1]) / 100; // Convert to pawns
    }

    // Parse mate detection
    const mateMatch = line.match(/score mate (-?\d+)/);
    if (mateMatch) {
      evaluation.mate = parseInt(mateMatch[1]);
    }

    // Parse depth
    const depthMatch = line.match(/depth (\d+)/);
    if (depthMatch) {
      evaluation.depth = parseInt(depthMatch[1]);
    }

    // Notify callbacks
    if (Object.keys(evaluation).length > 0) {
      this.callbacks.forEach((callback) => {
        callback(evaluation);
      });
    }
  }

  /**
   * Evaluate a position
   */
  async evaluate(fen, options = {}) {
    const depth = options.depth || 15;
    return await this.findBestMove(fen, depth);
  }

  /**
   * Analyze if position is mate in N moves
   */
  async analyzeMate(fen, maxDepth = 20) {
    const result = await this.findBestMove(fen, maxDepth);
    return {
      isMate: result.mate !== null && result.mate !== undefined,
      mateIn: result.mate,
      bestMove: result.bestMove
    };
  }

  /**
   * Get top N moves for a position
   */
  async getTopMoves(fen, count = 3) {
    return new Promise((resolve) => {
      const moves = [];

      this.sendCommand('ucinewgame');
      this.sendCommand(`position fen ${fen}`);
      this.sendCommand(`go depth 15 multipv ${count}`);

      // Note: This is a simplified implementation
      // In production, you'd parse multiple PV lines
      setTimeout(() => {
        // For now, return the best move
        // Full implementation would parse all PV lines
        resolve(moves);
      }, 5000);
    });
  }

  /**
   * Stop the engine analysis
   */
  stop() {
    this.sendCommand('stop');
  }

  /**
   * Terminate the worker
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.ready = false;
    }
  }
}

export default ChessEngine;
