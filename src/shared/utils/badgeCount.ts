/**
 * Text for a small count bubble, iOS style: nothing for 0 or a bad value,
 * the number up to `max`, then "99+".
 */
export function formatBadgeCount(value: unknown, max = 99): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const n = Math.floor(value);
  if (n <= 0) return null;
  return n > max ? `${max}+` : String(n);
}
