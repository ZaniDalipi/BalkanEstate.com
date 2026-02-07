import React from 'react';
import { translateAndReplacePlaceholders } from '@/src/shared/utils/featurePlaceholders';
import { Animated } from '@/src/components/ui/Animations';
import { CheckIcon, SparklesIcon } from '@/constants';
import { type Product } from '../hooks/usePricingData';

interface BuyerPlansSectionProps {
  t: any;
  buyerProduct: Product | undefined;
  onPlanSelection: (product: Product) => void;
}

const BuyerPlansSection: React.FC<BuyerPlansSectionProps> = ({
  t,
  buyerProduct,
  onPlanSelection,
}) => {
  return (
    <Animated variant="fadeInUp" className="max-w-md mx-auto">
      {buyerProduct ? (
        <div className="relative rounded-3xl p-8 flex flex-col bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-2 border-blue-300 shadow-xl hover-lift">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg">
              <SparklesIcon className="w-3.5 h-3.5" />
              {t('pricing:badges.buyerPro', 'BUYER PRO')}
            </span>
          </div>

          <div className="text-center pt-4">
            <h3 className="text-2xl font-bold text-gray-900">{buyerProduct.name}</h3>
            <p className="mt-2 text-sm text-gray-600">{buyerProduct.description}</p>
            <div className="mt-6">
              <span className="text-5xl font-extrabold text-gray-900">€{buyerProduct.price}</span>
              <span className="text-lg text-gray-600">/month</span>
            </div>
          </div>

          <ul className="mt-8 space-y-4 flex-grow">
            {buyerProduct.features?.map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                  <CheckIcon className="w-3 h-3 text-blue-600" />
                </div>
                <span className="text-sm text-gray-700">{translateAndReplacePlaceholders(feature, buyerProduct, t)}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={() => onPlanSelection(buyerProduct)}
            className="w-full mt-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 text-base"
          >
            {t('pricing:buttons.getStarted', 'Get Started')} - €{buyerProduct.price}{t('pricing:billing.perMonth', '/month')}
          </button>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-2xl">
          <p className="text-gray-600">No buyer plans available at the moment.</p>
        </div>
      )}
    </Animated>
  );
};

export default BuyerPlansSection;
