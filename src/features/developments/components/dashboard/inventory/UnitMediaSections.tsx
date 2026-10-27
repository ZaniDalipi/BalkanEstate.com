import React, { useState } from 'react';
import type { DashboardUnit } from '../../../types';
import { FloorplanUpload } from './FloorplanUpload';
import { UnitGallerySection } from './UnitGallerySection';
import { roleCan } from './permissions';

interface UnitMediaSectionsProps {
  developmentId: string;
  unit: DashboardUnit;
  role?: string;
}

/**
 * Floorplan and photo gallery of a unit in the edit dialog. Media changes are
 * saved immediately, so this keeps the unit the server last returned (the
 * dialog's `unit` prop is the row it was opened from and goes stale).
 */
export const UnitMediaSections: React.FC<UnitMediaSectionsProps> = ({ developmentId, unit, role }) => {
  const [live, setLive] = useState<DashboardUnit>(unit);
  const canUpload = roleCan(role, 'media.upload');
  const canRemove = roleCan(role, 'unit.manage');
  return (
    <>
      <FloorplanUpload
        developmentId={developmentId}
        unitId={unit.id}
        current={live.floorplan}
        disabled={!canUpload}
        canRemove={canRemove}
        onUnit={setLive}
      />
      <UnitGallerySection
        developmentId={developmentId}
        unitId={unit.id}
        gallery={live.gallery ?? []}
        canUpload={canUpload}
        canRemove={canRemove}
        onUnit={setLive}
      />
    </>
  );
};
