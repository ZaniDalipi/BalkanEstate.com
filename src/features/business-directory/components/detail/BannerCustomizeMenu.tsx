import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Camera, ImageIcon, MoveVertical, Pencil } from 'lucide-react';
import { useEscapeLayer } from '@/src/features/developments/components/public/explorer/useEscapeLayer';

interface BannerCustomizeMenuProps {
  hasBanner: boolean;
  hasLogo: boolean;
  busy: boolean;
  onChangeBanner: () => void;
  onReposition: () => void;
  onChangeLogo: () => void;
}

const ITEM = 'flex min-h-[44px] w-full items-center gap-3 px-4 text-left text-[15px] text-neutral-800 transition hover:bg-black/[0.04] disabled:opacity-50';

/** Owner-only menu on the banner: change banner, reposition it, change logo. */
export const BannerCustomizeMenu: React.FC<BannerCustomizeMenuProps> = ({ hasBanner, hasLogo, busy, onChangeBanner, onReposition, onChangeLogo }) => {
  const { t } = useTranslation('businessDirectory');
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEscapeLayer(ref, () => setOpen(false), open);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const run = (action: () => void) => () => {
    setOpen(false);
    action();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-black/35 px-4 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur-md transition hover:bg-black/50"
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
        {t('banner.customize', 'Customize')}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 min-w-[220px] overflow-hidden rounded-2xl bg-white/90 py-1 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl"
            initial={reduce ? false : { opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            <button type="button" role="menuitem" className={ITEM} onClick={run(onChangeBanner)} disabled={busy}>
              <ImageIcon className="h-[18px] w-[18px] text-neutral-500" aria-hidden="true" />
              {hasBanner ? t('form.bannerChange', 'Change Banner') : t('form.bannerUpload', 'Upload Banner')}
            </button>
            {hasBanner && (
              <button type="button" role="menuitem" className={ITEM} onClick={run(onReposition)}>
                <MoveVertical className="h-[18px] w-[18px] text-neutral-500" aria-hidden="true" />
                {t('banner.reposition', 'Reposition Banner')}
              </button>
            )}
            <button type="button" role="menuitem" className={ITEM} onClick={run(onChangeLogo)} disabled={busy}>
              <Camera className="h-[18px] w-[18px] text-neutral-500" aria-hidden="true" />
              {hasLogo ? t('form.logoChange', 'Change Logo') : t('form.logoUpload', 'Upload Logo')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
