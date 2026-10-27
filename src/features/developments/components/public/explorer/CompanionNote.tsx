import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link2 } from 'lucide-react';
import type { PublicUnit } from '../../../types';
import { useUnitText } from './useUnitText';

interface CompanionNoteProps {
  comesWith: PublicUnit[];
  soldWith: PublicUnit[];
}

/**
 * On the hover card: "Comes with Parking P1 · Storage S1" for an apartment,
 * "Sold with Apt A12" for a parking spot. Matches the dashed regions that
 * light up on the picture at the same time.
 */
export const CompanionNote: React.FC<CompanionNoteProps> = ({ comesWith, soldWith }) => {
  const { t } = useTranslation('developments');
  const txt = useUnitText();
  const line = (label: string, units: PublicUnit[]) => (
    <p className="flex items-start gap-1.5">
      <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        <span className="font-semibold">{label}</span> {units.map(txt.title).join(' · ')}
      </span>
    </p>
  );
  if (!comesWith.length && !soldWith.length) return null;
  return (
    <div className="mt-3 space-y-1 rounded-lg border border-dashed border-teal-400 bg-teal-50/60 px-2.5 py-1.5 text-xs text-teal-900">
      {comesWith.length > 0 && line(t('companions.comesWith', 'Comes with'), comesWith)}
      {soldWith.length > 0 && line(t('companions.soldWith', 'Sold with'), soldWith)}
    </div>
  );
};
