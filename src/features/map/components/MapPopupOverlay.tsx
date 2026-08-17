/**
 * MapPopupOverlay - Smart-positioned wrapper around GoogleMapPropertyPopup.
 *
 * The popup normally opens *above* its marker. When the marker sits near the
 * top edge of the map (or the popup would collide with the top toolbar), the
 * card is flipped to open *below* the marker instead, and clamped horizontally
 * so it never spills past the left/right edges. The pointer tail is offset to
 * keep pointing back at the marker even when the card is shifted.
 *
 * Coordinates are validated (per CLAUDE.md validation rules) before we attempt
 * to project them — invalid markers render nothing rather than throwing.
 */

import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { OverlayView, OverlayViewF } from '@react-google-maps/api';
import { Property } from '@/types';
import { validateCoordinates } from '@/shared/utils/validation';
import GoogleMapPropertyPopup from './GoogleMapPropertyPopup';

interface MapPopupOverlayProps {
  property: Property;
  map: google.maps.Map | null;
  onClose: () => void;
  onViewDetails: () => void;
  distanceLabel?: string | null;
}

type Placement = 'top' | 'bottom';

interface Layout {
  placement: Placement;
  offsetX: number;
  tailOffsetX: number;
}

// Card width mirrors the fixed width set in GoogleMapPropertyPopup.
const CARD_WIDTH = 248;
// Gap between the marker and the card (leaves room for the pointer tail).
const GAP = 14;
// Keep the card this far from the map container edges.
const EDGE_MARGIN = 12;
// Reserve space at the top for the floating toolbar (Subscribe / Login row).
const TOP_TOOLBAR_RESERVE = 72;

const DEFAULT_LAYOUT: Layout = { placement: 'top', offsetX: 0, tailOffsetX: 0 };

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const MapPopupOverlay: React.FC<MapPopupOverlayProps> = ({
  property,
  map,
  onClose,
  onViewDetails,
  distanceLabel,
}) => {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState<Layout>(DEFAULT_LAYOUT);

  // Validate coordinates up-front — never feed NaN/out-of-range values to the
  // Maps projection. Hooks below still run so hook order stays stable.
  const coords = validateCoordinates(property.lat as number, property.lng as number);

  const recomputeLayout = useCallback(() => {
    const anchor = anchorRef.current;
    const card = cardRef.current;
    if (!map || !anchor || !card) return;

    const container = map.getDiv();
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) return;

    const cardWidth = card.offsetWidth || CARD_WIDTH;
    const cardHeight = card.offsetHeight || 0;

    // Marker position relative to the map container.
    const markerX = anchorRect.left - containerRect.left;
    const markerY = anchorRect.top - containerRect.top;

    // --- Horizontal clamp: keep the centered card inside the container ---
    const centeredLeft = markerX - cardWidth / 2;
    const minLeft = EDGE_MARGIN;
    const maxLeft = Math.max(EDGE_MARGIN, containerRect.width - EDGE_MARGIN - cardWidth);
    const clampedLeft = clamp(centeredLeft, minLeft, maxLeft);
    const offsetX = clampedLeft - centeredLeft;

    // Tail should keep pointing at the marker; limit it to stay under the card.
    const tailLimit = Math.max(0, cardWidth / 2 - 18);
    const tailOffsetX = clamp(-offsetX, -tailLimit, tailLimit);

    // --- Vertical flip: prefer above, drop below when there isn't room ---
    const spaceAbove = markerY - TOP_TOOLBAR_RESERVE;
    const neededAbove = cardHeight + GAP + EDGE_MARGIN;
    const placement: Placement = spaceAbove >= neededAbove ? 'top' : 'bottom';

    setLayout((prev) =>
      prev.placement === placement &&
      Math.abs(prev.offsetX - offsetX) < 0.5 &&
      Math.abs(prev.tailOffsetX - tailOffsetX) < 0.5
        ? prev
        : { placement, offsetX, tailOffsetX }
    );
  }, [map]);

  // Recompute on selection, map movement, card resize (e.g. image loads), and
  // window resize. OverlayView keeps the anchor glued to the marker on pan, so
  // the transform below rides along; we only re-evaluate placement at rest.
  useLayoutEffect(() => {
    if (!coords.isValid || !map) return;

    recomputeLayout();

    // 'bounds_changed' fires on every drag frame and each call does two
    // getBoundingClientRect reads plus a setState — exactly the per-frame work
    // the comment above says we avoid. 'idle' + 'zoom_changed' cover rest.
    const listeners = [
      map.addListener('idle', recomputeLayout),
      map.addListener('zoom_changed', recomputeLayout),
    ];

    let resizeObserver: ResizeObserver | null = null;
    if (cardRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(recomputeLayout);
      resizeObserver.observe(cardRef.current);
    }

    window.addEventListener('resize', recomputeLayout);

    return () => {
      listeners.forEach((l) => l.remove());
      resizeObserver?.disconnect();
      window.removeEventListener('resize', recomputeLayout);
    };
    // property.id keeps the effect fresh when switching between markers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords.isValid, map, recomputeLayout, property.id]);

  if (!coords.isValid) {
    if (import.meta.env.DEV) {
      console.warn(
        `[MapPopupOverlay] Skipping popup for property ${property.id}: ${coords.error}`
      );
    }
    return null;
  }

  const cardTransform =
    layout.placement === 'top'
      ? `translate(calc(-50% + ${layout.offsetX}px), calc(-100% - ${GAP}px))`
      : `translate(calc(-50% + ${layout.offsetX}px), ${GAP}px)`;

  return (
    <OverlayViewF
      position={{ lat: property.lat as number, lng: property.lng as number }}
      mapPaneName={OverlayView.FLOAT_PANE}
    >
      {/* Zero-size anchor pinned to the marker pixel; the card floats off it. */}
      <div ref={anchorRef} style={{ position: 'absolute', width: 0, height: 0 }}>
        <div
          ref={cardRef}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: cardTransform,
          }}
        >
          <GoogleMapPropertyPopup
            property={property}
            onClose={onClose}
            onViewDetails={onViewDetails}
            distanceLabel={distanceLabel}
            placement={layout.placement}
            tailOffsetX={layout.tailOffsetX}
          />
        </div>
      </div>
    </OverlayViewF>
  );
};

export default MapPopupOverlay;
