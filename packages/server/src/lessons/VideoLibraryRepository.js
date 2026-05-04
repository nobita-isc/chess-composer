/**
 * VideoLibraryRepository.js
 * Data access layer for the admin video library.
 * Manages video metadata; physical files stored under uploads/videos/.
 */

function generateId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`
}

const UPDATABLE_FIELDS = new Set(['title', 'description', 'folder'])

export class VideoLibraryRepository {
  constructor(database) {
    this.db = database
  }

  /**
   * Insert a new video record.
   * @param {{ title, description, file_path, file_size, duration_seconds, mime_type, folder }} data
   * @returns {Promise<object>} the created row
   */
  async createVideo(data) {
    const id = generateId('vid')
    const now = new Date().toISOString()
    await this.db.run(
      `INSERT INTO videos (id, title, description, file_path, file_size, duration_seconds, mime_type, folder, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.title,
        data.description || '',
        data.file_path,
        data.file_size || null,
        data.duration_seconds || null,
        data.mime_type || null,
        data.folder || '',
        now,
        now,
      ]
    )
    return this.findVideoById(id)
  }

  /**
   * List videos with optional filtering + pagination.
   * @param {{ folder?: string, q?: string, limit?: number, offset?: number }} opts
   * @returns {Promise<object[]>}
   */
  async findVideos({ folder, q, limit = 50, offset = 0 } = {}) {
    const conditions = []
    const params = []

    if (folder !== undefined && folder !== '') {
      conditions.push('folder = ?')
      params.push(folder)
    }
    if (q) {
      conditions.push('title LIKE ?')
      params.push(`%${q}%`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    params.push(Number(limit), Number(offset))

    return this.db.query(
      `SELECT * FROM videos ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      params
    )
  }

  /**
   * Find a single video by id.
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async findVideoById(id) {
    return this.db.queryOne('SELECT * FROM videos WHERE id = ?', [id])
  }

  /**
   * Return distinct non-empty folder strings sorted alphabetically.
   * @returns {Promise<string[]>}
   */
  async findDistinctFolders() {
    const rows = await this.db.query(
      `SELECT DISTINCT folder FROM videos WHERE folder != '' ORDER BY folder`
    )
    return rows.map(r => r.folder)
  }

  /**
   * Partial update — only title, description, folder allowed.
   * @param {string} id
   * @param {object} fields
   * @returns {Promise<object|null>} updated row or null if not found
   */
  async updateVideo(id, fields) {
    const cols = []
    const values = []
    for (const [key, val] of Object.entries(fields)) {
      if (!UPDATABLE_FIELDS.has(key)) continue
      cols.push(`${key} = ?`)
      values.push(val)
    }
    if (cols.length === 0) return this.findVideoById(id)

    const now = new Date().toISOString()
    cols.push('updated_at = ?')
    values.push(now, id)

    const result = await this.db.run(
      `UPDATE videos SET ${cols.join(', ')} WHERE id = ?`,
      values
    )
    if (result.changes === 0) return null
    return this.findVideoById(id)
  }

  /**
   * Delete video record and return file_path for caller to unlink.
   * @param {string} id
   * @returns {Promise<{ file_path: string }|null>} null if not found
   */
  async deleteVideo(id) {
    const row = await this.findVideoById(id)
    if (!row) return null
    await this.db.run('DELETE FROM videos WHERE id = ?', [id])
    return { file_path: row.file_path }
  }
}
