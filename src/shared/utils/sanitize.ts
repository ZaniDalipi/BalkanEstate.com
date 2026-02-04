/**
 * HTML Sanitization Utilities
 * Uses DOMPurify to safely sanitize HTML content and prevent XSS attacks
 */

import DOMPurify from 'dompurify';

/**
 * Configuration for DOMPurify
 * Allows safe HTML tags while blocking potentially dangerous ones
 */
const SANITIZE_CONFIG: DOMPurify.Config = {
  // Allowed HTML tags (safe for content display)
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'ul', 'ol', 'li',
    'strong', 'b', 'em', 'i', 'u', 's', 'mark',
    'a', 'span', 'div',
    'blockquote', 'pre', 'code',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'img',
  ],
  // Allowed HTML attributes
  ALLOWED_ATTR: [
    'href', 'target', 'rel', 'title', 'alt', 'src',
    'class', 'id',
    'colspan', 'rowspan',
  ],
  // Force all links to open in new tab with security attributes
  ALLOW_DATA_ATTR: false,
  // Prevent protocol-based XSS
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
};

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const clean = DOMPurify.sanitize(html, SANITIZE_CONFIG);

  // Post-process links to add security attributes
  return clean.replace(
    /<a\s+href=/gi,
    '<a target="_blank" rel="noopener noreferrer" href='
  );
}

/**
 * Sanitize and render HTML safely
 * Returns props object for dangerouslySetInnerHTML with sanitized content
 * @param html - The HTML string to sanitize
 * @returns Object with __html property containing sanitized HTML
 */
export function createSanitizedMarkup(html: string): { __html: string } {
  return { __html: sanitizeHtml(html) };
}

/**
 * Strip all HTML tags and return plain text
 * Useful for previews or text-only displays
 * @param html - The HTML string to strip
 * @returns Plain text without any HTML tags
 */
export function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
}

/**
 * Sanitize text for use in HTML attributes
 * Escapes special characters to prevent attribute injection
 * @param text - The text to sanitize
 * @returns Sanitized text safe for use in HTML attributes
 */
export function sanitizeAttribute(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`/g, '&#96;');
}

/**
 * Decode HTML entities safely
 * Alternative to innerHTML-based decoding that's XSS-safe
 * @param encoded - The encoded HTML string
 * @returns Decoded string
 */
export function decodeHtmlEntities(encoded: string): string {
  if (!encoded || typeof encoded !== 'string') {
    return '';
  }

  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#96;': '`',
    '&nbsp;': ' ',
  };

  return encoded.replace(
    /&(?:amp|lt|gt|quot|#39|#x27|#x2F|#96|nbsp);/gi,
    (match) => entities[match.toLowerCase()] || match
  );
}

export default {
  sanitizeHtml,
  createSanitizedMarkup,
  stripHtml,
  sanitizeAttribute,
  decodeHtmlEntities,
};
