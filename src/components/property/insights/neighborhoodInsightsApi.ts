// Neighborhood insights API module.
// Errors are returned as values (never thrown) so callers narrow with `=== false`.

import { apiRequest } from '@/src/shared/api';
import { toInsightFailure, type InsightFailure, type InsightUsage } from './insightFailure';

export interface InsightPlace {
  lat: number;
  lng: number;
  address: string;
  city: string;
  country: string;
}

export interface InsightReportData {
  insights: string;
  /** Absent when the report was served from the user's saved copy (no quota used). */
  usage?: InsightUsage;
}

export type InsightResult =
  | { ok: true; value: InsightReportData }
  | { ok: false; error: InsightFailure };

/** Generate (or re-open the saved) insight for a listing. Requires sign-in. */
export async function requestNeighborhoodInsight(
  place: InsightPlace,
  language: string,
  listingId?: string,
): Promise<InsightResult> {
  try {
    const data = await apiRequest<InsightReportData>('/neighborhood-insights', {
      method: 'POST',
      body: { ...place, language, listingId },
      requiresAuth: true,
    });
    if (typeof data?.insights !== 'string' || !data.insights) {
      return { ok: false, error: { kind: 'other' } };
    }
    return { ok: true, value: { insights: data.insights, usage: data.usage } };
  } catch (error) {
    return { ok: false, error: toInsightFailure(error) };
  }
}

/** The signed-in user's own saved insight for a listing, or null. */
export async function fetchSavedNeighborhoodInsight(listingId: string): Promise<string | null> {
  const data = await apiRequest<{ insights: string | null }>(
    `/neighborhood-insights/saved/${encodeURIComponent(listingId)}`,
    { requiresAuth: true },
  );
  return typeof data?.insights === 'string' ? data.insights : null;
}
