/**
 * ApiClient.js
 * HTTP client for communicating with the chess composer server API
 *
 * This replaces the direct database access with server API calls.
 */

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export class ApiClient {
  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Make an HTTP request
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(
          data.error || 'Request failed',
          response.status,
          data
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Network request failed', 0, { originalError: error.message });
    }
  }

  /**
   * GET request
   */
  get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  /**
   * POST request
   */
  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  /**
   * PUT request
   */
  put(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  /**
   * DELETE request
   */
  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // ==================== Puzzle API ====================

  /**
   * Generate puzzles with filters
   * @param {object} options - { theme, count, minRating, maxRating, minPopularity }
   */
  async generatePuzzles(options = {}) {
    const response = await this.post('/puzzles/generate', options);
    return response.data;
  }

  /**
   * Get puzzle by ID
   * @param {string} id - Puzzle ID
   */
  async getPuzzle(id) {
    const response = await this.get(`/puzzles/${id}`);
    return response.data;
  }

  /**
   * Block a puzzle
   * @param {string} id - Puzzle ID
   */
  async blockPuzzle(id) {
    const response = await this.put(`/puzzles/${id}/block`);
    return response.data;
  }

  /**
   * Unblock a puzzle
   * @param {string} id - Puzzle ID
   */
  async unblockPuzzle(id) {
    const response = await this.put(`/puzzles/${id}/unblock`);
    return response.data;
  }

  /**
   * Update puzzle FEN
   * @param {string} id - Puzzle ID
   * @param {string} fen - New FEN
   */
  async updatePuzzleFEN(id, fen) {
    const response = await this.put(`/puzzles/${id}/fen`, { fen });
    return response.data;
  }

  /**
   * Create a new custom puzzle
   * @param {object} puzzleData - { id?, fen, moves, source, themes?, rating?, game_url? }
   */
  async createPuzzle(puzzleData) {
    const response = await this.post('/puzzles', puzzleData);
    return response.data;
  }

  /**
   * Get custom puzzle statistics
   */
  async getCustomPuzzleStats() {
    const response = await this.get('/puzzles/custom/stats');
    return response.data;
  }

  // ==================== Lichess API ====================

  /**
   * Fetch puzzle data from Lichess
   * @param {string} puzzleId - Lichess puzzle ID
   */
  async fetchLichessPuzzle(puzzleId) {
    const response = await this.get(`/lichess/puzzle/${puzzleId}`);
    return response.data;
  }

  /**
   * Get daily puzzle from Lichess
   */
  async getLichessDaily() {
    const response = await this.get('/lichess/daily');
    return response.data;
  }

  // ==================== Theme API ====================

  /**
   * Get all available themes
   */
  async getThemes() {
    const response = await this.get('/themes');
    return response.data;
  }

  /**
   * Get themes grouped by category
   */
  async getThemesWithCategories() {
    const response = await this.get('/themes/categories');
    return response.data;
  }

  /**
   * Get theme statistics
   */
  async getStats() {
    const response = await this.get('/themes/stats');
    return response.data;
  }

  // ==================== Report API ====================

  /**
   * Report a puzzle
   * @param {string} puzzleId - Puzzle ID
   * @param {string} reason - Report reason
   * @param {string} notes - Optional notes
   */
  async reportPuzzle(puzzleId, reason, notes = '') {
    const response = await this.post('/reports', { puzzleId, reason, notes });
    return response;
  }

  /**
   * Get reports with pagination
   * @param {object} options - { page, pageSize, includeDismissed }
   */
  async getReports(options = {}) {
    const response = await this.get('/reports', options);
    return response.data;
  }

  /**
   * Get report statistics
   */
  async getReportStats() {
    const response = await this.get('/reports/stats');
    return response.data;
  }

  /**
   * Dismiss a report
   * @param {number} reportId - Report ID
   */
  async dismissReport(reportId) {
    const response = await this.put(`/reports/${reportId}/dismiss`);
    return response;
  }

  /**
   * Delete a report
   * @param {number} reportId - Report ID
   */
  async deleteReport(reportId) {
    const response = await this.delete(`/reports/${reportId}`);
    return response;
  }
}

// Singleton instance
export const apiClient = new ApiClient();

export default ApiClient;
