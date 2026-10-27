import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNotification } from '@/src/shared/hooks/useNotification';
import type { AdminResidence } from '../../api/residenceAdminApi';
import { useResidenceAdminActions } from '../../hooks/useResidenceAdmin';
import { AgencyAllowanceDialog } from './AgencyAllowanceDialog';
import { NumberDialog } from './NumberDialog';
import type { ResidenceAction } from './ResidenceActions';
import { buildingLimitProblem, MAX_BUILDING_LIMIT, MAX_GRANT_MONTHS, rangeProblem } from './residenceAdminValidation';
import { useResidenceAdminText } from './useResidenceAdminText';

interface ResidenceDialogsProps {
  open: { action: ResidenceAction; residence: AdminResidence } | null;
  includedBuildings: number;
  onClose: () => void;
}

/** The dialog for whichever admin action was picked on a residence. */
export const ResidenceDialogs: React.FC<ResidenceDialogsProps> = ({ open, includedBuildings, onClose }) => {
  const { t } = useTranslation(['admin']);
  const notify = useNotification();
  const { problemText } = useResidenceAdminText();
  const { setLimit, grant } = useResidenceAdminActions();
  if (!open) return null;
  const r = open.residence;
  const saved = (message: string) => void notify.success(t('admin:residences.saved', 'Saved'), message);

  if (open.action === 'buildings') {
    return (
      <NumberDialog
        title={t('admin:residences.limit.title', { name: r.name, defaultValue: 'Building limit · {{name}}' })}
        label={t('admin:residences.limit.label', 'Buildings this residence can have')}
        help={t('admin:residences.limit.help', { used: r.buildings.used, included: includedBuildings, defaultValue: 'It has {{used}} now. Without a custom limit: {{included}} (plus any bought).' })}
        initial={String(r.buildings.adminLimit ?? r.buildings.limit)}
        validate={(raw) => {
          const p = buildingLimitProblem(raw, r.buildings.used);
          return p ? problemText(p, MAX_BUILDING_LIMIT, r.buildings.used) : null;
        }}
        submitLabel={t('admin:residences.limit.submit', 'Save limit')}
        secondary={
          r.buildings.adminLimit !== null
            ? { label: t('admin:residences.limit.reset', 'Back to the standard limit'), onClick: async () => { await setLimit({ id: r.id, limit: null }); saved(r.name); } }
            : undefined
        }
        onSubmit={async (limit) => {
          await setLimit({ id: r.id, limit });
          saved(t('admin:residences.limit.saved', { name: r.name, limit, defaultValue: '{{name}} can now have {{limit}} buildings.' }));
        }}
        onClose={onClose}
      />
    );
  }
  if (open.action === 'grant') {
    return (
      <NumberDialog
        title={t('admin:residences.grant.title', { name: r.name, defaultValue: 'Give a Residence Pass · {{name}}' })}
        label={t('admin:residences.grant.label', 'Months')}
        help={t('admin:residences.grant.help', 'Free, added after any pass it already has.')}
        initial="12"
        withNote
        validate={(raw) => {
          const p = rangeProblem(raw, MAX_GRANT_MONTHS);
          return p ? problemText(p, MAX_GRANT_MONTHS) : null;
        }}
        submitLabel={t('admin:residences.grant.submit', 'Give pass')}
        onSubmit={async (months, note) => {
          await grant({ id: r.id, months, note });
          saved(t('admin:residences.grant.saved', { name: r.name, months, defaultValue: '{{name}}: {{months}} months added.' }));
        }}
        onClose={onClose}
      />
    );
  }
  return r.agency ? <AgencyAllowanceDialog agencyId={r.agency.id} agencyName={r.agency.name} onClose={onClose} /> : null;
};
