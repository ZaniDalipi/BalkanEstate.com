import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  dockPadding,
  getContentWidth,
  getDockConfig,
  getPositions,
  getTargetScales,
  isSettled,
  lerp,
  resolveDockConfig,
  type DockConfig,
} from './dockMath';

/**
 * Drives the dock's magnification. Scales and positions live in refs and are
 * written straight to the DOM each frame, so hovering never re-renders React.
 */
export interface DockSizeOptions {
  iconSize?: number;
  maxScale?: number;
}

export function useDockMagnification(count: number, options: DockSizeOptions, reduced: boolean) {
  const [config, setConfig] = useState<DockConfig>(() =>
    typeof window === 'undefined' ? getDockConfig(0, 0) : getDockConfig(window.innerWidth, window.innerHeight),
  );
  const cfg = resolveDockConfig(config, options);
  const size = cfg.baseIconSize;

  const dockRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const mouseX = useRef<number | null>(null);
  const scales = useRef<number[]>([]);
  const positions = useRef<number[]>([]);
  const frame = useRef<number | null>(null);
  const latest = useRef({ cfg, count, reduced });
  latest.current = { cfg, count, reduced };

  useEffect(() => {
    const onResize = () => setConfig(getDockConfig(window.innerWidth, window.innerHeight));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const paint = useCallback(() => {
    const { cfg: c, count: n } = latest.current;
    const dock = dockRef.current;
    if (dock) {
      dock.style.width = `${getContentWidth(scales.current, positions.current, c.baseIconSize) + dockPadding(c.baseIconSize) * 2}px`;
    }
    for (let i = 0; i < n; i += 1) {
      const el = itemRefs.current[i];
      if (!el) continue;
      const px = c.baseIconSize * scales.current[i];
      el.style.left = `${positions.current[i] - px / 2}px`;
      el.style.width = `${px}px`;
      el.style.height = `${px}px`;
      el.style.zIndex = String(Math.round(scales.current[i] * 10));
    }
  }, []);

  const tick = useCallback(() => {
    frame.current = null;
    const { cfg: c, count: n, reduced: still } = latest.current;
    const targetScales = getTargetScales(still ? null : mouseX.current, n, c);
    const targetPositions = getPositions(targetScales, c.baseIconSize);
    const factor = mouseX.current !== null ? 0.2 : 0.12;
    scales.current = scales.current.map((s, i) => lerp(s, targetScales[i], factor));
    positions.current = positions.current.map((p, i) => lerp(p, targetPositions[i], factor));
    paint();
    const settled =
      isSettled(scales.current, targetScales, 0.002) && isSettled(positions.current, targetPositions, 0.1);
    if (!settled || mouseX.current !== null) frame.current = requestAnimationFrame(tick);
  }, [paint]);

  const wake = useCallback(() => {
    if (frame.current === null) frame.current = requestAnimationFrame(tick);
  }, [tick]);

  // Reset to the resting layout whenever the item count or size changes.
  useLayoutEffect(() => {
    const rest = Array.from({ length: count }, () => 1);
    scales.current = rest;
    positions.current = getPositions(rest, size);
    paint();
  }, [count, size, paint]);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === 'touch' || !dockRef.current) return;
      const rect = dockRef.current.getBoundingClientRect();
      mouseX.current = e.clientX - rect.left - dockPadding(latest.current.cfg.baseIconSize);
      wake();
    },
    [wake],
  );

  const onPointerLeave = useCallback(() => {
    mouseX.current = null;
    wake();
  }, [wake]);

  return { dockRef, itemRefs, size, scales, positions, onPointerMove, onPointerLeave };
}
