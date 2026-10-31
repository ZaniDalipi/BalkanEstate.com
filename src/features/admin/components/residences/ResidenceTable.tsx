import React from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminResidence } from '../../api/residenceAdminApi';
import { ResidenceActions, type ResidenceAction } from './ResidenceActions';
import { ResidenceStateBadge } from './ResidenceStateBadge';
import { useResidenceAdminText } from './useResidenceAdminText';

interface ResidenceTableProps {
  items: AdminResidence[];
  onAction: (action: ResidenceAction, residence: AdminResidence) => void;
}

const th = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500';

/** Residences on large screens. */
export const ResidenceTable: React.FC<ResidenceTableProps> = ({ items, onAction }) => {
  const { t } = useTranslation(['admin']);
  const { day } = useResidenceAdminText();
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className={th}>{t('admin:residences.col.residence', 'Residence')}</th>
            <th scope="col" className={th}>{t('admin:residences.col.owner', 'Owner / agency')}</th>
            <th scope="col" className={th}>{t('admin:residences.col.plan', 'Plan')}</th>
            <th scope="col" className={th}>{t('admin:residences.col.publicUntil', 'Public until')}</th>
            <th scope="col" className={th}>{t('admin:residences.col.buildings', 'Buildings')}</th>
            <th scope="col" className={th}><span className="sr-only">{t('admin:residences.col.actions', 'Actions')}</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((r) => (
            <tr key={r.id} className="align-top">
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900">{r.name}</p>
                <p className="text-sm text-gray-500">{r.city}</p>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {r.agency ? <span className="font-medium">{r.agency.name}</span> : r.owner?.name ?? '—'}
                {r.owner?.email && <p className="text-xs text-gray-500">{r.owner.email}</p>}
              </td>
              <td className="px-4 py-3"><ResidenceStateBadge state={r.state} /></td>
              <td className="px-4 py-3 text-sm text-gray-700">{r.publicNow ? day(r.visibleUntil) : t('admin:residences.notPublic', 'Not public')}</td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {r.buildings.used} / {r.buildings.limit}
                {r.buildings.adminLimit !== null && <span className="ml-1 text-xs text-blue-700">{t('admin:residences.custom', 'custom')}</span>}
              </td>
              <td className="px-4 py-3"><ResidenceActions residence={r} onAction={onAction} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
