import type { Development } from '../types';

export type ResidenceTimeline = { kind: 'built'; year: number } | { kind: 'expected'; date: string } | null;

/**
 * The one date worth showing for a residence: the year it was built once
 * completed, otherwise its expected completion ("June 2027"). Years are shown
 * plain (2019), never grouped like a number.
 */
export const residenceTimeline = (
  d: Pick<Development, 'constructionStatus' | 'yearBuilt' | 'expectedCompletionDate'>,
  locale: string,
  month: 'short' | 'long' = 'long'
): ResidenceTimeline => {
  if (d.constructionStatus === 'completed') return d.yearBuilt ? { kind: 'built', year: d.yearBuilt } : null;
  if (!d.expectedCompletionDate) return null;
  return { kind: 'expected', date: new Date(d.expectedCompletionDate).toLocaleDateString(locale || 'en', { month, year: 'numeric' }) };
};
