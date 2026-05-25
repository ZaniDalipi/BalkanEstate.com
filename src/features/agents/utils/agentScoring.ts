import type { Agent } from '@/types';

export const MAX_SCORE = 180;

export interface ScoreBreakdown {
  total: number;
  rating: number;
  sales: number;
  active: number;
  reviews: number;
}

export interface AchievementBadge {
  key: string;
  label: string;
  color: string;
}

export interface ScoringMetricDef {
  key: keyof Omit<ScoreBreakdown, 'total'>;
  icon: string;
  labelKey: string;
  formulaKey: string;
  descKey: string;
  capKey: string;
  maxPts: number;
  color: string;
  bg: string;
  border: string;
}

export const SCORING_METRIC_DEFS: ScoringMetricDef[] = [
  {
    key: 'rating',
    icon: '★',
    labelKey: 'agents:scoring.metrics.rating.label',
    formulaKey: 'agents:scoring.metrics.rating.formula',
    descKey: 'agents:scoring.metrics.rating.desc',
    capKey: 'agents:scoring.metrics.rating.cap',
    maxPts: 100,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.07)',
    border: 'rgba(245,158,11,0.22)',
  },
  {
    key: 'sales',
    icon: '🏠',
    labelKey: 'agents:scoring.metrics.sales.label',
    formulaKey: 'agents:scoring.metrics.sales.formula',
    descKey: 'agents:scoring.metrics.sales.desc',
    capKey: 'agents:scoring.metrics.sales.cap',
    maxPts: 50,
    color: '#10b981',
    bg: 'rgba(16,185,129,0.07)',
    border: 'rgba(16,185,129,0.22)',
  },
  {
    key: 'active',
    icon: '📋',
    labelKey: 'agents:scoring.metrics.active.label',
    formulaKey: 'agents:scoring.metrics.active.formula',
    descKey: 'agents:scoring.metrics.active.desc',
    capKey: 'agents:scoring.metrics.active.cap',
    maxPts: 20,
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.07)',
    border: 'rgba(59,130,246,0.22)',
  },
  {
    key: 'reviews',
    icon: '💬',
    labelKey: 'agents:scoring.metrics.reviews.label',
    formulaKey: 'agents:scoring.metrics.reviews.formula',
    descKey: 'agents:scoring.metrics.reviews.desc',
    capKey: 'agents:scoring.metrics.reviews.cap',
    maxPts: 10,
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.07)',
    border: 'rgba(139,92,246,0.22)',
  },
];

function clampPositive(value: number | undefined | null): number {
  const n = Number(value);
  return isFinite(n) && n > 0 ? n : 0;
}

export function calcScoreBreakdown(agent: Agent): ScoreBreakdown {
  const rating  = Math.min(clampPositive(agent.rating), 5);
  const sales   = clampPositive(agent.propertiesSold);
  const active  = clampPositive(agent.activeListings);
  const reviews = clampPositive(agent.totalReviews);

  const ratingPts  = Math.round(rating * 20);
  const salesPts   = Math.min(Math.round(sales * 5), 50);
  const activePts  = Math.min(Math.round(active * 2), 20);
  const reviewPts  = Math.min(Math.round(reviews * 1), 10);

  return {
    rating:  ratingPts,
    sales:   salesPts,
    active:  activePts,
    reviews: reviewPts,
    total:   ratingPts + salesPts + activePts + reviewPts,
  };
}

export function calcScore(agent: Agent): number {
  return calcScoreBreakdown(agent).total;
}

export function getAchievementBadge(agent: Agent): AchievementBadge | null {
  const sold    = clampPositive(agent.propertiesSold);
  const active  = clampPositive(agent.activeListings);
  const rating  = clampPositive(agent.rating);
  const reviews = clampPositive(agent.totalReviews);

  if (sold >= 5)                     return { key: 'topSeller',     label: '🔥 Top Seller',    color: '#ef4444' };
  if (rating >= 4.5 && reviews >= 3) return { key: 'topRated',      label: '⭐ Top Rated',     color: '#f59e0b' };
  if (active >= 10)                  return { key: 'mostActive',    label: '🚀 Most Active',   color: '#3b82f6' };
  if (reviews >= 5)                  return { key: 'mostReviewed',  label: '💬 Most Reviewed', color: '#8b5cf6' };
  if (active >= 3)                   return { key: 'risingStar',    label: '📈 Rising Star',   color: '#10b981' };
  return null;
}
