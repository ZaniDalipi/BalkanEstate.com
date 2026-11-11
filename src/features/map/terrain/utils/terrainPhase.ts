/**
 * Which step the terrain tool is on, from what the user has done and what the
 * server said. One place decides, so the panel and the map layers agree.
 */
import type { TerrainAnalysis, TerrainAnalysisResult } from '../types';

/** Why an analysis has nothing to show. */
export type TerrainFailure = 'busy' | 'rejected' | 'unavailable' | 'noData';

export type TerrainPhase =
  | { kind: 'drawing' }
  | { kind: 'loading' }
  | { kind: 'failed'; reason: TerrainFailure }
  | { kind: 'result'; analysis: TerrainAnalysis };

/** A failed elevation request, as something the user can act on. */
export function terrainFailure(error: unknown): TerrainFailure {
  const status = (error as { statusCode?: unknown } | null)?.statusCode;
  if (status === 429) return 'busy';
  if (status === 400) return 'rejected';
  return 'unavailable';
}

/** Retry only what might work the second time: never a refusal or a rate limit. */
export function shouldRetryTerrain(failureCount: number, error: unknown): boolean {
  return failureCount < 1 && terrainFailure(error) === 'unavailable';
}

export function terrainPhase(input: {
  submitted: boolean;
  error: unknown;
  result: TerrainAnalysisResult | null;
}): TerrainPhase {
  if (!input.submitted) return { kind: 'drawing' };
  if (input.result) {
    return input.result.ok === false
      ? { kind: 'failed', reason: input.result.error }
      : { kind: 'result', analysis: input.result.value };
  }
  if (input.error) return { kind: 'failed', reason: terrainFailure(input.error) };
  return { kind: 'loading' };
}
