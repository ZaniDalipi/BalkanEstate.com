import { Period } from '../../data/api/ViewStatsApiClient';

/**
 * Period options for analytics time range selector
 */
export const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
];

/**
 * Color configuration for stat cards
 */
export const STAT_CARD_COLORS = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', bar: 'bg-blue-500' },
  green: { bg: 'bg-green-50', text: 'text-green-600', bar: 'bg-green-500' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', bar: 'bg-purple-500' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600', bar: 'bg-orange-500' },
} as const;

export type StatCardColor = keyof typeof STAT_CARD_COLORS;

/**
 * Priority configuration for insight cards
 */
export const INSIGHT_PRIORITY_CONFIG = {
  success: { border: 'border-green-300', bg: 'bg-green-50', icon: 'text-green-600', accent: 'bg-green-500' },
  warning: { border: 'border-amber-300', bg: 'bg-amber-50', icon: 'text-amber-600', accent: 'bg-amber-500' },
  error: { border: 'border-red-300', bg: 'bg-red-50', icon: 'text-red-600', accent: 'bg-red-500' },
  info: { border: 'border-blue-300', bg: 'bg-blue-50', icon: 'text-blue-600', accent: 'bg-blue-500' },
} as const;

export type InsightPriority = keyof typeof INSIGHT_PRIORITY_CONFIG;
