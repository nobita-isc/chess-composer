/**
 * selection-store.js
 * Persists { courseId, lessonId } to URL hash + localStorage.
 * Hash format: #/courses/<id>/lessons/<id>  (lessonId optional)
 * Hash takes precedence over localStorage on read.
 *
 * API:
 *   read()          → { courseId, lessonId }
 *   write(sel)      → updates localStorage + history.replaceState
 *   onChange(cb)    → registers popstate listener; returns unsubscribe fn
 */

const LS_KEY = 'cm-selection'

/** Validate a non-empty string ID (TEXT primary keys, not numeric). */
function isValidId(v) {
  return typeof v === 'string' && v.trim().length > 0
}

/** Parse hash → { courseId, lessonId } or null fields on failure. */
function parseHash(hash) {
  // Expect: #/courses/<id>  or  #/courses/<id>/lessons/<id>
  const m = hash.match(/^#\/courses\/([^/]+)(?:\/lessons\/([^/]+))?$/)
  if (!m) return { courseId: null, lessonId: null }
  const courseId = isValidId(m[1]) ? m[1] : null
  const lessonId = m[2] && isValidId(m[2]) ? m[2] : null
  if (!courseId) {
    // Invalid hash — clean up
    history.replaceState(null, '', location.pathname + location.search)
    return { courseId: null, lessonId: null }
  }
  return { courseId, lessonId }
}

/** Build hash string from selection. */
function buildHash({ courseId, lessonId }) {
  if (!courseId) return location.pathname + location.search
  if (lessonId) return `#/courses/${courseId}/lessons/${lessonId}`
  return `#/courses/${courseId}`
}

/**
 * Read current selection.
 * Priority: hash → localStorage → null
 */
export function read() {
  const hash = location.hash
  if (hash && hash.startsWith('#/courses/')) {
    return parseHash(hash)
  }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const courseId = isValidId(parsed.courseId) ? parsed.courseId : null
      const lessonId = isValidId(parsed.lessonId) ? parsed.lessonId : null
      return { courseId, lessonId }
    }
  } catch (_) {
    // corrupted data — ignore
  }
  return { courseId: null, lessonId: null }
}

/**
 * Write selection to localStorage + URL hash.
 * Uses replaceState to avoid polluting history on every selection change.
 * Skips write if value unchanged (loop-prevention).
 */
export function write({ courseId, lessonId }) {
  const current = read()
  if (current.courseId === courseId && current.lessonId === lessonId) return

  // Persist to localStorage
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ courseId, lessonId }))
  } catch (_) {}

  // Update URL hash without pushing a new history entry
  history.replaceState(null, '', buildHash({ courseId, lessonId }))
}

/**
 * Clear persisted selection (e.g. on 404 fallback).
 */
export function clear() {
  try { localStorage.removeItem(LS_KEY) } catch (_) {}
  history.replaceState(null, '', location.pathname + location.search)
}

/**
 * Register a callback for browser back/forward navigation.
 * @param {function} cb — called with { courseId, lessonId }
 * @returns {function} unsubscribe
 */
export function onChange(cb) {
  function handler() {
    cb(read())
  }
  window.addEventListener('popstate', handler)
  return () => window.removeEventListener('popstate', handler)
}
