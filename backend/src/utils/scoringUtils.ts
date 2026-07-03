/**
 * Composite scoring utilities for Agent and Agency leaderboards.
 * These formulas must be kept in sync with any frontend display logic.
 */

export const AGENT_MAX_SCORE = 180;
export const AGENCY_MAX_SCORE = 160;

/** Returns v if v is a finite positive number, otherwise 0. */
function clampPositive(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// ---------------------------------------------------------------------------
// Agent scoring
// ---------------------------------------------------------------------------

export interface AgentScoreBreakdown {
  rating: number;
  sales: number;
  active: number;
  reviews: number;
  total: number;
}

export function calcAgentScoreBreakdown(agent: {
  rating?: unknown;
  totalSales?: unknown;
  activeListings?: unknown;
  totalReviews?: unknown;
}): AgentScoreBreakdown {
  const ratingPts = Math.round(Math.min(clampPositive(agent.rating), 5) * 20);        // max 100
  const salesPts  = Math.min(Math.round(clampPositive(agent.totalSales) * 5), 50);    // max 50
  const activePts = Math.min(Math.round(clampPositive(agent.activeListings) * 2), 20); // max 20
  const reviewPts = Math.min(Math.round(clampPositive(agent.totalReviews) * 1), 10);  // max 10

  return {
    rating:  ratingPts,
    sales:   salesPts,
    active:  activePts,
    reviews: reviewPts,
    total:   ratingPts + salesPts + activePts + reviewPts,
  };
}

export function calcAgentScore(agent: {
  rating?: unknown;
  totalSales?: unknown;
  activeListings?: unknown;
  totalReviews?: unknown;
}): number {
  return calcAgentScoreBreakdown(agent).total;
}

// ---------------------------------------------------------------------------
// Agency scoring
// ---------------------------------------------------------------------------

export interface AgencyScoreBreakdown {
  listings: number;
  team: number;
  experience: number;
  featured: number;
  total: number;
}

export function calcAgencyScoreBreakdown(agency: {
  totalProperties?: unknown;
  totalAgents?: unknown;
  yearsInBusiness?: unknown;
  isFeatured?: unknown;
}): AgencyScoreBreakdown {
  const listingsPts   = Math.min(Math.round(clampPositive(agency.totalProperties) * 3), 60); // max 60
  const teamPts       = Math.min(Math.round(clampPositive(agency.totalAgents) * 5), 50);     // max 50
  const experiencePts = Math.min(Math.round(clampPositive(agency.yearsInBusiness) * 2), 30); // max 30
  const featuredPts   = agency.isFeatured ? 20 : 0;                                          // max 20

  return {
    listings:   listingsPts,
    team:       teamPts,
    experience: experiencePts,
    featured:   featuredPts,
    total:      listingsPts + teamPts + experiencePts + featuredPts,
  };
}

export function calcAgencyScore(agency: {
  totalProperties?: unknown;
  totalAgents?: unknown;
  yearsInBusiness?: unknown;
  isFeatured?: unknown;
}): number {
  return calcAgencyScoreBreakdown(agency).total;
}
