import React from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminResidence } from '../../api/residenceAdminApi';

export type ResidenceAction = 'buildings' | 'grant' | 'agency';

interface ResidenceActionsProps {
  residence: AdminResidence;
  onAction: (action: ResidenceAction, residence: AdminResidence) => void;
}

const btn = 'min-h-[44px] rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';

/** The admin's three levers on a residence: building limit, a free pass, and (agency residences) the agency's free residences. */
export const ResidenceActions: React.FC<ResidenceActionsProps> = ({ residence, onAction }) => {
  const { t } = useTranslation(['admin']);
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={btn} onClick={() => onAction('buildings', residence)}>
        {t('admin:residences.action.buildings', 'Building limit')}
      </button>
      <button type="button" className={btn} onClick={() => onAction('grant', residence)}>
        {t('admin:residences.action.grant', 'Give pass')}
      </button>
      {residence.agency && (
        <button type="button" className={btn} onClick={() => onAction('agency', residence)}>
          {t('admin:residences.action.agency', 'Agency residences')}
        </button>
      )}
    </div>
  );
};
