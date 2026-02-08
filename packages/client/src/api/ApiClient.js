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
    this._authManager = null;
  }

  setAuthManager(authManager) {
    this._authManager = authManager;
  }

  _getAuthHeaders() {
    if (!this._authManager) return {};
    const token = this._authManager.getAccessToken();
    if (!token) return {};
    return { 'Authorization': `Bearer ${token}` };
  }

  /**
   * Make an HTTP request
   */
  async request(endpoint, options = {}, _isRetry = false) {
    const url = `${this.baseUrl}${endpoint}`;

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...this._getAuthHeaders(),
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 && !_isRetry && this._authManager) {
          try {
            const refreshed = await this._authManager.refreshAccessToken();
            if (refreshed) {
              return this.request(endpoint, options, true);
            }
          } catch {
            // Refresh failed, fall through to logout
          }
          this._authManager.logout();
        }

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

  // ==================== Student API ====================

  /**
   * Get all students
   */
  async getStudents() {
    const response = await this.get('/students');
    return response.data;
  }

  /**
   * Get a student by ID
   * @param {string} id - Student ID
   */
  async getStudent(id) {
    const response = await this.get(`/students/${id}`);
    return response.data;
  }

  /**
   * Create a new student
   * @param {object} data - { name, email?, skill_level?, notes? }
   */
  async createStudent(data) {
    const response = await this.post('/students', data);
    return response.data;
  }

  /**
   * Update a student
   * @param {string} id - Student ID
   * @param {object} data - Updated fields
   */
  async updateStudent(id, data) {
    const response = await this.put(`/students/${id}`, data);
    return response.data;
  }

  /**
   * Delete a student
   * @param {string} id - Student ID
   */
  async deleteStudent(id) {
    const response = await this.delete(`/students/${id}`);
    return response;
  }

  /**
   * Get a student's exercise assignments
   * @param {string} id - Student ID
   */
  async getStudentExercises(id) {
    const response = await this.get(`/students/${id}/exercises`);
    return response.data;
  }

  /**
   * Get a student's performance summary
   * @param {string} id - Student ID
   */
  async getStudentPerformance(id) {
    const response = await this.get(`/students/${id}/performance`);
    return response.data;
  }

  // ==================== Exercise API ====================

  /**
   * Get all weekly exercises
   */
  async getExercises() {
    const response = await this.get('/exercises');
    return response.data;
  }

  /**
   * Get current week info
   */
  async getCurrentWeek() {
    const response = await this.get('/exercises/current-week');
    return response.data;
  }

  /**
   * Get an exercise with puzzles
   * @param {string} id - Exercise ID
   */
  async getExercise(id) {
    const response = await this.get(`/exercises/${id}`);
    return response.data;
  }

  /**
   * Create a new weekly exercise
   * @param {object} data - { puzzleIds, filters?, name?, weekStart? }
   */
  async createExercise(data) {
    const response = await this.post('/exercises', data);
    return response.data;
  }

  /**
   * Delete an exercise
   * @param {string} id - Exercise ID
   */
  async deleteExercise(id) {
    const response = await this.delete(`/exercises/${id}`);
    return response;
  }

  /**
   * Assign exercise to students
   * @param {string} exerciseId - Exercise ID
   * @param {string[]} studentIds - Array of student IDs
   */
  async assignExercise(exerciseId, studentIds) {
    const response = await this.post(`/exercises/${exerciseId}/assign`, { studentIds });
    return response.data;
  }

  /**
   * Get exercise PDF download URL
   * @param {string} id - Exercise ID
   */
  getExercisePdfUrl(id) {
    const token = this._authManager?.getAccessToken() || '';
    return `${this.baseUrl}/exercises/${id}/pdf?token=${encodeURIComponent(token)}`;
  }

  /**
   * Get assignments for an exercise
   * @param {string} exerciseId - Exercise ID
   */
  async getExerciseAssignments(exerciseId) {
    const response = await this.get(`/exercises/${exerciseId}/assignments`);
    return response.data;
  }

  // ==================== Student Exercise API ====================

  /**
   * Grade a student's exercise
   * @param {string} studentExerciseId - Student exercise ID
   * @param {number} score - Score
   * @param {string} notes - Optional notes
   * @param {string} puzzleResults - Optional comma-separated results (1=correct, 0=wrong)
   */
  async gradeExercise(studentExerciseId, score, notes, puzzleResults = null) {
    const body = { score, notes };
    if (puzzleResults !== null) {
      body.puzzleResults = puzzleResults;
    }
    const response = await this.put(`/student-exercises/${studentExerciseId}/grade`, body);
    return response.data;
  }

  /**
   * Mark a student exercise as final (no further solving allowed)
   * @param {string} studentExerciseId - Student exercise ID
   */
  async markStudentExerciseAsFinal(studentExerciseId) {
    const response = await this.put(`/student-exercises/${studentExerciseId}/mark-final`);
    return response.data;
  }

  /**
   * Reset a student exercise score back to 0
   * @param {string} studentExerciseId - Student exercise ID
   */
  async resetStudentExerciseScore(studentExerciseId) {
    const response = await this.put(`/student-exercises/${studentExerciseId}/reset-score`);
    return response.data;
  }

  /**
   * Save a student's puzzle attempt (temporary score, not final grade)
   * @param {string} studentExerciseId - Student exercise ID
   * @param {number} score - Number of correct answers
   * @param {string} puzzleResults - Comma-separated results (1=correct, 0=wrong)
   */
  async saveStudentAttempt(studentExerciseId, score, puzzleResults = null, puzzleHints = null) {
    const body = { score };
    if (puzzleResults !== null) {
      body.puzzleResults = puzzleResults;
    }
    if (puzzleHints !== null) {
      body.puzzleHints = puzzleHints;
    }
    const response = await this.put(`/student-exercises/${studentExerciseId}/attempt`, body);
    return response.data;
  }

  /**
   * Upload answer PDF for a student exercise
   * @param {string} studentExerciseId - Student exercise ID
   * @param {File} file - PDF file
   */
  async uploadAnswerPdf(studentExerciseId, file) {
    const formData = new FormData();
    formData.append('file', file);

    const url = `${this.baseUrl}/student-exercises/${studentExerciseId}/upload`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this._getAuthHeaders(),
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(data.error || 'Upload failed', response.status, data);
    }

    return data.data;
  }

  /**
   * Get answer PDF download URL
   * @param {string} studentExerciseId - Student exercise ID
   */
  getAnswerPdfUrl(studentExerciseId) {
    const token = this._authManager?.getAccessToken() || '';
    return `${this.baseUrl}/student-exercises/${studentExerciseId}/download?token=${encodeURIComponent(token)}`;
  }

  // ==================== User Management API (Admin) ====================

  async getUsers() {
    const response = await this.get('/users');
    return response.data;
  }

  async getUser(id) {
    const response = await this.get(`/users/${id}`);
    return response.data;
  }

  async createUser(data) {
    const response = await this.post('/users', data);
    return response.data;
  }

  async updateUser(id, data) {
    const response = await this.put(`/users/${id}`, data);
    return response.data;
  }

  async deleteUser(id) {
    const response = await this.delete(`/users/${id}`);
    return response;
  }
}

// Singleton instance
export const apiClient = new ApiClient();

export default ApiClient;
