import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppLink } from '@/src/app/router/AppLink';
import { paths } from '@/src/app/router/paths';
import { StickyStackSlot } from '@/src/components/ui/StickyStackSlot';
import { usePublicDevelopments } from '@/src/features/developments/hooks/useDevelopments';
import { HomeSectionHeader } from '../HomeSectionHeader';
import { ResidenceStackCard } from './ResidenceStackCard';

const SHOWN = 5;

/**
 * New residences on the home page, as a scroll stack of big photo cards (the
 * same motion as the featured listings), with a link to all of them. Hidden
 * when there is none; if they can't be loaded, a link to the residences page
 * takes their place, so nobody is stuck.
 */
const HomeResidencesSection: React.FC = () => {
  const { t } = useTranslation('home');
  const { developments, total, isLoading, error } = usePublicDevelopments({ limit: SHOWN });
  const all = { label: total > SHOWN ? t('residences.viewAllCount', { n: total, defaultValue: 'All {{n}} residences' }) : t('residences.viewAll', 'All residences'), to: paths.developments() };

  if (error) {
    return (
      <p role="status" className="mx-auto my-10 max-w-6xl px-4 text-sm text-slate-600">
        {t('residences.loadFailed', 'New residences couldn’t be loaded right now.')}{' '}
        <AppLink to={paths.developments()} className="font-semibold text-primary hover:underline">{t('residences.viewAll', 'All residences')}</AppLink>
      </p>
    );
  }
  if (isLoading) return <div className="mx-auto my-12 h-[420px] max-w-5xl animate-pulse rounded-[28px] bg-slate-100 px-4" aria-busy="true" />;
  if (developments.length === 0) return null;

  return (
    <section aria-labelledby="home-residences-heading" className="bg-white pt-12">
      <HomeSectionHeader id="home-residences-heading" title={t('residences.title', 'New residences')} subtitle={t('residences.subtitle', 'Explore new buildings floor by floor and pick your apartment.')} action={all} />
      <div style={{ paddingBottom: Math.max(0, developments.length - 1) * 24 + 48 }}>
        {developments.map((d, i) => (
          <StickyStackSlot key={d.id} index={i} total={developments.length}>
            <ResidenceStackCard development={d} />
          </StickyStackSlot>
        ))}
      </div>
    </section>
  );
};

export default HomeResidencesSection;
