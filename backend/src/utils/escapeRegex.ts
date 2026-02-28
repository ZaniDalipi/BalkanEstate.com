/**
 * Escape special regex characters in a string to prevent ReDoS attacks.
 * Use this whenever constructing a RegExp from user input.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
