/**
 * safe-markdown.js
 * Wrapper around marked + DOMPurify for safe markdown-to-HTML rendering.
 * All markdown rendering in the app should go through this module.
 */

import DOMPurify from 'dompurify'
import { marked } from 'marked'

marked.setOptions({ breaks: true })

/**
 * Parse markdown to sanitized HTML.
 * @param {string} md - Markdown string
 * @returns {string} Sanitized HTML
 */
export function safeMarkdown(md) {
  if (!md?.trim()) return ''
  return DOMPurify.sanitize(marked.parse(md, { breaks: true }))
}
