import React from 'react';
import { useTranslation } from 'react-i18next';
import type { DevelopmentBuilding, DevelopmentFloor, PublicUnit } from '../../../types';
import { FloorByFloor } from './FloorByFloor';

interface BuildingFloorsProps {
  building?: DevelopmentBuilding;
  buildingId?: string;
  /** Only this floor (a floor was opened); else the whole building. */
  floorId?: string;
  floors: DevelopmentFloor[];
  units: PublicUnit[];
  matchedIds?: Set<string>;
  onOpenUnit: (unitId: string) => void;
  openUnitId?: string | null;
  back?: { label: string; onClick: () => void };
  note?: string;
}

/**
 * A building's (or one floor's) homes floor by floor: in place of a picture
 * not posted yet, or under a picture with nothing marked on it, so every
 * apartment stays reachable.
 */
export const BuildingFloors: React.FC<BuildingFloorsProps> = ({ building, buildingId, floorId, floors, units, ...rest }) => {
  const { t } = useTranslation('developments');
  return (
    <FloorByFloor
      title={building?.name ?? t('scene.linkTypes.building', 'Building')}
      floors={floors.filter((f) => f.buildingId === buildingId && (!floorId || f.id === floorId))}
      units={units.filter((u) => (floorId ? u.floorId === floorId : u.buildingId === buildingId))}
      {...rest}
    />
  );
};
