// Markdown utilities
// Simple markdown parser for property descriptions

/**
 * Parse markdown text to HTML
 *
 * Supports:
 * - Bold: **text** or __text__
 * - Italic: *text* or _text_
 * - Headings: # H1, ## H2, ### H3
 * - Lists: - item or * item
 * - Line breaks
 *
 * @param text - Markdown text
 * @returns HTML string
 */
export function parseMarkdown(text: string): string {
  return text
    // Headings
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mb-3">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4">$1</h1>')

    // Bold
    .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold">$1</strong>')
    .replace(/__(.*?)__/gim, '<strong class="font-semibold">$1</strong>')

    // Italic
    .replace(/\*(.*?)\*/gim, '<em class="italic">$1</em>')
    .replace(/_(.*?)_/gim, '<em class="italic">$1</em>')

    // Lists
    .replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^\* (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')

    // Line breaks
    .replace(/\n/gim, '<br />');
}

/**
 * Strip markdown formatting
 *
 * @param text - Markdown text
 * @returns Plain text
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/[#*_\-]/g, '')
    .replace(/\n/g, ' ')
    .trim();
}

/**
 * Truncate text with ellipsis
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export function truncate(text: string, maxLength: number = 200): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}
