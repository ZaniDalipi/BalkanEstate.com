import React from 'react';
import { Animated } from '@/src/components/ui/Animations';
import {
  BuildingOfficeIcon,
  CheckIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
} from '@/constants';

interface AgencyFeatureSectionProps {
  t: (key: string, defaultValue?: string, options?: any) => string;
  currentUserAgencyId: string | undefined;
  getAgencyPrice: (tier: string, duration: number) => number;
  onAgencyFeature: (tier: 'spotlight' | 'homepage' | 'premium') => void;
  onSetActiveTab: (tab: 'seller' | 'buyer' | 'listing' | 'agency') => void;
}

const AgencyFeatureSection: React.FC<AgencyFeatureSectionProps> = ({
  t,
  currentUserAgencyId,
  getAgencyPrice,
  onAgencyFeature,
  onSetActiveTab,
}) => {
  return (
    <Animated variant="fadeInUp" className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BuildingOfficeIcon className="w-8 h-8 text-amber-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900">{t('pricing:agency.title', 'Featured Agency')}</h3>
        <p className="mt-2 text-gray-600">{t('pricing:agency.subtitle', 'Get your agency featured everywhere on the platform for 1 week')}</p>
      </div>

      {/* Single Featured Agency Package - 7 days */}
      <div className="relative rounded-3xl p-8 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 shadow-xl">
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg">
            <SparklesIcon className="w-3.5 h-3.5" />
            {t('pricing:agency.oneWeek', '1 WEEK')}
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-6 pt-4">
          {/* Left: Info */}
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center">
                <span className="text-3xl">🏢</span>
              </div>
              <div>
                <h4 className="text-2xl font-bold text-gray-900">{t('pricing:agency.featuredTitle', 'Featured Agency')}</h4>
                <p className="text-sm text-gray-600">{t('pricing:agency.featuredDescription', 'Shown everywhere on the platform')}</p>
              </div>
            </div>

            <ul className="space-y-3">
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
          </div>

          {/* Right: Pricing */}
          <div className="md:w-56 bg-white rounded-2xl p-6 shadow-lg border border-amber-200">
            <div className="text-center">
              <div className="text-4xl font-extrabold text-amber-600">
                €{getAgencyPrice('featured', 7)}
              </div>
              <p className="text-sm text-gray-500 mt-1">{t('pricing:agency.perWeek', 'per week')}</p>
              <p className="text-xs text-amber-600 font-medium mt-2">{t('pricing:agency.showsEverywhere', 'Shows everywhere!')}</p>
            </div>

            <button
              onClick={() => onAgencyFeature('featured' as any)}
              className="w-full mt-4 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg"
            >
              {t('pricing:buttons.getFeatured', 'Get Featured')}
            </button>
          </div>
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
