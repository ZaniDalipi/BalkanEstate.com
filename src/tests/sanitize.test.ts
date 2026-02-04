/**
 * Sanitization Utilities Tests
 * Tests for XSS prevention and HTML sanitization
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeHtml,
  createSanitizedMarkup,
  stripHtml,
  sanitizeAttribute,
  decodeHtmlEntities,
} from '../shared/utils/sanitize';

describe('sanitizeHtml', () => {
  it('should return empty string for null/undefined input', () => {
    expect(sanitizeHtml(null as unknown as string)).toBe('');
    expect(sanitizeHtml(undefined as unknown as string)).toBe('');
    expect(sanitizeHtml('')).toBe('');
  });

  it('should allow safe HTML tags', () => {
    const input = '<p>Hello <strong>World</strong></p>';
    const result = sanitizeHtml(input);
    expect(result).toContain('<p>');
    expect(result).toContain('<strong>');
  });

  it('should remove script tags', () => {
    const input = '<p>Safe</p><script>alert("XSS")</script>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert');
    expect(result).toContain('<p>Safe</p>');
  });

  it('should remove event handlers', () => {
    const input = '<img src="x" onerror="alert(1)" />';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('alert');
  });

  it('should remove javascript: URLs', () => {
    const input = '<a href="javascript:alert(1)">Click</a>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('javascript:');
  });

  it('should allow safe href attributes', () => {
    const input = '<a href="https://example.com">Link</a>';
    const result = sanitizeHtml(input);
    expect(result).toContain('href="https://example.com"');
  });

  it('should remove iframe tags', () => {
    const input = '<iframe src="evil.com"></iframe>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<iframe');
  });

  it('should remove style tags with malicious content', () => {
    const input = '<style>body { background: url("javascript:alert(1)") }</style>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<style>');
  });

  it('should preserve safe inline styles', () => {
    const input = '<div class="test">Content</div>';
    const result = sanitizeHtml(input);
    expect(result).toContain('class="test"');
  });

  it('should add security attributes to links', () => {
    const input = '<a href="https://example.com">Link</a>';
    const result = sanitizeHtml(input);
    expect(result).toContain('rel="noopener noreferrer"');
    expect(result).toContain('target="_blank"');
  });
});

describe('createSanitizedMarkup', () => {
  it('should return object with __html property', () => {
    const result = createSanitizedMarkup('<p>Test</p>');
    expect(result).toHaveProperty('__html');
    expect(result.__html).toContain('<p>Test</p>');
  });

  it('should sanitize the HTML content', () => {
    const result = createSanitizedMarkup('<script>alert(1)</script>');
    expect(result.__html).not.toContain('<script>');
  });
});

describe('stripHtml', () => {
  it('should return empty string for null/undefined', () => {
    expect(stripHtml(null as unknown as string)).toBe('');
    expect(stripHtml(undefined as unknown as string)).toBe('');
  });

  it('should remove all HTML tags', () => {
    const input = '<p>Hello <strong>World</strong></p>';
    const result = stripHtml(input);
    expect(result).toBe('Hello World');
  });

  it('should handle nested tags', () => {
    const input = '<div><p><span>Text</span></p></div>';
    const result = stripHtml(input);
    expect(result).toBe('Text');
  });

  it('should preserve text content', () => {
    const input = 'Plain text without tags';
    const result = stripHtml(input);
    expect(result).toBe('Plain text without tags');
  });
});

describe('sanitizeAttribute', () => {
  it('should return empty string for null/undefined', () => {
    expect(sanitizeAttribute(null as unknown as string)).toBe('');
    expect(sanitizeAttribute(undefined as unknown as string)).toBe('');
  });

  it('should escape HTML special characters', () => {
    const input = '<script>alert("XSS")</script>';
    const result = sanitizeAttribute(input);
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
  });

  it('should escape quotes', () => {
    const input = 'Test "value" with \'quotes\'';
    const result = sanitizeAttribute(input);
    expect(result).not.toContain('"');
    expect(result).not.toContain("'");
    expect(result).toContain('&quot;');
    expect(result).toContain('&#x27;');
  });

  it('should escape backticks', () => {
    const input = 'Template `literal`';
    const result = sanitizeAttribute(input);
    expect(result).not.toContain('`');
    expect(result).toContain('&#96;');
  });
});

describe('decodeHtmlEntities', () => {
  it('should return empty string for null/undefined', () => {
    expect(decodeHtmlEntities(null as unknown as string)).toBe('');
    expect(decodeHtmlEntities(undefined as unknown as string)).toBe('');
  });

  it('should decode common HTML entities', () => {
    expect(decodeHtmlEntities('&amp;')).toBe('&');
    expect(decodeHtmlEntities('&lt;')).toBe('<');
    expect(decodeHtmlEntities('&gt;')).toBe('>');
    expect(decodeHtmlEntities('&quot;')).toBe('"');
    expect(decodeHtmlEntities('&#39;')).toBe("'");
    expect(decodeHtmlEntities('&nbsp;')).toBe(' ');
  });

  it('should handle multiple entities', () => {
    const input = '&lt;div&gt;&amp;&lt;/div&gt;';
    const result = decodeHtmlEntities(input);
    expect(result).toBe('<div>&</div>');
  });

  it('should preserve non-entity text', () => {
    const input = 'Regular text without entities';
    const result = decodeHtmlEntities(input);
    expect(result).toBe('Regular text without entities');
  });
});
