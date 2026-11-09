import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { PublicUnit } from '../../../../../types';
import { FRAME_DRIVEN } from '../../../motion/frameDriven';
import { DIVE_PAPER } from '../../dive/diveStyle';
import { useUnitText } from '../../useUnitText';
import { FloorStage } from './FloorStage';
import { PhotoStage } from './PhotoStage';
import { PlanStage } from './PlanStage';
import { ShowcaseModeSwitch } from './ShowcaseModeSwitch';
import { ShowcaseWaiting } from './ShowcaseWaiting';
import type { FloorShotState } from './floorShotState';
import { STAGE_AREA } from './showcaseLayout';
import { showcaseModes, type ShowcaseMedia, type ShowcaseMode } from './showcaseMedia';
import { apartmentBox } from './showcaseMotion';

interface ApartmentShowcaseProps {
  unit: PublicUnit;
  /** Null while the floor picture is on its way (or could not load and there is nothing else). */
  media: ShowcaseMedia | null;
  floor: FloorShotState;
  onClose: () => void;
}

const PILL =
  'inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white/95 px-4 text-sm font-semibold text-slate-800 shadow-md ring-1 ring-black/5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary landscape:min-h-[32px] landscape:px-3';

/**
 * The stage beside the apartment details (tablet and up): the building has
 * washed out to paper and what the developer posted rises out of the
 * apartment's place on it — its own floor plan as a tilted model, the
 * apartment on its floor's picture, its photos — switched with Plan / On its
 * floor / Photos. "Back to building" flies back out.
 */
export const ApartmentShowcase: React.FC<ApartmentShowcaseProps> = ({ unit, media, floor, onClose }) => {
  const { t } = useTranslation('developments');
  const txt = useUnitText();
  const reduced = useReducedMotion();
  // Measured once, as the showcase opens: where the buyer saw the apartment.
  const [origin] = useState(() => apartmentBox(unit.id));
  const modes = media ? showcaseModes(media) : [];
  const [chosen, setChosen] = useState<ShowcaseMode | null>(null);
  // The first picture rises out of the building; later ones come up from below.
  const mode = chosen && modes.includes(chosen) ? chosen : modes[0];
  const from = chosen ? null : origin;
  const name = txt.title(unit);
  const floorName = [unit.floorLabel, unit.buildingName].filter(Boolean).join(' · ');

  return (
    <motion.div
      {...FRAME_DRIVEN}
      className="relative h-full min-w-0 flex-1 overflow-hidden"
      style={{ background: `radial-gradient(ellipse at 45% 45%, #fbfaf7 0%, ${DIVE_PAPER} 60%, #e6e0d6 100%)` }}
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: reduced ? 0 : 0.45, ease: 'easeIn' } }}
      transition={{ duration: reduced ? 0 : 0.5, ease: 'easeOut' }}
      data-testid="apartment-showcase"
    >
      <button type="button" onClick={onClose} className={cn(PILL, 'absolute left-4 top-4 z-20 landscape:left-2 landscape:top-2')}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {origin ? t('explorer.showcase.back', 'Back to building') : t('explorer.showcase.backPlain', 'Back')}
      </button>

      <div className={STAGE_AREA} style={{ containerType: 'size' }}>
        {/* Clear of the Back button: centred where the card sits beside, else at the right. */}
        <div className="absolute inset-x-0 top-4 z-10 flex justify-end pl-44 pr-4 lg:justify-center landscape:top-2 landscape:justify-end landscape:pr-2">
          <ShowcaseModeSwitch modes={modes} mode={mode} onChange={setChosen} />
        </div>
        <div className="flex h-full w-full items-center justify-center">
          {!media && <ShowcaseWaiting floor={floor} />}
          {mode === 'plan' && media?.plan && (
            <PlanStage key="plan" plan={media.plan} alt={t('explorer.showcase.planAlt', { name, defaultValue: 'Floor plan of {{name}}' })} origin={from} />
          )}
          {mode === 'floor' && media?.floor && (
            <FloorStage
              key="floor"
              shot={media.floor}
              alt={t('explorer.showcase.floorAlt', { name, floor: unit.floorLabel ?? '', defaultValue: '{{floor}}: {{name}} highlighted' })}
              caption={floorName || undefined}
              origin={from}
            />
          )}
          {mode === 'photos' && media?.photos && <PhotoStage key="photos" photos={media.photos} name={name} origin={from} />}
        </div>
      </div>
    </motion.div>
  );
};
