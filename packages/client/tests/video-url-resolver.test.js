// @vitest-environment node
/**
 * video-url-resolver.test.js
 * Unit tests for resolveVideoUrl() — YouTube detection and generic video fallback.
 */

import { describe, it, expect } from 'vitest'
import { resolveVideoUrl } from '../src/shared/video-url-resolver.js'

describe('resolveVideoUrl', () => {
  describe('YouTube detection', () => {
    it('detects youtu.be short link', () => {
      const r = resolveVideoUrl('https://youtu.be/dQw4w9WgXcQ')
      expect(r.kind).toBe('youtube')
      expect(r.videoId).toBe('dQw4w9WgXcQ')
      expect(r.embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
      expect(r.playUrl).toBe('https://youtu.be/dQw4w9WgXcQ')
    })

    it('detects youtube.com/watch?v=ID', () => {
      const r = resolveVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
      expect(r.kind).toBe('youtube')
      expect(r.videoId).toBe('dQw4w9WgXcQ')
      expect(r.embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
    })

    it('detects youtube.com/watch?v=ID&t=30 (extra params)', () => {
      const r = resolveVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30')
      expect(r.kind).toBe('youtube')
      expect(r.videoId).toBe('dQw4w9WgXcQ')
    })

    it('detects youtube.com/embed/ID', () => {
      const r = resolveVideoUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')
      expect(r.kind).toBe('youtube')
      expect(r.videoId).toBe('dQw4w9WgXcQ')
    })

    it('detects youtube.com/shorts/ID', () => {
      const r = resolveVideoUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')
      expect(r.kind).toBe('youtube')
      expect(r.videoId).toBe('dQw4w9WgXcQ')
    })

    it('rejects YouTube URL with invalid/missing ID', () => {
      const r = resolveVideoUrl('https://www.youtube.com/watch?list=PLfoo')
      expect(r.kind).toBe('video')
      expect(r.videoId).toBeNull()
    })
  })

  describe('generic video fallback', () => {
    it('returns kind=video for raw mp4 URL', () => {
      const url = 'https://example.com/video.mp4'
      const r = resolveVideoUrl(url)
      expect(r.kind).toBe('video')
      expect(r.playUrl).toBe(url)
      expect(r.videoId).toBeNull()
      expect(r.embedUrl).toBeNull()
    })

    it('returns kind=video for relative /uploads/ path', () => {
      const url = '/uploads/videos/lecture.mp4'
      const r = resolveVideoUrl(url)
      expect(r.kind).toBe('video')
      expect(r.playUrl).toBe(url)
    })

    it('returns kind=video for Vimeo URL (unsupported — falls through)', () => {
      const r = resolveVideoUrl('https://vimeo.com/123456789')
      expect(r.kind).toBe('video')
      expect(r.videoId).toBeNull()
    })
  })

  describe('edge / null cases', () => {
    it('returns kind=video with null playUrl for empty string', () => {
      const r = resolveVideoUrl('')
      expect(r.kind).toBe('video')
      expect(r.playUrl).toBeNull()
    })

    it('returns kind=video with null playUrl for null', () => {
      const r = resolveVideoUrl(null)
      expect(r.kind).toBe('video')
      expect(r.playUrl).toBeNull()
    })

    it('returns kind=video with null playUrl for undefined', () => {
      const r = resolveVideoUrl(undefined)
      expect(r.kind).toBe('video')
      expect(r.playUrl).toBeNull()
    })
  })
})
