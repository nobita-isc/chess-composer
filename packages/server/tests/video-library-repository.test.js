/**
 * Tests for VideoLibraryRepository — CRUD round-trip on in-memory SQLite.
 * Uses synchronous better-sqlite3 directly; wraps with an async-compatible shim
 * matching the SqliteDatabase interface used by the repository.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Database from 'better-sqlite3'
import { VideoLibraryRepository } from '../src/lessons/VideoLibraryRepository.js'

// Minimal async shim over better-sqlite3 so VideoLibraryRepository works without the full app
function makeDbShim(raw) {
  return {
    async run(sql, params = []) {
      const stmt = raw.prepare(sql)
      const info = stmt.run(...params)
      return { changes: info.changes, lastInsertRowid: info.lastInsertRowid }
    },
    async query(sql, params = []) {
      return raw.prepare(sql).all(...params)
    },
    async queryOne(sql, params = []) {
      return raw.prepare(sql).get(...params) ?? null
    },
  }
}

let raw
let repo

beforeAll(() => {
  raw = new Database(':memory:')
  // Run migration DDL directly (mirrors 012_add_videos_table.js)
  raw.exec(`
    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      file_path TEXT NOT NULL,
      file_size INTEGER,
      duration_seconds INTEGER,
      mime_type TEXT,
      folder TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_videos_folder ON videos(folder);
  `)
  repo = new VideoLibraryRepository(makeDbShim(raw))
})

afterAll(() => raw.close())

describe('VideoLibraryRepository', () => {
  let createdId

  it('createVideo — inserts and returns the row', async () => {
    const row = await repo.createVideo({
      title: 'Italian Opening Intro',
      description: 'An overview',
      file_path: '/uploads/videos/test.mp4',
      file_size: 1024,
      mime_type: 'video/mp4',
      folder: 'openings',
    })
    expect(row).toBeTruthy()
    expect(row.id).toMatch(/^vid_/)
    expect(row.title).toBe('Italian Opening Intro')
    expect(row.folder).toBe('openings')
    createdId = row.id
  })

  it('findVideoById — retrieves the created row', async () => {
    const row = await repo.findVideoById(createdId)
    expect(row).toBeTruthy()
    expect(row.title).toBe('Italian Opening Intro')
    expect(row.file_path).toBe('/uploads/videos/test.mp4')
  })

  it('findVideoById — returns null for unknown id', async () => {
    const row = await repo.findVideoById('nonexistent_id')
    expect(row).toBeNull()
  })

  it('findVideos — returns all rows without filter', async () => {
    const rows = await repo.findVideos()
    expect(rows.length).toBeGreaterThanOrEqual(1)
  })

  it('findVideos — filters by folder exact match', async () => {
    await repo.createVideo({ title: 'Other', file_path: '/uploads/videos/other.mp4', folder: 'endgames' })
    const rows = await repo.findVideos({ folder: 'openings' })
    expect(rows.every(r => r.folder === 'openings')).toBe(true)
  })

  it('findVideos — filters by title query (LIKE)', async () => {
    const rows = await repo.findVideos({ q: 'Italian' })
    expect(rows.length).toBeGreaterThanOrEqual(1)
    expect(rows[0].title).toContain('Italian')
  })

  it('findVideos — respects limit and offset', async () => {
    const all = await repo.findVideos({ limit: 100, offset: 0 })
    const limited = await repo.findVideos({ limit: 1, offset: 0 })
    expect(limited.length).toBe(1)
    if (all.length > 1) {
      const offset1 = await repo.findVideos({ limit: 1, offset: 1 })
      expect(offset1[0].id).not.toBe(limited[0].id)
    }
  })

  it('findDistinctFolders — returns unique non-empty folders', async () => {
    const folders = await repo.findDistinctFolders()
    expect(folders).toContain('openings')
    expect(folders).toContain('endgames')
    expect(folders).not.toContain('')
    // Should be sorted
    const sorted = [...folders].sort()
    expect(folders).toEqual(sorted)
  })

  it('updateVideo — updates whitelisted fields', async () => {
    const updated = await repo.updateVideo(createdId, { title: 'Updated Title', folder: 'tactics' })
    expect(updated).toBeTruthy()
    expect(updated.title).toBe('Updated Title')
    expect(updated.folder).toBe('tactics')
  })

  it('updateVideo — ignores non-whitelisted fields', async () => {
    const before = await repo.findVideoById(createdId)
    await repo.updateVideo(createdId, { file_path: '/evil/path', mime_type: 'text/html' })
    const after = await repo.findVideoById(createdId)
    // file_path should be unchanged
    expect(after.file_path).toBe(before.file_path)
  })

  it('updateVideo — returns null for unknown id', async () => {
    const result = await repo.updateVideo('nonexistent', { title: 'X' })
    expect(result).toBeNull()
  })

  it('deleteVideo — returns file_path and removes row', async () => {
    const tmp = await repo.createVideo({ title: 'Delete Me', file_path: '/uploads/videos/del.mp4', folder: '' })
    const result = await repo.deleteVideo(tmp.id)
    expect(result).toEqual({ file_path: '/uploads/videos/del.mp4' })
    const gone = await repo.findVideoById(tmp.id)
    expect(gone).toBeNull()
  })

  it('deleteVideo — returns null for unknown id', async () => {
    const result = await repo.deleteVideo('no-such-id')
    expect(result).toBeNull()
  })
})
