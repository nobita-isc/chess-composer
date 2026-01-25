/**
 * PuzzleReportManager.js
 * Core logic for puzzle reporting system
 *
 * Coordinates between SQLite (runtime) and IndexedDB (persistent)
 * Provides CRUD operations for reports and puzzle modifications
 */

import { ReportStorage } from './ReportStorage.js';

// Report reason constants
export const REPORT_REASONS = {
  WRONG_SOLUTION: 'wrong_solution',
  DUPLICATE: 'duplicate',
  BROKEN_POSITION: 'broken_position',
  OTHER: 'other'
};

export const REPORT_REASON_LABELS = {
  [REPORT_REASONS.WRONG_SOLUTION]: 'Wrong Solution',
  [REPORT_REASONS.DUPLICATE]: 'Duplicate Puzzle',
  [REPORT_REASONS.BROKEN_POSITION]: 'Broken Position',
  [REPORT_REASONS.OTHER]: 'Other'
};

// Constants
const MAX_NOTES_LENGTH = 500;
const MAX_PUZZLE_ID_LENGTH = 20;
const MAX_FEN_LENGTH = 200;

export class PuzzleReportManager {
  constructor() {
    this.storage = new ReportStorage();
    this.db = null;
    this.initialized = false;
    // In-memory cache for fast blocked ID lookup
    this.blockedIdsCache = new Set();
  }

  /**
   * Initialize the report manager
   * @param {SqliteDatabase} sqliteDb - SQLite database instance
   */
  async initialize(sqliteDb) {
    if (this.initialized) return;

    this.db = sqliteDb;

    // Initialize IndexedDB storage
    await this.storage.initialize();

    // Create SQLite tables if they don't exist
    await this.createTables();

    // Sync from IndexedDB to SQLite
    await this.syncFromIndexedDB();

    // Build blocked IDs cache
    await this.rebuildBlockedCache();

    this.initialized = true;
  }

  /**
   * Create SQLite tables for reports and modifications
   */
  async createTables() {
    if (!this.db || !this.db.isReady()) return;

    try {
      // Create puzzle_reports table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS puzzle_reports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          puzzle_id TEXT NOT NULL,
          reason TEXT NOT NULL,
          notes TEXT,
          dismissed INTEGER DEFAULT 0,
          reported_at INTEGER NOT NULL
        )
      `);

      // Create puzzle_modifications table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS puzzle_modifications (
          puzzle_id TEXT PRIMARY KEY,
          blocked INTEGER DEFAULT 0,
          modified_fen TEXT,
          modified_at INTEGER NOT NULL
        )
      `);

