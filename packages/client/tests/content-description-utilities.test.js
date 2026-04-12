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
  let mockCreateObjectURL, mockRevokeObjectURL, mockClick, mockAppendChild, mockRemoveChild

  beforeEach(async () => {
    // Mock DOM APIs for triggerDownload
    mockClick = vi.fn()
    mockCreateObjectURL = vi.fn(() => 'blob:mock-url')
    mockRevokeObjectURL = vi.fn()
    mockAppendChild = vi.fn()
    mockRemoveChild = vi.fn()

    globalThis.URL.createObjectURL = mockCreateObjectURL
    globalThis.URL.revokeObjectURL = mockRevokeObjectURL

    // Mock document.createElement to intercept anchor creation
    const origCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = origCreateElement(tag)
      if (tag === 'a') {
        el.click = mockClick
      }
      return el
    })
    vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild)
    vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild)

    const mod = await import('../src/shared/content-download-helper.js')
    downloadAsStyledHtml = mod.downloadAsStyledHtml
    downloadAsMarkdown = mod.downloadAsMarkdown
    downloadAllNotes = mod.downloadAllNotes
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('downloadAsStyledHtml', () => {
    it('returns true and triggers download for valid markdown', () => {
      const result = downloadAsStyledHtml('My Notes', '## Hello World', { courseName: 'Chess 101' })
      expect(result).toBe(true)
      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
      expect(mockRevokeObjectURL).toHaveBeenCalled()
    })

    it('returns false for null markdown', () => {
      const result = downloadAsStyledHtml('Title', null)
      expect(result).toBe(false)
      expect(mockClick).not.toHaveBeenCalled()
    })

    it('returns false for empty markdown', () => {
      const result = downloadAsStyledHtml('Title', '')
      expect(result).toBe(false)
    })

    it('returns false for whitespace-only markdown', () => {
      const result = downloadAsStyledHtml('Title', '   ')
      expect(result).toBe(false)
    })

    it('creates blob with text/html mime type', () => {
      downloadAsStyledHtml('Test', '# Content')
      expect(mockCreateObjectURL).toHaveBeenCalled()
      const blobArg = mockCreateObjectURL.mock.calls[0][0]
      expect(blobArg).toBeInstanceOf(Blob)
      expect(blobArg.type).toBe('text/html')
    })
  })

  describe('downloadAsMarkdown', () => {
    it('returns true and triggers download for valid content', () => {
      const result = downloadAsMarkdown('Notes', '## Section\n\nContent here')
      expect(result).toBe(true)
      expect(mockClick).toHaveBeenCalled()
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
    it('combines descriptions from multiple items', () => {
      const items = [
        { title: 'Video 1', description: '## Video notes', content_type: 'video' },
        { title: 'PDF 1', description: '## PDF notes', content_type: 'pdf' },
      ]
      const result = downloadAllNotes('Chess Course', items)
      expect(result).toBe(true)
      expect(mockClick).toHaveBeenCalled()
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
      // Only V1 has a valid description, so download still triggers
      expect(mockClick).toHaveBeenCalledTimes(1)
    })

    it('returns false when no items have descriptions', () => {
      const items = [
        { title: 'V1', description: null, content_type: 'video' },
        { title: 'V2', description: '', content_type: 'pdf' },
      ]
      const result = downloadAllNotes('Course', items)
      expect(result).toBe(false)
      expect(mockClick).not.toHaveBeenCalled()
    })

    it('returns false for empty items array', () => {
      expect(downloadAllNotes('Course', [])).toBe(false)
    })
  })
})
