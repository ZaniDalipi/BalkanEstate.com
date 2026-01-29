import React from 'react';
import { useTranslation } from 'react-i18next';

interface PaymentComingSoonProps {
  title?: string;
  message?: string;
  contactEmail?: string;
  showContactInfo?: boolean;
  className?: string;
}

/**
 * Coming Soon overlay for payment features
 * Shows a friendly message that payments are being set up
 * and provides contact info for manual processing
 */
const PaymentComingSoon: React.FC<PaymentComingSoonProps> = ({
  title,
  message,
  contactEmail = 'sales@balkanestateai.com',
  showContactInfo = true,
  className = '',
}) => {
  const { t } = useTranslation(['common']);

  return (
    <div className={`bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-2 border-amber-200 rounded-2xl p-6 sm:p-8 text-center ${className}`}>
      {/* Icon */}
      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl shadow-lg mb-4">
        <span className="text-3xl">🚧</span>
      </div>

      {/* Title */}
      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
        {title || t('common:comingSoon.title', 'Payments Coming Soon')}
      </h3>

      {/* Message */}
      <p className="text-gray-600 mb-4 max-w-md mx-auto">
        {message || t('common:comingSoon.message', 'We are setting up our payment system. In the meantime, contact us to process your order manually.')}
      </p>

      {/* Contact Info */}
      {showContactInfo && (
        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-amber-100 max-w-sm mx-auto">
          <p className="text-sm text-gray-500 mb-2">
            {t('common:comingSoon.contactUs', 'Contact us for manual processing:')}
          </p>
          <a
            href={`mailto:${contactEmail}?subject=Payment%20Request%20-%20BalkanEstate`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
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
        {t('common:comingSoon.badge', 'Payment integration in progress')}
      </div>
    </div>
  );
};

export default PaymentComingSoon;
