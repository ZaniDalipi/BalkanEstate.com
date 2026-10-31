import React from 'react';
import type { AdminResidenceState } from '../../api/residenceAdminApi';
import { useResidenceAdminText } from './useResidenceAdminText';

const STYLE: Record<AdminResidenceState, string> = {
  none: 'bg-gray-100 text-gray-700',
  trial: 'bg-amber-50 text-amber-800',
  active: 'bg-emerald-50 text-emerald-800',
  included: 'bg-sky-50 text-sky-800',
  agency: 'bg-teal-50 text-teal-800',
  expired: 'bg-red-50 text-red-800',
};

export const ResidenceStateBadge: React.FC<{ state: AdminResidenceState }> = ({ state }) => {
  const { stateLabel } = useResidenceAdminText();
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLE[state]}`}>{stateLabel(state)}</span>;
};
