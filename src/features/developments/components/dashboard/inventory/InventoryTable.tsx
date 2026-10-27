import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '@/src/hooks/useMediaQuery';
import { useNotification } from '@/src/shared/hooks/useNotification';
import { useDevelopmentStructure } from '../../../hooks/useDevelopment';
import { useInventoryQuery } from '../../../hooks/useInventoryQuery';
import { useUnitAdmin } from '../../../hooks/useUnitAdmin';
import { EmptyState, ErrorState, LoadingState } from '../../shared/States';
import type { DashboardUnit } from '../../../types';
import { InventoryBulkBar } from './InventoryBulkBar';
import { InventoryCards } from './InventoryCards';
import { InventoryGrid } from './InventoryGrid';
import { InventoryPagination } from './InventoryPagination';
import { InventoryToolbar } from './InventoryToolbar';
import { UnitEditDialog } from './UnitEditDialog';
import { editPermissions } from './permissions';

interface InventoryTableProps {
  developmentId: string;
  /** Caller's development role (from GET /dashboard/developments/:id). */
  role?: string;
  /** Used for the CSV file name. */
  slug?: string;
}

/**
 * Server-driven inventory: debounced search, filters, sortable columns,
 * pagination, row selection with bulk actions, CSV export and the unit editor.
 * Cards replace the table below the md breakpoint.
 */
export const InventoryTable: React.FC<InventoryTableProps> = ({ developmentId, role, slug }) => {
  const { t } = useTranslation('developments');
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const notify = useNotification();
  const inv = useInventoryQuery(developmentId);
  const { buildings, floors } = useDevelopmentStructure(developmentId);
  const { exportCsv, isExporting } = useUnitAdmin(developmentId);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<DashboardUnit | null>(null);
  const permissions = useMemo(() => editPermissions(role), [role]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected((prev) => {
      const pageIds = inv.units.map((u) => u.id);
      const all = pageIds.length > 0 && pageIds.every((id) => prev.has(id));
      const next = new Set(prev);
      pageIds.forEach((id) => (all ? next.delete(id) : next.add(id)));
      return next;
    });

  const onExport = () =>
    exportCsv(slug ? `${slug}-units.csv` : undefined).catch((err: { message?: string }) => {
      void notify.error(t('inventory.exportFailed', 'Export failed'), err?.message || t('errors.generic'));
    });

  const viewProps = {
    units: inv.units,
    selected,
    onToggle: toggle,
    onToggleAll: toggleAll,
    sort: inv.sort,
    onSort: inv.toggleSort,
    onEdit: setEditing,
  };

  let body: React.ReactNode;
  if (inv.isLoading) body = <LoadingState rows={5} />;
  else if (inv.error && inv.units.length === 0)
    body = <ErrorState message={t('inventory.loadFailed', 'Could not load units.')} onRetry={() => inv.refetch()} retryLabel={t('inventory.retry', 'Retry')} />;
  else if (inv.units.length === 0)
    body = inv.hasFilters ? (
      <EmptyState
        title={t('inventory.noMatches', 'No units match these filters.')}
        action={
          <button type="button" onClick={inv.resetFilters} className="text-sm font-medium text-primary underline">
            {t('inventory.filters.clear', 'Clear filters')}
          </button>
        }
      />
    ) : (
      <EmptyState title={t('unit.none', 'No units yet.')} description={t('inventory.emptyHint', 'Add buildings, floors and units above to build your inventory.')} />
    );
  else body = isDesktop ? <InventoryGrid {...viewProps} /> : <InventoryCards {...viewProps} />;

  return (
    <div className="space-y-4">
      <InventoryToolbar
        developmentId={developmentId}
        filters={inv.filters}
        setFilter={inv.setFilter}
        resetFilters={inv.resetFilters}
        hasFilters={inv.hasFilters}
        buildings={buildings}
        floors={floors}
        onExport={onExport}
        isExporting={isExporting}
      />
      <div aria-busy={inv.isFetching} className={inv.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
        {body}
      </div>
      {inv.total > 0 && (
        <InventoryPagination total={inv.total} limit={inv.limit} skip={inv.skip} onLimit={inv.setLimit} onSkip={inv.setSkip} isFetching={inv.isFetching} />
      )}
      <InventoryBulkBar
        developmentId={developmentId}
        selectedIds={[...selected]}
        withExtras={inv.units.filter((u) => selected.has(u.id) && (u.linkedUnitIds?.length ?? 0) > 0).length}
        permissions={permissions}
        onClear={() => setSelected(new Set())}
      />
      {editing && (
        <UnitEditDialog
          key={editing.id}
          developmentId={developmentId}
          unit={editing}
          role={role}
          buildings={buildings}
          floors={floors}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
};
