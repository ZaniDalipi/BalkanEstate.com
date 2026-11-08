import React, { useMemo } from 'react';
import { useIsPresent } from 'framer-motion';
import { cn } from '@/src/lib/utils';
import type { DevelopmentBuilding, DevelopmentEntrance, Hotspot, PublicSceneView, PublicUnit } from '../../../types';
import { usePanZoom } from '../../../hooks/usePanZoom';
import { linkedHotspotIds } from '../../../utils/unitCompanions';
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
import { DiveHud } from './dive/DiveHud';
import { DiveVeil } from './dive/DiveVeil';
import { HIDE_WHEN_IMMERSED } from './dive/diveStyle';
import { useApartmentDive } from './dive/useApartmentDive';
import { coverBox } from './immersive/coverBox';
import { useElementSize } from './immersive/useElementSize';

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
  /** 'contain' (default): sized to the picture. 'cover': fill the parent edge to edge (the full-screen hero). */
  fit?: 'contain' | 'cover';
  /** Region to glide to and highlight (the budget helper); `onFocusArrive` fires once there. */
  focus?: ExplorerFocus;
  onFocusArrive?: (h: Hotspot) => void;
  /** The apartment open in the details sheet (null: none). Given, opening an apartment flies into it first. */
  openUnitId?: string | null;
  className?: string;
}

/**
 * The explorer's rendering: the camera view image with an SVG overlay of
 * regions (normalised 0–1 points scaled into the image's own viewBox) and the
 * building name tags, all in one pan/zoom layer so they stay glued to the
 * facade at any zoom. Hovering a region lights it up and shows its card;
 * clicking an apartment pins its card, whose button flies into the apartment.
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
  fit = 'contain',
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
  const [rootRef, stage] = useElementSize<HTMLDivElement>();
  const W = view.imageWidth || 1600;
  const H = view.imageHeight || 900;
  const cover = fit === 'cover';
  // Swinging away to another camera view: its card and buttons go at once.
  const present = useIsPresent();

  const hovered = hover ? hotspots.find((h) => h.id === hover.id) : undefined;
  const focused = focus ? hotspots.find((h) => h.id === focus.hotspotId) : undefined;
  // Its parking spot / storage room (or its apartment) light up with the hovered unit.
  const linkedIds = useMemo(() => linkedHotspotIds(hovered, hotspots, unitsById), [hovered, hotspots, unitsById]);
  useFlyFocus(focus, hotspots, pz.flyTo, onFocusArrive);
  const card = hovered ? cardFor(hovered) : undefined;
  const frame: React.CSSProperties = cover ? coverBox(stage, W / H) : { inset: 0 };

  return (
    <div
      ref={rootRef}
      className={cn('select-none overflow-hidden', cover ? 'absolute inset-0' : 'relative mx-auto bg-slate-900', className)}
      style={cover ? undefined : canvasSize(W, H, fullscreen)}
      data-testid="explorer-canvas"
      data-immersed={dive.veil || dive.returning ? 'true' : undefined}
    >
      <div
        ref={pz.containerRef}
        className="absolute"
        style={{ ...frame, touchAction: pz.isZoomed ? 'none' : 'pan-y' }}
        {...pz.handlers}
        onClick={() => !pz.consumeDrag() && dismiss()}
      >
        <div ref={pz.contentRef} className={cn('absolute inset-0', pz.isZoomed ? 'cursor-grab active:cursor-grabbing' : '')} style={pz.contentStyle}>
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
          <EntranceMarkers hotspots={hotspots} entrancesById={entrancesById} activeId={hover?.id} onHover={showFor} onLeave={(h) => scheduleClose(h.id)} onSelect={activate} />
          <BuildingLabels hotspots={hotspots} buildingsById={buildingsById} activeId={hover?.id} onHover={showFor} onLeave={(h) => scheduleClose(h.id)} onSelect={activate} />
          <DiveVeil hotspot={dive.veil} phase={dive.phase} imageUrl={view.imageUrl} width={W} height={H} />
        </div>
      </div>

      <div className={cn('absolute bottom-3 right-3 z-10 hidden sm:block', cover && 'bottom-24 right-6', HIDE_WHEN_IMMERSED)}>
        <ZoomControls onZoomIn={pz.zoomIn} onZoomOut={pz.zoomOut} onReset={pz.reset} isZoomed={pz.isZoomed} />
      </div>

      {present && hover && hovered && card && (
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
          beside={!!card.unit}
          {...cardHandlers}
        />
      )}

      <DiveHud show={present && dive.flying} unit={dive.target ? unitsById.get(dive.target.linkId) : undefined} onBack={dive.cancel} onSkip={dive.skip} />
    </div>
  );
};
