import React from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminResidence } from '../../api/residenceAdminApi';
import { ResidenceActions, type ResidenceAction } from './ResidenceActions';
import { ResidenceStateBadge } from './ResidenceStateBadge';
import { useResidenceAdminText } from './useResidenceAdminText';

interface ResidenceCardProps {
  residence: AdminResidence;
  onAction: (action: ResidenceAction, residence: AdminResidence) => void;
}

/** One residence on phones and small tablets: stacked, no sideways scrolling. */
export const ResidenceCard: React.FC<ResidenceCardProps> = ({ residence: r, onAction }) => {
  const { t } = useTranslation(['admin']);
  const { day } = useResidenceAdminText();
  return (
    <li className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-gray-900">{r.name}</p>
          <p className="truncate text-sm text-gray-500">{r.agency?.name ?? r.owner?.name ?? '—'} · {r.city}</p>
        </div>
        <ResidenceStateBadge state={r.state} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-gray-500">{t('admin:residences.col.publicUntil', 'Public until')}</dt>
          <dd className="font-medium text-gray-900">{r.publicNow ? day(r.visibleUntil) : t('admin:residences.notPublic', 'Not public')}</dd>
        </div>
        <div>
          <dt className="text-gray-500">{t('admin:residences.col.buildings', 'Buildings')}</dt>
          <dd className="font-medium text-gray-900">
            {r.buildings.used} / {r.buildings.limit}
            {r.buildings.adminLimit !== null && <span className="ml-1 text-xs text-blue-700">{t('admin:residences.custom', 'custom')}</span>}
          </dd>
        </div>
      </dl>
      <div className="mt-auto pt-3">
        <ResidenceActions residence={r} onAction={onAction} />
      </div>
    </li>
  );
};
