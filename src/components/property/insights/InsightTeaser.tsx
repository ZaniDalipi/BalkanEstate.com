// InsightTeaser — the call to action shown before a report exists.

import React from 'react';
import { useTranslation } from 'react-i18next';
import { SparklesIcon } from '../../../../constants';
import { SoftIcon } from '@/src/shared/illustrations';

interface InsightTeaserProps {
  isAuthenticated: boolean;
  onGenerate: () => void;
}

export const InsightTeaser: React.FC<InsightTeaserProps> = ({ isAuthenticated, onGenerate }) => {
  const { t } = useTranslation(['property']);
  return (
    <div className="text-center py-1 sm:py-2">
      <SoftIcon name="sparkles" className="mx-auto mb-3 sm:mb-4 w-14 h-14 sm:w-16 sm:h-16" />
      <h4 className="text-base sm:text-lg font-bold text-neutral-800">
        {t('neighborhood.aiTeaserTitle', 'Want to know more about this property?')}
      </h4>
      <p className="text-sm text-neutral-600 mt-1.5 mb-4 max-w-md mx-auto leading-relaxed">
        {t(
          'neighborhood.aiTeaserSubtitle',
          'Let our AI generate a detailed neighborhood report — nearby schools, transport, parks, shops and local amenities — in just seconds.'
        )}
      </p>
      {!isAuthenticated && (
        <p className="text-xs sm:text-sm text-amber-600 mb-4 font-semibold">
          <SoftIcon name="lock" className="inline-block w-4 h-4 mr-1 align-[-3px]" />
          {t('neighborhood.loginRequired')}
        </p>
      )}
      <button
        type="button"
        onClick={onGenerate}
        className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-3 bg-gradient-to-r from-primary to-primary-dark text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 w-full sm:w-auto motion-reduce:transform-none motion-reduce:transition-none"
      >
        <SparklesIcon className="w-5 h-5" />
        {isAuthenticated ? t('neighborhood.generateInsights') : t('neighborhood.loginAndGenerate')}
      </button>
    </div>
  );
};
