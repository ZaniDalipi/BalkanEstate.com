import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import { useUpdateBusinessListing } from './useBusinessListings';

/** Clamp to the 0–100 % range object-position accepts. */
export const clampPercent = (v: number): number => Math.max(0, Math.min(100, v));

/**
 * Owner drags the banner up/down to choose which strip of the photo shows.
 * One pointer handler set covers mouse, pen and touch; the pointer is captured
 * so the drag keeps tracking outside the banner.
 */
export function useBannerReposition(listing: BusinessListing) {
  const { t } = useTranslation('businessDirectory');
  const { updateListing, isLoading: isSaving } = useUpdateBusinessListing();
  const saved = listing.bannerPosition ?? 50;
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [draftY, setDraftY] = useState(saved);
  const [error, setError] = useState<string | null>(null);
  // Shown between a successful save and the refetch that brings it back.
  const [justSaved, setJustSaved] = useState<number | null>(null);
  const drag = useRef<{ startY: number; startPos: number; height: number } | null>(null);

  const start = useCallback(() => {
    setDraftY(saved);
    setError(null);
    setIsRepositioning(true);
  }, [saved]);

  const cancel = useCallback(() => setIsRepositioning(false), []);

  const save = useCallback(async () => {
    try {
      const position = Math.round(draftY);
      await updateListing({ id: listing.id, data: { bannerPosition: position } });
      setJustSaved(position);
      setIsRepositioning(false);
    } catch {
      setError(t('banner.repositionError', 'Failed to save banner position'));
    }
  }, [draftY, listing.id, updateListing, t]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!isRepositioning) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startY: e.clientY, startPos: draftY, height: e.currentTarget.getBoundingClientRect().height || 1 };
  }, [isRepositioning, draftY]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    // Dragging down reveals the upper part of the photo.
    setDraftY(clampPercent(d.startPos - ((e.clientY - d.startY) / d.height) * 100));
  }, []);

  const onPointerUp = useCallback(() => {
    drag.current = null;
  }, []);

  return {
    isRepositioning,
    isSaving,
    /** Position to render: the draft while repositioning, the saved one otherwise. */
    positionY: isRepositioning ? draftY : justSaved ?? saved,
    error,
    start,
    cancel,
    save,
    pointerHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
}
