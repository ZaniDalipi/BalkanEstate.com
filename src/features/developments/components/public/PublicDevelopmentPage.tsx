import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { navigate, goBack } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { usePublicDevelopment, usePublicDevelopmentUnits } from '../../hooks';
import { useExplorerUrlState } from '../../hooks/useExplorerUrlState';
import { useUnitDrawer } from '../../hooks/useUnitDrawer';
import { filterUnits, hasActiveCriteria } from '../../utils/unitFilters';
import { LoadingState, ErrorState } from '../shared/States';
import { ResidenceHero } from './ResidenceHero';
import { StatsBar } from './StatsBar';
import { AvailabilityBar } from './AvailabilityBar';
import { UnitFilters } from './UnitFilters';
import { UnitsBrowser } from './UnitsBrowser';
import { FollowCard } from './FollowCard';
import { ResidenceLocation } from './ResidenceLocation';
import { ResidenceExplorer } from './explorer/ResidenceExplorer';
import { ResidenceTitleBar } from './explorer/ResidenceTitleBar';
import { ResidenceSections } from './explorer/ResidenceSections';
import { ApartmentDetailsDrawer } from './explorer/drawer/ApartmentDetailsDrawer';

const scrollToId = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

/**
 * Public residence page. The interactive explorer is the full-bleed hero
 * (East Gate B2): camera views with apartments drawn on the facade, the
 * building drill-down and the details drawer; with nothing published the
 * cover hero takes its place. Filters live in the URL and drive the explorer
 * and the unit grid alike; `?unit=` opens the drawer from either.
 */
const PublicDevelopmentPage: React.FC = () => {
  const { t } = useTranslation('developments');
  const { slug } = useParams();
  const { development, buildings, floors, isLoading, error } = usePublicDevelopment(slug);
  const { units, summary } = usePublicDevelopmentUnits(slug);
  const { criteria, setCriteria, nav, setNav } = useExplorerUrlState();
  const drawer = useUnitDrawer();
  const matchedUnits = useMemo(() => filterUnits(units, criteria), [units, criteria]);

  const sections = [
    { id: 'overview', label: t('detail.overview', 'Overview') },
    { id: 'units', label: t('units.heading', 'Available homes') },
    { id: 'location', label: t('detail.location', 'Location') },
  ];

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <LoadingState rows={4} />
      </main>
    );
  }
  if (error || !development) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <ErrorState message={t('errors.notFound', 'Not found')} />
        <button type="button" onClick={() => navigate(paths.developments())} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('public.backToList', 'Back to developments')}
        </button>
      </main>
    );
  }

  return (
    <main className="w-full bg-white pb-12">
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <button type="button" onClick={() => goBack(paths.developments())} className="mb-2 inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('public.backToList', 'Back to developments')}
        </button>
      </div>

      <ResidenceExplorer
        slug={development.slug}
        residenceName={development.name}
        buildings={buildings}
        floors={floors}
        units={units}
        criteria={criteria}
        onCriteriaChange={setCriteria}
        nav={nav}
        onNavChange={setNav}
        onOpenUnit={drawer.open}
        header={<ResidenceTitleBar development={development} summary={summary} onViewUnits={() => scrollToId('units')} />}
        fallback={
          <div className="mx-auto max-w-6xl px-4">
            <ResidenceHero development={development} onViewUnits={() => scrollToId('units')} />
          </div>
        }
      />

      <div className="mx-auto max-w-6xl px-4">
        <div className="relative z-10 mt-6 px-0 sm:px-8">
          <StatsBar summary={summary} buildings={buildings.length} />
        </div>

        <nav aria-label={t('explorer.sections', 'Page sections')} className="sticky top-0 z-20 -mx-4 mt-6 overflow-x-auto border-b border-slate-200 bg-white/90 px-4 backdrop-blur">
          <ul className="flex gap-1 py-2">
            {sections.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => scrollToId(s.id)} className="min-h-[44px] whitespace-nowrap rounded-full px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {units.length > 0 && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">{t('units.availabilityHeading', 'Availability')}</h2>
            <AvailabilityBar units={units} />
          </div>
        )}

        <ResidenceSections development={development} buildings={buildings} floors={floors} />

        <div className="mt-8">
          <FollowCard slug={development.slug} developmentName={development.name} />
        </div>

        <section id="units" aria-labelledby="units-heading" className="mt-12 scroll-mt-20">
          <h2 id="units-heading" className="mb-5 text-2xl font-extrabold tracking-tight text-slate-900">
            {t('units.heading', 'Available homes')}
          </h2>
          {units.length > 0 && (
            <UnitFilters units={units} criteria={criteria} onChange={setCriteria} matchCount={matchedUnits.length} className="mb-5" />
          )}
          <UnitsBrowser units={matchedUnits} slug={development.slug} onOpenUnit={drawer.open} filtered={hasActiveCriteria(criteria)} />
        </section>

        <ResidenceLocation development={development} />
      </div>

      <ApartmentDetailsDrawer
        slug={development.slug}
        unitId={drawer.unitId}
        onClose={drawer.close}
        preview={units.find((u) => u.id === drawer.unitId)}
      />
    </main>
  );
};

export default PublicDevelopmentPage;
