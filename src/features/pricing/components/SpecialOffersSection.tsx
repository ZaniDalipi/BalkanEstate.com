import React from 'react';
import { Animated } from '@/src/components/ui/Animations';
import { BoltIcon, CheckIcon } from '@/constants';
import { type PromotionPlan } from '../hooks/usePricingData';

interface SpecialOffersSectionProps {
  t: (key: string, defaultValue?: string, options?: Record<string, unknown>) => string;
  specialOffers: PromotionPlan[];
}

// Color presets mapped from cardStyle.gradientFrom — matches admin presets
interface OfferColorPreset {
  cardBg: string;
  border: string;
  headerGradient: string;
  priceText: string;
  labelBg: string;
  featureCheck: string;
  countdownText: string;
}

const OFFER_COLOR_PRESETS: Record<string, OfferColorPreset> = {
  slate: {
    cardBg: 'bg-gradient-to-br from-slate-800 to-slate-900',
    border: 'border-slate-700',
    headerGradient: 'from-slate-700 to-slate-800',
    priceText: 'text-amber-400',
    labelBg: 'bg-amber-500/20 text-amber-300',
    featureCheck: 'text-amber-400',
    countdownText: 'text-slate-400',
  },
  purple: {
    cardBg: 'bg-gradient-to-br from-purple-50 to-purple-100/50',
    border: 'border-purple-200',
    headerGradient: 'from-purple-500 to-indigo-500',
    priceText: 'text-purple-600',
    labelBg: 'bg-purple-100 text-purple-700',
    featureCheck: 'text-purple-500',
    countdownText: 'text-purple-500',
  },
  cyan: {
    cardBg: 'bg-gradient-to-br from-cyan-50 to-cyan-100/50',
    border: 'border-cyan-300',
    headerGradient: 'from-cyan-500 to-blue-500',
    priceText: 'text-cyan-600',
    labelBg: 'bg-cyan-100 text-cyan-700',
    featureCheck: 'text-cyan-500',
    countdownText: 'text-cyan-500',
  },
  amber: {
    cardBg: 'bg-gradient-to-br from-amber-50 to-yellow-100/50',
    border: 'border-amber-200',
    headerGradient: 'from-amber-500 to-orange-500',
    priceText: 'text-amber-600',
    labelBg: 'bg-amber-100 text-amber-700',
    featureCheck: 'text-amber-500',
    countdownText: 'text-amber-500',
  },
  gray: {
    cardBg: 'bg-gradient-to-br from-gray-100 to-gray-200',
    border: 'border-gray-300',
    headerGradient: 'from-gray-500 to-gray-600',
    priceText: 'text-gray-900',
    labelBg: 'bg-gray-200 text-gray-700',
    featureCheck: 'text-gray-600',
    countdownText: 'text-gray-500',
  },
  rose: {
    cardBg: 'bg-gradient-to-br from-rose-50 to-pink-100/50',
    border: 'border-rose-200',
    headerGradient: 'from-rose-500 to-pink-500',
    priceText: 'text-rose-600',
    labelBg: 'bg-rose-100 text-rose-700',
    featureCheck: 'text-rose-500',
    countdownText: 'text-rose-500',
  },
};

function getOfferColorPreset(cardStyle?: PromotionPlan['cardStyle']): OfferColorPreset {
  const from = cardStyle?.gradientFrom || '';
  if (from.includes('slate')) return OFFER_COLOR_PRESETS.slate;
  if (from.includes('purple')) return OFFER_COLOR_PRESETS.purple;
  if (from.includes('cyan') || from.includes('blue')) return OFFER_COLOR_PRESETS.cyan;
  if (from.includes('gray')) return OFFER_COLOR_PRESETS.gray;
  if (from.includes('rose') || from.includes('pink')) return OFFER_COLOR_PRESETS.rose;
  if (from.includes('amber') || from.includes('orange') || from.includes('yellow')) return OFFER_COLOR_PRESETS.amber;
  return OFFER_COLOR_PRESETS.slate; // default for special offers
}

