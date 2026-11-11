import type React from 'react';
import type { DevelopmentBuilding, DevelopmentEntrance, Hotspot, PublicSceneView, PublicUnit, UnitAvailability } from '../../../types';
import type { Crumb } from './ExplorerBreadcrumb';
import type { FloorStop } from './floors/floorStack';
import type { BuildingFacts } from './useRegionCard';
import type { ExplorerFocus } from './useFlyFocus';

/** What both explorer stages (on the page, and the full-screen residence page) show and report. */
export interface ExplorerStageProps {
  views: PublicSceneView[];
  viewIndex: number;
  onViewIndex: (i: number) => void;
  crumbs: Crumb[];
  onCrumb: (i: number) => void;
  buildings: DevelopmentBuilding[];
  activeBuildingId?: string;
  onBuilding: (b: DevelopmentBuilding) => void;
  legend: Array<{ state: UnitAvailability; count: number }>;
  selectedAvailability: readonly UnitAvailability[];
  onToggleAvailability: (s: UnitAvailability) => void;
  unitsById: Map<string, PublicUnit>;
  matchedIds?: Set<string>;
  buildingsById: Map<string, DevelopmentBuilding>;
  entrancesById?: Map<string, DevelopmentEntrance>;
  buildingFacts?: Map<string, BuildingFacts>;
  onActivate: (h: Hotspot) => void;
  /** The shared filter panel, shown over the stage on demand. */
  filters: React.ReactNode;
  activeFilters: boolean;
  /** Extra buttons before the filters toggle (the budget helper); their popups anchor under the bar. */
  actions?: React.ReactNode;
  /** Region the explorer is gliding to; see ExplorerCanvas. */
  focus?: ExplorerFocus;
  onFocusArrive?: (h: Hotspot) => void;
  /** The apartment open in the details sheet; see ExplorerCanvas. */
  openUnitId?: string | null;
  /** Inside a building: its floors for the floor picker, top first (empty hides it). */
  floors?: FloorStop[];
  /** The floor on show, if any. */
  activeFloorId?: string;
  /** Open a floor, or the whole building again (null). */
  onFloor?: (floorId: string | null) => void;
  /** A floor the buyer points at in the floor picker (its picture can start loading). */
  onPointFloor?: (floorId: string) => void;
}
