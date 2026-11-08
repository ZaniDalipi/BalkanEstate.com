import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { optimizeImageUrl } from '@/config/mediaConfig';
import { cn } from '@/src/lib/utils';
import type { PublicUnit } from '../../../../../types';
import { DIVE_PAPER } from '../../dive/diveStyle';
import { useUnitText } from '../../useUnitText';
import { FloorPlanModel } from './FloorPlanModel';
import { apartmentBox } from './showcaseMotion';
import type { ShowcaseMedia } from './showcaseMedia';
import { FRAME_DRIVEN } from '../../../motion/frameDriven';

interface ApartmentShowcaseProps {
  unit: PublicUnit;
  media: ShowcaseMedia;
  onClose: () => void;
  className?: string;
}

const PILL = 'inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white/95 px-4 text-sm font-semibold text-slate-800 shadow-md ring-1 ring-black/5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';
const MODE = 'min-h-[44px] min-w-[52px] rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';
const DOCK = 'absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-1 rounded-full bg-white/95 p-1 shadow-md ring-1 ring-black/5';
const PHOTO_RATIO = 3 / 2;

/**
 * Desktop stage beside the apartment details: the building has washed out to
 * paper and what the developer posted for the apartment rises out of it — its
 * floor plan as a tilted model (laid flat on request), else its photos. "Back
 * to building" flies back out.
 */
export const ApartmentShowcase: React.FC<ApartmentShowcaseProps> = ({ unit, media, onClose, className }) => {
  const { t } = useTranslation('developments');
  const txt = useUnitText();
  const reduced = useReducedMotion();
  // Measured once, as the showcase opens: where the buyer saw the apartment.
  const [origin] = useState(() => apartmentBox(unit.id));
  const [tilted, setTilted] = useState(true);
  const [photo, setPhoto] = useState(0);
  const name = txt.title(unit);
  const isPlan = media.kind === 'plan';

  return (
    <motion.div
      {...FRAME_DRIVEN}
      className={cn('relative flex h-full min-w-0 flex-1 items-center justify-center overflow-hidden', className)}
      style={{ background: `radial-gradient(ellipse at 45% 45%, #fbfaf7 0%, ${DIVE_PAPER} 60%, #e6e0d6 100%)` }}
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: reduced ? 0 : 0.45, ease: 'easeIn' } }}
      transition={{ duration: reduced ? 0 : 0.5, ease: 'easeOut' }}
      data-testid="apartment-showcase"
    >
      <button type="button" onClick={onClose} className={cn(PILL, 'absolute left-4 top-4 z-10')}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {origin ? t('explorer.showcase.back', 'Back to building') : t('explorer.showcase.backPlain', 'Back')}
      </button>

      {isPlan ? (
        <FloorPlanModel
          url={media.url}
          ratio={media.ratio}
          alt={t('explorer.showcase.planAlt', { name, defaultValue: 'Floor plan of {{name}}' })}
          tilted={tilted}
          origin={origin}
        />
      ) : (
        <FloorPlanModel
          url={media.urls[photo] ?? media.urls[0]}
          ratio={PHOTO_RATIO}
          alt={t('explorer.showcase.photoAlt', { name, n: photo + 1, defaultValue: '{{name}}, photo {{n}}' })}
          tilted={false}
          origin={origin}
          fill="cover"
        />
      )}

      {isPlan ? (
        <div role="group" aria-label={t('explorer.showcase.mode', 'Floor plan view')} className={DOCK}>
          {([true, false] as const).map((on) => (
            <button
              key={String(on)}
              type="button"
              aria-pressed={tilted === on}
              onClick={() => setTilted(on)}
              className={cn(MODE, tilted === on ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100')}
            >
              {on ? t('explorer.showcase.tilted', '3D') : t('explorer.showcase.flat', '2D')}
            </button>
          ))}
        </div>
      ) : (
        media.urls.length > 1 && (
          <div role="group" aria-label={t('explorer.drawer.openGallery', 'Open photos')} className={cn(DOCK, 'gap-1.5 rounded-2xl p-1.5')}>
            {media.urls.map((url, i) => (
              <button
                key={url}
                type="button"
                aria-pressed={photo === i}
                aria-label={`${t('explorer.drawer.photo', 'Photo')} ${i + 1}`}
                onClick={() => setPhoto(i)}
                className={cn('h-11 w-16 overflow-hidden rounded-xl ring-2 transition', photo === i ? 'ring-slate-900' : 'ring-transparent opacity-70 hover:opacity-100')}
              >
                <img src={optimizeImageUrl(url, { width: 160 })} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )
      )}
    </motion.div>
  );
};
