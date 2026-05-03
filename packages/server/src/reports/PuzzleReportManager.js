/**
 * PuzzleReportManager.js (Server Version)
 * Manage puzzle reports and modifications using better-sqlite3
 *
 * Simplified from client version - no IndexedDB sync needed,
 * all storage is in SQLite.
 */

import { database } from '../database/SqliteDatabase.js';
import { getDialectForDb } from '../database/dialect.js';

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
    this.db = null;
    this.initialized = false;
    this.blockedIdsCache = new Set();
  }

  /**
   * Initialize the report manager
   */
  async initialize() {
    if (this.initialized) return;

    this.db = database;

    if (!this.db.isReady()) {
      throw new Error('Database not initialized');
    }

    await this.createTables();
    await this.rebuildBlockedCache();

    this.initialized = true;
  }

  /**
   * Create tables for reports and modifications (portable: SQLite + Postgres)
   */
  async createTables() {
    const dialect = getDialectForDb(this.db);
    try {
      // BIGINT for millisecond timestamps: PG INT4 max ~2.1e9 < Date.now() ~1.7e12.
      // SQLite stores BIGINT as 8-byte integer — fully compatible.
      const isPostgres = Boolean(this.db.driver);
      const bigintType = isPostgres ? 'BIGINT' : 'INTEGER';
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS puzzle_reports (
          id ${dialect.autoIncrementPk()},
          puzzle_id TEXT NOT NULL,
          reason TEXT NOT NULL,
          notes TEXT,
          dismissed INTEGER DEFAULT 0,
          reported_at ${bigintType} NOT NULL
        )
      `);

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS puzzle_modifications (
          puzzle_id TEXT PRIMARY KEY,
          blocked INTEGER DEFAULT 0,
          modified_fen TEXT,
          modified_at ${bigintType} NOT NULL
        )
      `);

      await this.db.exec(`CREATE INDEX IF NOT EXISTS idx_reports_puzzle ON puzzle_reports(puzzle_id)`);
      await this.db.exec(`CREATE INDEX IF NOT EXISTS idx_mods_blocked ON puzzle_modifications(blocked)`);
    } catch (error) {
      if (!error.message?.includes('already exists')) {
        throw error;
      }
    }
  }

  /**
   * Rebuild the blocked IDs cache
   */
  async rebuildBlockedCache() {
    try {
      const rows = await this.db.query('SELECT puzzle_id FROM puzzle_modifications WHERE blocked = 1');
      this.blockedIdsCache = new Set(rows.map(r => r.puzzle_id));
    } catch (error) {
      this.blockedIdsCache = new Set();
    }
  }

  /**
   * Report a puzzle
   * @param {string} puzzleId - Puzzle ID
   * @param {string} reason - Report reason
   * @param {string} notes - Optional notes
   * @returns {object} - { success, reportId?, error? }
   */
  async reportPuzzle(puzzleId, reason, notes = '') {
    try {
      if (!puzzleId || typeof puzzleId !== 'string' || puzzleId.length > MAX_PUZZLE_ID_LENGTH) {
        throw new Error('Invalid puzzle ID');
      }

      if (!/^[a-zA-Z0-9]+$/.test(puzzleId)) {
        throw new Error('Invalid puzzle ID format');
      }

      if (!Object.values(REPORT_REASONS).includes(reason)) {
        throw new Error('Invalid report reason');
      }

      const reportData = {
        puzzle_id: puzzleId,
        reason,
        notes: notes.trim().substring(0, MAX_NOTES_LENGTH),
        reported_at: Date.now()
      };

      const result = await this.db.run(
        `INSERT INTO puzzle_reports (puzzle_id, reason, notes, dismissed, reported_at)
         VALUES (?, ?, ?, 0, ?)`,
        [reportData.puzzle_id, reportData.reason, reportData.notes, reportData.reported_at]
      );

      // lastInsertRowid from better-sqlite3; postgres driver returns lastInsertId
      const reportId = Number(result.lastInsertRowid ?? result.lastInsertId ?? 0);
      return { success: true, reportId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all reports with pagination
   * @param {object} options - { page, pageSize, includeDismissed }
   * @returns {object} - { reports, total, page, pageSize, hasMore }
   */
  async getReports({ page = 1, pageSize = 20, includeDismissed = false } = {}) {
    try {
      let countSql = 'SELECT COUNT(*) FROM puzzle_reports';
      let sql = 'SELECT * FROM puzzle_reports';

      if (!includeDismissed) {
        const whereClause = ' WHERE dismissed = 0';
        countSql += whereClause;
        sql += whereClause;
      }

      sql += ' ORDER BY reported_at DESC';
      sql += ` LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;

      const total = (await this.db.queryScalar(countSql)) || 0;
      const reports = await this.db.query(sql);

      return {
        reports,
        total,
        page,
        pageSize,
        hasMore: (page * pageSize) < total
      };
    } catch (error) {
      return { reports: [], total: 0, page, pageSize, hasMore: false };
    }
  }

  /**
   * Dismiss a report
   * @param {number} reportId - Report ID
   * @returns {object} - { success, error? }
   */
  async dismissReport(reportId) {
    try {
      await this.db.run('UPDATE puzzle_reports SET dismissed = 1 WHERE id = ?', [reportId]);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a report
   * @param {number} reportId - Report ID
   * @returns {object} - { success, error? }
   */
  async deleteReport(reportId) {
    try {
      await this.db.run('DELETE FROM puzzle_reports WHERE id = ?', [reportId]);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Block a puzzle
   * @param {string} puzzleId - Puzzle ID
   * @returns {object} - { success, error? }
   */
  async blockPuzzle(puzzleId) {
    try {
      // Preserve existing modified_fen when blocking; upsert is portable across SQLite + Postgres
      const existing = await this.db.queryOne(
        'SELECT modified_fen FROM puzzle_modifications WHERE puzzle_id = ?',
        [puzzleId]
      );
      const dialect = getDialectForDb(this.db);
      const sql = dialect.upsert({
        table: 'puzzle_modifications',
        columns: ['puzzle_id', 'blocked', 'modified_fen', 'modified_at'],
        conflictCols: ['puzzle_id'],
        updateCols: ['blocked', 'modified_fen', 'modified_at']
      });
      await this.db.run(sql, [puzzleId, 1, existing?.modified_fen ?? null, Date.now()]);

      this.blockedIdsCache.add(puzzleId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Unblock a puzzle
   * @param {string} puzzleId - Puzzle ID
   * @returns {object} - { success, error? }
   */
  async unblockPuzzle(puzzleId) {
    try {
      await this.db.run(
        'UPDATE puzzle_modifications SET blocked = 0, modified_at = ? WHERE puzzle_id = ?',
        [Date.now(), puzzleId]
      );

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
   * @returns {object} - { success, error? }
   */
  async updatePuzzleFEN(puzzleId, newFen) {
    try {
      if (!newFen || newFen.length > MAX_FEN_LENGTH) {
        throw new Error('Invalid FEN string length');
      }

      const existing = await this.db.queryOne(
        'SELECT blocked FROM puzzle_modifications WHERE puzzle_id = ?',
        [puzzleId]
      );

      const dialect = getDialectForDb(this.db);
      const sql = dialect.upsert({
        table: 'puzzle_modifications',
        columns: ['puzzle_id', 'blocked', 'modified_fen', 'modified_at'],
        conflictCols: ['puzzle_id'],
        updateCols: ['blocked', 'modified_fen', 'modified_at']
      });
      await this.db.run(sql, [puzzleId, existing?.blocked || 0, newFen, Date.now()]);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get modification for a puzzle
   * @param {string} puzzleId - Puzzle ID
   * @returns {object|null}
   */
  async getModification(puzzleId) {
    return this.db.queryOne(
      'SELECT * FROM puzzle_modifications WHERE puzzle_id = ?',
      [puzzleId]
    );
  }

  /**
   * Get all blocked puzzle IDs (fast, uses cache)
   * @returns {array}
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
   * Get puzzle info
   * @param {string} puzzleId - Puzzle ID
   * @returns {object|null}
   */
  async getPuzzleInfo(puzzleId) {
    return this.db.queryOne(
      'SELECT id, fen, rating, themes FROM puzzles WHERE id = ?',
      [puzzleId]
    );
  }

  /**
   * Get statistics
   * @returns {object}
   */
  async getStats() {
    try {
      const totalReports = (await this.db.queryScalar('SELECT COUNT(*) FROM puzzle_reports')) || 0;
      const pendingReports = (await this.db.queryScalar('SELECT COUNT(*) FROM puzzle_reports WHERE dismissed = 0')) || 0;
      const dismissedReports = totalReports - pendingReports;
      const blockedPuzzles = this.blockedIdsCache.size;

      return {
        totalReports,
        pendingReports,
        dismissedReports,
        blockedPuzzles
      };
    } catch (error) {
      return { totalReports: 0, pendingReports: 0, dismissedReports: 0, blockedPuzzles: 0 };
    }
  }
}

export const reportManager = new PuzzleReportManager();

export default PuzzleReportManager;
