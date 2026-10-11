import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ForeignOwnership } from '../types/guide.types';

const STYLES: Record<ForeignOwnership, string> = {
  open: 'bg-green-50 text-green-700 ring-green-600/20',
  conditional: 'bg-amber-50 text-amber-800 ring-amber-600/20',
};

/** "Open to foreigners" / "Conditions apply" pill. */
export const OwnershipBadge: React.FC<{ ownership: ForeignOwnership; className?: string }> = ({
  ownership,
  className = '',
}) => {
  const { t } = useTranslation('common');
  const label =
    ownership === 'open'
      ? t('common:guides.ownershipOpen', 'Open to foreigners')
      : t('common:guides.ownershipConditional', 'Conditions apply');
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[ownership]} ${className}`}
    >
      {label}
    </span>
  );
};
