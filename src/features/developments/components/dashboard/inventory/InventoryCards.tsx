import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';
import type { InventorySortField } from '../../../hooks/useInventoryQuery';
import type { InventoryViewProps } from './InventoryGrid';
import { AvailabilityCell, ListingsCell, PriceCell, RelativeTime, VisibilityChip, areaText } from './InventoryCells';

const SORT_FIELDS: InventorySortField[] = ['unitNumber', 'floor', 'price', 'updatedAt'];

/** Mobile inventory: one card per unit, tap to edit, checkbox to select. */
export const InventoryCards: React.FC<InventoryViewProps> = ({ units, selected, onToggle, onToggleAll, sort, onSort, onEdit }) => {
  const { t } = useTranslation('developments');
  const allSelected = units.length > 0 && units.every((u) => selected.has(u.id));
  const sortField = sort.replace(/^-/, '') as InventorySortField;
  const sortLabel = (f: InventorySortField) =>
    ({
      unitNumber: t('unit.number', 'Unit number'),
      floor: t('inventory.col.floor', 'Floor'),
      price: t('unit.price', 'Price'),
      updatedAt: t('inventory.col.updated', 'Updated'),
    })[f];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="flex min-h-[44px] items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={allSelected} onChange={onToggleAll} className="h-5 w-5" />
          {t('inventory.selectAll', 'Select all units on this page')}
        </label>
        <div className="flex items-center gap-1">
          <select
            aria-label={t('inventory.sortBy', 'Sort by')}
            value={sortField}
            onChange={(e) => onSort(e.target.value as InventorySortField)}
            className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-2 text-sm"
          >
            {SORT_FIELDS.map((f) => (
              <option key={f} value={f}>{sortLabel(f)}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onSort(sortField)}
            aria-label={t('inventory.toggleDirection', 'Toggle sort direction')}
            className="min-h-[44px] min-w-[44px] rounded-lg border border-slate-300 bg-white text-sm"
          >
            {sort.startsWith('-') ? '↓' : '↑'}
          </button>
        </div>
      </div>
      <ul className="space-y-2">
        {units.map((u) => (
          <li key={u.id} className={cn('rounded-xl border bg-white p-3', selected.has(u.id) ? 'border-primary' : 'border-slate-200')}>
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selected.has(u.id)}
                onChange={() => onToggle(u.id)}
                aria-label={t('inventory.selectUnit', 'Select unit {{number}}', { number: u.unitNumber })}
                className="mt-1 h-5 w-5"
              />
              <button type="button" onClick={() => onEdit(u)} className="min-w-0 flex-1 text-left">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{u.unitNumber}</span>
                  <PriceCell unit={u} />
                </div>
                <p className="mt-0.5 text-xs text-slate-600">
                  {u.buildingName || '—'} · {u.floorLabel || '—'} · {u.unitType} · {u.beds ?? '—'}/{u.baths ?? '—'} · {areaText(u)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <AvailabilityCell unit={u} />
                  <VisibilityChip unit={u} />
                </div>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <ListingsCell unit={u} />
                  <RelativeTime iso={u.updatedAt} />
                </div>
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
