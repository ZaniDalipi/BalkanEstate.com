/**
 * No Subscription View Component
 * Displayed when user has no active subscription
 */

import React from 'react';
import { CheckCircleIcon, XCircleIcon, SparklesIcon } from '@/constants';

const DEFAULT_BENEFITS = [
  '250 Listings/Year',
  '3 Promo Coupons/Month',
  'Unlimited AI Chat',
  '20 Insights/Month',
];

interface NoSubscriptionViewProps {
  benefits?: string[];
  subscribeUrl?: string;
}

const NoSubscriptionView: React.FC<NoSubscriptionViewProps> = ({
  benefits = DEFAULT_BENEFITS,
  subscribeUrl = '/subscribe',
}) => {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-primary-light/5 to-white rounded-2xl shadow-lg border border-neutral-200/50 p-8 md:p-12">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/5 rounded-full blur-3xl -z-10" />

        <div className="text-center space-y-6">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-neutral-100 to-neutral-200 mb-2">
            <XCircleIcon className="w-10 h-10 text-neutral-400" />
          </div>

          {/* Text */}
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-3">
              No Active Subscription
            </h3>
            <p className="text-neutral-600 text-lg max-w-md mx-auto">
              Unlock premium features and take your experience to the next level
            </p>
          </div>

          {/* Benefits grid */}
          <div className="grid sm:grid-cols-2 gap-3 max-w-lg mx-auto pt-4">
            {benefits.map((benefit, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 bg-white rounded-lg border border-neutral-200"
              >
                <CheckCircleIcon className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-sm text-neutral-700">{benefit}</span>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <a
            href={subscribeUrl}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-primary-dark text-white font-bold rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-300 mt-4 cursor-pointer"
          >
            <SparklesIcon className="w-5 h-5" />
            View Plans & Pricing
          </a>
        </div>
      </div>
    </div>
  );
};

export default NoSubscriptionView;
