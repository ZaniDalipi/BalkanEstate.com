import React, { useRef, useEffect } from 'react';
import { Animated } from '@/src/components/ui/Animations';
import { BoltIcon, CheckIcon, SparklesIcon } from '@/constants';
import { type PromotionPlan } from '../hooks/usePricingData';
import { type UserListing, buildLocalizedPath } from './usePricingPage';

interface SpecialOffersSectionProps {
  t: (key: string, defaultValue?: string, options?: Record<string, unknown>) => string;
  dispatch: (action: Record<string, unknown>) => void;
  isAuthenticated: boolean;
  specialOffers: PromotionPlan[];
  selectedOfferId: string | null;
  setSelectedOfferId: (id: string | null) => void;
  selectedListing: UserListing | null;
  setSelectedListing: (listing: UserListing | null) => void;
  selectedDuration: 7 | 30 | 90;
  setSelectedDuration: (duration: 7 | 30 | 90) => void;
  loadingListings: boolean;
  userListings: UserListing[];
  onSelectOffer: (offerId: string) => void;
  onSelectListingForPromotion: (listing: UserListing) => void;
  onPurchasePromotion: () => void;
}

// Color presets mapped from cardStyle.gradientFrom — matches admin presets
interface OfferColorPreset {
  cardBg: string;
  cardBgSelected: string;
  border: string;
  borderSelected: string;
  iconBg: string;
  priceText: string;
  labelBg: string;
  featureCheck: string;
  countdownText: string;
  button: string;
  badge: string;
}

