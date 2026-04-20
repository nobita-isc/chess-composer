/**
 * content-download-helper.js
 * Client-side download of notes as PDF (via browser print dialog) or raw markdown.
 * Zero server deps — uses hidden iframe + window.print() for PDF export.
 */

import { safeMarkdown } from './safe-markdown.js'

/**
 * Open the browser's print dialog for a styled notes document.
 * User chooses "Save as PDF" destination to produce a real PDF file.
 * @param {string} title - Document title
 * @param {string} markdown - Markdown content
 * @param {object} metadata - Optional { courseName, contentType, date }
 */
export function downloadAsStyledHtml(title, markdown, metadata = {}) {
  if (!markdown?.trim()) return false
  const renderedBody = safeMarkdown(markdown)
  const html = buildHtmlTemplate(title, renderedBody, metadata)
  printViaIframe(html, `${sanitizeFilename(title)}-notes`)
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
 * Print all course notes as a single styled document (user saves as PDF).
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
    @page { size: A4; margin: 18mm 16mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 720px; margin: 0 auto; padding: 40px 24px; color: #1e293b; line-height: 1.7; font-size: 13pt; }
    h1 { font-size: 22pt; font-weight: 700; margin: 0 0 4px; page-break-after: avoid; }
    h2 { font-size: 16pt; font-weight: 700; margin: 24px 0 10px; color: #1e293b; page-break-after: avoid; page-break-inside: avoid; }
    h3 { font-size: 13pt; font-weight: 600; margin: 18px 0 6px; color: #334155; page-break-after: avoid; }
    p { margin: 8px 0; orphans: 3; widows: 3; }
    ul, ol { padding-left: 22px; margin: 8px 0; }
    li { margin: 3px 0; }
    a { color: #4f46e5; }
    strong { font-weight: 600; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 12pt; }
    pre { background: #f1f5f9; padding: 10px; border-radius: 6px; overflow: auto; page-break-inside: avoid; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; page-break-after: always; }
    img { max-width: 100%; page-break-inside: avoid; }
    .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 14px; margin-bottom: 24px; }
    .meta { font-size: 10pt; color: #94a3b8; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10pt; color: #94a3b8; text-align: center; }
    @media print { body { padding: 0; max-width: none; } .footer { display: none; } a { color: #1e293b; text-decoration: none; } }
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

/**
 * Render HTML into a hidden iframe and invoke the browser print dialog.
 * User selects "Save as PDF" destination to produce a PDF file.
 * Falls back to a popup window if iframe printing fails.
 */
function printViaIframe(html, suggestedTitle) {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  document.body.appendChild(iframe)

  const cleanup = () => {
    // Delay removal so the print dialog can finish reading the document
    setTimeout(() => { try { iframe.remove() } catch {} }, 1500)
  }

  iframe.onload = () => {
    try {
      const win = iframe.contentWindow
      // Give the browser's Save-as-PDF a default filename via <title>
      if (win?.document) win.document.title = suggestedTitle
      win.focus()
      win.print()
      // Listen for print dialog close on browsers that fire it
      if (win.matchMedia) {
        const mql = win.matchMedia('print')
        const handler = (e) => { if (!e.matches) { mql.removeListener?.(handler); cleanup() } }
        mql.addListener?.(handler)
      }
      // Fallback cleanup
      setTimeout(cleanup, 60000)
    } catch {
      cleanup()
      // Fallback: open in new window so user can still print manually
      const w = window.open('', '_blank')
      if (w) { w.document.write(html); w.document.close() }
    }
  }

  // Write the document into the iframe
  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) { cleanup(); return }
  doc.open()
  doc.write(html)
  doc.close()
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
