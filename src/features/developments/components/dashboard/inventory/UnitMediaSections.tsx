import React, { useState } from 'react';
import type { DashboardUnit } from '../../../types';
import { FloorplanUpload } from './FloorplanUpload';
import { UnitGallerySection } from './UnitGallerySection';
import { roleCan } from './permissions';

interface UnitMediaSectionsProps {
  developmentId: string;
  unit: DashboardUnit;
  role?: string;
  /** A photo or floorplan was added or removed (already saved on the server). */
  onChanged?: () => void;
  /** A floorplan file is picked but not uploaded yet. */
  onPendingFloorplan?: (file: File | null) => void;
}

/**
 * Floorplan and photo gallery of a unit in the edit dialog. Media changes are
 * saved immediately, so this keeps the unit the server last returned (the
 * dialog's `unit` prop is the row it was opened from and goes stale).
 */
export const UnitMediaSections: React.FC<UnitMediaSectionsProps> = ({ developmentId, unit, role, onChanged, onPendingFloorplan }) => {
  const [live, setLive] = useState<DashboardUnit>(unit);
  const canUpload = roleCan(role, 'media.upload');
  const canRemove = roleCan(role, 'unit.manage');
  const onUnit = (u: DashboardUnit) => {
    setLive(u);
    onChanged?.();
  };
  return (
    <>
      <FloorplanUpload
        developmentId={developmentId}
        unitId={unit.id}
        current={live.floorplan}
        disabled={!canUpload}
        canRemove={canRemove}
        onUnit={onUnit}
        onPending={onPendingFloorplan}
      />
      <UnitGallerySection
        developmentId={developmentId}
        unitId={unit.id}
        gallery={live.gallery ?? []}
        floorplanUrl={live.floorplan?.url}
        canUpload={canUpload}
        canRemove={canRemove}
        onUnit={onUnit}
      />
    </>
  );
};
