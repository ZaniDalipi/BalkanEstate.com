import React, { useMemo } from 'react';
import { cn } from '@/src/lib/utils';
import type { DevelopmentBuilding, DevelopmentEntrance, Hotspot, PublicSceneView, PublicUnit } from '../../../types';
import { usePanZoom } from '../../../hooks/usePanZoom';
import { BuildingLabels } from './BuildingLabels';
import { canvasSize } from './canvasSize';
import { EntranceMarkers } from './EntranceMarkers';
import { RegionLayer } from './RegionLayer';
import { RegionCard } from './RegionCard';
import { ZoomControls } from './ZoomControls';
import { ViewPicture } from './ViewPicture';
import type { RegionDisplayMode } from './regionPaint';
import { useFlyFocus, type ExplorerFocus } from './useFlyFocus';
import { useHotspotInteraction } from './useHotspotInteraction';
import { useRegionCard, type BuildingFacts } from './useRegionCard';
import { linkedHotspotIds } from '../../../utils/unitCompanions';
import { DiveVeil } from './dive/DiveVeil';
import { HIDE_WHEN_IMMERSED } from './dive/diveStyle';
import { useApartmentDive } from './dive/useApartmentDive';

export interface ExplorerCanvasProps {
  view: Pick<PublicSceneView, 'imageUrl' | 'imageWidth' | 'imageHeight' | 'hotspots' | 'viewName'>;
  unitsById: Map<string, PublicUnit>;
  /** Units matching the active filters; undefined = no filters. */
  matchedIds?: Set<string>;
  buildingsById?: Map<string, DevelopmentBuilding>;
  entrancesById?: Map<string, DevelopmentEntrance>;
  buildingFacts?: Map<string, BuildingFacts>;
  onActivate: (h: Hotspot) => void;
  /** 'clean' (default): regions appear on hover; 'availability': always coloured. */
  mode?: RegionDisplayMode;
  /** Fill the viewport (pseudo full-screen): fit the image inside it. */
  fullscreen?: boolean;
  /** Region to glide to and highlight (the budget helper); `onFocusArrive` fires once there. */
  focus?: ExplorerFocus;
  onFocusArrive?: (h: Hotspot) => void;
  /** The apartment open in the details sheet (null: none). Given, clicking an apartment dives into it first. */
  openUnitId?: string | null;
  className?: string;
}

/**
 * The explorer's rendering: the camera view image with an SVG overlay of
 * regions (normalised 0–1 points scaled into the image's own viewBox) and the
 * building name tags, all in one pan/zoom layer so they stay glued to the
 * facade at any zoom. Hovering (or tapping) a region lights it up and opens its
 * card; clicking opens it, an apartment after a short dive into it.
 */
export const ExplorerCanvas: React.FC<ExplorerCanvasProps> = ({
  view,
  unitsById,
  matchedIds,
  buildingsById,
  entrancesById,
  buildingFacts,
  onActivate,
  mode = 'clean',
  fullscreen,
  focus,
  onFocusArrive,
  openUnitId,
  className,
}) => {
  const pz = usePanZoom({ wheelAlwaysZooms: fullscreen });
  const hotspots = useMemo(() => [...view.hotspots].sort((a, b) => (a.z ?? 0) - (b.z ?? 0)), [view.hotspots]);
  const dive = useApartmentDive(hotspots, openUnitId, pz, onActivate);
  const { hover, bind, activate, dismiss, cardHandlers, showFor, scheduleClose } = useHotspotInteraction(pz.consumeDrag, dive.activate);
  const cardFor = useRegionCard(unitsById, buildingsById, buildingFacts, entrancesById);
  const W = view.imageWidth || 1600;
  const H = view.imageHeight || 900;

  const hovered = hover ? hotspots.find((h) => h.id === hover.id) : undefined;
  const focused = focus ? hotspots.find((h) => h.id === focus.hotspotId) : undefined;
  // Its parking spot / storage room (or its apartment) light up with the hovered unit.
  const linkedIds = useMemo(() => linkedHotspotIds(hovered, hotspots, unitsById), [hovered, hotspots, unitsById]);
  useFlyFocus(focus, hotspots, pz.flyTo, onFocusArrive);

  const sizeStyle = canvasSize(W, H, fullscreen);
  const card = hovered ? cardFor(hovered) : undefined;

  return (
    <div
      ref={pz.containerRef}
      className={cn('relative mx-auto select-none overflow-hidden bg-slate-900', className)}
      style={{ ...sizeStyle, touchAction: pz.isZoomed ? 'none' : 'pan-y' }}
      {...pz.handlers}
      onClick={() => !pz.consumeDrag() && dismiss()}
      data-testid="explorer-canvas"
      data-immersed={dive.veil ? 'true' : undefined}
    >
      <div className={cn('absolute inset-0', pz.isZoomed ? 'cursor-grab active:cursor-grabbing' : '')} style={pz.contentStyle}>
        <ViewPicture url={view.imageUrl} name={view.viewName} />
        <RegionLayer
          width={W}
          height={H}
          hotspots={hotspots}
          unitsById={unitsById}
          buildingsById={buildingsById}
          entrancesById={entrancesById}
          matchedIds={matchedIds}
          mode={mode}
          activeId={hover?.id}
          linkedIds={linkedIds}
          focused={focused}
          bind={bind}
        />
        <EntranceMarkers
          hotspots={hotspots}
          entrancesById={entrancesById}
          activeId={hover?.id}
          onHover={showFor}
          onLeave={(h) => scheduleClose(h.id)}
          onSelect={activate}
        />
        <BuildingLabels
          hotspots={hotspots}
          buildingsById={buildingsById}
          activeId={hover?.id}
          onHover={showFor}
          onLeave={(h) => scheduleClose(h.id)}
          onSelect={activate}
        />
        <DiveVeil hotspot={dive.veil} width={W} height={H} />
      </div>

      <div className={cn('absolute bottom-3 right-3 z-10 hidden sm:block', HIDE_WHEN_IMMERSED)}>
        <ZoomControls onZoomIn={pz.zoomIn} onZoomOut={pz.zoomOut} onReset={pz.reset} isZoomed={pz.isZoomed} />
      </div>

      {hover && hovered && card && (
        <RegionCard
          anchor={hover.rect}
          unit={card.unit}
          companions={card.companions}
          title={card.title}
          facts={card.facts}
          imageUrl={card.imageUrl}
          badge={card.badge}
          actionLabel={card.actionLabel}
          onAction={card.actionLabel ? () => activate(hovered) : undefined}
          {...cardHandlers}
        />
      )}
    </div>
  );
};
