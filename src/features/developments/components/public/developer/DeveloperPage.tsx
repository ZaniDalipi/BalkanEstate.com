import React from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { usePublicDevelopment, usePublicDeveloper } from '../../../hooks';
import { sectionState } from '../../../utils/residenceSections';
import { ErrorState, LoadingState } from '../../shared/States';
import { BuilderFacts } from '../builder/BuilderFacts';
import { DeveloperHero } from './DeveloperHero';
import { DeveloperOffice } from './DeveloperOffice';
import { DeveloperResidences } from './DeveloperResidences';
import { DeveloperTopBar } from './DeveloperTopBar';

const LINK = 'inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2';

/**
 * The company behind a residence, on a page of its own (opened from the
 * residence's "The builder"): who they are, their track record, what they say
 * about themselves, where their office is and how to reach them, and the
 * residences they build here. Shares the residence's data, so it opens at once
 * from the residence page; a direct link loads it.
 */
const DeveloperPage: React.FC = () => {
  const { t } = useTranslation('developments');
  const { slug } = useParams();
  const { development, isLoading, error } = usePublicDevelopment(slug);
  const builder = development?.builder?.name?.trim() ? development.builder : undefined;
  const residences = usePublicDeveloper(slug, !!builder);

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8" aria-busy="true">
        <LoadingState rows={4} />
      </main>
    );
  }
  if (error || !development) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <ErrorState message={t('errors.notFound', 'Not found')} />
        <button type="button" onClick={() => navigate(paths.developments())} className={`${LINK} mt-4 px-0 text-primary hover:underline`}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('public.backToList', 'Back to developments')}
        </button>
      </main>
    );
  }

  const residence = paths.development(development.slug);
  return (
    <main className="w-full overflow-x-clip bg-white pb-16">
      <DeveloperTopBar development={development} />
      <div className="mx-auto max-w-6xl px-4">
        {!builder ? (
          // A link to a residence that has not named its builder: say so and lead back.
          <div role="status" className="mt-10 rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-base text-slate-700">{t('builderPublic.noProfile', 'This residence has not introduced its builder yet.')}</p>
            <button type="button" onClick={() => navigate(residence)} className={`${LINK} mt-4 bg-slate-900 text-white hover:bg-slate-800`}>
              {t('builderPublic.backTo', { name: development.name, defaultValue: 'Back to {{name}}' })}
            </button>
          </div>
        ) : (
          <>
            <DeveloperHero builder={builder} residenceName={development.name} />
            <BuilderFacts builder={builder} withOffice={false} className="mt-8" />
            {builder.about && (
              <section aria-labelledby="developer-about-heading" className="mt-10 max-w-3xl">
                <h2 id="developer-about-heading" className="text-xl font-bold tracking-tight text-slate-900">
                  {t('builderPublic.aboutHeading', { name: builder.name, defaultValue: 'About {{name}}' })}
                </h2>
                <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-slate-700">{builder.about}</p>
              </section>
            )}
            <DeveloperOffice builder={builder} />
            <DeveloperResidences
              builderName={builder.name}
              current={development}
              residences={residences.residences}
              isLoading={residences.isLoading}
              failed={!!residences.error}
              onRetry={() => void residences.refetch()}
              onOpen={(s) => navigate(paths.development(s))}
            />
            <div className="mt-12 flex justify-center">
              <button type="button" onClick={() => navigate(residence, { state: sectionState('units') })} className={`${LINK} bg-amber-400 text-slate-900 shadow-lg shadow-amber-900/10 hover:bg-amber-300`}>
                {t('builderPublic.seeHomes', { name: development.name, defaultValue: 'See the homes in {{name}}' })}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default DeveloperPage;
