/**
 * Security Tests: escapeRegex Utility
 * Verifies that special regex characters are properly escaped
 * to prevent ReDoS attacks via user-supplied search strings.
 */

import { escapeRegex } from '../utils/escapeRegex';

describe('escapeRegex', () => {
  it('should escape dots', () => {
    expect(escapeRegex('file.txt')).toBe('file\\.txt');
  });

  it('should escape asterisks', () => {
    expect(escapeRegex('a*b')).toBe('a\\*b');
  });

  it('should escape plus signs', () => {
    expect(escapeRegex('a+b')).toBe('a\\+b');
  });

  it('should escape question marks', () => {
    expect(escapeRegex('what?')).toBe('what\\?');
  });

  it('should escape caret', () => {
    expect(escapeRegex('^start')).toBe('\\^start');
  });

  it('should escape dollar sign', () => {
    expect(escapeRegex('price$')).toBe('price\\$');
  });

  it('should escape curly braces', () => {
    expect(escapeRegex('a{3}')).toBe('a\\{3\\}');
  });

  it('should escape parentheses', () => {
    expect(escapeRegex('(group)')).toBe('\\(group\\)');
  });

  it('should escape pipe', () => {
    expect(escapeRegex('a|b')).toBe('a\\|b');
  });

  it('should escape square brackets', () => {
    // Hyphen is not a special regex metacharacter outside of brackets
    expect(escapeRegex('[a-z]')).toBe('\\[a-z\\]');
  });

  it('should escape backslash', () => {
    expect(escapeRegex('path\\file')).toBe('path\\\\file');
  });

  it('should leave normal strings untouched', () => {
    expect(escapeRegex('apartment in Belgrade')).toBe('apartment in Belgrade');
  });

  it('should handle empty string', () => {
    expect(escapeRegex('')).toBe('');
  });

  it('should handle a ReDoS payload', () => {
    const payload = '((((((((((a+)+)+)+)+)+)+)+)+)+)';
    const escaped = escapeRegex(payload);

    // The escaped string should be safe to use in new RegExp
    expect(() => new RegExp(escaped)).not.toThrow();

    // And it should match the literal payload string
    const regex = new RegExp(escaped);
    expect(regex.test(payload)).toBe(true);
  });

  it('should make a regex that matches literal special chars', () => {
    const input = 'cost: $100.00 (USD)';
    const escaped = escapeRegex(input);
    const regex = new RegExp(escaped);

    expect(regex.test(input)).toBe(true);
    // Should NOT match a string that only matches the unescaped pattern
    expect(regex.test('cost: 100000 USD')).toBe(false);
  });
});
