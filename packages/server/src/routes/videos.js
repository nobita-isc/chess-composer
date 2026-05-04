/**
 * videos.js — Admin video library routes.
 * All routes gated by requireRole('admin').
 * Files stored under uploads/videos/{ts}_{rand}.{ext}.
 */

import { Hono } from 'hono'
import { requireRole } from '../middleware/roleMiddleware.js'
import { VideoLibraryRepository } from '../lessons/VideoLibraryRepository.js'
import { database } from '../database/SqliteDatabase.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const VIDEOS_DIR = path.join(__dirname, '../../uploads/videos')
if (!fs.existsSync(VIDEOS_DIR)) fs.mkdirSync(VIDEOS_DIR, { recursive: true })

const ALLOWED_MIMES = new Set(['video/mp4', 'video/webm', 'video/quicktime'])
const ALLOWED_EXTS = { 'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov' }
const MAX_SIZE = 500 * 1024 * 1024 // 500 MB

/**
 * Sanitize folder string: strip leading slash, "..", and control chars; limit length.
 * @param {string} raw
 * @returns {string}
 */
function sanitizeFolder(raw) {
  if (!raw || typeof raw !== 'string') return ''
  return raw
    .replace(/\.\./g, '')
    .replace(/^\/+/, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f]/g, '')
    .trim()
    .substring(0, 200)
}

const repo = new VideoLibraryRepository(database)
const videos = new Hono()

// Gate every route to admin only
videos.use('*', requireRole('admin'))

// POST /upload — multipart video upload
videos.post('/upload', async (c) => {
  try {
    const body = await c.req.parseBody()
    const file = body['file']
    if (!file || typeof file === 'string') {
      return c.json({ success: false, error: 'No file uploaded' }, 400)
    }

    const mime = file.type || ''
    if (!ALLOWED_MIMES.has(mime)) {
      return c.json({ success: false, error: `Unsupported media type: ${mime}` }, 415)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (buffer.length > MAX_SIZE) {
      return c.json({ success: false, error: 'File too large (max 500MB)' }, 400)
    }

    const ext = ALLOWED_EXTS[mime]
    const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`
    const diskPath = path.join(VIDEOS_DIR, filename)
    // Safety: confirm resolved path is inside VIDEOS_DIR
    if (!path.resolve(diskPath).startsWith(path.resolve(VIDEOS_DIR))) {
      return c.json({ success: false, error: 'Invalid file path' }, 400)
    }
    fs.writeFileSync(diskPath, buffer)

    const title = (typeof body['title'] === 'string' && body['title'].trim()) || file.name || filename
    const folder = sanitizeFolder(typeof body['folder'] === 'string' ? body['folder'] : '')
    const relativePath = `/uploads/videos/${filename}`

    const row = await repo.createVideo({
      title,
      description: typeof body['description'] === 'string' ? body['description'] : '',
      file_path: relativePath,
      file_size: buffer.length,
      mime_type: mime,
      folder,
    })

    return c.json({ success: true, data: { ...row, url: relativePath } }, 201)
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

// GET / — list videos with optional filters
videos.get('/', async (c) => {
  try {
    const { folder, q, limit = '50', offset = '0' } = c.req.query()
    const rows = await repo.findVideos({
      folder,
      q,
      limit: parseInt(limit, 10) || 50,
      offset: parseInt(offset, 10) || 0,
    })
    return c.json({ success: true, data: rows })
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

// GET /folders — distinct non-empty folder strings
videos.get('/folders', async (c) => {
  try {
    const folders = await repo.findDistinctFolders()
    return c.json({ success: true, data: folders })
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

// PUT /:id — partial update (title, description, folder)
videos.put('/:id', async (c) => {
  try {
    const body = await c.req.json()
    const updates = {}
    if (body.title !== undefined) updates.title = body.title
    if (body.description !== undefined) updates.description = body.description
    if (body.folder !== undefined) updates.folder = sanitizeFolder(body.folder)

    const row = await repo.updateVideo(c.req.param('id'), updates)
    if (!row) return c.json({ success: false, error: 'Video not found' }, 404)
    return c.json({ success: true, data: row })
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

// DELETE /:id — remove DB row + unlink file
videos.delete('/:id', async (c) => {
  try {
    const result = await repo.deleteVideo(c.req.param('id'))
    if (!result) return c.json({ success: false, error: 'Video not found' }, 404)

    // Resolve absolute disk path; guard against traversal
    const absPath = path.resolve(path.join(__dirname, '../..', result.file_path))
    if (absPath.startsWith(path.resolve(VIDEOS_DIR))) {
      try {
        fs.unlinkSync(absPath)
      } catch (unlinkErr) {
        console.error('[videos] unlink failed:', unlinkErr.message)
      }
    }

    return c.json({ success: true })
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

export default videos
