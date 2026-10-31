import React from 'react';
import { useTranslation } from 'react-i18next';
import { useUnitCounts } from '../../hooks/useInventoryQuery';
import { useResidenceBilling } from '../../hooks/useResidenceBilling';
import { AVAILABILITY_META } from '../../utils/availability';
import { CoverImageUpload } from '../shared/CoverImageUpload';
import { ResidencePlanCard } from './billing/ResidencePlanCard';
import { PublishSection } from './PublishSection';
import type { Development, UnitAvailability } from '../../types';

interface OverviewPanelProps {
  development: Development;
  canPublish: boolean;
  /** Only the owner pays for the Residence Pass. */
  canBuy: boolean;
}

const Stat: React.FC<{ label: string; value?: number; state?: UnitAvailability }> = ({ label, value, state }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4">
    <p className="flex items-center gap-1.5 text-xs font-medium uppercase text-slate-500">
      {state && <span className={`h-2 w-2 rounded-full ${AVAILABILITY_META[state].dotClass}`} aria-hidden="true" />}
      {label}
    </p>
    <p className="mt-1 text-2xl font-semibold text-slate-900">{value ?? '—'}</p>
  </div>
);

/** Status + publish control, the Residence Pass plan, unit totals and the cover image. */
export const OverviewPanel: React.FC<OverviewPanelProps> = ({ development, canPublish, canBuy }) => {
  const { t } = useTranslation('developments');
  const counts = useUnitCounts(development.id);
  const { billing } = useResidenceBilling(development.id);

  return (
    <div className="space-y-6">
      <PublishSection development={development} billing={billing} canPublish={canPublish} canBuy={canBuy} />
      {billing && <ResidencePlanCard developmentId={development.id} billing={billing} canBuy={canBuy} />}

      <section aria-labelledby="overview-stats">
        <h2 id="overview-stats" className="mb-3 text-base font-semibold text-slate-900">
          {t('manage.overview.units', 'Units')}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label={t('manage.overview.total', 'Total')} value={counts.total} />
          <Stat label={t('availability.available', 'Available')} value={counts.available} state="available" />
          <Stat label={t('availability.reserved', 'Reserved')} value={counts.reserved} state="reserved" />
          <Stat label={t('availability.sold', 'Sold')} value={counts.sold} state="sold" />
        </div>
      </section>

      <section aria-labelledby="overview-cover">
        <h2 id="overview-cover" className="mb-3 text-base font-semibold text-slate-900">
          {t('cover.heading', 'Cover image')}
        </h2>
        <CoverImageUpload developmentId={development.id} coverImage={development.coverImage} />
      </section>
    </div>
  );
};
