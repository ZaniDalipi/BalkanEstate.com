import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import type { Development, DevelopmentBuilding, DevelopmentFloor } from '../../../types';
import { KeyFacts } from '../KeyFacts';

const Heading: React.FC<{ children: React.ReactNode; id?: string }> = ({ children, id }) => (
  <h2 id={id} className="mb-4 flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
    <span className="h-5 w-1 rounded-full bg-primary" aria-hidden="true" />
    {children}
  </h2>
);

interface ResidenceSectionsProps {
  development: Development;
  buildings: DevelopmentBuilding[];
  floors: DevelopmentFloor[];
}

/** Overview, amenities and the crawlable building → floors outline of the residence page. */
export const ResidenceSections: React.FC<ResidenceSectionsProps> = ({ development, buildings, floors }) => {
  const { t } = useTranslation('developments');
  return (
    <>
      <section id="overview" className="mt-10 scroll-mt-20">
        <Heading>{t('detail.overview', 'Overview')}</Heading>
        <KeyFacts development={development} buildings={buildings.length} />
        {development.description && (
          <p className="mt-5 max-w-3xl whitespace-pre-line text-[15px] leading-relaxed text-slate-700">{development.description}</p>
        )}
      </section>

      {development.amenities?.length > 0 && (
        <section className="mt-10">
          <Heading>{t('amenities.heading', 'Amenities')}</Heading>
          <ul className="flex flex-wrap gap-2">
            {development.amenities.map((a) => (
              <li key={a} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm text-slate-800 shadow-sm">
                <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {a}
              </li>
            ))}
          </ul>
        </section>
      )}

      {buildings.length > 0 && (
        <section aria-labelledby="buildings-heading" className="mt-10">
          <Heading id="buildings-heading">{t('detail.buildings', 'Buildings')}</Heading>
          <ul className="flex flex-wrap gap-3">
            {buildings.map((b) => (
              <li key={b.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-900">{b.name}</h3>
                <p className="text-xs text-slate-500">
                  {t('detail.floors', 'Floors')}: {floors.filter((f) => f.buildingId === b.id).length}
                  {b.stats ? ` · ${t('explorer.availableCount', { count: b.stats.available, defaultValue: '{{count}} available' })}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
};
