import React from 'react';
import { useTranslation } from 'react-i18next';
import { QuickAddInventory } from './inventory/QuickAddInventory';
import { InventoryTable } from './inventory/InventoryTable';
import { ImportUnitsButton } from './inventory/import/ImportUnitsButton';
import { roleCan } from './inventory/permissions';

interface InventoryPanelProps {
  developmentId: string;
  slug?: string;
  role?: string;
}

/** Inventory tab: spreadsheet import and the quick builder (buildings, floors, units) above the unit table. */
export const InventoryPanel: React.FC<InventoryPanelProps> = ({ developmentId, slug, role }) => {
  const { t } = useTranslation('developments');
  return (
    <div className="space-y-6">
      <section aria-labelledby="quick-add-heading" className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="quick-add-heading" className="text-base font-semibold text-slate-900">
            {t('manage.inventory.quickAdd', 'Add buildings, floors and units')}
          </h2>
          {roleCan(role, 'unit.manage') && <ImportUnitsButton developmentId={developmentId} />}
        </div>
        <QuickAddInventory developmentId={developmentId} />
      </section>
      <section aria-labelledby="units-heading">
        <h2 id="units-heading" className="mb-3 text-base font-semibold text-slate-900">
          {t('detail.units', 'Units')}
        </h2>
        <InventoryTable developmentId={developmentId} role={role} slug={slug} />
      </section>
    </div>
  );
};
