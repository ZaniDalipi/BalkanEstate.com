/**
 * ContactSuccess Component
 * Success state displayed after successful form submission
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon } from '@/src/shared/illustrations';

interface ContactSuccessProps {
  onReset: () => void;
}

const ContactSuccess: React.FC<ContactSuccessProps> = ({ onReset }) => {
  const { t } = useTranslation(['contact', 'common']);

  return (
    <div className="text-center py-10 px-4">
      <SoftIcon name="check" className="mx-auto h-16 w-16 mb-5" />
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
