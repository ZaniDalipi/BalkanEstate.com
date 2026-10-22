import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/src/components/ui/button';
import { INVENTORY_PAGE_SIZES } from '../../../hooks/useInventoryQuery';

interface InventoryPaginationProps {
  total: number;
  limit: number;
  skip: number;
  onLimit: (limit: number) => void;
  onSkip: (skip: number) => void;
  isFetching?: boolean;
}

/** "1–25 of 312", page size and previous/next. */
export const InventoryPagination: React.FC<InventoryPaginationProps> = ({ total, limit, skip, onLimit, onSkip, isFetching }) => {
  const { t } = useTranslation('developments');
  const from = total === 0 ? 0 : skip + 1;
  const to = Math.min(skip + limit, total);

  return (
    <nav aria-label={t('inventory.pagination.label', 'Inventory pages')} className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
      <span aria-live="polite">
        {t('inventory.pagination.range', '{{from}}–{{to}} of {{total}}', { from, to, total })}
        {isFetching && <span className="ml-2 text-slate-400">{t('inventory.loading', 'Loading…')}</span>}
      </span>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1">
          <span>{t('inventory.pagination.perPage', 'Per page')}</span>
          <select
            value={limit}
            onChange={(e) => onLimit(Number(e.target.value))}
            className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-2 sm:min-h-[36px]"
          >
            {INVENTORY_PAGE_SIZES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <Button type="button" variant="outline" size="sm" disabled={skip === 0} onClick={() => onSkip(Math.max(0, skip - limit))} className="min-h-[44px] sm:min-h-[36px]">
          {t('inventory.pagination.previous', 'Previous')}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={skip + limit >= total} onClick={() => onSkip(skip + limit)} className="min-h-[44px] sm:min-h-[36px]">
          {t('inventory.pagination.next', 'Next')}
        </Button>
      </div>
    </nav>
  );
};
