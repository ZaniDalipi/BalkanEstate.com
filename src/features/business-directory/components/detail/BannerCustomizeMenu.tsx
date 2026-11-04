import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Pencil } from 'lucide-react';
import { SoftIcon } from '@/src/shared/illustrations';
import { useEscapeLayer } from '@/src/features/developments/components/public/explorer/useEscapeLayer';

interface BannerCustomizeMenuProps {
  hasBanner: boolean;
  hasLogo: boolean;
  busy: boolean;
  onEdit: () => void;
  onChangeBanner: () => void;
  onReposition: () => void;
  onChangeLogo: () => void;
}

const ITEM = 'flex min-h-[44px] w-full items-center gap-3 px-4 text-left text-[15px] text-neutral-800 transition hover:bg-black/[0.04] disabled:opacity-50';

/** Owner-only menu on the banner: edit the listing, change or reposition the banner, change the logo. */
export const BannerCustomizeMenu: React.FC<BannerCustomizeMenuProps> = ({ hasBanner, hasLogo, busy, onEdit, onChangeBanner, onReposition, onChangeLogo }) => {
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
        className="liquid-dark inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-semibold transition active:scale-[0.97]"
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
        {t('banner.customize', 'Customize')}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            className="liquid-surface absolute left-0 top-full z-50 mt-2 min-w-[230px] overflow-hidden rounded-[22px] py-1.5"
            initial={reduce ? false : { opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            <button type="button" role="menuitem" className={ITEM} onClick={run(onEdit)}>
              <SoftIcon name="pencil" className="h-6 w-6" />
              {t('edit.button', 'Edit Listing')}
            </button>
            <button type="button" role="menuitem" className={ITEM} onClick={run(onChangeBanner)} disabled={busy}>
              <SoftIcon name="photo" className="h-6 w-6" />
              {hasBanner ? t('form.bannerChange', 'Change Banner') : t('form.bannerUpload', 'Upload Banner')}
            </button>
            {hasBanner && (
              <button type="button" role="menuitem" className={ITEM} onClick={run(onReposition)}>
                <SoftIcon name="sliders" className="h-6 w-6" />
                {t('banner.reposition', 'Reposition Banner')}
              </button>
            )}
            <button type="button" role="menuitem" className={ITEM} onClick={run(onChangeLogo)} disabled={busy}>
              <SoftIcon name="camera" className="h-6 w-6" />
              {hasLogo ? t('form.logoChange', 'Change Logo') : t('form.logoUpload', 'Upload Logo')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
