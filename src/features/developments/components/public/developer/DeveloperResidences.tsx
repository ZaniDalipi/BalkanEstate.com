import React from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon } from '@/src/shared/illustrations';
import type { Development } from '../../../types';
import { DevelopmentCard } from '../../shared/DevelopmentCard';

interface DeveloperResidencesProps {
  builderName: string;
  /** The residence the buyer came from: listed first, marked. */
  current: Development;
  /** The company's residences as the server lists them (this one included, with its list picture). */
  residences: Development[];
  isLoading: boolean;
  failed: boolean;
  onRetry: () => void;
  onOpen: (slug: string) => void;
}

/**
 * The company's residences on the platform: the one the buyer came from,
 * then the others it builds. While they load, quiet placeholders; if they
 * could not load, the reason and a way to try again (the page stays usable).
 */
export const DeveloperResidences: React.FC<DeveloperResidencesProps> = ({ builderName, current, residences, isLoading, failed, onRetry, onOpen }) => {
  const { t } = useTranslation('developments');
  const here = residences.find((d) => d.slug === current.slug) ?? current;
  const others = residences.filter((d) => d.slug !== current.slug);
  return (
    <section aria-labelledby="developer-residences-heading" className="mt-12">
      <h2 id="developer-residences-heading" className="text-xl font-bold tracking-tight text-slate-900">
        {t('builderPublic.residencesHeading', { name: builderName, defaultValue: 'Residences by {{name}}' })}
      </h2>
      <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <li className="relative">
          <span className="absolute left-3 top-3 z-10 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow">
            {t('builderPublic.thisResidence', 'This residence')}
          </span>
          <DevelopmentCard development={here} onOpen={() => onOpen(current.slug)} />
        </li>
        {others.map((d) => (
          <li key={d.id}>
            <DevelopmentCard development={d} onOpen={() => onOpen(d.slug)} />
          </li>
        ))}
        {isLoading &&
          [0, 1].map((i) => (
            <li key={`skeleton-${i}`} aria-hidden="true" className="h-72 animate-pulse rounded-2xl bg-slate-100 motion-reduce:animate-none" />
          ))}
      </ul>
      {isLoading && <p className="sr-only" aria-live="polite">{t('builderPublic.residencesLoading', 'Loading their other residences…')}</p>}
      {failed && (
        <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
          {t('builderPublic.residencesError', 'Their other residences could not be loaded.')}
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-300 bg-white px-4 font-semibold text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <SoftIcon name="refresh" className="h-5 w-5" />
            {t('explorer.showcase.retry', 'Try again')}
          </button>
        </div>
      )}
    </section>
  );
};