function getDaysLeft(availableTo?: string): number | null {
  if (!availableTo) return null;
  return Math.max(0, Math.ceil((new Date(availableTo).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

function getLowestPrice(pricing: PromotionPlan['pricing']): { price: number; duration: string } {
  const options: { price: number; duration: string }[] = [];
  if (pricing.duration7) options.push({ price: pricing.duration7, duration: '7' });
  if (pricing.duration14) options.push({ price: pricing.duration14, duration: '14' });
  if (pricing.duration28) options.push({ price: pricing.duration28, duration: '28' });
  if (pricing.duration30) options.push({ price: pricing.duration30, duration: '30' });
  if (pricing.duration90) options.push({ price: pricing.duration90, duration: '90' });
  if (options.length === 0) return { price: 0, duration: '30' };
  return options.reduce((min, opt) => opt.price < min.price ? opt : min, options[0]);
}

const SpecialOffersSection: React.FC<SpecialOffersSectionProps> = ({ t, specialOffers }) => {
  if (specialOffers.length === 0) return null;

  return (
    <Animated variant="fadeInUp" className="mt-12 mb-8">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
          <BoltIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            {t('pricing:specialOffers.title', 'Special Offers')}
          </h3>
          <p className="text-sm text-gray-500">
            {t('pricing:specialOffers.subtitle', 'Limited-time deals on listing promotions')}
          </p>
        </div>
      </div>

      {/* Offers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {specialOffers.map((offer, index) => {
          const colors = getOfferColorPreset(offer.cardStyle);
          const timeLeft = getDaysLeft(offer.availableTo);
          const isDarkTheme = (offer.cardStyle?.gradientFrom || '').includes('slate');
          const { price, duration } = getLowestPrice(offer.pricing);

          return (
            <Animated key={offer.id} variant="fadeInUp" delay={index * 100}>
              <div
                className={`rounded-2xl overflow-hidden border-2 shadow-lg hover:shadow-xl transition-all ${colors.cardBg} ${colors.border}`}
              >
                {/* Card Header with gradient */}
                <div className={`bg-gradient-to-r ${colors.headerGradient} p-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{offer.icon}</span>
                      <h4 className="font-bold text-white text-lg">{offer.name}</h4>
                    </div>
                    {offer.offerLabel && (
                      <span className="px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full">
                        {offer.offerLabel}
                      </span>
                    )}
                  </div>
                  {offer.description && (
                    <p className="text-white/80 text-sm mt-1">{offer.description}</p>
                  )}
                </div>

                {/* Pricing */}
                <div className="p-5">
                  <div className="flex items-baseline gap-2 mb-4">
                    {offer.originalPriceMultiplier && price > 0 ? (
                      <>
                        <span className={`text-sm line-through ${isDarkTheme ? 'text-slate-500' : 'text-gray-400'}`}>
                          &euro;{Math.round(price * offer.originalPriceMultiplier)}
                        </span>
                        <span className={`text-3xl font-extrabold ${colors.priceText}`}>
                          &euro;{price}
                        </span>
                        <span className={`text-sm ${isDarkTheme ? 'text-slate-400' : 'text-gray-500'}`}>
                          /{duration} {t('pricing:specialOffers.days', 'days')}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className={`text-3xl font-extrabold ${colors.priceText}`}>
                          &euro;{price}
                        </span>
                        <span className={`text-sm ${isDarkTheme ? 'text-slate-400' : 'text-gray-500'}`}>
                          /{duration} {t('pricing:specialOffers.days', 'days')}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Features */}
                  {offer.features.length > 0 && (
                    <ul className="space-y-2 mb-4">
                      {offer.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckIcon className={`w-4 h-4 flex-shrink-0 ${colors.featureCheck}`} />
                          <span className={`text-sm ${isDarkTheme ? 'text-slate-300' : 'text-gray-600'}`}>
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Countdown */}
                  {timeLeft !== null && timeLeft > 0 && (
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${colors.countdownText}`}>
                      <BoltIcon className="w-3.5 h-3.5" />
                      {timeLeft === 1
                        ? t('pricing:specialOffers.lastDay', 'Last day!')
                        : t('pricing:specialOffers.daysLeft', '{{days}} days left', { days: timeLeft })}
                    </div>
                  )}
                </div>
              </div>
            </Animated>
          );
        })}
      </div>
    </Animated>
  );
};

export default SpecialOffersSection;
