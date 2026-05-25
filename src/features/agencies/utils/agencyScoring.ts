import type { Agency } from '@/src/shared/types';

export const AGENCY_MAX_SCORE = 160;

export interface AgencyScoreBreakdown {
  total: number;
  listings: number;
  team: number;
  experience: number;
  featured: number;
}

export interface AgencyAchievementBadge {
  key: string;
  label: string;
  color: string;
}

export interface AgencyScoringMetricDef {
  key: keyof Omit<AgencyScoreBreakdown, 'total'>;
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

export const AGENCY_SCORING_METRIC_DEFS: AgencyScoringMetricDef[] = [
  {
    key: 'listings',
    icon: '🏠',
    labelKey: 'agencies:scoring.metrics.listings.label',
    formulaKey: 'agencies:scoring.metrics.listings.formula',
    descKey: 'agencies:scoring.metrics.listings.desc',
    capKey: 'agencies:scoring.metrics.listings.cap',
    maxPts: 60,
    color: '#10b981',
    bg: 'rgba(16,185,129,0.07)',
    border: 'rgba(16,185,129,0.22)',
  },
  {
    key: 'team',
    icon: '👥',
    labelKey: 'agencies:scoring.metrics.team.label',
    formulaKey: 'agencies:scoring.metrics.team.formula',
    descKey: 'agencies:scoring.metrics.team.desc',
    capKey: 'agencies:scoring.metrics.team.cap',
    maxPts: 50,
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.07)',
    border: 'rgba(59,130,246,0.22)',
  },
  {
    key: 'experience',
    icon: '📅',
    labelKey: 'agencies:scoring.metrics.experience.label',
    formulaKey: 'agencies:scoring.metrics.experience.formula',
    descKey: 'agencies:scoring.metrics.experience.desc',
    capKey: 'agencies:scoring.metrics.experience.cap',
    maxPts: 30,
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.07)',
    border: 'rgba(139,92,246,0.22)',
  },
  {
    key: 'featured',
    icon: '✨',
    labelKey: 'agencies:scoring.metrics.featured.label',
    formulaKey: 'agencies:scoring.metrics.featured.formula',
    descKey: 'agencies:scoring.metrics.featured.desc',
    capKey: 'agencies:scoring.metrics.featured.cap',
    maxPts: 20,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.07)',
    border: 'rgba(245,158,11,0.22)',
  },
];

function clampPositive(value: number | undefined | null): number {
  const n = Number(value);
  return isFinite(n) && n > 0 ? n : 0;
}

export function calcAgencyScoreBreakdown(agency: Agency): AgencyScoreBreakdown {
  const listings    = clampPositive(agency.totalProperties);
  const team        = clampPositive(agency.totalAgents);
  const experience  = clampPositive(agency.yearsInBusiness);
  const featured    = agency.isFeatured ? 1 : 0;

  const listingsPts    = Math.min(Math.round(listings * 3), 60);
  const teamPts        = Math.min(Math.round(team * 5), 50);
  const experiencePts  = Math.min(Math.round(experience * 2), 30);
  const featuredPts    = featured * 20;

  return {
    listings:   listingsPts,
    team:       teamPts,
    experience: experiencePts,
    featured:   featuredPts,
    total:      listingsPts + teamPts + experiencePts + featuredPts,
  };
}

export function calcAgencyScore(agency: Agency): number {
  if (typeof agency.score === 'number') return agency.score;
  return calcAgencyScoreBreakdown(agency).total;
}

export function getAgencyAchievementBadge(agency: Agency): AgencyAchievementBadge | null {
  const props    = clampPositive(agency.totalProperties);
  const agents   = clampPositive(agency.totalAgents);
  const years    = clampPositive(agency.yearsInBusiness);

  if (props >= 20)                    return { key: 'marketLeader',  label: '🏆 Market Leader',   color: '#f59e0b' };
  if (agency.isFeatured)              return { key: 'featured',      label: '✨ Featured Agency',  color: '#8b5cf6' };
  if (agents >= 8)                    return { key: 'topTeam',       label: '👥 Top Team',         color: '#3b82f6' };
  if (years >= 10)                    return { key: 'established',   label: '📅 Established',      color: '#10b981' };
  if (props >= 5 && agents >= 3)      return { key: 'growingFast',   label: '📈 Growing Fast',     color: '#06b6d4' };
  return null;
}
