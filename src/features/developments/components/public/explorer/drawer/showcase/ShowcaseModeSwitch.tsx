import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';
import type { ShowcaseMode } from './showcaseMedia';

interface ShowcaseModeSwitchProps {
  modes: ShowcaseMode[];
  mode: ShowcaseMode;
  onChange: (mode: ShowcaseMode) => void;
}

/** Plan / On its floor / Photos — only the ones the developer posted; hidden when there is one. */
export const ShowcaseModeSwitch: React.FC<ShowcaseModeSwitchProps> = ({ modes, mode, onChange }) => {
  const { t } = useTranslation('developments');
  const reduced = useReducedMotion();
  if (modes.length < 2) return null;
  const label: Record<ShowcaseMode, string> = {
    plan: t('explorer.drawer.floorplan', 'Floor plan'),
    floor: t('explorer.showcase.modeFloor', 'On its floor'),
    photos: t('explorer.showcase.modePhotos', 'Photos'),
  };
  return (
    <div
      role="group"
      aria-label={t('explorer.showcase.modes', 'What to show')}
      className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-white/95 p-1 shadow-md ring-1 ring-black/5"
    >
      {modes.map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={mode === m}
          onClick={() => onChange(m)}
          className={cn(
            'relative min-h-[44px] shrink-0 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary landscape:min-h-[32px] landscape:px-3',
            mode === m ? 'text-white' : 'text-slate-700 hover:bg-slate-100'
          )}
        >
          {mode === m && (
            <motion.span layoutId="showcase-mode" className="absolute inset-0 rounded-full bg-slate-900" transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 32 }} aria-hidden="true" />
          )}
          <span className="relative">{label[m]}</span>
        </button>
      ))}
    </div>
  );
};
