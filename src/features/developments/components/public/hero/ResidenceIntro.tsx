import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MousePointerClick } from 'lucide-react';
import type { Development, UnitsSummary } from '../../../types';
import { formatPrice } from '../../../utils/format';
import { splitAtToken } from '../../../utils/splitAtToken';
import { FRAME_DRIVEN } from '../motion/frameDriven';
import { BuilderByline } from '../builder/BuilderByline';

interface ResidenceIntroProps {
  development: Development;
  summary?: UnitsSummary;
  /** Opens the company behind the residence (its own page); without it no byline shows. */
  onViewBuilder?: () => void;
}

const NAME = '\u0000name\u0000';
const rise = (delay: number) => ({ ...FRAME_DRIVEN, initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] } });

/**
 * The hero's headline over the rendering: where it is, "Find your home in
 * <name>", how many homes are free and from what price, who is behind it
 * ("Built by …", to the company's page), and a hint that the building itself
 * is the way in.
 */
export const ResidenceIntro: React.FC<ResidenceIntroProps> = ({ development, summary, onViewBuilder }) => {
  const { t } = useTranslation('developments');
  const reduced = useReducedMotion();
  const enter = (delay: number) => (reduced ? {} : rise(delay));
  const headline = t('immersive.headline', { name: NAME, defaultValue: 'Find your home in {{name}}' });
  const parts = splitAtToken(headline, NAME);
  const place = [development.city, development.country].filter(Boolean).join(' · ');
  const from = summary?.priceMin ? formatPrice(summary.priceMin, summary.currency) : null;

  return (
    <div className="text-white [text-shadow:0_1px_24px_rgba(0,0,0,0.35)]">
      {place && (
        <motion.p {...enter(0.1)} className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
          {place}
        </motion.p>
      )}
      <motion.h1 {...enter(0.2)} className="mt-4 text-5xl font-light leading-[1.04] tracking-tight xl:text-6xl">
        {parts ? (
          <>
            {parts.before}
            <span className="font-semibold">{development.name}</span>
            {parts.after}
          </>
        ) : (
          development.name
        )}
      </motion.h1>
      {summary && summary.total > 0 && (
        <motion.p {...enter(0.35)} className="mt-5 text-base text-white/90">
          {t('explorer.availableOfTotal', { available: summary.available, total: summary.total, defaultValue: '{{available}} of {{total}} available' })}
          {from && <span className="text-white/70"> · {t('immersive.priceFrom', { price: from, defaultValue: 'From {{price}}' })}</span>}
        </motion.p>
      )}
      {onViewBuilder && (
        // The headline does not take clicks (the building behind it does); the byline does.
        <motion.div {...enter(0.42)} className="pointer-events-auto mt-4 [text-shadow:none]">
          <BuilderByline builder={development.builder} onOpen={onViewBuilder} />
        </motion.div>
      )}
      <motion.p {...enter(0.5)} className="mt-7 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-2 text-sm text-white/85 ring-1 ring-white/20 backdrop-blur-sm">
        <MousePointerClick className="h-4 w-4" aria-hidden="true" />
        {t('immersive.hint', 'Hover the building and choose an apartment')}
      </motion.p>
    </div>
  );
};
