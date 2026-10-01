/**
 * Analytics utility helpers
 */

/**
 * Truncates text to specified length with ellipsis
 */
export const truncateText = (text: string, maxLength: number = 25): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Calculates performance level as a ratio (0-1)
 */
export const calculatePerformanceLevel = (value: number, max: number): number => {
  return max > 0 ? value / max : 0;
};

/**
 * Returns appropriate color class based on performance level
 */
export const getPerformanceColor = (level: number): { text: string; bar: string } => {
  if (level > 0.7) return { text: 'text-green-600', bar: 'bg-green-500' };
  if (level > 0.3) return { text: 'text-amber-600', bar: 'bg-amber-500' };
  return { text: 'text-neutral-500', bar: 'bg-neutral-300' };
};

/**
 * Formats a duration in seconds as a short label ("45s", "2m 05s")
 */
export const formatDuration = (seconds: number): string => {
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) return `${total}s`;
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}m ${String(rest).padStart(2, '0')}s`;
};

/**
 * Change from the previous period as a whole percentage.
 * `null` when there is nothing to compare against (no earlier views).
 */
export const calculateTrend = (current: number, previous: number): number | null => {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
};