const OFFER_COLOR_PRESETS: Record<string, OfferColorPreset> = {
  slate: {
    cardBg: 'bg-gradient-to-br from-slate-800 to-slate-900',
    cardBgSelected: 'bg-slate-900',
    border: 'border-slate-700',
    borderSelected: 'border-amber-400',
    iconBg: 'bg-gradient-to-br from-amber-400 to-yellow-500',
    priceText: 'text-amber-400',
    labelBg: 'bg-amber-500/20 text-amber-300',
    featureCheck: 'text-amber-400',
    countdownText: 'text-amber-400/70',
    button: 'from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600',
    badge: 'from-amber-500 to-yellow-500',
  },
  purple: {
    cardBg: 'bg-gradient-to-br from-purple-50 to-purple-100/50',
    cardBgSelected: 'bg-purple-100',
    border: 'border-purple-200',
    borderSelected: 'border-purple-400',
    iconBg: 'bg-purple-500',
    priceText: 'text-purple-600',
    labelBg: 'bg-purple-100 text-purple-700',
    featureCheck: 'text-purple-500',
    countdownText: 'text-purple-500',
    button: 'from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600',
    badge: 'from-purple-500 to-indigo-500',
  },
  cyan: {
    cardBg: 'bg-gradient-to-br from-cyan-50 to-cyan-100/50',
    cardBgSelected: 'bg-cyan-100',
    border: 'border-cyan-300',
    borderSelected: 'border-cyan-400',
    iconBg: 'bg-gradient-to-br from-cyan-400 to-blue-500',
    priceText: 'text-cyan-600',
    labelBg: 'bg-cyan-100 text-cyan-700',
    featureCheck: 'text-cyan-500',
    countdownText: 'text-cyan-500',
    button: 'from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600',
    badge: 'from-cyan-500 to-blue-500',
  },
  amber: {
    cardBg: 'bg-gradient-to-br from-amber-50 to-yellow-100/50',
    cardBgSelected: 'bg-amber-100',
    border: 'border-amber-200',
    borderSelected: 'border-amber-400',
    iconBg: 'bg-gradient-to-br from-amber-400 to-yellow-500',
    priceText: 'text-amber-600',
    labelBg: 'bg-amber-100 text-amber-700',
    featureCheck: 'text-amber-500',
    countdownText: 'text-amber-500',
    button: 'from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600',
    badge: 'from-amber-500 to-orange-500',
  },
  gray: {
    cardBg: 'bg-gradient-to-br from-gray-100 to-gray-200',
    cardBgSelected: 'bg-gray-200',
    border: 'border-gray-300',
    borderSelected: 'border-gray-500',
    iconBg: 'bg-gradient-to-br from-gray-400 to-gray-500',
    priceText: 'text-gray-900',
    labelBg: 'bg-gray-200 text-gray-700',
    featureCheck: 'text-gray-600',
    countdownText: 'text-gray-500',
    button: 'from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800',
    badge: 'from-gray-600 to-gray-700',
  },
  rose: {
    cardBg: 'bg-gradient-to-br from-rose-50 to-pink-100/50',
    cardBgSelected: 'bg-rose-100',
    border: 'border-rose-200',
    borderSelected: 'border-rose-400',
    iconBg: 'bg-gradient-to-br from-rose-500 to-pink-500',
    priceText: 'text-rose-600',
    labelBg: 'bg-rose-100 text-rose-700',
    featureCheck: 'text-rose-500',
    countdownText: 'text-rose-500',
    button: 'from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600',
    badge: 'from-rose-500 to-pink-500',
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
  return OFFER_COLOR_PRESETS.rose; // default
}

function getDaysLeft(availableTo?: string): number | null {
  if (!availableTo) return null;
  return Math.max(0, Math.ceil((new Date(availableTo).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

function getPrice(pricing: PromotionPlan['pricing'], duration: number): number {
  const key = `duration${duration}` as keyof PromotionPlan['pricing'];
  return pricing[key] ?? pricing.duration30 ?? pricing.duration7 ?? 0;
}

const SpecialOffersSection: React.FC<SpecialOffersSectionProps> = ({
  t,
  dispatch,
  isAuthenticated,
  specialOffers,
  selectedOfferId,
  setSelectedOfferId,
  selectedListing,
  setSelectedListing,
  selectedDuration,
  setSelectedDuration,
  loadingListings,
  userListings,
  onSelectOffer,
  onSelectListingForPromotion,
  onPurchasePromotion,
}) => {
  const sectionRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to this section when arriving with a pre-selected offer (e.g. from home page)
  useEffect(() => {
    if (selectedOfferId && specialOffers.length > 0 && sectionRef.current) {
      const timer = setTimeout(() => {
        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedOfferId, specialOffers.length]);

  if (specialOffers.length === 0) return null;

  const selectedOffer = specialOffers.find((o) => o.id === selectedOfferId);

  return (
    <div ref={sectionRef}>
    <Animated variant="fadeInUp" className="max-w-5xl mx-auto mt-12">
      {/* Section Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-rose-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BoltIcon className="w-8 h-8 text-rose-500" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900">
          {t('pricing:specialOffers.title', 'Special Offers')}
        </h3>
        <p className="mt-2 text-gray-600">
          {t('pricing:specialOffers.subtitle', 'Limited-time deals on listing promotions')}
        </p>
      </div>

      {/* Duration Selector */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 p-1 rounded-full inline-flex">
          {[
            { value: 7, label: t('pricing:duration.7days', '7 days') },
            { value: 30, label: t('pricing:duration.30days', '30 days') },
            { value: 90, label: t('pricing:duration.90days', '90 days') },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedDuration(option.value as 7 | 30 | 90)}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
                selectedDuration === option.value
                  ? 'bg-white text-gray-900 shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Listing selection panel - shown when an offer is selected */}
      {selectedOfferId && selectedOffer && (
        <div className="mb-8 bg-white rounded-2xl border border-gray-200 p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold text-gray-900">
              {t('pricing:specialOffers.selectListing', 'Select a listing to promote with {{name}}', { name: selectedOffer.name })}
            </h4>
            <button
              onClick={() => { setSelectedOfferId(null); setSelectedListing(null); }}
              className="text-gray-500 hover:text-gray-700 text-xl leading-none"
            >
              &times;
            </button>
          </div>

          {!isAuthenticated ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">{t('pricing:listing.loginRequired', 'Please log in to see your listings')}</p>
              <button
                onClick={() => dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } })}
                className="px-6 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors"
              >
                {t('common:login', 'Log In')}
              </button>
            </div>
          ) : loadingListings ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary"></div>
            </div>
          ) : userListings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">{t('pricing:listing.noListings', 'You don\'t have any listings yet')}</p>
              <button
                onClick={() => {
                  dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'create-listing' });
                  window.history.pushState({}, '', buildLocalizedPath('/create-listing'));
                }}
                className="px-6 py-2.5 bg-secondary text-white rounded-xl font-medium hover:bg-opacity-90 transition-colors"
              >
                {t('pricing:listing.createListing', '+ Create Listing')}
              </button>
            </div>
          ) : (
            <>
              {/* Listings grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-64 overflow-y-auto">
                {userListings.map((listing) => (
                  <button
                    key={listing.id}
                    onClick={() => onSelectListingForPromotion(listing)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      selectedListing?.id === listing.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={listing.imageUrl}
                      alt={listing.address}
                      loading="lazy"
                      decoding="async"
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{listing.address}</p>
                      <p className="text-sm text-primary font-bold">&euro;{listing.price.toLocaleString()}</p>
                    </div>
                    {selectedListing?.id === listing.id && (
                      <CheckIcon className="w-5 h-5 text-primary flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {/* Purchase button */}
              {selectedListing && (
                <div className="mt-6 flex items-center justify-between p-4 bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl border border-rose-200">
                  <div>
                    <p className="text-sm text-gray-600">{t('pricing:listing.promotingLabel', 'Promoting:')} <span className="font-medium text-gray-900">{selectedListing.address}</span></p>
                    <p className="text-lg font-bold text-gray-900">
                      &euro;{getPrice(selectedOffer.pricing, selectedDuration)} {t('pricing:listing.forDaysCount', 'for {{count}} days', { count: selectedDuration })}
                    </p>
                  </div>
                  <button
                    onClick={onPurchasePromotion}
                    className="px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-bold hover:from-rose-600 hover:to-pink-600 transition-all shadow-lg"
                  >
                    {t('pricing:listing.purchase', 'Purchase')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Offer Cards Grid - same style as promotion tier cards */}
      <div className={`grid grid-cols-1 ${specialOffers.length === 1 ? 'max-w-md mx-auto' : specialOffers.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : 'md:grid-cols-3'} gap-6`}>
        {specialOffers.map((offer, index) => {
          const colors = getOfferColorPreset(offer.cardStyle);
          const isDarkTheme = (offer.cardStyle?.gradientFrom || '').includes('slate');
          const timeLeft = getDaysLeft(offer.availableTo);
          const isSelected = selectedOfferId === offer.id;
          const price = getPrice(offer.pricing, selectedDuration);

          return (
            <Animated key={offer.id} variant="fadeInUp" delay={index * 100}>
              <div
                onClick={() => onSelectOffer(offer.id)}
                className={`relative rounded-3xl p-6 flex flex-col cursor-pointer transition-all duration-300 ${
                  isSelected
                    ? `${colors.cardBgSelected} border-2 ${colors.borderSelected} shadow-xl scale-[1.02]`
                    : `${colors.cardBg} border ${colors.border} hover:shadow-lg hover:scale-[1.01]`
                }`}
              >
                {/* Badge */}
                {offer.offerLabel && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className={`inline-flex items-center gap-1 bg-gradient-to-r ${colors.badge} text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg`}>
                      <SparklesIcon className="w-3 h-3" />
                      {offer.offerLabel}
                    </span>
                  </div>
                )}

                {/* Icon */}
                <div className={`w-12 h-12 ${colors.iconBg} rounded-xl flex items-center justify-center mb-4 ${offer.offerLabel ? 'mt-2' : ''}`}>
                  <span className="text-2xl">{offer.icon || '🔥'}</span>
                </div>

                {/* Title & Description */}
                <h4 className={`text-xl font-bold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>{offer.name}</h4>
                {offer.description && (
                  <p className={`text-sm mt-1 ${isDarkTheme ? 'text-slate-400' : 'text-gray-600'}`}>{offer.description}</p>
                )}

                {/* Price */}
                <div className="mt-4">
                  {offer.originalPriceMultiplier && price > 0 ? (
                    <div className="flex items-baseline gap-2">
                      <span className={`text-sm line-through ${isDarkTheme ? 'text-slate-500' : 'text-gray-400'}`}>
                        &euro;{Math.round(price * offer.originalPriceMultiplier)}
                      </span>
                      <span className={`text-3xl font-extrabold ${colors.priceText}`}>&euro;{price}</span>
                    </div>
                  ) : (
                    <span className={`text-3xl font-extrabold ${colors.priceText}`}>&euro;{price}</span>
                  )}
                </div>
                <p className={`text-xs mt-1 ${isDarkTheme ? 'text-slate-500' : 'text-gray-500'}`}>
                  {selectedDuration} {t('pricing:listing.days', 'days')}
                </p>

                {/* Features */}
                <ul className="mt-4 space-y-2 flex-grow">
                  {offer.features.map((feature, i) => (
                    <li key={i} className={`flex items-center gap-2 text-sm ${isDarkTheme ? 'text-slate-300' : 'text-gray-700'}`}>
                      <span className={colors.featureCheck}>&#10003;</span> {feature}
                    </li>
                  ))}
                </ul>

                {/* Countdown */}
                {timeLeft !== null && timeLeft > 0 && (
                  <div className={`mt-4 flex items-center gap-1.5 text-xs font-semibold ${colors.countdownText}`}>
                    <BoltIcon className="w-3.5 h-3.5" />
                    {timeLeft === 1
                      ? t('pricing:specialOffers.lastDay', 'Last day!')
                      : t('pricing:specialOffers.daysLeft', '{{days}} days left', { days: timeLeft })}
                  </div>
                )}

                {/* Select Button */}
                <button
                  className={`mt-5 w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r ${colors.button} transition-all shadow-md hover:shadow-lg`}
                >
                  {isSelected
                    ? t('pricing:specialOffers.selected', 'Selected — Choose Listing')
                    : t('pricing:specialOffers.selectOffer', 'Select Offer')}
                </button>
              </div>
            </Animated>
          );
        })}
      </div>
    </Animated>
    </div>
  );
};

export default SpecialOffersSection;