      // Create indexes for faster lookups
      this.db.exec(`CREATE INDEX IF NOT EXISTS idx_reports_puzzle ON puzzle_reports(puzzle_id)`);
      this.db.exec(`CREATE INDEX IF NOT EXISTS idx_mods_blocked ON puzzle_modifications(blocked)`);
    } catch (error) {
      // Tables might already exist - expected during re-initialization
      if (!error.message?.includes('already exists')) {
        console.warn('Error creating report tables:', error);
      }
    }
  }

  /**
   * Sync data from IndexedDB to SQLite (on app load)
   */
  async syncFromIndexedDB() {
    if (!this.db || !this.db.isReady()) return;

    try {
      // Sync reports
      const reports = await this.storage.getReports({ includeDismissed: true });
      for (const report of reports) {
        // Check if report already exists in SQLite
        const existing = this.db.queryOne(
          'SELECT id FROM puzzle_reports WHERE id = ?',
          [report.id]
        );

        if (!existing) {
          this.db.run(
            `INSERT INTO puzzle_reports (id, puzzle_id, reason, notes, dismissed, reported_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [report.id, report.puzzle_id, report.reason, report.notes || '', report.dismissed || 0, report.reported_at]
          );
        }
      }

      // Sync modifications
      const modifications = await this.storage.getAllModifications();
      for (const mod of modifications) {
        this.db.run(
          `INSERT OR REPLACE INTO puzzle_modifications (puzzle_id, blocked, modified_fen, modified_at)
           VALUES (?, ?, ?, ?)`,
          [mod.puzzle_id, mod.blocked || 0, mod.modified_fen || null, mod.modified_at]
        );
      }
    } catch (error) {
      // Sync errors are not critical, but log for debugging
      console.warn('Error syncing from IndexedDB:', error);
    }
  }

  /**
   * Rebuild the blocked IDs cache from IndexedDB
   */
  async rebuildBlockedCache() {
    try {
      const blockedIds = await this.storage.getBlockedPuzzleIds();
      this.blockedIdsCache = new Set(blockedIds);
    } catch (error) {
      this.blockedIdsCache = new Set();
    }
  }

  /**
   * Report a puzzle
   * @param {string} puzzleId - Puzzle ID
   * @param {string} reason - Report reason (from REPORT_REASONS)
   * @param {string} notes - Optional additional notes
   * @returns {object} - { success: boolean, reportId?: number, error?: string }
   */
  async reportPuzzle(puzzleId, reason, notes = '') {
    try {
      // Validate puzzleId
      if (!puzzleId || typeof puzzleId !== 'string' || puzzleId.length > MAX_PUZZLE_ID_LENGTH) {
        throw new Error('Invalid puzzle ID');
      }

      // Validate puzzleId format (alphanumeric only for Lichess puzzle IDs)
      if (!/^[a-zA-Z0-9]+$/.test(puzzleId)) {
        throw new Error('Invalid puzzle ID format');
      }

      // Validate reason
      if (!Object.values(REPORT_REASONS).includes(reason)) {
        throw new Error('Invalid report reason');
      }

      const reportData = {
        puzzle_id: puzzleId,
        reason,
        notes: notes.trim().substring(0, MAX_NOTES_LENGTH),
        reported_at: Date.now()
      };

      // Save to IndexedDB (persistent)
      const reportId = await this.storage.saveReport(reportData);

      // Save to SQLite (runtime)
      if (this.db && this.db.isReady()) {
        this.db.run(
          `INSERT INTO puzzle_reports (id, puzzle_id, reason, notes, dismissed, reported_at)
           VALUES (?, ?, ?, ?, 0, ?)`,
          [reportId, reportData.puzzle_id, reportData.reason, reportData.notes, reportData.reported_at]
        );
      }

      return { success: true, reportId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all reports with pagination
   * @param {object} options - { page: number, pageSize: number, includeDismissed: boolean }
   * @returns {object} - { reports: array, total: number, hasMore: boolean }
   */
  async getReports({ page = 1, pageSize = 20, includeDismissed = false } = {}) {
    try {
      const allReports = await this.storage.getReports({ includeDismissed });
      const total = allReports.length;
      const offset = (page - 1) * pageSize;
      const reports = allReports.slice(offset, offset + pageSize);

      return {
        reports,
        total,
        page,
        pageSize,
        hasMore: offset + pageSize < total
      };
    } catch (error) {
      return { reports: [], total: 0, page, pageSize, hasMore: false };
    }
  }

  /**
   * Dismiss a report
   * @param {number} reportId - Report ID
   * @returns {object} - { success: boolean, error?: string }
   */
  async dismissReport(reportId) {
    try {
      // Update IndexedDB
      await this.storage.updateReport(reportId, { dismissed: 1 });

      // Update SQLite
      if (this.db && this.db.isReady()) {
        this.db.run(
          'UPDATE puzzle_reports SET dismissed = 1 WHERE id = ?',
          [reportId]
        );
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a report
   * @param {number} reportId - Report ID
   * @returns {object} - { success: boolean, error?: string }
   */
  async deleteReport(reportId) {
    try {
      // Delete from IndexedDB
      await this.storage.deleteReport(reportId);

      // Delete from SQLite
      if (this.db && this.db.isReady()) {
        this.db.run('DELETE FROM puzzle_reports WHERE id = ?', [reportId]);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Block a puzzle (exclude from quiz generation)
   * @param {string} puzzleId - Puzzle ID
   * @returns {object} - { success: boolean, error?: string }
   */
  async blockPuzzle(puzzleId) {
    try {
      const modification = {
        puzzle_id: puzzleId,
        blocked: 1,
        modified_fen: null,
        modified_at: Date.now()
      };

      // Save to IndexedDB
      await this.storage.saveModification(modification);

      // Save to SQLite
      if (this.db && this.db.isReady()) {
        this.db.run(
          `INSERT OR REPLACE INTO puzzle_modifications (puzzle_id, blocked, modified_fen, modified_at)
           VALUES (?, 1, (SELECT modified_fen FROM puzzle_modifications WHERE puzzle_id = ?), ?)`,
          [puzzleId, puzzleId, modification.modified_at]
        );
      }

      // Update cache
      this.blockedIdsCache.add(puzzleId);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Unblock a puzzle
   * @param {string} puzzleId - Puzzle ID
   * @returns {object} - { success: boolean, error?: string }
   */
  async unblockPuzzle(puzzleId) {
    try {
      // Get existing modification to preserve FEN changes
      const existing = await this.storage.getModification(puzzleId);

      if (existing) {
        const modification = {
          ...existing,
          blocked: 0,
          modified_at: Date.now()
        };
        await this.storage.saveModification(modification);

        if (this.db && this.db.isReady()) {
          this.db.run(
            'UPDATE puzzle_modifications SET blocked = 0, modified_at = ? WHERE puzzle_id = ?',
            [modification.modified_at, puzzleId]
          );
        }
      }

      // Update cache
      this.blockedIdsCache.delete(puzzleId);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update puzzle FEN
   * @param {string} puzzleId - Puzzle ID
   * @param {string} newFen - New FEN string
   * @returns {object} - { success: boolean, error?: string }
   */
  async updatePuzzleFEN(puzzleId, newFen) {
    try {
      // Validate FEN length
      if (!newFen || newFen.length > MAX_FEN_LENGTH) {
        throw new Error('Invalid FEN string length');
      }

      // Get existing modification or create new one
      const existing = await this.storage.getModification(puzzleId);

      const modification = {
        puzzle_id: puzzleId,
        blocked: existing?.blocked || 0,
        modified_fen: newFen,
        modified_at: Date.now()
      };

      // Save to IndexedDB
      await this.storage.saveModification(modification);

      // Save to SQLite modification table
      if (this.db && this.db.isReady()) {
        this.db.run(
          `INSERT OR REPLACE INTO puzzle_modifications (puzzle_id, blocked, modified_fen, modified_at)
           VALUES (?, ?, ?, ?)`,
          [puzzleId, modification.blocked, newFen, modification.modified_at]
        );
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get modification for a puzzle
   * @param {string} puzzleId - Puzzle ID
   * @returns {object|null} - Modification object or null
   */
  async getModification(puzzleId) {
    return this.storage.getModification(puzzleId);
  }

  /**
   * Get all blocked puzzle IDs (fast, uses cache)
   * @returns {array} - Array of blocked puzzle IDs
   */
  getBlockedPuzzleIds() {
    return Array.from(this.blockedIdsCache);
  }

  /**
   * Check if a puzzle is blocked
   * @param {string} puzzleId - Puzzle ID
   * @returns {boolean}
   */
  isBlocked(puzzleId) {
    return this.blockedIdsCache.has(puzzleId);
  }

  /**
   * Get puzzle info (for display in admin panel)
   * @param {string} puzzleId - Puzzle ID
   * @returns {object|null} - Puzzle data or null
   */
  getPuzzleInfo(puzzleId) {
    if (!this.db || !this.db.isReady()) return null;

    try {
      return this.db.queryOne(
        'SELECT id, fen, rating, themes FROM puzzles WHERE id = ?',
        [puzzleId]
      );
    } catch (error) {
      return null;
    }
  }

  /**
   * Export the database as a downloadable file
   * @returns {Blob} - Database file as Blob
   */
  async exportDatabase() {
    if (!this.db || !this.db.isReady() || !this.db.db) {
      throw new Error('Database not initialized');
    }

    // Export the SQLite database to Uint8Array
    const data = this.db.db.export();
    const blob = new Blob([data], { type: 'application/x-sqlite3' });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `puzzles_modified_${timestamp}.db`;

    // Trigger download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return blob;
  }

  /**
   * Get statistics about reports
   * @returns {object} - { totalReports, blockedPuzzles, pendingReports }
   */
  async getStats() {
    try {
      const allReports = await this.storage.getReports({ includeDismissed: true });
      const blockedIds = await this.storage.getBlockedPuzzleIds();

      return {
        totalReports: allReports.length,
        pendingReports: allReports.filter(r => r.dismissed !== 1).length,
        dismissedReports: allReports.filter(r => r.dismissed === 1).length,
        blockedPuzzles: blockedIds.length
      };
    } catch (error) {
      return { totalReports: 0, pendingReports: 0, dismissedReports: 0, blockedPuzzles: 0 };
    }
  }
}

export default PuzzleReportManager;
