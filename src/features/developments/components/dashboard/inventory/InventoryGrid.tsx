import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil } from 'lucide-react';
import { sortDirection, type InventorySortField } from '../../../hooks/useInventoryQuery';
import type { DashboardUnit, UnitSort } from '../../../types';
import { AvailabilityCell, ListingsCell, PriceCell, RelativeTime, VisibilityChip, areaText } from './InventoryCells';

export interface InventoryViewProps {
  units: DashboardUnit[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  sort: UnitSort;
  onSort: (field: InventorySortField) => void;
  onEdit: (unit: DashboardUnit) => void;
}

const SortHeader: React.FC<{ field: InventorySortField; label: string; sort: UnitSort; onSort: (f: InventorySortField) => void }> = ({
  field,
  label,
  sort,
  onSort,
}) => {
  const dir = sortDirection(sort, field);
  const Icon = dir === 'ascending' ? ArrowUp : dir === 'descending' ? ArrowDown : ArrowUpDown;
  return (
    <th scope="col" aria-sort={dir} className="px-3 py-2 font-medium">
      <button type="button" onClick={() => onSort(field)} className="inline-flex items-center gap-1 rounded hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        {label}
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </th>
  );
};

/** Desktop inventory table: selectable rows, sortable columns. */
export const InventoryGrid: React.FC<InventoryViewProps> = ({ units, selected, onToggle, onToggleAll, sort, onSort, onEdit }) => {
  const { t } = useTranslation('developments');
  const allSelected = units.length > 0 && units.every((u) => selected.has(u.id));

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[1000px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th scope="col" className="w-10 px-3 py-2">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                aria-label={t('inventory.selectAll', 'Select all units on this page')}
                className="h-4 w-4"
              />
            </th>
            <SortHeader field="unitNumber" label={t('unit.number', 'Unit number')} sort={sort} onSort={onSort} />
            <SortHeader field="floor" label={t('inventory.col.buildingFloor', 'Building / floor')} sort={sort} onSort={onSort} />
            <th scope="col" className="px-3 py-2 font-medium">{t('unit.type', 'Type')}</th>
            <th scope="col" className="px-3 py-2 font-medium">{t('inventory.col.bedsBaths', 'Beds / baths')}</th>
            <th scope="col" className="px-3 py-2 font-medium">{t('unit.area', 'Area')}</th>
            <SortHeader field="price" label={t('unit.price', 'Price')} sort={sort} onSort={onSort} />
            <th scope="col" className="px-3 py-2 font-medium">{t('unit.availability', 'Availability')}</th>
            <th scope="col" className="px-3 py-2 font-medium">{t('inventory.col.visibility', 'Visibility')}</th>
            <th scope="col" className="px-3 py-2 font-medium">{t('detail.listings', 'Listings')}</th>
            <SortHeader field="updatedAt" label={t('inventory.col.updated', 'Updated')} sort={sort} onSort={onSort} />
            <th scope="col" className="px-3 py-2"><span className="sr-only">{t('inventory.col.actions', 'Actions')}</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {units.map((u) => (
            <tr key={u.id} className={selected.has(u.id) ? 'bg-primary/5' : 'hover:bg-slate-50'}>
              <td className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={selected.has(u.id)}
                  onChange={() => onToggle(u.id)}
                  aria-label={t('inventory.selectUnit', 'Select unit {{number}}', { number: u.unitNumber })}
                  className="h-4 w-4"
                />
              </td>
              <td className="px-3 py-2 font-medium text-slate-900">{u.unitNumber}</td>
              <td className="px-3 py-2 text-slate-600">
                {u.buildingName || '—'} · {u.floorLabel || '—'}
              </td>
              <td className="px-3 py-2 text-slate-600">{u.unitType}</td>
              <td className="px-3 py-2 text-slate-600">{u.beds ?? '—'} / {u.baths ?? '—'}</td>
              <td className="whitespace-nowrap px-3 py-2 text-slate-600">{areaText(u)}</td>
              <td className="px-3 py-2"><PriceCell unit={u} /></td>
              <td className="px-3 py-2"><AvailabilityCell unit={u} /></td>
              <td className="px-3 py-2"><VisibilityChip unit={u} /></td>
              <td className="px-3 py-2"><ListingsCell unit={u} /></td>
              <td className="px-3 py-2"><RelativeTime iso={u.updatedAt} /></td>
              <td className="px-3 py-2 text-right">
                <button
                  type="button"
                  onClick={() => onEdit(u)}
                  aria-label={t('inventory.editUnit', 'Edit unit {{number}}', { number: u.unitNumber })}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
