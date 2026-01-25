/**
 * ReportStorage.js
 * IndexedDB persistence for puzzle reports and modifications
 *
 * Stores reports across browser sessions, syncs with SQLite runtime database
 */

const CACHE_DB_NAME = 'chess-puzzle-reports';
const CACHE_DB_VERSION = 1;
const REPORTS_STORE = 'reports';
const MODIFICATIONS_STORE = 'modifications';

export class ReportStorage {
  constructor() {
    this.db = null;
  }

  /**
   * Open IndexedDB connection
   */
  async open() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CACHE_DB_NAME, CACHE_DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store for puzzle reports
        if (!db.objectStoreNames.contains(REPORTS_STORE)) {
          const reportsStore = db.createObjectStore(REPORTS_STORE, { keyPath: 'id', autoIncrement: true });
          reportsStore.createIndex('puzzle_id', 'puzzle_id', { unique: false });
          reportsStore.createIndex('reported_at', 'reported_at', { unique: false });
        }

        // Store for puzzle modifications (blocks, FEN edits)
        if (!db.objectStoreNames.contains(MODIFICATIONS_STORE)) {
          const modsStore = db.createObjectStore(MODIFICATIONS_STORE, { keyPath: 'puzzle_id' });
          modsStore.createIndex('blocked', 'blocked', { unique: false });
        }
      };
    });
  }

  /**
   * Initialize storage
   */
  async initialize() {
    await this.open();
  }

  /**
   * Save a new report
   * @param {object} report - Report object { puzzle_id, reason, notes, reported_at }
   * @returns {number} - Generated report ID
   */
  async saveReport(report) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(REPORTS_STORE, 'readwrite');
      const store = transaction.objectStore(REPORTS_STORE);

      const reportData = {
        ...report,
        dismissed: 0,
        reported_at: report.reported_at || Date.now()
      };

      const request = store.add(reportData);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Get all reports
   * @param {object} options - { includeDismissed: boolean }
   * @returns {array} - Array of report objects
   */
  async getReports({ includeDismissed = false } = {}) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(REPORTS_STORE, 'readonly');
      const store = transaction.objectStore(REPORTS_STORE);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        let reports = request.result || [];
        if (!includeDismissed) {
          reports = reports.filter(r => r.dismissed !== 1);
        }
        // Sort by reported_at descending
        reports.sort((a, b) => (b.reported_at || 0) - (a.reported_at || 0));
        resolve(reports);
      };
    });
  }

  /**
   * Update a report
   * @param {number} reportId - Report ID
   * @param {object} updates - Fields to update
   */
  async updateReport(reportId, updates) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(REPORTS_STORE, 'readwrite');
      const store = transaction.objectStore(REPORTS_STORE);

      const getRequest = store.get(reportId);
      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        const report = getRequest.result;
        if (!report) {
          reject(new Error('Report not found'));
          return;
        }

        const updatedReport = { ...report, ...updates };
        const putRequest = store.put(updatedReport);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve(updatedReport);
      };
    });
  }

  /**
   * Delete a report
   * @param {number} reportId - Report ID
   */
  async deleteReport(reportId) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(REPORTS_STORE, 'readwrite');
      const store = transaction.objectStore(REPORTS_STORE);
      const request = store.delete(reportId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Save or update a puzzle modification
   * @param {object} modification - { puzzle_id, blocked, modified_fen, modified_at }
   */
  async saveModification(modification) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(MODIFICATIONS_STORE, 'readwrite');
      const store = transaction.objectStore(MODIFICATIONS_STORE);

      const modData = {
        ...modification,
        modified_at: modification.modified_at || Date.now()
      };

      const request = store.put(modData);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(modData);
    });
  }

  /**
   * Get modification for a puzzle
   * @param {string} puzzleId - Puzzle ID
   * @returns {object|null} - Modification object or null
   */
  async getModification(puzzleId) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(MODIFICATIONS_STORE, 'readonly');
      const store = transaction.objectStore(MODIFICATIONS_STORE);
      const request = store.get(puzzleId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  /**
   * Get all modifications
   * @returns {array} - Array of modification objects
   */
  async getAllModifications() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(MODIFICATIONS_STORE, 'readonly');
      const store = transaction.objectStore(MODIFICATIONS_STORE);
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  /**
   * Get all blocked puzzle IDs
   * @returns {array} - Array of puzzle IDs that are blocked
   */
  async getBlockedPuzzleIds() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(MODIFICATIONS_STORE, 'readonly');
      const store = transaction.objectStore(MODIFICATIONS_STORE);
      const index = store.index('blocked');
      const request = index.getAll(1); // Get all with blocked = 1

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const mods = request.result || [];
        resolve(mods.map(m => m.puzzle_id));
      };
    });
  }

  /**
   * Delete a modification
   * @param {string} puzzleId - Puzzle ID
   */
  async deleteModification(puzzleId) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(MODIFICATIONS_STORE, 'readwrite');
      const store = transaction.objectStore(MODIFICATIONS_STORE);
      const request = store.delete(puzzleId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Clear all data (for testing/reset)
   */
  async clearAll() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([REPORTS_STORE, MODIFICATIONS_STORE], 'readwrite');

      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();

      transaction.objectStore(REPORTS_STORE).clear();
      transaction.objectStore(MODIFICATIONS_STORE).clear();
    });
  }
}

export default ReportStorage;
