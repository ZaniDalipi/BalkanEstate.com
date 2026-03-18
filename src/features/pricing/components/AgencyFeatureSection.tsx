import React from 'react';
import { Animated } from '@/src/components/ui/Animations';
import {
  BuildingOfficeIcon,
  CheckIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
} from '@/constants';
import { type PromotionPlan } from '../hooks/usePricingData';

interface AgencyFeatureSectionProps {
  t: any;
  currentUserAgencyId: string | undefined;
  agencyFeaturePlans: PromotionPlan[];
  loadingPlans: boolean;
  getAgencyPrice: (tier: string, duration: number) => number;
  selectedAgencyDuration: 7 | 14 | 28 | 90;
  setSelectedAgencyDuration: (d: 7 | 14 | 28 | 90) => void;
  onAgencyFeature: (tier: string) => void;
  onSetActiveTab: (tab: 'seller' | 'buyer' | 'listing' | 'agency') => void;
}

const getDurationOptions = (t: any): { value: 7 | 14 | 28 | 90; label: string }[] => [
  { value: 7, label: t('pricing:agencyDuration.1week', '1 Week') },
  { value: 14, label: t('pricing:agencyDuration.2weeks', '2 Weeks') },
  { value: 28, label: t('pricing:agencyDuration.4weeks', '4 Weeks') },
  { value: 90, label: t('pricing:agencyDuration.90days', '90 Days') },
];

// Color presets mapped from cardStyle.gradientFrom
interface ColorPreset {
  gradient: string;
  border: string;
  borderHighlighted: string;
  iconBg: string;
  price: string;
  checkBg: string;
  checkText: string;
  button: string;
  badge: string;
  selectedBorder: string;
  selectedBg: string;
  selectedRing: string;
  selectedText: string;
  selectedPrice: string;
}

const COLOR_PRESETS: Record<string, ColorPreset> = {
  amber: {
    gradient: 'from-amber-50 to-orange-50',
    border: 'border-amber-200',
    borderHighlighted: 'border-amber-300',
    iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500',
    price: 'text-amber-600',
    checkBg: 'bg-amber-200',
    checkText: 'text-amber-700',
    button: 'from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600',
    badge: 'from-amber-500 to-orange-500',
    selectedBorder: 'border-amber-500',
    selectedBg: 'bg-amber-50',
    selectedRing: 'ring-amber-200',
    selectedText: 'text-amber-700',
    selectedPrice: 'text-amber-600',
  },
  purple: {
    gradient: 'from-purple-50 to-purple-100/50',
    border: 'border-purple-200',
    borderHighlighted: 'border-purple-300',
    iconBg: 'bg-purple-500',
    price: 'text-purple-600',
    checkBg: 'bg-purple-200',
    checkText: 'text-purple-700',
    button: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
    badge: 'from-purple-500 to-purple-600',
    selectedBorder: 'border-purple-500',
    selectedBg: 'bg-purple-50',
    selectedRing: 'ring-purple-200',
    selectedText: 'text-purple-700',
    selectedPrice: 'text-purple-600',
  },
  cyan: {
    gradient: 'from-cyan-50 to-cyan-100/50',
    border: 'border-cyan-200',
    borderHighlighted: 'border-cyan-300',
    iconBg: 'bg-gradient-to-br from-cyan-400 to-blue-500',
    price: 'text-cyan-600',
    checkBg: 'bg-cyan-200',
    checkText: 'text-cyan-700',
    button: 'from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600',
    badge: 'from-cyan-500 to-blue-500',
    selectedBorder: 'border-cyan-500',
    selectedBg: 'bg-cyan-50',
    selectedRing: 'ring-cyan-200',
    selectedText: 'text-cyan-700',
    selectedPrice: 'text-cyan-600',
  },
  green: {
    gradient: 'from-green-50 to-emerald-50',
    border: 'border-green-200',
    borderHighlighted: 'border-green-300',
    iconBg: 'bg-gradient-to-br from-green-400 to-emerald-500',
    price: 'text-green-600',
    checkBg: 'bg-green-200',
    checkText: 'text-green-700',
    button: 'from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600',
    badge: 'from-green-500 to-emerald-500',
    selectedBorder: 'border-green-500',
    selectedBg: 'bg-green-50',
    selectedRing: 'ring-green-200',
    selectedText: 'text-green-700',
    selectedPrice: 'text-green-600',
  },
};

function getColorPreset(cardStyle?: PromotionPlan['cardStyle']): ColorPreset {
  const from = cardStyle?.gradientFrom || '';
  if (from.includes('purple')) return COLOR_PRESETS.purple;
  if (from.includes('cyan') || from.includes('blue')) return COLOR_PRESETS.cyan;
  if (from.includes('green') || from.includes('emerald')) return COLOR_PRESETS.green;
  return COLOR_PRESETS.amber; // default for amber/orange
}

