import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { optimizeImageUrl, imageSrcSet } from '@/config/mediaConfig';
import { cn } from '@/src/lib/utils';
import type { DevelopmentBuilding, Hotspot, PublicSceneView, PublicUnit } from '../../../types';
import { usePanZoom } from '../../../hooks/usePanZoom';
import { AvailabilityPatterns } from './AvailabilityPatterns';
import { BuildingLabels } from './BuildingLabels';
import { HotspotShape } from './HotspotShape';
import { RegionCard } from './RegionCard';
import { ZoomControls } from './ZoomControls';
import type { RegionDisplayMode } from './regionPaint';
import { useHotspotInteraction } from './useHotspotInteraction';
import { useRegionCard, type BuildingFacts } from './useRegionCard';
import { useUnitText } from './useUnitText';

export interface ExplorerCanvasProps {
  view: Pick<PublicSceneView, 'imageUrl' | 'imageWidth' | 'imageHeight' | 'hotspots' | 'viewName'>;
  unitsById: Map<string, PublicUnit>;
  /** Units matching the active filters; undefined = no filters. */
  matchedIds?: Set<string>;
  buildingsById?: Map<string, DevelopmentBuilding>;
  buildingFacts?: Map<string, BuildingFacts>;
  onActivate: (h: Hotspot) => void;
  /** 'clean' (default): regions appear on hover; 'availability': always coloured. */
  mode?: RegionDisplayMode;
  /** Fill the viewport (pseudo full-screen): fit the image inside it. */
  fullscreen?: boolean;
  className?: string;
}

/**
 * The explorer's rendering: the camera view image with an SVG overlay of
 * regions (normalised 0–1 points scaled into the image's own viewBox) and the
 * building name tags, all in one pan/zoom layer so they stay glued to the
 * facade at any zoom. Hovering (or tapping) a region lights it up and opens its
 * card; clicking opens it.
 */
export const ExplorerCanvas: React.FC<ExplorerCanvasProps> = ({
  view,
  unitsById,
  matchedIds,
  buildingsById,
  buildingFacts,
  onActivate,
  mode = 'clean',
  fullscreen,
  className,
}) => {
  const { t } = useTranslation('developments');
  const txt = useUnitText();
  const pz = usePanZoom({ wheelAlwaysZooms: fullscreen });
  const { hover, bind, activate, dismiss, cardHandlers, showFor, scheduleClose } = useHotspotInteraction(pz.consumeDrag, onActivate);
  const cardFor = useRegionCard(unitsById, buildingsById, buildingFacts);
  const W = view.imageWidth || 1600;
  const H = view.imageHeight || 900;

  const hotspots = useMemo(() => [...view.hotspots].sort((a, b) => (a.z ?? 0) - (b.z ?? 0)), [view.hotspots]);
  const hovered = hover ? hotspots.find((h) => h.id === hover.id) : undefined;

  const describe = (h: Hotspot): string | undefined => {
    if (h.linkType === 'unit') {
      const u = unitsById.get(h.linkId);
      return u ? txt.ariaLabel(u) : h.label;
    }
    if (h.linkType === 'building') return txt.buildingLabel(h, buildingsById?.get(h.linkId));
    if (h.linkType === 'floor') return h.label || t('scene.linkTypes.floor', 'Floor');
    if (h.linkType === 'listing') return h.label || t('unit.viewListing', 'View listing');
    return h.label;
  };

  const sizeStyle: React.CSSProperties = fullscreen
    ? { aspectRatio: `${W} / ${H}`, width: `min(100vw, calc(100dvh * ${W / H}))` }
    : { aspectRatio: `${W} / ${H}`, width: `min(100%, calc(min(82dvh, 100dvh - 13rem) * ${W / H}))` };
  const card = hovered ? cardFor(hovered) : undefined;

  return (
    <div
      ref={pz.containerRef}
      className={cn('relative mx-auto select-none overflow-hidden bg-slate-900', className)}
      style={{ ...sizeStyle, touchAction: pz.isZoomed ? 'none' : 'pan-y' }}
      {...pz.handlers}
      onClick={() => !pz.consumeDrag() && dismiss()}
      data-testid="explorer-canvas"
    >
      <div className={cn('absolute inset-0', pz.isZoomed ? 'cursor-grab active:cursor-grabbing' : '')} style={pz.contentStyle}>
        <img
          src={optimizeImageUrl(view.imageUrl, { width: 1920 })}
          srcSet={imageSrcSet(view.imageUrl, [800, 1280, 1920, 2560]) || undefined}
          sizes="100vw"
          alt={view.viewName || t('scene.exploreHeading', 'Explore the development')}
          draggable={false}
          // A failed image hides itself so buyers see the dark stage, not a broken-image icon.
          onError={(e) => {
            e.currentTarget.style.visibility = 'hidden';
          }}
          className="pointer-events-none absolute inset-0 h-full w-full object-fill"
        />
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" role="group" aria-label={t('explorer.regions', 'Apartments and buildings')}>
          <AvailabilityPatterns scale={W} />
          {hotspots.map((h) => {
            const unit = h.linkType === 'unit' ? unitsById.get(h.linkId) : undefined;
            const interactive = h.linkType !== 'entrance' && (h.linkType !== 'unit' || !!unit);
            return (
              <HotspotShape
                key={h.id}
                hotspot={h}
                width={W}
                height={H}
                state={unit?.availability}
                matched={unit && matchedIds ? matchedIds.has(unit.id) : undefined}
                mode={mode}
                active={hover?.id === h.id}
                label={describe(h)}
                interactive={interactive}
                {...bind(h)}
              />
            );
          })}
        </svg>
        <BuildingLabels
          hotspots={hotspots}
          buildingsById={buildingsById}
          activeId={hover?.id}
          onHover={showFor}
          onLeave={(h) => scheduleClose(h.id)}
          onSelect={activate}
        />
      </div>

      <div className="absolute bottom-3 right-3 z-10 hidden sm:block">
        <ZoomControls onZoomIn={pz.zoomIn} onZoomOut={pz.zoomOut} onReset={pz.reset} isZoomed={pz.isZoomed} />
      </div>

      {hover && hovered && card && (
        <RegionCard
          anchor={hover.rect}
          unit={card.unit}
          title={card.title}
          facts={card.facts}
          imageUrl={card.imageUrl}
          badge={card.badge}
          actionLabel={hovered.linkType !== 'entrance' ? card.actionLabel : undefined}
          onAction={hovered.linkType !== 'entrance' ? () => activate(hovered) : undefined}
          {...cardHandlers}
        />
      )}
    </div>
  );
};
