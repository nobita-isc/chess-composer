// @vitest-environment jsdom

/**
 * Tests for client-side content description utilities.
 * Covers: safe-markdown sanitization, content-download-helper logic.
 * Uses jsdom environment via vitest for DOM APIs.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ==================== safe-markdown tests ====================
// We test the sanitization logic directly since it's the XSS defense layer.

describe('safeMarkdown', () => {
  let safeMarkdown

  beforeEach(async () => {
    const mod = await import('../src/shared/safe-markdown.js')
    safeMarkdown = mod.safeMarkdown
  })

  it('renders basic markdown to HTML', () => {
    const html = safeMarkdown('**bold** and _italic_')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>italic</em>')
  })

  it('renders headings', () => {
    const html = safeMarkdown('## Heading 2\n### Heading 3')
    expect(html).toContain('<h2>Heading 2</h2>')
    expect(html).toContain('<h3>Heading 3</h3>')
  })

  it('renders lists', () => {
    const html = safeMarkdown('- item 1\n- item 2')
    expect(html).toContain('<li>item 1</li>')
    expect(html).toContain('<li>item 2</li>')
  })

  it('renders links', () => {
    const html = safeMarkdown('[click](https://example.com)')
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('click</a>')
  })

  it('renders line breaks (breaks: true)', () => {
    const html = safeMarkdown('line 1\nline 2')
    expect(html).toContain('<br')
  })

  it('returns empty string for null input', () => {
    expect(safeMarkdown(null)).toBe('')
  })

  it('returns empty string for undefined input', () => {
    expect(safeMarkdown(undefined)).toBe('')
  })

  it('returns empty string for whitespace-only input', () => {
    expect(safeMarkdown('   ')).toBe('')
    expect(safeMarkdown('\n\n')).toBe('')
  })

  it('strips script tags (XSS prevention)', () => {
    const html = safeMarkdown('<script>alert("xss")</script>Hello')
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('alert')
    expect(html).toContain('Hello')
  })

  it('strips onerror event handlers (XSS prevention)', () => {
    const html = safeMarkdown('<img src=x onerror=alert(1)>')
    expect(html).not.toContain('onerror')
  })

  it('strips javascript: protocol in links (XSS prevention)', () => {
    const html = safeMarkdown('[click](javascript:alert(1))')
    expect(html).not.toContain('javascript:')
  })

  it('strips iframe tags (XSS prevention)', () => {
    const html = safeMarkdown('<iframe src="https://evil.com"></iframe>')
    expect(html).not.toContain('<iframe')
  })

  it('preserves safe HTML entities', () => {
    const html = safeMarkdown('5 &gt; 3 and 2 &lt; 4')
    // Should render the entities correctly
    expect(html).toBeTruthy()
  })
})

// ==================== content-download-helper tests ====================
// We test the logic functions. triggerDownload uses Blob/URL which need DOM mocking.

describe('content-download-helper', () => {
  let downloadAsStyledHtml, downloadAsMarkdown, downloadAllNotes
  // For downloadAsMarkdown (still uses Blob + anchor)
  let mockCreateObjectURL, mockRevokeObjectURL, mockAnchorClick
  // For downloadAsStyledHtml (uses hidden iframe + window.print)
  let iframeCount, capturedIframe, mockPrint

  beforeEach(async () => {
    iframeCount = 0
    capturedIframe = null
    mockAnchorClick = vi.fn()
    mockPrint = vi.fn()
    mockCreateObjectURL = vi.fn(() => 'blob:mock-url')
    mockRevokeObjectURL = vi.fn()

    globalThis.URL.createObjectURL = mockCreateObjectURL
    globalThis.URL.revokeObjectURL = mockRevokeObjectURL

    // Intercept createElement: anchors get a spy click; iframes expose a
    // spy'd contentWindow.print and fire onload synchronously after write().
    const origCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = origCreateElement(tag)
      if (tag === 'a') {
        el.click = mockAnchorClick
      } else if (tag === 'iframe') {
        iframeCount++
        capturedIframe = el
        // jsdom does not call iframe.onload after contentDocument.write in
        // tests; stub the timing so the module's onload handler runs.
        Object.defineProperty(el, 'contentWindow', {
          configurable: true,
          get() { return { print: mockPrint, focus: vi.fn(), document: el.contentDocument, matchMedia: null } }
        })
        const origDoc = el.contentDocument
        if (origDoc) {
          const origClose = origDoc.close.bind(origDoc)
          origDoc.close = function() {
            origClose()
            queueMicrotask(() => { try { el.onload?.() } catch {} })
          }
        }
      }
      return el
    })

    const mod = await import('../src/shared/content-download-helper.js')
    downloadAsStyledHtml = mod.downloadAsStyledHtml
    downloadAsMarkdown = mod.downloadAsMarkdown
    downloadAllNotes = mod.downloadAllNotes
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('downloadAsStyledHtml (PDF via print iframe)', () => {
    it('returns true and mounts a hidden print iframe for valid markdown', () => {
      const result = downloadAsStyledHtml('My Notes', '## Hello World', { courseName: 'Chess 101' })
      expect(result).toBe(true)
      expect(iframeCount).toBe(1)
      expect(capturedIframe).toBeTruthy()
      // iframe is hidden/off-screen so user never sees a flash
      expect(capturedIframe.style.visibility).toBe('hidden')
    })

    it('returns false for null markdown', () => {
      const result = downloadAsStyledHtml('Title', null)
      expect(result).toBe(false)
      expect(iframeCount).toBe(0)
      expect(mockPrint).not.toHaveBeenCalled()
    })

    it('returns false for empty markdown', () => {
      const result = downloadAsStyledHtml('Title', '')
      expect(result).toBe(false)
    })

    it('returns false for whitespace-only markdown', () => {
      const result = downloadAsStyledHtml('Title', '   ')
      expect(result).toBe(false)
    })

    it('writes styled HTML into the iframe document', () => {
      downloadAsStyledHtml('Test', '# Content', { courseName: 'Course X' })
      expect(capturedIframe).toBeTruthy()
      const html = capturedIframe.contentDocument?.documentElement?.outerHTML || ''
      expect(html).toContain('Course X')
      expect(html).toContain('Test')
      expect(html).toContain('@page')
    })
  })

  describe('downloadAsMarkdown', () => {
    it('returns true and triggers download for valid content', () => {
      const result = downloadAsMarkdown('Notes', '## Section\n\nContent here')
      expect(result).toBe(true)
      expect(mockAnchorClick).toHaveBeenCalled()
    })

    it('returns false for null content', () => {
      expect(downloadAsMarkdown('Title', null)).toBe(false)
    })

    it('returns false for empty content', () => {
      expect(downloadAsMarkdown('Title', '')).toBe(false)
    })

    it('creates blob with text/markdown mime type', () => {
      downloadAsMarkdown('Test', 'Content')
      const blobArg = mockCreateObjectURL.mock.calls[0][0]
      expect(blobArg.type).toBe('text/markdown')
    })
  })

  describe('downloadAllNotes', () => {
    it('combines descriptions from multiple items into one print iframe', () => {
      const items = [
        { title: 'Video 1', description: '## Video notes', content_type: 'video' },
        { title: 'PDF 1', description: '## PDF notes', content_type: 'pdf' },
      ]
      const result = downloadAllNotes('Chess Course', items)
      expect(result).toBe(true)
      expect(iframeCount).toBe(1)
    })

    it('filters out items without descriptions', () => {
      const items = [
        { title: 'V1', description: '## Notes', content_type: 'video' },
        { title: 'V2', description: null, content_type: 'video' },
        { title: 'V3', description: '', content_type: 'puzzle' },
        { title: 'V4', description: '   ', content_type: 'pdf' },
      ]
      const result = downloadAllNotes('Course', items)
      expect(result).toBe(true)
      // Only V1 has a valid description — still exactly one print iframe
      expect(iframeCount).toBe(1)
    })

    it('returns false when no items have descriptions', () => {
      const items = [
        { title: 'V1', description: null, content_type: 'video' },
        { title: 'V2', description: '', content_type: 'pdf' },
      ]
      const result = downloadAllNotes('Course', items)
      expect(result).toBe(false)
      expect(iframeCount).toBe(0)
    })

    it('returns false for empty items array', () => {
      expect(downloadAllNotes('Course', [])).toBe(false)
    })
  })
})
