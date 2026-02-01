/**
 * ChessEngineV2.js
 * Improved Stockfish wrapper using npm stockfish package
 */

export class ChessEngineV2 {
  constructor() {
    this.engine = null;
    this.ready = false;
    this.pendingCommands = [];
    this.currentCallback = null;
    this.buffer = '';
  }

  /**
   * Initialize the Stockfish engine using npm package
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      try {
        // Import stockfish from npm
        import('stockfish').then((module) => {
          this.engine = module.default ? module.default() : module();

          this.engine.onmessage = (line) => {
            this.handleOutput(line);
          };

          // Wait for engine ready
          this.engine.postMessage('uci');

          const timeout = setTimeout(() => {
            if (!this.ready) {
              reject(new Error('Stockfish initialization timeout'));
            }
          }, 10000);

          const checkReady = setInterval(() => {
            if (this.ready) {
              clearInterval(checkReady);
              clearTimeout(timeout);
              console.log('✅ Stockfish engine initialized (npm package)');
              resolve();
            }
          }, 100);

        }).catch((error) => {
          console.error('Failed to import stockfish:', error);
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle engine output
   */
  handleOutput(line) {
    console.log('Stockfish:', line);

    if (line === 'uciok') {
      this.engine.postMessage('isready');
    } else if (line === 'readyok') {
      this.ready = true;
      this.engine.postMessage('setoption name Skill Level value 20');
    }

    if (this.currentCallback) {
      this.currentCallback(line);
    }
  }

  /**
   * Send command to engine
   */
  sendCommand(command) {
    if (this.engine && this.ready) {
      this.engine.postMessage(command);
    }
  }

  /**
   * Analyze position
   */
  async analyze(fen, depth = 15) {
    return new Promise((resolve) => {
      if (!this.ready) {
        resolve({ error: 'Engine not ready' });
        return;
      }

      let bestMove = null;
      let evaluation = null;
      let mate = null;

      this.currentCallback = (line) => {
        // Parse bestmove
        if (line.startsWith('bestmove')) {
          const match = line.match(/bestmove (\S+)/);
          if (match) {
            bestMove = match[1];
          }
        }

        // Parse evaluation
        if (line.startsWith('info') && line.includes('score')) {
          const cpMatch = line.match(/score cp (-?\d+)/);
          if (cpMatch) {
            evaluation = parseInt(cpMatch[1]) / 100;
          }

          const mateMatch = line.match(/score mate (-?\d+)/);
          if (mateMatch) {
            mate = parseInt(mateMatch[1]);
          }
        }
      };

      this.sendCommand('ucinewgame');
      this.sendCommand(`position fen ${fen}`);
      this.sendCommand(`go depth ${depth}`);

      // Wait for analysis
      setTimeout(() => {
        this.currentCallback = null;
        resolve({
          bestMove,
          evaluation,
          mate,
          isMate: mate !== null
        });
      }, (depth * 200) + 1000); // Estimate time based on depth
    });
  }

  /**
   * Terminate engine
   */
  terminate() {
    if (this.engine) {
      this.engine.postMessage('quit');
      this.engine = null;
      this.ready = false;
    }
  }
}

export default ChessEngineV2;
