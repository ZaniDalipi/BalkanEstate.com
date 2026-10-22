import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/src/components/ui/button';
import { useConfirmation } from '@/src/shared/hooks/useConfirmation';
import { useNotification } from '@/src/shared/hooks/useNotification';
import { useUnitAdmin } from '../../../hooks/useUnitAdmin';
import { AVAILABILITY_ORDER } from '../../../utils/availability';
import type { BulkUnitUpdatePayload, UnitAvailability, UnitVisibility } from '../../../types';
import type { EditPermissions } from './permissions';

interface InventoryBulkBarProps {
  developmentId: string;
  selectedIds: string[];
  permissions: EditPermissions;
  onClear: () => void;
}

const selectClass =
  'min-h-[44px] rounded-lg border border-slate-300 bg-white px-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-[36px]';

/** Sticky action bar for the selected rows: bulk availability / visibility. */
export const InventoryBulkBar: React.FC<InventoryBulkBarProps> = ({ developmentId, selectedIds, permissions, onClear }) => {
  const { t } = useTranslation('developments');
  const { confirm } = useConfirmation();
  const notify = useNotification();
  const { bulkUpdate, isBulkUpdating } = useUnitAdmin(developmentId);
  const [availability, setAvailability] = useState<UnitAvailability | ''>('');
  const [visibility, setVisibility] = useState<UnitVisibility | ''>('');
  const count = selectedIds.length;

  const run = async (change: Omit<BulkUnitUpdatePayload, 'unitIds'>, label: string) => {
    const ok = await confirm({
      title: t('inventory.bulk.confirmTitle', 'Update {{count}} units?', { count }),
      message: t('inventory.bulk.confirmMessage', 'Set {{change}} on {{count}} selected units.', { count, change: label }),
      confirmLabel: t('inventory.bulk.apply', 'Apply'),
      cancelLabel: t('wizard.cancel', 'Cancel'),
      type: 'warning',
    });
    if (!ok) return;
    try {
      const { updated } = await bulkUpdate({ unitIds: selectedIds, ...change });
      onClear();
      setAvailability('');
      setVisibility('');
      void notify.success(
        t('inventory.bulk.successTitle', 'Units updated'),
        t('inventory.bulk.successMessage', '{{count}} units updated.', { count: updated })
      );
    } catch (err) {
      const e = err as { statusCode?: number; message?: string };
      void notify.error(
        t('inventory.bulk.errorTitle', 'Update failed'),
        e?.statusCode === 403 ? t('inventory.errors.forbidden', 'Your role is not allowed to make this change.') : e?.message || t('errors.generic')
      );
    }
  };

  if (count === 0) return null;

  return (
    <div role="region" aria-label={t('inventory.bulk.label', 'Bulk actions')} className="sticky bottom-2 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-white p-3 shadow-lg">
      <span className="mr-2 text-sm font-medium text-slate-900" aria-live="polite">
        {t('inventory.bulk.selected', '{{count}} selected', { count })}
      </span>
      {permissions.availability && (
        <div className="flex items-center gap-1">
          <select
            aria-label={t('inventory.bulk.setAvailability', 'Set availability')}
            value={availability}
            onChange={(e) => setAvailability(e.target.value as UnitAvailability)}
            className={selectClass}
          >
            <option value="">{t('inventory.bulk.setAvailability', 'Set availability')}</option>
            {AVAILABILITY_ORDER.map((s) => (
              <option key={s} value={s}>{t(`availability.${s}`)}</option>
            ))}
          </select>
          <Button type="button" size="sm" disabled={!availability || isBulkUpdating} onClick={() => availability && run({ availability }, t(`availability.${availability}`))}>
            {t('inventory.bulk.apply', 'Apply')}
          </Button>
        </div>
      )}
      {permissions.unit && (
        <div className="flex items-center gap-1">
          <select
            aria-label={t('inventory.bulk.setVisibility', 'Set visibility')}
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as UnitVisibility)}
            className={selectClass}
          >
            <option value="">{t('inventory.bulk.setVisibility', 'Set visibility')}</option>
            <option value="public">{t('inventory.visibility.public', 'Public')}</option>
            <option value="hidden">{t('inventory.visibility.hidden', 'Hidden')}</option>
          </select>
          <Button type="button" size="sm" disabled={!visibility || isBulkUpdating} onClick={() => visibility && run({ visibility }, t(`inventory.visibility.${visibility}`))}>
            {t('inventory.bulk.applyVisibility', 'Apply visibility')}
          </Button>
        </div>
      )}
      <Button type="button" size="sm" variant="ghost" onClick={onClear} className="ml-auto">
        {t('inventory.bulk.clear', 'Clear selection')}
      </Button>
    </div>
  );
};
