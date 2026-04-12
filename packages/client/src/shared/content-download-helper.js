/**
 * content-download-helper.js
 * Client-side download of content descriptions as styled HTML or raw markdown.
 * Zero server deps — uses Blob + createObjectURL for downloads.
 */

import { safeMarkdown } from './safe-markdown.js'

/**
 * Download markdown content as a styled, self-contained HTML file.
 * @param {string} title - Document title
 * @param {string} markdown - Markdown content
 * @param {object} metadata - Optional { courseName, contentType, date }
 */
export function downloadAsStyledHtml(title, markdown, metadata = {}) {
  if (!markdown?.trim()) return false
  const renderedBody = safeMarkdown(markdown)
  const html = buildHtmlTemplate(title, renderedBody, metadata)
  triggerDownload(html, `${sanitizeFilename(title)}-notes.html`, 'text/html')
  return true
}

/**
 * Download raw markdown content as a .md file.
 */
export function downloadAsMarkdown(title, markdown) {
  if (!markdown?.trim()) return false
  const content = `# ${title}\n\n${markdown}`
  triggerDownload(content, `${sanitizeFilename(title)}-notes.md`, 'text/markdown')
  return true
}

/**
 * Download all content descriptions from a lesson as one styled HTML.
 * @param {string} courseTitle
 * @param {Array} items - [{ title, description, content_type }]
 */
export function downloadAllNotes(courseTitle, items) {
  const itemsWithDesc = items.filter(i => i.description?.trim())
  if (itemsWithDesc.length === 0) return false

  const combinedMd = itemsWithDesc
    .map(item => `## ${item.title}\n\n${item.description}`)
    .join('\n\n---\n\n')

  downloadAsStyledHtml(courseTitle, combinedMd, { courseName: courseTitle })
  return true
}

function buildHtmlTemplate(title, bodyHtml, metadata) {
  const date = metadata.date || new Date().toLocaleDateString()
  const courseLine = metadata.courseName ? `<div style="font-size:14px;color:#64748b;margin-bottom:4px">${escapeForHtml(metadata.courseName)}</div>` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeForHtml(title)} — Learning Notes</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 720px; margin: 0 auto; padding: 40px 24px; color: #1e293b; line-height: 1.7; font-size: 15px; }
    h1 { font-size: 24px; font-weight: 700; margin: 0 0 4px; }
    h2 { font-size: 20px; font-weight: 700; margin: 32px 0 12px; color: #1e293b; }
    h3 { font-size: 17px; font-weight: 600; margin: 24px 0 8px; color: #334155; }
    p { margin: 10px 0; }
    ul, ol { padding-left: 24px; margin: 10px 0; }
    li { margin: 4px 0; }
    a { color: #4f46e5; }
    strong { font-weight: 600; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 14px; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 32px 0; }
    .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 32px; }
    .meta { font-size: 12px; color: #94a3b8; }
    .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
    @media print { body { padding: 0; } .footer { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    ${courseLine}
    <h1>${escapeForHtml(title)}</h1>
    <div class="meta">${date}</div>
  </div>
  ${bodyHtml}
  <div class="footer">Generated from Chess Composer</div>
</body>
</html>`
}

function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function sanitizeFilename(str) {
  return (str || 'notes')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 60)
}

function escapeForHtml(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
