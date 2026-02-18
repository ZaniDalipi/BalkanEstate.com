import React from 'react';
import { Animated } from '@/src/components/ui/Animations';
import {
  BuildingOfficeIcon,
  CheckIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
} from '@/constants';

interface AgencyFeatureSectionProps {
  t: any;
  currentUserAgencyId: string | undefined;
  getAgencyPrice: (tier: string, duration: number) => number;
  selectedAgencyDuration: 7 | 14 | 28 | 90;
  setSelectedAgencyDuration: (d: 7 | 14 | 28 | 90) => void;
  onAgencyFeature: (tier: 'spotlight' | 'homepage' | 'premium') => void;
  onSetActiveTab: (tab: 'seller' | 'buyer' | 'listing' | 'agency') => void;
}

const DURATION_OPTIONS: { value: 7 | 14 | 28 | 90; label: string }[] = [
  { value: 7, label: '1 Week' },
  { value: 14, label: '2 Weeks' },
  { value: 28, label: '4 Weeks' },
  { value: 90, label: '90 Days' },
];

const AgencyFeatureSection: React.FC<AgencyFeatureSectionProps> = ({
  t,
  currentUserAgencyId,
  getAgencyPrice,
  selectedAgencyDuration,
  setSelectedAgencyDuration,
  onAgencyFeature,
  onSetActiveTab,
}) => {
  const currentPrice = getAgencyPrice('featured', selectedAgencyDuration);

  return (
    <Animated variant="fadeInUp" className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BuildingOfficeIcon className="w-8 h-8 text-amber-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900">{t('pricing:agency.title', 'Featured Agency')}</h3>
        <p className="mt-2 text-gray-600">{t('pricing:agency.subtitle', 'Get your agency featured everywhere on the platform')}</p>
      </div>

      {/* Featured Agency Package with Duration Picker */}
      <div className="relative rounded-3xl p-8 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 shadow-xl">
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg">
            <SparklesIcon className="w-3.5 h-3.5" />
            {t('pricing:agency.featuredBadge', 'FEATURED')}
          </span>
        </div>

        <div className="flex flex-col gap-6 pt-4">
          {/* Info section */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center">
              <span className="text-3xl">🏢</span>
            </div>
            <div>
              <h4 className="text-2xl font-bold text-gray-900">{t('pricing:agency.featuredTitle', 'Featured Agency')}</h4>
              <p className="text-sm text-gray-600">{t('pricing:agency.featuredDescription', 'Shown everywhere on the platform')}</p>
            </div>
          </div>

          {/* Features */}
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              t('pricing:agency.benefits.featuredInDirectory', 'Featured in agency directory'),
              t('pricing:agency.benefits.priorityInSearch', 'Priority in search results'),
              t('pricing:agency.benefits.homepageCarousel', 'Homepage agency carousel'),
              t('pricing:agency.benefits.featuredBadge', 'Featured badge on profile'),
              t('pricing:agency.benefits.boostedVisibility', 'Boosted visibility everywhere (3x)'),
              t('pricing:agency.benefits.mapMarker', 'Agency marker on property map'),
            ].map((feature, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-gray-700">
                <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0">
                  <CheckIcon className="w-3 h-3 text-amber-700" />
                </div>
                {feature}
              </li>
            ))}
          </ul>

          {/* Duration Selection */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">{t('pricing:agency.selectDuration', 'Select duration:')}</p>
            <div className="grid grid-cols-4 gap-2">
              {DURATION_OPTIONS.map((opt) => {
                const price = getAgencyPrice('featured', opt.value);
                const isSelected = selectedAgencyDuration === opt.value;
                const isBestValue = opt.value === 90;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedAgencyDuration(opt.value)}
                    className={`relative flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50 shadow-md ring-2 ring-amber-200'
                        : 'border-gray-200 bg-white hover:border-amber-300 hover:bg-amber-50/50'
                    }`}
                  >
                    {isBestValue && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full whitespace-nowrap">
                        BEST VALUE
                      </span>
                    )}
                    <span className={`text-xs font-medium ${isSelected ? 'text-amber-700' : 'text-gray-500'}`}>
                      {opt.label}
                    </span>
                    <span className={`text-lg font-extrabold mt-1 ${isSelected ? 'text-amber-600' : 'text-gray-900'}`}>
                      €{price.toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => onAgencyFeature('featured' as any)}
            className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg text-lg"
          >
            {t('pricing:buttons.getFeatured', 'Get Featured')} — €{currentPrice.toFixed(2)}
          </button>
        </div>
      </div>

      {/* Note for non-agency users */}
      {(!currentUserAgencyId) && (
        <div className="mt-8 bg-blue-50 rounded-2xl p-6 border border-blue-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <ExclamationTriangleIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900">{t('pricing:agency.needAgency', 'Don\'t have an agency yet?')}</h4>
              <p className="text-sm text-gray-600 mt-1">
                {t('pricing:agency.needAgencyDescription', 'Subscribe to our Enterprise plan to create your agency and unlock these features.')}
              </p>
              <button
                onClick={() => onSetActiveTab('seller')}
                className="mt-3 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors press-effect"
              >
                {t('pricing:agency.viewEnterprise', 'View Enterprise Plan')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Animated>
  );
};

export default AgencyFeatureSection;
