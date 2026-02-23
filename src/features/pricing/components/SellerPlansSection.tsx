import React from 'react';
import { translateAndReplacePlaceholders } from '@/src/shared/utils/featurePlaceholders';
import { Animated } from '@/src/components/ui/Animations';
import {
  BuildingOfficeIcon,
  CheckIcon,
  SparklesIcon,
  UserGroupIcon,
} from '@/constants';
import { type Product } from '../hooks/usePricingData';
import { formatLimit } from './usePricingPage';

interface SellerPlansSectionProps {
  t: any;
  proYearlyProduct: Product | undefined;
  proMonthlyProduct: Product | undefined;
  enterpriseProduct: Product | undefined;
  onPlanSelection: (product: Product) => void;
  isActivePlan: (productId: string) => boolean;
  isPlanDisabled: (productId: string) => boolean;
}

const SellerPlansSection: React.FC<SellerPlansSectionProps> = ({
  t,
  proYearlyProduct,
  proMonthlyProduct,
  enterpriseProduct,
  onPlanSelection,
  isActivePlan,
  isPlanDisabled,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-stretch">

      {/* Pro Yearly - Most Popular */}
      {proYearlyProduct && (
        <Animated variant="fadeInUp" delay={0} className={`relative order-1 lg:order-1 pt-4 lg:-translate-y-4 ${isPlanDisabled(proYearlyProduct.productId) && !isActivePlan(proYearlyProduct.productId) ? 'opacity-40 blur-[1px] pointer-events-none select-none' : ''}`}>
        {/* Badge - Outside the card */}
        <div className="absolute -top-0 left-1/2 -translate-x-1/2 z-20">
          <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg whitespace-nowrap">
            <SparklesIcon className="w-3.5 h-3.5" />
            {t('pricing:badges.mostPopular', 'MOST POPULAR')}
          </span>
        </div>

        <div className="rounded-3xl p-6 sm:p-8 flex flex-col bg-gradient-to-br from-emerald-50 via-white to-cyan-50 border-2 border-emerald-400 shadow-xl h-full">
          <div className="text-center pt-2">
            <h3 className="text-2xl font-bold text-gray-900">{proYearlyProduct.name}</h3>
            <p className="mt-2 text-sm text-gray-600">{proYearlyProduct.description || 'Best value for serious sellers'}</p>
            <div className="mt-6">
              <span className="text-5xl font-extrabold text-gray-900">€{proYearlyProduct.price}</span>
              <span className="text-lg text-gray-600">/year</span>
            </div>
            <p className="mt-2 text-sm text-emerald-600 font-medium">{t('pricing:plans.proYearly.saveVsMonthly', 'Save 33% vs monthly')}</p>
          </div>

          {/* Key Metrics */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="bg-white/80 rounded-xl p-3 text-center border border-emerald-100">
              <p className="text-2xl font-bold text-emerald-600">{formatLimit(proYearlyProduct.listingsLimit)}</p>
              <p className="text-xs text-gray-600">{t('pricing:metrics.listingsYear', 'Listings/Year')}</p>
            </div>
            <div className="bg-white/80 rounded-xl p-3 text-center border border-emerald-100">
              <p className="text-2xl font-bold text-emerald-600">{formatLimit(proYearlyProduct.promotionCoupons)}</p>
              <p className="text-xs text-gray-600">{t('pricing:metrics.promoCouponsMonth', 'Promo Coupons/Mo')}</p>
            </div>
          </div>

          {/* Features - with fallback */}
          <ul className="mt-6 space-y-3 flex-grow">
            {(proYearlyProduct.features && proYearlyProduct.features.length > 0
              ? proYearlyProduct.features
              : [
                  '250 listings per year',
                  '3 promo coupons/month',
                  'Unlimited AI chat',
                  'Unlimited saved searches',
                  'Advanced analytics',
                  'Priority support',
                ]
            ).map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center mt-0.5">
                  <CheckIcon className="w-3 h-3 text-emerald-600" />
                </div>
                <span className="text-sm text-gray-700">{translateAndReplacePlaceholders(feature, proYearlyProduct, t)}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={() => !isPlanDisabled(proYearlyProduct.productId) && onPlanSelection(proYearlyProduct)}
            disabled={isPlanDisabled(proYearlyProduct.productId)}
            className={`w-full mt-8 py-4 rounded-xl font-bold transition-all duration-300 text-base ${
              isPlanDisabled(proYearlyProduct.productId)
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed shadow-none'
                : 'text-white bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 shadow-lg hover:shadow-xl press-effect'
            }`}
          >
            {isActivePlan(proYearlyProduct.productId)
              ? t('pricing:buttons.currentPlan', 'Current Plan')
              : <>{t('pricing:buttons.getStarted', 'Get Started')} - €{proYearlyProduct.price}{t('pricing:billing.perYear', '/year')}</>
            }
          </button>
        </div>
      </Animated>
    )}

    {/* Pro Monthly */}
    {proMonthlyProduct && (
      <Animated variant="fadeInUp" delay={100} className={`relative order-2 lg:order-2 pt-4 ${isPlanDisabled(proMonthlyProduct.productId) && !isActivePlan(proMonthlyProduct.productId) ? 'opacity-40 blur-[1px] pointer-events-none select-none' : ''}`}>
        <div className="rounded-3xl p-6 sm:p-8 flex flex-col bg-white border border-gray-200 shadow-lg h-full">
          <div className="text-center pt-2">
            <h3 className="text-2xl font-bold text-gray-900">{proMonthlyProduct.name}</h3>
            <p className="mt-2 text-sm text-gray-600">{proMonthlyProduct.description || 'Great for getting started'}</p>
            <div className="mt-6">
              <span className="text-5xl font-extrabold text-gray-900">€{proMonthlyProduct.price}</span>
              <span className="text-lg text-gray-600">/month</span>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-primary">{formatLimit(proMonthlyProduct.listingsLimit)}</p>
              <p className="text-xs text-gray-600">{t('pricing:metrics.listingsMonth', 'Listings/Month')}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-primary">{formatLimit(proMonthlyProduct.promotionCoupons)}</p>
              <p className="text-xs text-gray-600">{t('pricing:metrics.promoCouponsMonth', 'Promo Coupons/Mo')}</p>
            </div>
          </div>

          {/* Features - with fallback */}
          <ul className="mt-6 space-y-3 flex-grow">
            {(proMonthlyProduct.features && proMonthlyProduct.features.length > 0
              ? proMonthlyProduct.features
              : [
                  '20 listings per month',
                  '3 promo coupons/month',
                  'Unlimited AI chat',
                  'Unlimited saved searches',
                  'Basic analytics',
                ]
            ).map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center mt-0.5">
                  <CheckIcon className="w-3 h-3 text-gray-600" />
                </div>
                <span className="text-sm text-gray-700">{translateAndReplacePlaceholders(feature, proMonthlyProduct, t)}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={() => !isPlanDisabled(proMonthlyProduct.productId) && onPlanSelection(proMonthlyProduct)}
            disabled={isPlanDisabled(proMonthlyProduct.productId)}
            className={`w-full mt-8 py-4 rounded-xl font-bold transition-all duration-300 text-base ${
              isPlanDisabled(proMonthlyProduct.productId)
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed border-2 border-gray-200 shadow-none'
                : 'text-gray-700 bg-white border-2 border-gray-300 hover:border-primary hover:text-primary hover:shadow-lg press-effect'
            }`}
          >
            {isActivePlan(proMonthlyProduct.productId)
              ? t('pricing:buttons.currentPlan', 'Current Plan')
              : <>{t('pricing:buttons.getStarted', 'Get Started')} - €{proMonthlyProduct.price}{t('pricing:billing.perMonth', '/month')}</>
            }
          </button>
        </div>
      </Animated>
    )}

    {/* Enterprise - For Teams */}
    {enterpriseProduct && (
      <Animated variant="fadeInUp" delay={200} className={`relative order-3 lg:order-3 pt-4 ${isPlanDisabled(enterpriseProduct.productId) && !isActivePlan(enterpriseProduct.productId) ? 'opacity-40 blur-[1px] pointer-events-none select-none' : ''}`}>
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
            onClick={() => !isPlanDisabled(enterpriseProduct.productId) && onPlanSelection(enterpriseProduct)}
            disabled={isPlanDisabled(enterpriseProduct.productId)}
            className={`w-full mt-8 py-4 rounded-xl font-bold transition-all duration-300 text-base relative z-10 ${
              isPlanDisabled(enterpriseProduct.productId)
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed shadow-none'
                : 'text-slate-900 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 shadow-lg hover:shadow-xl press-effect'
            }`}
          >
            {isActivePlan(enterpriseProduct.productId)
              ? t('pricing:buttons.currentPlan', 'Current Plan')
              : <>{t('pricing:buttons.getStarted', 'Get Started')} - €{enterpriseProduct.price}{t('pricing:billing.perYear', '/year')}</>
            }
          </button>
        </div>
      </Animated>
    )}
  </div>
  );
};

export default SellerPlansSection;
