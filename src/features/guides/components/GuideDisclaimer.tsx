import React from 'react';
import { useTranslation } from 'react-i18next';
import { ExclamationTriangleIcon } from '@/constants';
import { GUIDES_LAST_REVIEWED } from '../data/countryGuides';
import { formatReviewDate } from '../utils/guideSelectors';

/** Not legal advice, and when the figures were last checked. */
export const GuideDisclaimer: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t, i18n } = useTranslation('common');
  const showsEnglishContent = !i18n.language?.startsWith('en');
  return (
    <aside
      className={`rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5 text-sm text-amber-900 ${className}`}
      aria-label={t('common:guides.disclaimerTitle', 'Good to know')}
    >
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 text-amber-600 mt-0.5" aria-hidden="true" />
        <div className="space-y-1.5">
          <p className="font-semibold">{t('common:guides.disclaimerTitle', 'Good to know')}</p>
          <p className="leading-relaxed">
            {t(
              'common:guides.disclaimer',
              'This guide is general information, not legal or tax advice. Rules and rates change — confirm the details with a licensed local lawyer or notary before you buy.',
            )}
          </p>
          <p className="text-amber-800/80">
            {t('common:guides.lastReviewed', 'Last reviewed {{date}}', {
              date: formatReviewDate(GUIDES_LAST_REVIEWED, i18n.language || 'en'),
            })}
            {showsEnglishContent && <> · {t('common:guides.englishContentNote', 'Detailed guide text is currently available in English.')}</>}
          </p>
        </div>
      </div>
    </aside>
  );
};
