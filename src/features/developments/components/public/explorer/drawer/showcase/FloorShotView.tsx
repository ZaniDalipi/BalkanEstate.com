import React from 'react';
import { cn } from '@/src/lib/utils';
import { DIVE_PAPER } from '../../dive/diveStyle';
import { holeMask } from '../../dive/holeMask';
import { ViewPicture } from '../../ViewPicture';
import type { FloorShot } from './floorShot';

interface FloorShotViewProps {
  shot: FloorShot;
  /** Describes the picture (the floor, the apartment highlighted). */
  alt: string;
  /** A label over the picture's corner (the floor's name). */
  caption?: string;
  /** Size and shape only: the box is always `relative` (the picture and outline fill it). */
  className?: string;
  style?: React.CSSProperties;
}

/** How much the rest of the floor fades, so the apartment stands out without losing its surroundings. */
const FADE = 0.5;

/**
 * The apartment on its floor's picture (the plan the developer drew its homes
 * on): the rest of the floor fades under a paper wash, the apartment keeps its
 * colours inside a teal outline. Without a marked region the plain floor shows.
 * Its box must have the picture's shape (the regions are stretched over it).
 */
export const FloorShotView: React.FC<FloorShotViewProps> = ({ shot, alt, caption, className, style }) => {
  const { view, region } = shot;
  const W = view.imageWidth || 1600;
  const H = view.imageHeight || 900;
  const pts = (region ?? []).map(([x, y]) => [x * W, y * H] as const);
  const mask = pts.length ? holeMask(W, H, pts) : '';

  return (
    <div className={cn('relative overflow-hidden bg-white', className)} style={style} data-testid="floor-shot">
      <ViewPicture url={view.imageUrl} name={alt} />
      {mask && (
        <>
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: DIVE_PAPER, opacity: FADE, WebkitMaskImage: mask, maskImage: mask, WebkitMaskSize: '100% 100%', maskSize: '100% 100%' }}
          />
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
            <polygon
              points={pts.map(([x, y]) => `${x},${y}`).join(' ')}
              fill="rgba(13,148,136,0.16)"
              stroke="#0d9488"
              strokeWidth={Math.max(2, W / 420)}
              strokeLinejoin="round"
            />
          </svg>
        </>
      )}
      {caption && (
        <span className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] truncate rounded-full bg-black/55 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-md">
          {caption}
        </span>
      )}
    </div>
  );
};
