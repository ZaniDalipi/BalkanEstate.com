/**
 * Escape HTML special characters so user text can go into an HTML email or
 * page as text, never as markup.
 */
export function escapeHtml(unsafe: string | undefined | null): string {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
