import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FeedRun } from '../../types/propertyImports';
import MutationError from './MutationError';

interface ActivationBoxProps {
  preview: FeedRun;
  statement: string;
  activating: boolean;
  error: unknown;
  onActivate: (acceptListingLimit: boolean) => void;
}

/** The authorization confirmation and plan check that gate the first import. */
const ActivationBox: React.FC<ActivationBoxProps> = ({ preview, statement, activating, error, onActivate }) => {
  const { t } = useTranslation(['agencyDashboard']);
  const [authorized, setAuthorized] = useState(false);
  const [acceptLimit, setAcceptLimit] = useState(false);
  const exceeds = preview.limit.wouldExceed;
  const canActivate = preview.status === 'previewed' && preview.counts.valid > 0 && authorized && (!exceeds || acceptLimit);

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-3">
      <h4 className="text-sm font-semibold text-gray-900">{t('agencyDashboard:imports.activate.title', 'Activate daily imports')}</h4>
      <label className="flex items-start gap-2 text-sm text-gray-800">
        <input type="checkbox" className="mt-1 rounded border-gray-300 text-indigo-600" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} />
        <span>{t('agencyDashboard:imports.activate.statement', statement)}</span>
      </label>
      {exceeds && (
        <label className="flex items-start gap-2 text-sm text-gray-800">
          <input type="checkbox" className="mt-1 rounded border-gray-300 text-indigo-600" checked={acceptLimit} onChange={(e) => setAcceptLimit(e.target.checked)} />
          <span>
            {t('agencyDashboard:imports.activate.acceptLimit', 'Import only up to my plan allowance ({{remaining}} listings). The other {{excess}} stay unpublished until I have room.', {
              remaining: preview.limit.remaining ?? 0, excess: preview.limit.newListings - (preview.limit.remaining ?? 0),
            })}
          </span>
        </label>
      )}
      <MutationError error={error} />
      <button
        type="button"
        onClick={() => onActivate(acceptLimit)}
        disabled={!canActivate || activating}
        className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
      >
        {activating ? t('agencyDashboard:imports.activate.activating', 'Activating…') : t('agencyDashboard:imports.activate.button', 'Activate and import now')}
      </button>
    </div>
  );
};

export default ActivationBox;
