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
