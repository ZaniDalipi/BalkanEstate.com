import type { ClimateRiskType } from '../googleMapConstants';

export interface ActiveLayerFlags {
  selectedClimateRisk: ClimateRiskType;
  showOnlyPromoted: boolean;
  show3DBuildings: boolean;
  showLandmarks: boolean;
  showMeasurement: boolean;
  showTerrain: boolean;
  showCadastre: boolean;
}

/** Whether anything beyond the plain map is switched on (the Map button then shows a dot). */
export const hasActiveLayers = (f: ActiveLayerFlags): boolean =>
  f.selectedClimateRisk !== 'none' ||
  f.showOnlyPromoted || f.show3DBuildings || f.showLandmarks || f.showMeasurement || f.showTerrain || f.showCadastre;
