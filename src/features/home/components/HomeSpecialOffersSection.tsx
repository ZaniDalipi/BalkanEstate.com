import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { usePromotionPlans, type PromotionPlan } from '@/src/features/pricing/hooks/usePricingData';
import { BoltIcon, CheckIcon } from '@/constants';

/* ── colour presets keyed by cardStyle.gradientFrom ── */
interface ColorPreset {
  cardBg: string;
  border: string;
  iconBg: string;
  badge: string;
  priceText: string;
  check: string;
  countdown: string;
  button: string;
}

const PRESETS: Record<string, ColorPreset> = {
  slate:  { cardBg: 'from-slate-800 to-slate-900', border: 'border-slate-700', iconBg: 'from-amber-400 to-yellow-500', badge: 'from-amber-500 to-yellow-500', priceText: 'text-amber-400', check: 'text-amber-400', countdown: 'text-amber-400/70', button: 'from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600' },
  purple: { cardBg: 'from-purple-50 to-purple-100/50', border: 'border-purple-200', iconBg: 'from-purple-500 to-indigo-500', badge: 'from-purple-500 to-indigo-500', priceText: 'text-purple-600', check: 'text-purple-500', countdown: 'text-purple-500', button: 'from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600' },
  cyan:   { cardBg: 'from-cyan-50 to-cyan-100/50', border: 'border-cyan-300', iconBg: 'from-cyan-400 to-blue-500', badge: 'from-cyan-500 to-blue-500', priceText: 'text-cyan-600', check: 'text-cyan-500', countdown: 'text-cyan-500', button: 'from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600' },
  amber:  { cardBg: 'from-amber-50 to-yellow-100/50', border: 'border-amber-200', iconBg: 'from-amber-400 to-yellow-500', badge: 'from-amber-500 to-orange-500', priceText: 'text-amber-600', check: 'text-amber-500', countdown: 'text-amber-500', button: 'from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600' },
  rose:   { cardBg: 'from-rose-50 to-pink-100/50', border: 'border-rose-200', iconBg: 'from-rose-500 to-pink-500', badge: 'from-rose-500 to-pink-500', priceText: 'text-rose-600', check: 'text-rose-500', countdown: 'text-rose-500', button: 'from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600' },
};

function resolvePreset(style?: PromotionPlan['cardStyle']): ColorPreset {
  const g = style?.gradientFrom || '';
  if (g.includes('slate')) return PRESETS.slate;
  if (g.includes('purple')) return PRESETS.purple;
  if (g.includes('cyan') || g.includes('blue')) return PRESETS.cyan;
  if (g.includes('amber') || g.includes('orange') || g.includes('yellow')) return PRESETS.amber;
  if (g.includes('rose') || g.includes('pink')) return PRESETS.rose;
  return PRESETS.rose;
}

function daysLeft(to?: string): number | null {
  if (!to) return null;
  return Math.max(0, Math.ceil((new Date(to).getTime() - Date.now()) / 86_400_000));
}

function lowestPrice(p: PromotionPlan['pricing']): { price: number; duration: string } {
  const opts: { price: number; duration: string }[] = [];
  if (p.duration7) opts.push({ price: p.duration7, duration: '7' });
  if (p.duration14) opts.push({ price: p.duration14, duration: '14' });
  if (p.duration28) opts.push({ price: p.duration28, duration: '28' });
  if (p.duration30) opts.push({ price: p.duration30, duration: '30' });
  if (p.duration90) opts.push({ price: p.duration90, duration: '90' });
  if (opts.length === 0) return { price: 0, duration: '30' };
  return opts.reduce((m, o) => (o.price < m.price ? o : m), opts[0]);
}

/* ── component ── */

interface Props {
  onNavigate: (view: string, path: string) => void;
}

