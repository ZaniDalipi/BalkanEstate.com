import React from 'react';
import { useTranslation } from 'react-i18next';
import { BedDouble, Bath, Maximize, Compass, Layers, Sun, Trees } from 'lucide-react';
import type { PublicUnit } from '../../../../types';
import { formatArea } from '../../../../utils/format';
import { unitArea } from '../../../../utils/unitFilters';

interface SpecProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

const Spec: React.FC<SpecProps> = ({ icon, label, value }) => (
  <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
    <span className="text-primary" aria-hidden="true">{icon}</span>
    <div className="min-w-0">
      <div className="truncate text-sm font-semibold text-slate-900">{value}</div>
      <div className="truncate text-xs text-slate-500">{label}</div>
    </div>
  </div>
);

/** Key specs grid + feature chips of a unit. */
export const UnitSpecs: React.FC<{ unit: PublicUnit }> = ({ unit }) => {
  const { t } = useTranslation('developments');
  const area = unitArea(unit);
  const i = 'h-4 w-4';
  const specs: SpecProps[] = [];
  if (typeof unit.beds === 'number') specs.push({ icon: <BedDouble className={i} />, label: t('unit.beds', 'Beds'), value: unit.beds });
  if (typeof unit.baths === 'number') specs.push({ icon: <Bath className={i} />, label: t('unit.baths', 'Baths'), value: unit.baths });
  if (area) specs.push({ icon: <Maximize className={i} />, label: t('unit.area', 'Area'), value: formatArea(area) });
  if (unit.netArea && unit.netArea !== area) specs.push({ icon: <Maximize className={i} />, label: t('explorer.spec.netArea', 'Internal area'), value: formatArea(unit.netArea) });
  if (unit.terraceArea) specs.push({ icon: <Sun className={i} />, label: t('explorer.spec.terrace', 'Terrace'), value: formatArea(unit.terraceArea) });
  if (unit.externalArea) specs.push({ icon: <Trees className={i} />, label: t('explorer.spec.outdoor', 'Outdoor area'), value: formatArea(unit.externalArea) });
  if (unit.balconies) specs.push({ icon: <Sun className={i} />, label: t('explorer.spec.balconies', 'Balconies'), value: unit.balconies });
  if (unit.floorLabel) specs.push({ icon: <Layers className={i} />, label: t('explorer.floor', 'Floor'), value: unit.floorLabel });
  if (unit.orientation) specs.push({ icon: <Compass className={i} />, label: t('unit.orientation', 'Orientation'), value: t(`explorer.orientation.${unit.orientation.toLowerCase()}`, unit.orientation) });

  const features = unit.features ?? [];
  return (
    <div className="space-y-4">
      {specs.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {specs.map((s) => <Spec key={s.label} {...s} />)}
        </div>
      )}
      {features.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('explorer.filters.features', 'Features')}</h3>
          <ul className="flex flex-wrap gap-1.5">
            {features.map((f) => (
              <li key={f} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                {t(`feature.${f}`, f.replace(/_/g, ' '))}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
