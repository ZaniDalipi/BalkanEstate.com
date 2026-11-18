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

/** How many layers / overlays are on beyond the plain map (shown as a count on the Layers button). */
export const countActiveLayers = (f: ActiveLayerFlags): number =>
  [
    f.selectedClimateRisk !== 'none',
    f.showOnlyPromoted,
    f.show3DBuildings,
    f.showLandmarks,
    f.showMeasurement,
    f.showTerrain,
    f.showCadastre,
  ].filter(Boolean).length;

export const hasActiveLayers = (f: ActiveLayerFlags): boolean => countActiveLayers(f) > 0;
