import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/src/hooks/useMediaQuery';
import { useMorphRenderer, type MorphStatus } from './useMorphRenderer';

export interface MorphStageProps {
  /** Photo URLs. Must be served with CORS headers, or the stage reports `unavailable`. */
  sources: string[];
  /** The photo to show; changing it plays the dissolve. */
  index: number;
  loop?: boolean;
  /** Milliseconds of dissolve. */
  duration?: number;
  /** fbm frequency. Higher tears into finer shreds. */
  noiseScale?: number;
  /** Width of the dissolve front, in threshold units. 0 is a hard edge. */
  edge?: number;
  /** How far the photos slide against each other while dissolving. */
  drift?: number;
  /** Photos either side of the visible one that keep a GPU texture. */
  keepRadius?: number;
  /** Per photo: fill the frame (true) or show it whole over a soft backdrop (false). */
  shouldCover?: (imgAspect: number, frameAspect: number) => boolean;
  /** Told when the stage is drawing, or when the caller should show its fallback. */
  onStatusChange?: (status: MorphStatus) => void;
  className?: string;
}

/**
 * The bare morph canvas: no controls, no fallback of its own. It fills its
 * positioned parent and is decorative (`aria-hidden`); the caller owns the
 * accessible name, the navigation and what to render when it is unavailable.
 */
export function MorphStage({
  sources,
  index,
  loop = true,
  duration = 1500,
  noiseScale = 3.5,
  edge = 0.15,
  drift = 0.5,
  keepRadius = 2,
  shouldCover,
  onStatusChange,
  className = '',
}: MorphStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduced = useReducedMotion();
  const status = useMorphRenderer(canvasRef, {
    sources,
    active: index,
    loop,
    keepRadius,
    shouldCover,
    tuning: { duration, noiseScale, edge, drift, reduced },
  });

  const notify = useRef(onStatusChange);
  notify.current = onStatusChange;
  useEffect(() => {
    notify.current?.(status);
  }, [status]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 block h-full w-full ${className}`}
      // Nothing is drawn until the first texture lands; fading in avoids a black flash.
      style={{ opacity: status === 'ready' ? 1 : 0, transition: 'opacity 400ms ease' }}
      aria-hidden="true"
    />
  );
}
