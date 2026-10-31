import React from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon } from '@/src/shared/illustrations';

interface PaymentComingSoonProps {
  title?: string;
  message?: string;
  contactEmail?: string;
  showContactInfo?: boolean;
  onActivateCoupon?: () => void;
  className?: string;
}

/**
 * Coming Soon overlay for payment features
 * Shows a friendly message that payments are being set up
 * and provides contact info for manual processing + coupon activation
 */
const PaymentComingSoon: React.FC<PaymentComingSoonProps> = ({
  title,
  message,
  contactEmail = 'sales@balkanestateai.com',
  showContactInfo = true,
  onActivateCoupon,
  className = '',
}) => {
  const { t } = useTranslation(['common']);

  return (
    <div className={`bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-2 border-amber-200 rounded-2xl p-6 sm:p-8 text-center ${className}`}>
      {/* Payment card illustration */}
      <div className="relative mx-auto mb-5 w-44 h-28 sm:w-52 sm:h-32">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-100/50 to-orange-100/50 rounded-2xl"></div>
        <div className="absolute top-3 left-1/2 -translate-x-1/2">
          <div className="relative">
            <div className="w-32 sm:w-40 h-[76px] sm:h-[88px] bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg transform -rotate-6 absolute top-0 left-0">
              <div className="p-3">
                <div className="flex justify-between items-start mb-2 sm:mb-3">
                  <div className="w-7 h-4 sm:w-9 sm:h-5 bg-yellow-300 rounded-sm"></div>
                  <div className="flex gap-0.5">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white/30 rounded-full"></div>
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white/20 rounded-full -ml-1 sm:-ml-1.5"></div>
                  </div>
                </div>
                <div className="flex gap-1 sm:gap-1.5 mb-2">
                  <div className="h-1 w-5 sm:w-7 bg-white/30 rounded"></div>
                  <div className="h-1 w-5 sm:w-7 bg-white/30 rounded"></div>
                  <div className="h-1 w-5 sm:w-7 bg-white/30 rounded"></div>
                  <div className="h-1 w-5 sm:w-7 bg-white/30 rounded"></div>
                </div>
                <div className="h-1 w-14 sm:w-16 bg-white/20 rounded"></div>
              </div>
            </div>
            <div className="w-32 sm:w-40 h-[76px] sm:h-[88px] bg-gradient-to-br from-primary to-indigo-600 rounded-xl shadow-lg transform rotate-6 absolute top-2 left-2">
              <div className="p-3">
                <div className="flex justify-between items-start mb-2 sm:mb-3">
                  <div className="w-7 h-4 sm:w-9 sm:h-5 bg-amber-400 rounded-sm"></div>
                  <SoftIcon name="bolt" className="w-4 h-4 opacity-70" />
                </div>
                <div className="flex gap-1 sm:gap-1.5 mb-2">
                  <div className="h-1 w-5 sm:w-7 bg-white/30 rounded"></div>
                  <div className="h-1 w-5 sm:w-7 bg-white/30 rounded"></div>
                  <div className="h-1 w-5 sm:w-7 bg-white/30 rounded"></div>
                  <div className="h-1 w-5 sm:w-7 bg-white/30 rounded"></div>
                </div>
                <div className="h-1 w-14 sm:w-16 bg-white/20 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
        {title || t('common:comingSoon.title', 'Payments Coming Soon')}
      </h3>

      {/* Message */}
      <p className="text-gray-600 mb-5 max-w-md mx-auto">
        {message || t('common:comingSoon.message', 'We are currently looking for a payment provider to partner with us. Direct payments are not accepted at this time. You can activate your subscription instantly using a coupon code, or contact us to arrange it manually.')}
      </p>

      {/* Coupon activation section */}
      {onActivateCoupon && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-primary/20 max-w-sm mx-auto mb-4">
          <p className="text-sm font-semibold text-neutral-800 mb-1">
            {t('common:comingSoon.haveCoupon', 'Did we provide a coupon for you?')}
          </p>
          <p className="text-xs text-neutral-500 mb-3">
            {t('common:comingSoon.couponDescription', 'Enter your code to activate your subscription instantly')}
          </p>
          <button
            onClick={onActivateCoupon}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-indigo-600 text-white font-semibold rounded-lg hover:from-primary-dark hover:to-indigo-700 transition-all shadow-md hover:shadow-lg text-sm"
          >
            <SoftIcon name="ticket" className="w-5 h-5" />
            {t('common:comingSoon.activateCoupon', 'Activate with Coupon')}
          </button>
        </div>
      )}

      {/* Contact Info */}
      {showContactInfo && (
        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-amber-100 max-w-sm mx-auto">
          <p className="text-sm text-gray-500 mb-2">
            {t('common:comingSoon.contactUs', 'Contact us for manual processing:')}
          </p>
          <a
            href={`mailto:${contactEmail}?subject=Subscription%20Request%20-%20BalkanEstate`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-md hover:shadow-lg"
          >
            <SoftIcon name="envelope" className="w-6 h-6" />
            {contactEmail}
          </a>
          <p className="text-xs text-gray-400 mt-3">
            {t('common:comingSoon.responseTime', 'We typically respond within 24 hours')}
          </p>
        </div>
      )}

      {/* Badge */}
      <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">
        <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
        {t('common:comingSoon.badge', 'Seeking payment provider partner')}
      </div>
    </div>
  );
};

export default PaymentComingSoon;
