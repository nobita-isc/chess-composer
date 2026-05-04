/**
 * video-url-resolver.js
 * Pure utility: classify a raw video URL as YouTube or generic video.
 * Returns structured object used by player and admin preview.
 *
 * Supported YouTube patterns:
 *   - youtube.com/watch?v=ID
 *   - youtu.be/ID
 *   - youtube.com/embed/ID
 *   - youtube.com/shorts/ID
 */

const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/

/**
 * Extract YouTube video ID from a URL string.
 * Returns validated ID or null.
 * @param {URL} parsed
 * @param {string} raw
 * @returns {string|null}
 */
function extractYouTubeId(parsed, raw) {
  const host = parsed.hostname.replace(/^www\./, '')

  // youtu.be/<ID>
  if (host === 'youtu.be') {
    const id = parsed.pathname.replace(/^\//, '').split('/')[0]
    return YT_ID_RE.test(id) ? id : null
  }

  if (host === 'youtube.com') {
    // /watch?v=ID
    const v = parsed.searchParams.get('v')
    if (v && YT_ID_RE.test(v)) return v

    // /embed/ID or /shorts/ID
    const parts = parsed.pathname.split('/').filter(Boolean)
    if ((parts[0] === 'embed' || parts[0] === 'shorts') && parts[1]) {
      const id = parts[1].split('?')[0]
      return YT_ID_RE.test(id) ? id : null
    }
  }

  return null
}

/**
 * Resolve a raw video URL into a typed descriptor.
 *
 * @param {string|null|undefined} rawUrl
 * @returns {{ kind: 'youtube'|'video', videoId: string|null, embedUrl: string|null, playUrl: string|null }}
 */
export function resolveVideoUrl(rawUrl) {
  if (!rawUrl) {
    return { kind: 'video', videoId: null, embedUrl: null, playUrl: null }
  }

  try {
    // Ensure absolute URL for URL constructor
    const urlStr = rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl
    const parsed = new URL(urlStr)

    const videoId = extractYouTubeId(parsed, rawUrl)
    if (videoId) {
      return {
        kind: 'youtube',
        videoId,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        playUrl: rawUrl
      }
    }
  } catch {
    // Relative paths (e.g. /uploads/videos/x.mp4) — fall through to video
  }

  return { kind: 'video', videoId: null, embedUrl: null, playUrl: rawUrl }
}
