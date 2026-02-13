/**
 * ContactSuccess Component
 * Success state displayed after successful form submission
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

interface ContactSuccessProps {
  onReset: () => void;
}

const ContactSuccess: React.FC<ContactSuccessProps> = ({ onReset }) => {
  const { t } = useTranslation(['contact', 'common']);

  return (
    <div className="text-center py-10 px-4">
      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100/80 backdrop-blur-sm mb-5">
        <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-2xl font-bold text-neutral-900 mb-2">
        {t('contact:success.title', 'Message Sent!')}
      </h3>
      <p className="text-neutral-600 mb-8 max-w-sm mx-auto">
        {t('contact:success.description', 'Thank you for reaching out. Our team will get back to you within 24 hours.')}
      </p>
      <button
        onClick={onReset}
        className="px-6 py-2.5 bg-primary/10 text-primary rounded-xl font-semibold hover:bg-primary/20 transition-colors"
      >
        {t('contact:success.sendAnother', 'Send Another Message')}
      </button>
    </div>
  );
};

export default ContactSuccess;
