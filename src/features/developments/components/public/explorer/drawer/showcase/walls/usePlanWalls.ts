import { useEffect, useState } from 'react';
import { optimizeImageUrl } from '@/config/mediaConfig';
import { findWalls, paintMask, type WallMask } from './planWalls';

/** The walls as two pictures: their sides and their tops. */
export interface PlanWallImages {
  side: string;
  top: string;
}

/** Longest side the plan is read at (enough for walls, quick to scan). */
const READ_SIZE = 768;
const SIDE: readonly [number, number, number] = [87, 83, 78];
const TOP: readonly [number, number, number] = [28, 25, 23];

/** Plans already read this visit (url → walls, or null for "no walls found"). */
const cache = new Map<string, PlanWallImages | null>();

const toDataUrl = (mask: WallMask, colour: readonly [number, number, number]): string => {
  const canvas = document.createElement('canvas');
  canvas.width = mask.width;
  canvas.height = mask.height;
  canvas.getContext('2d')!.putImageData(new ImageData(paintMask(mask, colour), mask.width, mask.height), 0, 0);
  return canvas.toDataURL('image/png');
};

/**
 * Reads a floor-plan picture and finds its walls. Needs the media host's CORS
 * (as the WebGL gallery does): the picture is asked for with a query of its
 * own so a copy cached without CORS is never reused. Null while reading, and
 * when the plan has no clear walls or cannot be read — the plan then stays a
 * flat sheet.
 */
export function usePlanWalls(url: string, enabled = true): PlanWallImages | null {
  const [walls, setWalls] = useState<PlanWallImages | null>(() => cache.get(url) ?? null);

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return undefined;
    if (cache.has(url)) {
      setWalls(cache.get(url) ?? null);
      return undefined;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      // Let the plan's rise animation have the frame; read it just after.
      timer = setTimeout(() => {
        if (cancelled) return;
        let found: PlanWallImages | null = null;
        try {
          const scale = Math.min(1, READ_SIZE / Math.max(img.naturalWidth, img.naturalHeight));
          const w = Math.max(1, Math.round(img.naturalWidth * scale));
          const h = Math.max(1, Math.round(img.naturalHeight * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const mask = findWalls(ctx.getImageData(0, 0, w, h).data, w, h);
            if (mask) found = { side: toDataUrl(mask, SIDE), top: toDataUrl(mask, TOP) };
          }
        } catch {
          // A tainted canvas (no CORS) or no canvas support: stay flat.
        }
        cache.set(url, found);
        setWalls(found);
      }, 250);
    };
    img.onerror = () => {
      if (!cancelled) setWalls(null);
    };
    const src = optimizeImageUrl(url, { width: 960 }) || url;
    img.src = `${src}${src.includes('?') ? '&' : '?'}walls=1`;
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [url, enabled]);

  return enabled ? walls : null;
}
