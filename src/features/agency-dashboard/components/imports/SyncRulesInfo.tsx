import React from 'react';
import { useTranslation } from 'react-i18next';
import type { FeedMeta } from '../../types/propertyImports';

/** States plainly which fields the feed controls and which stay editable here. */
const SyncRulesInfo: React.FC<{ meta: FeedMeta }> = ({ meta }) => {
  const { t } = useTranslation(['agencyDashboard']);
  return (
    <details className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
      <summary className="cursor-pointer font-semibold text-gray-900">
        {t('agencyDashboard:imports.rules.title', 'What the feed updates — and what stays yours')}
      </summary>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
        <div>
          <h5 className="font-medium text-gray-900">{t('agencyDashboard:imports.rules.managedTitle', 'Updated from the feed')}</h5>
          <p className="mt-1">
            {meta.sourceManagedFields.map((f) => t(`agencyDashboard:imports.fields.${f}`, f)).join(', ')}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            {t('agencyDashboard:imports.rules.localEdits', 'If you edit one of these on BalkanEstateAI, your edit is kept and reported in the import results instead of being overwritten.')}
          </p>
        </div>
        <div>
          <h5 className="font-medium text-gray-900">{t('agencyDashboard:imports.rules.localTitle', 'Only edited here, never by the feed')}</h5>
          <ul className="mt-1 list-disc pl-5">
            {meta.localOnly.map((item, i) => (
              <li key={item}>{t(`agencyDashboard:imports.rules.local.${i}`, item)}</li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-500">
        {t('agencyDashboard:imports.rules.removal', 'Listings are never deleted. A listing missing from a complete feed is moved to draft and comes back automatically if it reappears. Listings you created by hand are never touched.')}
      </p>
    </details>
  );
};

export default SyncRulesInfo;
