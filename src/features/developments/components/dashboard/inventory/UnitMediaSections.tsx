import React, { useState } from 'react';
import type { DashboardUnit } from '../../../types';
import { useUnitAdmin } from '../../../hooks/useUnitAdmin';
import { FloorplanUpload } from './FloorplanUpload';
import { UnitGallerySection } from './UnitGallerySection';
import { roleCan } from './permissions';

interface UnitMediaSectionsProps {
  developmentId: string;
  unit: DashboardUnit;
  role?: string;
  /** A photo or floorplan was added or removed (already saved on the server). */
  onChanged?: () => void;
  /** A floorplan file is picked but not uploaded yet (the dialog uploads it on Save). */
  onPendingFloorplan?: (file: File | null) => void;
}

/**
 * Floorplan and photo gallery of a unit in the edit dialog. Photo changes are
 * saved immediately, so this keeps the unit the server last returned (the
 * dialog's `unit` prop is the row it was opened from and goes stale). A
 * picked floor plan waits for Save — unless photos are placed on it first,
 * which uploads it then.
 */
export const UnitMediaSections: React.FC<UnitMediaSectionsProps> = ({ developmentId, unit, role, onChanged, onPendingFloorplan }) => {
  const [live, setLive] = useState<DashboardUnit>(unit);
  const [planFile, setPlanFileState] = useState<File | null>(null);
  const { uploadFloorplan } = useUnitAdmin(developmentId);
  const canUpload = roleCan(role, 'media.upload');
  const canRemove = roleCan(role, 'unit.manage');
  const onUnit = (u: DashboardUnit) => {
    setLive(u);
    onChanged?.();
  };
  const setPlanFile = (file: File | null) => {
    setPlanFileState(file);
    onPendingFloorplan?.(file);
  };

  /** The plan to place photos on: a picked one is uploaded first. Throws when that upload fails. */
  const preparePlan = async (): Promise<string | null> => {
    if (!planFile) return live.floorplan?.url ?? null;
    const res = await uploadFloorplan({ unitId: unit.id, file: planFile });
    if (res?.unit) onUnit(res.unit);
    setPlanFile(null);
    return res?.unit?.floorplan?.url ?? null;
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
        pending={{ file: planFile, onChange: setPlanFile }}
      />
      <UnitGallerySection
        developmentId={developmentId}
        unitId={unit.id}
        gallery={live.gallery ?? []}
        preparePlan={live.floorplan?.url || planFile ? preparePlan : undefined}
        canUpload={canUpload}
        canRemove={canRemove}
        onUnit={onUnit}
      />
    </>
  );
};
