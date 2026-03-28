/**
 * Tests for offline storage logic patterns.
 * Tests the data structures and sync queue logic without IndexedDB (pure functions).
 */

import { describe, it, expect } from 'vitest'

// Test the sync queue processing logic (extracted as pure functions)

function shouldProcessItem(item, isOnline) {
  if (!isOnline) return false
  if (item.retryCount > 5) return false
  return true
}

function categorizeResponse(status) {
  if (status >= 200 && status < 300) return 'success'
  if (status === 400) return 'rejected' // server rejected, remove from queue
  if (status === 401) return 'auth_expired'
  return 'retry'
}

function buildProgressRecord(data) {
  return {
    studentExerciseId: data.studentExerciseId,
    exerciseId: data.exerciseId,
    puzzleResults: data.puzzleResults,
    puzzleHints: data.puzzleHints || null,
    score: data.score,
    totalPuzzles: data.totalPuzzles,
    lastUpdated: Date.now(),
    synced: false
  }
}

function buildSyncQueueItem(url, method, body) {
  return {
    url,
    method,
    body,
    timestamp: Date.now(),
    retryCount: 0
  }
}

function mergeProgress(existing, incoming) {
  // Latest write wins
  if (!existing) return incoming
  if (incoming.lastUpdated > existing.lastUpdated) return incoming
  return existing
}

describe('shouldProcessItem', () => {
  it('processes item when online', () => {
    expect(shouldProcessItem({ retryCount: 0 }, true)).toBe(true)
  })

  it('skips item when offline', () => {
    expect(shouldProcessItem({ retryCount: 0 }, false)).toBe(false)
  })

  it('skips item after 5 retries', () => {
    expect(shouldProcessItem({ retryCount: 6 }, true)).toBe(false)
  })

  it('processes item at exactly 5 retries', () => {
    expect(shouldProcessItem({ retryCount: 5 }, true)).toBe(true)
  })
})

describe('categorizeResponse', () => {
  it('200 is success', () => {
    expect(categorizeResponse(200)).toBe('success')
  })

  it('201 is success', () => {
    expect(categorizeResponse(201)).toBe('success')
  })

  it('400 is rejected (remove from queue)', () => {
    expect(categorizeResponse(400)).toBe('rejected')
  })

  it('401 is auth expired', () => {
    expect(categorizeResponse(401)).toBe('auth_expired')
  })

  it('500 is retry', () => {
    expect(categorizeResponse(500)).toBe('retry')
  })

  it('503 is retry', () => {
    expect(categorizeResponse(503)).toBe('retry')
  })
})

describe('buildProgressRecord', () => {
  it('creates record with synced=false', () => {
    const record = buildProgressRecord({
      studentExerciseId: 'se_1',
      exerciseId: 'ex_1',
      puzzleResults: '1,0,1',
      score: 2,
      totalPuzzles: 3
    })

    expect(record.synced).toBe(false)
    expect(record.studentExerciseId).toBe('se_1')
    expect(record.puzzleResults).toBe('1,0,1')
    expect(record.lastUpdated).toBeGreaterThan(0)
  })

  it('defaults puzzleHints to null', () => {
    const record = buildProgressRecord({
      studentExerciseId: 'se_1',
      exerciseId: 'ex_1',
      puzzleResults: '1,1',
      score: 2,
      totalPuzzles: 2
    })
    expect(record.puzzleHints).toBeNull()
  })
})

describe('buildSyncQueueItem', () => {
  it('creates queue item with retryCount 0', () => {
    const item = buildSyncQueueItem('/api/student-exercises/se_1/attempt', 'PUT', { score: 3 })
    expect(item.retryCount).toBe(0)
    expect(item.method).toBe('PUT')
    expect(item.url).toContain('se_1')
    expect(item.timestamp).toBeGreaterThan(0)
  })
})

describe('mergeProgress', () => {
  it('returns incoming when no existing', () => {
    const incoming = { studentExerciseId: 'se_1', lastUpdated: 100 }
    expect(mergeProgress(null, incoming)).toBe(incoming)
  })

  it('returns incoming when newer', () => {
    const existing = { studentExerciseId: 'se_1', lastUpdated: 100 }
    const incoming = { studentExerciseId: 'se_1', lastUpdated: 200 }
    expect(mergeProgress(existing, incoming)).toBe(incoming)
  })

  it('returns existing when newer', () => {
    const existing = { studentExerciseId: 'se_1', lastUpdated: 200 }
    const incoming = { studentExerciseId: 'se_1', lastUpdated: 100 }
    expect(mergeProgress(existing, incoming)).toBe(existing)
  })

  it('returns existing when same timestamp', () => {
    const existing = { studentExerciseId: 'se_1', lastUpdated: 100 }
    const incoming = { studentExerciseId: 'se_1', lastUpdated: 100 }
    expect(mergeProgress(existing, incoming)).toBe(existing)
  })
})
