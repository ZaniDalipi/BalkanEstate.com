import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { animate, useMotionValue, useMotionValueEvent, usePresence, type AnimationPlaybackControls, type MotionValue } from 'framer-motion';
import { backdropStrength, clampSheetY, dragIntent, sheetGeometry, snapAfterRelease, snapY, type SheetGeometry, type SheetSize, type SheetSnap } from '../utils/sheetSnap';

const SPRING = { type: 'spring', stiffness: 420, damping: 42, mass: 0.9 } as const;
const EXIT = { duration: 0.22, ease: 'easeIn' } as const;
const INSTANT = { duration: 0 } as const;

const useViewportHeight = (): number => {
  const [h, setH] = useState(() => (typeof window === 'undefined' ? 800 : window.innerHeight));
  useEffect(() => {
    const on = () => setH(window.innerHeight);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return h;
};

interface SheetMotionOptions {
  /** Phones only; on desktop the drawer slides in from the side and this does nothing. */
  enabled: boolean;
  panelRef: RefObject<HTMLElement>;
  contentRef: RefObject<HTMLElement>;
  onClose: () => void;
  reduceMotion: boolean;
}

export interface SheetMotion {
  /** Vertical offset of the sheet in px (0 = full height); bind it to the sheet's `y`. */
  y: MotionValue<number>;
  /** 0…1 strength of the dim over the picture behind; follows the sheet live. */
  backdrop: MotionValue<number>;
  geometry: SheetGeometry;
  size: SheetSize;
  toggle: () => void;
}

/**
 * The phone sheet's motion: it slides up to half height on open, follows the
 * finger while dragged (from the handle, or from the content when that does not
 * scroll), settles on full / half / closed with a spring on release (a flick
 * counts), and slides away on close. The picture behind dims and clears in step
 * because it is driven by the same offset. Touch events are used directly so a
 * drag can cancel the page's own scrolling.
 */
export function useSheetMotion({ enabled, panelRef, contentRef, onClose, reduceMotion }: SheetMotionOptions): SheetMotion {
  const viewportHeight = useViewportHeight();
  const geometry = useMemo(() => sheetGeometry(viewportHeight), [viewportHeight]);
  const geoRef = useRef(geometry);
  geoRef.current = geometry;
  const [size, setSize] = useState<SheetSize>('half');
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const y = useMotionValue(enabled ? geometry.closedY : 0);
  const backdrop = useMotionValue(0);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const motionRef = useRef(reduceMotion);
  motionRef.current = reduceMotion;
  const running = useRef<AnimationPlaybackControls | null>(null);
  const mounted = useRef(false);

  useMotionValueEvent(y, 'change', (v) => backdrop.set(backdropStrength(v, geoRef.current)));

  const moveTo = useCallback((target: number, transition: typeof SPRING | typeof EXIT, onComplete?: () => void) => {
    running.current?.stop();
    running.current = animate(y, target, { ...(motionRef.current ? INSTANT : transition), onComplete });
  }, [y]);

  const settle = useCallback((snap: SheetSnap) => {
    if (snap === 'closed') {
      closeRef.current(); // the exit below carries it the rest of the way down
      return;
    }
    setSize(snap);
    moveTo(snapY(snap, geoRef.current), SPRING);
  }, [moveTo]);

  // Open: from below the screen up to half height. A new screen size re-places it.
  useEffect(() => {
    if (!enabled) return;
    if (!mounted.current) {
      mounted.current = true;
      y.set(geometry.closedY);
      moveTo(snapY('half', geometry), SPRING);
    } else {
      y.jump(snapY(sizeRef.current, geometry));
    }
  }, [enabled, geometry, moveTo, y]);

  // Close: slide down out of the screen, then let the page remove it.
  const [present, safeToRemove] = usePresence();
  useEffect(() => {
    if (present) return undefined;
    if (!enabled) {
      safeToRemove?.();
      return undefined;
    }
    moveTo(geoRef.current.closedY, EXIT, safeToRemove ?? undefined);
    return () => running.current?.stop();
  }, [present, enabled, moveTo, safeToRemove]);

  // Touch: the sheet follows the finger.
  useEffect(() => {
    const panel = panelRef.current;
    if (!enabled || !panel) return undefined;
    let touch: { x: number; y: number; inContent: boolean } | null = null;
    let mode: 'wait' | 'drag' | 'scroll' = 'wait';
    let baseY = 0;
    let anchor = 0;
    let samples: { y: number; t: number }[] = [];

    const start = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        touch = null;
        return;
      }
      const t = e.touches[0];
      touch = { x: t.clientX, y: t.clientY, inContent: !!contentRef.current?.contains(e.target as Node) };
      mode = 'wait';
      samples = [{ y: t.clientY, t: e.timeStamp }];
    };
    const move = (e: TouchEvent) => {
      if (!touch || e.touches.length !== 1) return;
      const t = e.touches[0];
      if (mode === 'wait') {
        mode = dragIntent({ inContent: touch.inContent, size: sizeRef.current, scrollTop: contentRef.current?.scrollTop ?? 0, dy: t.clientY - touch.y, dx: t.clientX - touch.x });
        if (mode === 'drag') {
          running.current?.stop();
          baseY = y.get();
          anchor = t.clientY;
        }
      }
      if (mode !== 'drag') return;
      if (e.cancelable) e.preventDefault();
      y.set(clampSheetY(baseY + (t.clientY - anchor), geoRef.current));
      samples.push({ y: t.clientY, t: e.timeStamp });
      if (samples.length > 6) samples.shift();
    };
    const end = () => {
      if (touch && mode === 'drag') {
        const last = samples[samples.length - 1];
        const first = samples.find((s) => last.t - s.t <= 120) ?? last;
        const velocity = last.t > first.t ? ((last.y - first.y) / (last.t - first.t)) * 1000 : 0;
        settle(snapAfterRelease(y.get(), velocity, geoRef.current));
      }
      touch = null;
      mode = 'wait';
    };

    panel.addEventListener('touchstart', start, { passive: true });
    panel.addEventListener('touchmove', move, { passive: false });
    panel.addEventListener('touchend', end);
    panel.addEventListener('touchcancel', end);
    return () => {
      panel.removeEventListener('touchstart', start);
      panel.removeEventListener('touchmove', move);
      panel.removeEventListener('touchend', end);
      panel.removeEventListener('touchcancel', end);
    };
  }, [enabled, panelRef, contentRef, settle, y]);

  const toggle = useCallback(() => settle(sizeRef.current === 'full' ? 'half' : 'full'), [settle]);
  return { y, backdrop, geometry, size, toggle };
}

