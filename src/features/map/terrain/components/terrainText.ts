/**
 * English fallbacks for the terrain texts whose key is picked at run time.
 * The translations live in the `search` namespace under `terrain`.
 */
import type { SlopeClassId } from '../types';
import type { TerrainFailure } from '../utils/terrainPhase';
import type { TerrainAreaError } from '../utils/validateTerrainArea';

export const AREA_ERROR_TEXT: Record<Exclude<TerrainAreaError, 'tooFewPoints'>, string> = {
  edgesCross: 'The edges cross. Undo the last corner and place it somewhere else.',
  tooSmall: 'This area is too small. Draw at least 10 × 10 m.',
  tooLarge: 'This area is too large. Keep each side under 7.5 km.',
};

export const FAILURE_TEXT: Record<TerrainFailure, string> = {
  unavailable: 'Elevation data could not be loaded right now.',
  busy: 'Too many requests. Wait a few minutes and try again.',
  rejected: 'This area cannot be analysed. Try a smaller area.',
  noData: 'There is no elevation data here. The area may be water.',
};

export const CLASS_NAME_TEXT: Record<SlopeClassId, string> = {
  flat: 'Flat',
  gentle: 'Gentle',
  moderate: 'Moderate',
  steep: 'Steep',
  verySteep: 'Very steep',
};

export const CLASS_ADVICE_TEXT: Record<SlopeClassId, string> = {
  flat: 'Ideal for building',
  gentle: 'Easy to build, little levelling',
  moderate: 'Buildable with split levels or terraces',
  steep: 'Needs retaining walls and costlier foundations',
  verySteep: 'Problematic for most buildings',
};
