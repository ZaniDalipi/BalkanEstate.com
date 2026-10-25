import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAgencyResidenceAllowance } from '../../hooks/useResidenceAdmin';
import { NumberDialog } from './NumberDialog';
import { MAX_EXTRA_RESIDENCES, rangeProblem } from './residenceAdminValidation';
import { useResidenceAdminText } from './useResidenceAdminText';

interface AgencyAllowanceCardProps {
  agencyId: string;
}

/**
 * An agency's free residences this subscription year (used of allowed, when
 * the year ends) with "Add free residences" — shown in the agency detail and
 * from the Residences screen.
 */
export const AgencyAllowanceCard: React.FC<AgencyAllowanceCardProps> = ({ agencyId }) => {
  const { t } = useTranslation(['admin']);
  const { day, problemText } = useResidenceAdminText();
  const { allowance: a, isLoading, error, add } = useAgencyResidenceAllowance(agencyId);
  const [adding, setAdding] = useState(false);

  if (isLoading) return <div className="h-28 animate-pulse rounded-xl bg-gray-100" aria-busy="true" />;
  if (error || !a) return <p className="text-sm text-red-700">{t('admin:residences.allowance.error', 'Could not load the agency’s residences.')}</p>;

  return (
    <section aria-labelledby={`allowance-${agencyId}`} className="rounded-xl border border-teal-200 bg-teal-50/50 p-4">
      <h3 id={`allowance-${agencyId}`} className="font-semibold text-gray-900">{t('admin:residences.allowance.title', 'Free residences')}</h3>
      {a.subscribed ? (
        <>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {t('admin:residences.allowance.usedOf', { used: a.used, allowed: a.allowed, defaultValue: '{{used}} of {{allowed}} used' })}
          </p>
          <p className="text-sm text-gray-600">
            {t('admin:residences.allowance.year', { from: day(a.yearStart), to: day(a.yearEnd), perYear: a.perYear, extra: a.extra, defaultValue: 'This subscription year: {{from}} – {{to}} · {{perYear}} per year + {{extra}} added' })}
          </p>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-3 min-h-[44px] w-full rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 sm:w-auto"
          >
            {t('admin:residences.allowance.add', 'Add free residences')}
          </button>
        </>
      ) : (
        <p className="mt-1 text-sm text-gray-700">
          {a.coveredUntil
            ? t('admin:residences.allowance.lapsed', { date: day(a.coveredUntil), defaultValue: 'No active subscription. Its free residences stay public until {{date}}.' })
            : t('admin:residences.allowance.none', 'No active subscription, so no free residences.')}
        </p>
      )}
      {adding && (
        <NumberDialog
          title={t('admin:residences.allowance.dialogTitle', { name: a.agencyName ?? '', defaultValue: 'Add free residences · {{name}}' })}
          label={t('admin:residences.allowance.dialogLabel', 'Extra residences for this subscription year')}
          initial="1"
          withNote
          validate={(raw) => {
            const p = rangeProblem(raw, MAX_EXTRA_RESIDENCES);
            return p ? problemText(p, MAX_EXTRA_RESIDENCES) : null;
          }}
          submitLabel={t('admin:residences.allowance.submit', 'Add')}
          onSubmit={async (extra, note) => {
            await add({ extra, note });
          }}
          onClose={() => setAdding(false)}
        />
      )}
    </section>
  );
};
