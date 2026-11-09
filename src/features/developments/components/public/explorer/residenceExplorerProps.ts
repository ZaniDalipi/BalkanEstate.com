import type React from 'react';
import type { DevelopmentBuilding, DevelopmentEntrance, DevelopmentFloor, PublicUnit } from '../../../types';
import type { ExplorerNav } from '../../../hooks/useExplorerUrlState';
import type { UnitCriteria } from '../../../utils/unitFilters';

export interface ResidenceExplorerProps {
  slug: string;
  residenceName: string;
  buildings: DevelopmentBuilding[];
  floors: DevelopmentFloor[];
  /** Entrances with the homes they serve; marked on the pictures as door pins. */
  entrances?: DevelopmentEntrance[];
  units: PublicUnit[];
  criteria: UnitCriteria;
  onCriteriaChange: (c: UnitCriteria) => void;
  nav: ExplorerNav;
  onNavChange: (n: ExplorerNav) => void;
  onOpenUnit: (unitId: string) => void;
  /** The apartment open in the details sheet (from `?unit=`). */
  openUnitId?: string | null;
  /** Where the residence is: the budget helper compares prices with this city's average. */
  city?: string;
  country?: string;
  /** Rendered above the stage when there is something to explore. */
  header?: React.ReactNode;
  /** Rendered instead when no view is published (e.g. the cover hero). */
  fallback?: React.ReactNode;
  /** Full-screen hero (desktop): the residence's bar and headline over an edge-to-edge rendering. */
  immersive?: { nav: React.ReactNode; intro: React.ReactNode };
}
