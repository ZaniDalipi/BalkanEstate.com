import React from 'react';
import { Animated } from '@/src/components/ui/Animations';
import NoPhotoPlaceholder from '@/src/components/ui/NoPhotoPlaceholder';
import { CheckIcon, SparklesIcon } from '@/constants';
import { type UserListing, buildLocalizedPath } from './usePricingPage';

interface ListingPromotionSectionProps {
  t: any;
  dispatch: (action: any) => void;
  isAuthenticated: boolean;
  selectedPromoTier: 'featured' | 'highlight' | 'premium' | null;
  setSelectedPromoTier: (tier: 'featured' | 'highlight' | 'premium' | null) => void;
  selectedListing: UserListing | null;
  setSelectedListing: (listing: UserListing | null) => void;
  selectedDuration: 7 | 30 | 90;
  setSelectedDuration: (duration: 7 | 30 | 90) => void;
  loadingListings: boolean;
  userListings: UserListing[];
  getPromotionPrice: (tier: string, duration: number) => number;
  onPromoteListing: (tier: 'featured' | 'highlight' | 'premium') => void;
  onSelectListingForPromotion: (listing: UserListing) => void;
  onPurchasePromotion: () => void;
}

const ListingPromotionSection: React.FC<ListingPromotionSectionProps> = ({
  t,
  dispatch,
  isAuthenticated,
  selectedPromoTier,
  setSelectedPromoTier,
  selectedListing,
  setSelectedListing,
  selectedDuration,
  setSelectedDuration,
  loadingListings,
  userListings,
  getPromotionPrice,
  onPromoteListing,
  onSelectListingForPromotion,
  onPurchasePromotion,
}) => {
  return (
    <Animated variant="fadeInUp" className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🚀</span>
        </div>
        <h3 className="text-2xl font-bold text-gray-900">{t('pricing:listing.title', 'Listing Promotion Plans')}</h3>
        <p className="mt-2 text-gray-600">{t('pricing:listing.subtitle', 'Boost your property listings to get more visibility and inquiries')}</p>
      </div>

      {/* Duration Selector - like Agency section */}
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

      {/* Listing selection modal/section */}
      {selectedPromoTier && (
        <div className="mb-8 bg-white rounded-2xl border border-gray-200 p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold text-gray-900">
              {t('pricing:listing.selectToPromoteWith', 'Select a listing to promote with {{tier}}', { tier: selectedPromoTier.charAt(0).toUpperCase() + selectedPromoTier.slice(1) })}
            </h4>
            <button
              onClick={() => { setSelectedPromoTier(null); setSelectedListing(null); }}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
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
              {/* Duration selector */}
              <div className="mb-4 flex items-center gap-2 justify-center">
                <span className="text-sm text-gray-600">{t('pricing:listing.durationLabel', 'Duration:')}</span>
                {[7, 30, 90].map((days) => (
                  <button
                    key={days}
                    onClick={() => setSelectedDuration(days as 7 | 30 | 90)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                      selectedDuration === days
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {t('pricing:listing.daysCount', '{{count}} days', { count: days })}
                  </button>
                ))}
              </div>

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
                    {listing.imageUrl ? (
                      <img
                        src={listing.imageUrl}
                        alt={listing.address}
                        loading="lazy"
                        decoding="async"
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                        <NoPhotoPlaceholder size="sm" fill={false} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{listing.address}</p>
                      <p className="text-sm text-primary font-bold">€{listing.price.toLocaleString()}</p>
                    </div>
                    {selectedListing?.id === listing.id && (
                      <CheckIcon className="w-5 h-5 text-primary flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {/* Purchase button */}
              {selectedListing && (
                <div className="mt-6 flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                  <div>
                    <p className="text-sm text-gray-600">{t('pricing:listing.promotingLabel', 'Promoting:')} <span className="font-medium text-gray-900">{selectedListing.address}</span></p>
                    <p className="text-lg font-bold text-gray-900">
                      €{getPromotionPrice(selectedPromoTier, selectedDuration)} {t('pricing:listing.forDaysCount', 'for {{count}} days', { count: selectedDuration })}
                    </p>
                  </div>
                  <button
                    onClick={onPurchasePromotion}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg"
                  >
                    {t('pricing:listing.purchase', 'Purchase')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Promotion Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Featured */}
        <div
          className={`relative rounded-3xl p-6 flex flex-col cursor-pointer transition-all duration-300 ${
            selectedPromoTier === 'featured'
              ? 'bg-purple-100 border-2 border-purple-400 shadow-xl scale-[1.02]'
              : 'bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200 hover:shadow-lg hover:scale-[1.01]'
          }`}
          onClick={() => onPromoteListing('featured')}
        >
          <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mb-4">
            <span className="text-2xl">⭐</span>
          </div>
          <h4 className="text-xl font-bold text-gray-900">{t('pricing:listing.tiers.featured.title', 'Featured')}</h4>
          <p className="text-sm text-gray-600 mt-1">{t('pricing:listing.tiers.featured.description', 'Priority in search')}</p>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-purple-600">€{getPromotionPrice('featured', selectedDuration)}</span>
            <span className="text-sm text-gray-500">+</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">{selectedDuration} {t('pricing:listing.days', 'days')}</p>
          <ul className="mt-4 space-y-2 flex-grow">
            <li className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-purple-500">✓</span> {t('pricing:listing.tiers.featured.topOfSearch', 'Top of search')}
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-purple-500">✓</span> {t('pricing:listing.tiers.featured.featuredBadge', 'Featured badge')}
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-purple-500">✓</span> {t('pricing:listing.tiers.featured.visibility', '2x visibility')}
            </li>
          </ul>
        </div>

        {/* Highlight - Popular */}
        <div
          className={`relative rounded-3xl p-6 flex flex-col cursor-pointer transition-all duration-300 ${
            selectedPromoTier === 'highlight'
              ? 'bg-cyan-100 border-2 border-cyan-400 shadow-xl scale-[1.02]'
              : 'bg-gradient-to-br from-cyan-50 to-cyan-100/50 border-2 border-cyan-300 hover:shadow-lg hover:scale-[1.01]'
          }`}
          onClick={() => onPromoteListing('highlight')}
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="inline-flex items-center gap-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
              <SparklesIcon className="w-3 h-3" />
              {t('pricing:badges.popular', 'Popular')}
            </span>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center mb-4 mt-2">
            <span className="text-2xl">💎</span>
          </div>
          <h4 className="text-xl font-bold text-gray-900">{t('pricing:listing.tiers.highlight.title', 'Highlight')}</h4>
          <p className="text-sm text-gray-600 mt-1">{t('pricing:listing.tiers.highlight.description', 'Stand out')}</p>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-cyan-600">€{getPromotionPrice('highlight', selectedDuration)}</span>
            <span className="text-sm text-gray-500">+</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">{selectedDuration} {t('pricing:listing.days', 'days')}</p>
          <ul className="mt-4 space-y-2 flex-grow">
            <li className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-cyan-500">✓</span> {t('pricing:listing.tiers.highlight.featuredBenefits', 'Featured benefits')}
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-cyan-500">✓</span> {t('pricing:listing.tiers.highlight.coloredHighlight', 'Colored highlight')}
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-cyan-500">✓</span> {t('pricing:listing.tiers.highlight.visibility', '3x visibility')}
            </li>
          </ul>
        </div>

        {/* Premium */}
        <div
          className={`relative rounded-3xl p-6 flex flex-col cursor-pointer transition-all duration-300 ${
            selectedPromoTier === 'premium'
              ? 'bg-amber-100 border-2 border-amber-400 shadow-xl scale-[1.02]'
              : 'bg-gradient-to-br from-amber-50 to-yellow-100/50 border border-amber-200 hover:shadow-lg hover:scale-[1.01]'
          }`}
          onClick={() => onPromoteListing('premium')}
        >
          <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl flex items-center justify-center mb-4">
            <span className="text-2xl">🏆</span>
          </div>
          <h4 className="text-xl font-bold text-gray-900">{t('pricing:listing.tiers.premium.title', 'Premium')}</h4>
          <p className="text-sm text-gray-600 mt-1">{t('pricing:listing.tiers.premium.description', 'Homepage featured')}</p>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-amber-600">€{getPromotionPrice('premium', selectedDuration)}</span>
            <span className="text-sm text-gray-500">+</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">{selectedDuration} {t('pricing:listing.days', 'days')}</p>
          <ul className="mt-4 space-y-2 flex-grow">
            <li className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-amber-500">✓</span> {t('pricing:listing.tiers.premium.highlightBenefits', 'Highlight benefits')}
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-amber-500">✓</span> {t('pricing:listing.tiers.premium.homepageCarousel', 'Homepage carousel')}
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-amber-500">✓</span> {t('pricing:listing.tiers.premium.visibility', '5x visibility')}
            </li>
          </ul>
        </div>
      </div>

      {/* How it works */}
      <div className="mt-8 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-lg">💡</span>
          </div>
          <div>
            <h4 className="font-bold text-gray-900">{t('pricing:listing.howItWorks', 'How it works:')}</h4>
            <p className="text-sm text-gray-600 mt-1">
              {t('pricing:listing.howItWorksDescription', 'Click on a promotion tier above to get started, or create a listing first.')}
            </p>
          </div>
        </div>
      </div>
    </Animated>
  );
};

export default ListingPromotionSection;
