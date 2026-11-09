import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { ResidenceCodeFilter, ResidenceCodeKind, ResidenceCodeStatus } from '../../../api/residenceCodeAdminApi';

/** Wording for Admin › Residences › Unlock codes. */
export function useResidenceCodeText() {
  const { t } = useTranslation(['admin']);
  const kindLabel = useCallback(
    (k: ResidenceCodeKind) => (k === 'pass' ? t('admin:residenceCodes.kind.pass', 'Residence Pass') : t('admin:residenceCodes.kind.extra_building', 'Extra buildings')),
    [t]
  );
  const statusLabel = useCallback(
    (s: ResidenceCodeStatus) =>
      ({
        active: t('admin:residenceCodes.status.active', 'Ready to use'),
        used: t('admin:residenceCodes.status.used', 'Used'),
        expired: t('admin:residenceCodes.status.expired', 'Expired'),
        disabled: t('admin:residenceCodes.status.disabled', 'Switched off'),
        scheduled: t('admin:residenceCodes.status.scheduled', 'Not yet valid'),
      })[s],
    [t]
  );
  const filterLabel = useCallback(
    (f: ResidenceCodeFilter) =>
      ({
        all: t('admin:residenceCodes.filter.all', 'All'),
        active: t('admin:residenceCodes.filter.active', 'Ready to use'),
        used: t('admin:residenceCodes.filter.used', 'Used'),
        expired: t('admin:residenceCodes.filter.expired', 'Expired'),
        disabled: t('admin:residenceCodes.filter.disabled', 'Switched off'),
      })[f],
    [t]
  );
  return { kindLabel, statusLabel, filterLabel };
}
