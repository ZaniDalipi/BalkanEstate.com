import React from 'react';
import { translateAndReplacePlaceholders } from '@/src/shared/utils/featurePlaceholders';
import { Animated } from '@/src/components/ui/Animations';
import {
  BuildingOfficeIcon,
  CheckIcon,
  UserGroupIcon,
} from '@/constants';
import { type Product } from '../hooks/usePricingData';
import { formatLimit } from './usePricingPage';

interface EnterprisePlanCardProps {
  t: any;
  enterpriseProduct: Product;
  onPlanSelection: (product: Product) => void;
  isActivePlan: (productId: string) => boolean;
  isPlanDisabled: (productId: string) => boolean;
  /** Extra classes for the animated wrapper (grid ordering, spacing, width). */
  className?: string;
  delay?: number;
}

const EnterprisePlanCard: React.FC<EnterprisePlanCardProps> = ({
  t,
  enterpriseProduct,
  onPlanSelection,
  isActivePlan,
  isPlanDisabled,
  className = '',
  delay = 0,
}) => {
  const disabled = isPlanDisabled(enterpriseProduct.productId);
  const active = isActivePlan(enterpriseProduct.productId);

  return (
    <Animated
      variant="fadeInUp"
      delay={delay}
      className={`relative pt-4 ${disabled && !active ? 'opacity-40 blur-[1px] pointer-events-none select-none' : ''} ${className}`}
    >
      {/* Badge - Outside the card to prevent clipping */}
      <div className="absolute -top-0 left-1/2 -translate-x-1/2 z-20">
        <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg whitespace-nowrap">
          <UserGroupIcon className="w-3.5 h-3.5" />
          {t('pricing:badges.bestForTeams', 'BEST FOR TEAMS')}
        </span>
      </div>

      <div className="rounded-3xl p-6 sm:p-8 flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl h-full relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="text-center pt-2 relative z-10">
          <div className="flex items-center justify-center gap-2">
            <BuildingOfficeIcon className="w-7 h-7 text-amber-400" />
            <h3 className="text-2xl font-bold">{enterpriseProduct.name}</h3>
          </div>
          <p className="mt-2 text-sm text-gray-400">
            {enterpriseProduct.description || 'Complete solution for real estate agencies'}
          </p>
          <div className="mt-6">
            <span className="text-5xl font-extrabold">€{enterpriseProduct.price}</span>
            <span className="text-lg text-gray-400">/year</span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="mt-6 grid grid-cols-2 gap-3 relative z-10">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
            <p className="text-2xl font-bold text-amber-400">{formatLimit(enterpriseProduct.listingsLimit)}</p>
            <p className="text-xs text-gray-400">{t('pricing:metrics.listings', 'Listings')}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
            <p className="text-2xl font-bold text-amber-400">{formatLimit(enterpriseProduct.promotionCoupons)}</p>
            <p className="text-xs text-gray-400">{t('pricing:metrics.promoCouponsMonth', 'Promo Coupons/Mo')}</p>
          </div>
        </div>

        {/* Features - with fallback */}
        <ul className="mt-6 space-y-3 flex-grow relative z-10">
          {(enterpriseProduct.features && enterpriseProduct.features.length > 0
            ? enterpriseProduct.features
            : [
                '750 listings (expandable)',
                'Unlimited team members',
                'Agency branding page',
                '5 promo coupons/month',
                'Unlimited AI & insights',
                'Dedicated account manager',
              ]
          ).map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center mt-0.5">
                <CheckIcon className="w-3 h-3 text-amber-400" />
              </div>
              <span className="text-sm text-gray-300">{translateAndReplacePlaceholders(feature, enterpriseProduct, t)}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={() => !disabled && onPlanSelection(enterpriseProduct)}
          disabled={disabled}
          className={`w-full mt-8 py-4 rounded-xl font-bold transition-all duration-300 text-base relative z-10 ${
            disabled
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed shadow-none'
              : 'text-slate-900 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 shadow-lg hover:shadow-xl press-effect'
          }`}
        >
          {active
            ? t('pricing:buttons.currentPlan', 'Current Plan')
            : <>{t('pricing:buttons.getStarted', 'Get Started')} - €{enterpriseProduct.price}{t('pricing:billing.perYear', '/year')}</>
          }
        </button>
      </div>
    </Animated>
  );
};

export default EnterprisePlanCard;
