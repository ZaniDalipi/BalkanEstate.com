import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { ResidenceCodeDiscountType, ResidenceCodeFilter, ResidenceCodeKind, ResidenceCodeStatus } from '../../../api/residenceCodeAdminApi';

/** Wording for Admin › Residences › Unlock codes. */
export function useResidenceCodeText() {
  const { t, i18n } = useTranslation(['admin']);
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
  const discountLabel = useCallback(
    (type: ResidenceCodeDiscountType, value: number) => {
      if (type === 'percentage' && value >= 100) return t('admin:residenceCodes.discount.full', 'Whole price');
      if (type === 'percentage') return t('admin:residenceCodes.discount.percent', { value, defaultValue: '{{value}}% off' });
      const amount = new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
      return t('admin:residenceCodes.discount.fixed', { amount, defaultValue: '{{amount}} off' });
    },
    [t, i18n.language]
  );
  return { kindLabel, statusLabel, filterLabel, discountLabel };
}
