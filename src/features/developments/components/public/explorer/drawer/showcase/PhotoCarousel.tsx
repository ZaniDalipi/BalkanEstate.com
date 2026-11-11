import React from 'react';
import { AnimatePresence, motion, useReducedMotion, type PanInfo, type Variants } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { imageSrcSet, optimizeImageUrl } from '@/config/mediaConfig';
import { cn } from '@/src/lib/utils';
import { FRAME_DRIVEN } from '../../../motion/frameDriven';
import type { UnitPhoto } from '../unitGallery';

interface PhotoCarouselProps {
  photos: UnitPhoto[];
  labels: string[];
  index: number;
  /** Which way the last switch went: the next photo flies in from that side. */
  dir: -1 | 1;
  onStep: (step: -1 | 1) => void;
  /** The apartment's name, for the photos' alt text. */
  name: string;
}

/** A swipe this far (px) or this fast (px/s) turns the page. */
const SWIPE_PX = 90;
const SWIPE_SPEED = 550;
/** Low damping: the photo overshoots and bounces back into place. */
const BOUNCE = { type: 'spring', stiffness: 230, damping: 15, mass: 0.9 } as const;

/**
 * Photos dealt like cards: the next one flies in from the side you are
 * heading to, tilted, overshoots and bounces into place, while the one on show
 * is flung off the other way. Drag a photo sideways to turn it (it springs
 * back with a rubber-band bounce if you let go early).
 */
const deal: Variants = {
  enter: (d: number) => ({ x: `${d * 70}%`, rotate: d * 10, scale: 0.84, opacity: 0, zIndex: 2 }),
  center: { x: '0%', rotate: 0, scale: 1, opacity: 1, zIndex: 2, transition: { ...BOUNCE, opacity: { duration: 0.22 } } },
  exit: (d: number) => ({
    x: `${d * -55}%`,
    rotate: d * -14,
    scale: 0.78,
    opacity: 0,
    zIndex: 1,
    transition: { duration: 0.42, ease: [0.45, 0, 0.9, 0.55] },
  }),
};
const fade: Variants = { enter: { opacity: 0 }, center: { opacity: 1, transition: { duration: 0.2 } }, exit: { opacity: 0, transition: { duration: 0.2 } } };

const ARROW =
  'absolute top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-lg ring-1 ring-black/5 backdrop-blur transition hover:scale-105 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95';

export const PhotoCarousel: React.FC<PhotoCarouselProps> = ({ photos, labels, index, dir, onStep, name }) => {
  const { t } = useTranslation('developments');
  const reduced = useReducedMotion();
  const photo = photos[index] ?? photos[0];
  const many = photos.length > 1;
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_PX || info.velocity.x < -SWIPE_SPEED) onStep(1);
    else if (info.offset.x > SWIPE_PX || info.velocity.x > SWIPE_SPEED) onStep(-1);
  };

  return (
    <div className="absolute inset-0" data-testid="photo-carousel">
      <AnimatePresence initial={false} custom={dir}>
        <motion.figure
          key={photo.url}
          {...FRAME_DRIVEN}
          custom={dir}
          variants={reduced ? fade : deal}
          initial="enter"
          animate="center"
          exit="exit"
          drag={many && !reduced ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.55}
          dragTransition={{ bounceStiffness: 420, bounceDamping: 14 }}
          whileDrag={{ scale: 0.97 }}
          onDragEnd={onDragEnd}
          className={cn('absolute inset-0 m-0', many && 'cursor-grab active:cursor-grabbing')}
        >
          <img
            src={optimizeImageUrl(photo.url, { width: 1280 })}
            srcSet={imageSrcSet(photo.url, [640, 960, 1280, 1920]) || undefined}
            sizes="(min-width: 1280px) 760px, 60vw"
            alt={t('explorer.showcase.photoAlt', { name, n: index + 1, defaultValue: '{{name}}, photo {{n}}' })}
            draggable={false}
            className="pointer-events-none h-full w-full select-none rounded-2xl bg-white object-cover shadow-[0_40px_70px_-30px_rgba(70,50,30,0.45)]"
          />
          <figcaption className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/55 py-1.5 pl-3.5 pr-1.5 text-sm font-semibold text-white backdrop-blur-md">
            {labels[index]}
            {many && (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs tabular-nums" aria-hidden="true">
                {index + 1} / {photos.length}
              </span>
            )}
            {many && <span className="sr-only">{t('explorer.showcase.photoOf', { n: index + 1, total: photos.length, defaultValue: '{{n}} of {{total}}' })}</span>}
          </figcaption>
        </motion.figure>
      </AnimatePresence>

      {many && (
        <>
          <button type="button" onClick={() => onStep(-1)} className={cn(ARROW, 'left-3 xl:-left-16')} aria-label={t('explorer.showcase.prevPhoto', 'Previous photo')}>
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onStep(1)} className={cn(ARROW, 'right-3 xl:-right-16')} aria-label={t('explorer.showcase.nextPhoto', 'Next photo')}>
            <ChevronRight className="h-6 w-6" aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
};
