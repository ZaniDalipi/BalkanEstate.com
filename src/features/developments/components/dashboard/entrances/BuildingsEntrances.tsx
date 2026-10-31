import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDevelopmentStructure } from '../../../hooks';
import { roleCan } from '../inventory/permissions';
import { BuildingEntrancesCard } from './BuildingEntrancesCard';

/**
 * "Buildings & entrances" on the Inventory tab: every building with its
 * entrances, and a spreadsheet import per building. Hidden until there is a
 * building.
 */
export const BuildingsEntrances: React.FC<{ developmentId: string; role?: string }> = ({ developmentId, role }) => {
  const { t } = useTranslation('developments');
  const { buildings, entrances } = useDevelopmentStructure(developmentId);
  if (buildings.length === 0) return null;
  return (
    <section aria-labelledby="entrances-heading" className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 id="entrances-heading" className="text-base font-semibold text-slate-900">{t('entrance.sectionTitle', 'Buildings & entrances')}</h2>
      <p className="mb-3 mt-1 text-sm text-slate-600">
        {t('entrance.sectionHint', 'Name each door buyers use — main entrance, side door, car park. Then mark it on your pictures in the Interactive explorer.')}
      </p>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {buildings.map((b) => (
          <BuildingEntrancesCard
            key={b.id}
            developmentId={developmentId}
            building={b}
            entrances={entrances.filter((e) => e.buildingId === b.id).sort((x, y) => x.order - y.order)}
            canManage={roleCan(role, 'building.manage')}
            canImport={roleCan(role, 'unit.manage')}
          />
        ))}
      </div>
    </section>
  );
};
