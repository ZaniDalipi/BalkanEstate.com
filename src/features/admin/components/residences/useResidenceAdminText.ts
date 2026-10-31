import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminResidenceFilter, AdminResidenceState } from '../../api/residenceAdminApi';
import type { NumberProblem } from './residenceAdminValidation';

/** Wording for the admin Residences screen: plan states, filters, dates, number problems. */
export function useResidenceAdminText() {
  const { t, i18n } = useTranslation(['admin']);

  const stateLabel = useCallback(
    (s: AdminResidenceState) =>
      ({
        none: t('admin:residences.state.none', 'Not published'),
        trial: t('admin:residences.state.trial', 'Free trial'),
        active: t('admin:residences.state.active', 'Residence Pass'),
        included: t('admin:residences.state.included', 'Plan included'),
        agency: t('admin:residences.state.agency', 'Agency free'),
        expired: t('admin:residences.state.expired', 'Ended'),
      })[s],
    [t]
  );

  const filterLabel = useCallback(
    (f: AdminResidenceFilter) =>
      ({
        all: t('admin:residences.filter.all', 'All'),
        public: t('admin:residences.filter.public', 'Public'),
        offline: t('admin:residences.filter.offline', 'Offline'),
        draft: t('admin:residences.filter.draft', 'Drafts'),
        trial: t('admin:residences.filter.trial', 'On trial'),
        pass: t('admin:residences.filter.pass', 'With pass'),
        agency: t('admin:residences.filter.agency', 'Agency free'),
      })[f],
    [t]
  );

  const day = useCallback(
    (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString(i18n.language, { dateStyle: 'medium' }) : '—'),
    [i18n.language]
  );

  const problemText = useCallback(
    (p: NumberProblem, max: number, used = 0) =>
      ({
        required: t('admin:residences.problem.required', 'Enter a number.'),
        whole: t('admin:residences.problem.whole', 'Use a whole number.'),
        range: t('admin:residences.problem.range', { max, defaultValue: 'Use a number from 1 to {{max}}.' }),
        belowUsed: t('admin:residences.problem.belowUsed', { used, defaultValue: 'This residence already has {{used}} buildings.' }),
      })[p],
    [t]
  );

  return { stateLabel, filterLabel, day, problemText };
}