const AgencyFeatureSection: React.FC<AgencyFeatureSectionProps> = ({
  t,
  currentUserAgencyId,
  agencyFeaturePlans,
  loadingPlans,
  getAgencyPrice,
  selectedAgencyDuration,
  setSelectedAgencyDuration,
  onAgencyFeature,
  onSetActiveTab,
}) => {
  const DURATION_OPTIONS = getDurationOptions(t);

  // Determine grid columns based on number of plans
  const gridCols = agencyFeaturePlans.length === 1
    ? 'max-w-2xl mx-auto'
    : agencyFeaturePlans.length === 2
    ? 'grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto'
    : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto';

  return (
    <Animated variant="fadeInUp" className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BuildingOfficeIcon className="w-8 h-8 text-amber-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900">{t('pricing:agency.title', 'Agency Features')}</h3>
        <p className="mt-2 text-gray-600">{t('pricing:agency.subtitle', 'Get your agency featured everywhere on the platform')}</p>
      </div>

      {/* Shared Duration Selector */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 p-1 rounded-full inline-flex">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelectedAgencyDuration(opt.value)}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
                selectedAgencyDuration === opt.value
                  ? 'bg-white text-gray-900 shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loadingPlans && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500/20 border-t-amber-500"></div>
        </div>
      )}

      {/* No plans available */}
      {!loadingPlans && agencyFeaturePlans.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">{t('pricing:agency.noPlans', 'No agency feature plans available at this time.')}</p>
        </div>
      )}

      {/* Plan Cards */}
      {!loadingPlans && agencyFeaturePlans.length > 0 && (
        <div className={agencyFeaturePlans.length === 1 ? '' : gridCols}>
          {agencyFeaturePlans.map((plan) => {
            const colors = getColorPreset(plan.cardStyle);
            const price = getAgencyPrice(plan.tier, selectedAgencyDuration);

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-8 bg-gradient-to-br ${colors.gradient} border-2 ${
                  plan.highlighted ? colors.borderHighlighted : colors.border
                } shadow-xl flex flex-col`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className={`inline-flex items-center gap-1.5 bg-gradient-to-r ${colors.badge} text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg`}>
                      <SparklesIcon className="w-3.5 h-3.5" />
                      {plan.badge.toUpperCase()}
                    </span>
                  </div>
                )}

                <div className="flex flex-col gap-6 pt-4 flex-grow">
                  {/* Info section */}
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 ${colors.iconBg} rounded-2xl flex items-center justify-center`}>
                      <span className="text-3xl">{plan.icon || '🏢'}</span>
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold text-gray-900">{plan.name}</h4>
                      {plan.description && (
                        <p className="text-sm text-gray-600">{plan.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Features */}
                  {plan.features.length > 0 && (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm text-gray-700">
                          <div className={`w-5 h-5 rounded-full ${colors.checkBg} flex items-center justify-center flex-shrink-0`}>
                            <CheckIcon className={`w-3 h-3 ${colors.checkText}`} />
                          </div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Duration Selection */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">{t('pricing:agency.selectDuration', 'Select duration:')}</p>
                    <div className="grid grid-cols-4 gap-2">
                      {DURATION_OPTIONS.map((opt) => {
                        const optPrice = getAgencyPrice(plan.tier, opt.value);
                        const isSelected = selectedAgencyDuration === opt.value;
                        const isBestValue = opt.value === 90;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => setSelectedAgencyDuration(opt.value)}
                            className={`relative flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-all ${
                              isSelected
                                ? `${colors.selectedBorder} ${colors.selectedBg} shadow-md ring-2 ${colors.selectedRing}`
                                : `border-gray-200 bg-white hover:${colors.border} hover:bg-opacity-50`
                            }`}
                          >
                            {isBestValue && (
                              <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-gradient-to-r ${colors.badge} text-white px-2 py-0.5 rounded-full whitespace-nowrap`}>
                                {t('pricing:agencyDuration.bestValue', 'BEST VALUE')}
                              </span>
                            )}
                            <span className={`text-xs font-medium ${isSelected ? colors.selectedText : 'text-gray-500'}`}>
                              {opt.label}
                            </span>
                            <span className={`text-lg font-extrabold mt-1 ${isSelected ? colors.selectedPrice : 'text-gray-900'}`}>
                              €{optPrice.toFixed(2)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => onAgencyFeature(plan.tier)}
                    className={`w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r ${colors.button} transition-all shadow-lg text-lg mt-auto`}
                  >
                    {t('pricing:buttons.getFeatured', 'Get Featured')} — €{price.toFixed(2)}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Note for non-agency users */}
      {(!currentUserAgencyId) && (
        <div className="mt-8 bg-blue-50 rounded-2xl p-6 border border-blue-200 max-w-2xl mx-auto">
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