const HomeSpecialOffersSection: React.FC<Props> = ({ onNavigate }) => {
  const { t } = useTranslation(['pricing', 'home']);
  const { data: allPlans = [] } = usePromotionPlans();
  const offers = allPlans.filter((p) => p.isSpecialOffer);

  if (offers.length === 0) return null;

  const isDark = (o: PromotionPlan) => (o.cardStyle?.gradientFrom || '').includes('slate');

  return (
    <section className="py-12 sm:py-16 bg-gradient-to-b from-white to-slate-50 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-100 text-rose-600 text-sm font-semibold mb-4">
            <BoltIcon className="w-4 h-4" />
            {t('pricing:specialOffers.limitedTime', 'Limited Time')}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {t('pricing:specialOffers.title', 'Special Offers')}
          </h2>
          <p className="mt-2 text-gray-500 max-w-lg mx-auto">
            {t('pricing:specialOffers.homeSubtitle', 'Boost your property listings with exclusive deals')}
          </p>
        </motion.div>

        {/* Cards */}
        <div className={`grid grid-cols-1 ${offers.length === 1 ? 'max-w-md mx-auto' : offers.length === 2 ? 'sm:grid-cols-2 max-w-3xl mx-auto' : 'sm:grid-cols-2 lg:grid-cols-3'} gap-6`}>
          {offers.map((offer, i) => {
            const c = resolvePreset(offer.cardStyle);
            const dark = isDark(offer);
            const left = daysLeft(offer.availableTo);
            const { price, duration } = lowestPrice(offer.pricing);

            return (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                onClick={() => onNavigate('pricing', '/pricing')}
                className={`relative rounded-3xl p-6 flex flex-col cursor-pointer bg-gradient-to-br ${c.cardBg} border ${c.border} hover:shadow-xl hover:scale-[1.02] transition-all duration-300`}
              >
                {/* Badge */}
                {offer.offerLabel && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <span className={`inline-flex items-center gap-1 bg-gradient-to-r ${c.badge} text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg`}>
                      <BoltIcon className="w-3 h-3" />
                      {offer.offerLabel}
                    </span>
                  </div>
                )}

                {/* Icon */}
                <div className={`w-12 h-12 bg-gradient-to-br ${c.iconBg} rounded-xl flex items-center justify-center mb-4 ${offer.offerLabel ? 'mt-2' : ''}`}>
                  <span className="text-2xl">{offer.icon || '🔥'}</span>
                </div>

                {/* Title */}
                <h3 className={`text-xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{offer.name}</h3>
                {offer.description && (
                  <p className={`text-sm mt-1 ${dark ? 'text-slate-400' : 'text-gray-600'}`}>{offer.description}</p>
                )}

                {/* Price */}
                <div className="mt-4 flex items-baseline gap-2">
                  {offer.originalPriceMultiplier && price > 0 && (
                    <span className={`text-sm line-through ${dark ? 'text-slate-500' : 'text-gray-400'}`}>
                      &euro;{Math.round(price * offer.originalPriceMultiplier)}
                    </span>
                  )}
                  <span className={`text-3xl font-extrabold ${c.priceText}`}>&euro;{price}</span>
                </div>
                <p className={`text-xs mt-1 ${dark ? 'text-slate-500' : 'text-gray-500'}`}>
                  {duration} {t('pricing:listing.days', 'days')}
                </p>

                {/* Features (max 3 on homepage) */}
                {offer.features.length > 0 && (
                  <ul className="mt-4 space-y-2 flex-grow">
                    {offer.features.slice(0, 3).map((f, j) => (
                      <li key={j} className={`flex items-center gap-2 text-sm ${dark ? 'text-slate-300' : 'text-gray-700'}`}>
                        <span className={c.check}>&#10003;</span> {f}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Countdown */}
                {left !== null && left > 0 && (
                  <div className={`mt-4 flex items-center gap-1.5 text-xs font-semibold ${c.countdown}`}>
                    <BoltIcon className="w-3.5 h-3.5" />
                    {left === 1
                      ? t('pricing:specialOffers.lastDay', 'Last day!')
                      : t('pricing:specialOffers.daysLeft', '{{days}} days left', { days: left })}
                  </div>
                )}

                {/* CTA Button */}
                <button className={`mt-5 w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r ${c.button} transition-all shadow-md hover:shadow-lg`}>
                  {t('pricing:specialOffers.getThisDeal', 'Get This Deal')}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* View all link */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center mt-8"
        >
          <button
            onClick={() => onNavigate('pricing', '/pricing')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-rose-600 hover:text-rose-700 transition-colors"
          >
            {t('pricing:specialOffers.viewAllDeals', 'View All Promotion Plans')}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default HomeSpecialOffersSection;
