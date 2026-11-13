'use client';

import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { MorphStage } from './MorphStage';
import { MorphFallback } from './MorphFallback';
import { MorphArrows } from './MorphArrows';
import { MorphThumbnails } from './MorphThumbnails';
import { useAutoplay } from './useAutoplay';
import { wrapIndex } from './morphMath';
import { supportsWebGL } from './morphGl';
import { DEFAULT_MORPH_LABELS, type MorphGalleryLabels, type MorphItem } from './types';
import type { MorphStatus } from './useMorphRenderer';

export type MorphGalleryProps = {
  items: MorphItem[];
  /** **Must be a definite length.** The canvas fills this box. */
  height?: string;
  duration?: number;
  noiseScale?: number;
  edge?: number;
  drift?: number;
  loop?: boolean;
  /** Milliseconds between automatic advances. 0 (default) is off. */
  autoplay?: number;
  arrows?: boolean;
  thumbnails?: boolean;
  /** Controlled index. Omit for uncontrolled. */
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  labels?: Partial<MorphGalleryLabels>;
  className?: string;
};

const SWIPE_PX = 48;

/**
 * Morph Gallery — a photo gallery whose slides dissolve into each other through
 * noise instead of cutting or cross-fading. Falls back to a plain cross-fade
 * when WebGL is missing or a photo is served without CORS headers.
 */
export default function MorphGallery({
  items,
  height = '100svh',
  duration = 1500,
  noiseScale = 3.5,
  edge = 0.15,
  drift = 0.5,
  loop = true,
  autoplay = 0,
  arrows = true,
  thumbnails = true,
  index,
  defaultIndex = 0,
  onIndexChange,
  labels: labelOverrides,
  className = '',
}: MorphGalleryProps) {
  const labels = { ...DEFAULT_MORPH_LABELS, ...labelOverrides };
  const [uncontrolled, setUncontrolled] = useState(() => wrapIndex(defaultIndex, items.length, loop));
  const active = index === undefined ? uncontrolled : wrapIndex(index, items.length, loop);
  const [status, setStatus] = useState<MorphStatus>(() => (supportsWebGL() ? 'loading' : 'unavailable'));

  const go = useCallback(
    (next: number) => {
      const wrapped = wrapIndex(next, items.length, loop);
      if (index === undefined) setUncontrolled(wrapped);
      onIndexChange?.(wrapped);
    },
    [index, items.length, loop, onIndexChange],
  );

  const setHeld = useAutoplay(autoplay, items.length > 1, () => go(active + 1));

  const swipeStart = useRef<number | null>(null);
  const onPointerDown = (e: PointerEvent) => {
    swipeStart.current = e.clientX;
  };
  const onPointerUp = (e: PointerEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (start === null) return;
    const dx = e.clientX - start;
    if (Math.abs(dx) > SWIPE_PX) go(active + (dx < 0 ? 1 : -1));
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    go(active + (e.key === 'ArrowRight' ? 1 : -1));
  };

  const current = items[active];
  const multiple = items.length > 1;

  return (
    <section
      className={`relative w-full overflow-hidden bg-black ${className}`}
      style={{ height }}
      aria-roledescription="carousel"
      aria-label={labels.region}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      {/* Under the canvas while a photo cannot be textured; on its own without WebGL. */}
      {(status === 'unavailable' || status === 'blocked') && <MorphFallback items={items} active={active} />}
      {status !== 'unavailable' && (
        <MorphStage
          sources={items.map((i) => i.src)}
          index={active}
          loop={loop}
          duration={duration}
          noiseScale={noiseScale}
          edge={edge}
          drift={drift}
          onStatusChange={setStatus}
        />
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-56 bg-gradient-to-b from-transparent to-black/65" aria-hidden="true" />

      {arrows && multiple && (
        <MorphArrows
          onPrev={() => go(active - 1)}
          onNext={() => go(active + 1)}
          atStart={!loop && active === 0}
          atEnd={!loop && active === items.length - 1}
          labels={labels}
        />
      )}
      {thumbnails && multiple && <MorphThumbnails items={items} active={active} onSelect={go} labels={labels} />}

      <span className="sr-only" aria-live="polite">
        {current?.alt ? `${current.alt} — ` : ''}
        {labels.position(active + 1, items.length)}
      </span>
    </section>
  );
}
