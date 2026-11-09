import React from 'react';
import { cn } from '@/src/lib/utils';
import type { DevelopmentBuilding, UnitAvailability } from '../../../types';
import { BuildingChips } from './BuildingChips';
import { ExplorerLegend } from './ExplorerLegend';
import { HIDE_WHEN_IMMERSED } from './dive/diveStyle';
import { FloorPicker } from './floors/FloorPicker';
import type { FloorStop } from './floors/floorStack';

interface ExplorerStageControlsProps {
  fullscreen: boolean;
  buildings: DevelopmentBuilding[];
  activeBuildingId?: string;
  onBuilding: (b: DevelopmentBuilding) => void;
  floors?: FloorStop[];
  activeFloorId?: string;
  onFloor?: (floorId: string | null) => void;
  onPreviewFloor: (floorId: string | null) => void;
  legend: Array<{ state: UnitAvailability; count: number }>;
  selectedAvailability: readonly UnitAvailability[];
  onToggleAvailability: (s: UnitAvailability) => void;
  showAvailability: boolean;
  onToggleShowAvailability: () => void;
}

/**
 * The page explorer's choosers: building chips and the floor row (top left),
 * the availability legend (bottom left). Over the picture from tablet up and
 * in full screen; on phones they flow below it so they don't bury it.
 */
export const ExplorerStageControls: React.FC<ExplorerStageControlsProps> = (p) => {
  const full = p.fullscreen;
  const float = full ? 'absolute' : 'relative sm:absolute';
  return (
    <>
      <div className={cn(float, 'z-10 px-3 pt-3 sm:left-3 sm:top-16 sm:p-0', full && 'left-3 top-16 p-0', HIDE_WHEN_IMMERSED)}>
        <BuildingChips buildings={p.buildings} activeId={p.activeBuildingId} onSelect={p.onBuilding} />
        {p.floors && p.onFloor && p.floors.length > 0 && (
          <div className="mt-2">
            <FloorPicker stops={p.floors} activeId={p.activeFloorId} onSelect={p.onFloor} onPreview={p.onPreviewFloor} layout="row" />
          </div>
        )}
      </div>

      <div className={cn(float, 'z-10 px-3 py-3 sm:bottom-[4.25rem] sm:left-3 sm:p-0 lg:bottom-3', full && 'bottom-20 left-3 p-0 lg:bottom-3', HIDE_WHEN_IMMERSED)}>
        <ExplorerLegend
          counts={p.legend}
          selected={p.selectedAvailability}
          onToggle={p.onToggleAvailability}
          showAvailability={p.showAvailability}
          onToggleShowAvailability={p.onToggleShowAvailability}
        />
      </div>
    </>
  );
};
