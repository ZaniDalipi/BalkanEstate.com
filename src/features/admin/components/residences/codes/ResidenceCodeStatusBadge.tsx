import React from 'react';
import type { ResidenceCodeStatus } from '../../../api/residenceCodeAdminApi';
import { useResidenceCodeText } from './useResidenceCodeText';

const TONE: Record<ResidenceCodeStatus, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  used: 'bg-gray-200 text-gray-800',
  expired: 'bg-amber-100 text-amber-800',
  disabled: 'bg-red-100 text-red-800',
  scheduled: 'bg-sky-100 text-sky-800',
};

/** Where a code stands, in words and colour. */
export const ResidenceCodeStatusBadge: React.FC<{ status: ResidenceCodeStatus }> = ({ status }) => {
  const { statusLabel } = useResidenceCodeText();
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TONE[status]}`}>{statusLabel(status)}</span>;
};
