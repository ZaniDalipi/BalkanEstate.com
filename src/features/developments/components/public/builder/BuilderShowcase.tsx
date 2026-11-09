import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { optimizeImageUrl } from '@/config/mediaConfig';
import type { DevelopmentBuilder } from '../../../types';
import { BuilderContacts } from './BuilderContacts';
import { BuilderFacts } from './BuilderFacts';
import { BuilderLogo } from './BuilderLogo';
import { companyLabel } from '../../../utils/companyLabel';

interface BuilderShowcaseProps {
  builder?: DevelopmentBuilder;
  /** Opens the company's own page; the section then shortens what it says about itself and links there. */
  onOpenPage?: () => void;
}

/**
 * "The builder" on the residence page: the company's banner with its logo,
 * name and tagline, its track record (founded, years, completed projects,
 * licence), what it says about itself, how to reach it, and the way to its
 * own page.
 */
export const BuilderShowcase: React.FC<BuilderShowcaseProps> = ({ builder, onOpenPage }) => {
  const { t } = useTranslation('developments');
  if (!builder?.name) return null;
  return (
    <section id="builder" aria-labelledby="builder-public-heading" className="mt-8 scroll-mt-20 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="relative h-36 bg-gradient-to-br from-slate-900 via-slate-800 to-primary sm:h-52">
        {builder.banner?.url && (
          <img src={optimizeImageUrl(builder.banner.url, { width: 1600 })} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" aria-hidden="true" />
        <p className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 sm:left-6">
          {companyLabel(t, builder)}
        </p>
      </div>
      <div className="px-4 pb-6 sm:px-6">
        <div className="relative z-10 -mt-10 flex items-start gap-4">
          <BuilderLogo name={builder.name} url={builder.logo?.url} size={88} className="shadow-lg ring-4 ring-white" />
          <div className="min-w-0 flex-1 pt-11">
            <h2 id="builder-public-heading" className="break-words text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">{builder.name}</h2>
            {builder.tagline && <p className="text-sm text-slate-600">{builder.tagline}</p>}
          </div>
        </div>
        <BuilderFacts builder={builder} className="mt-5" />
        {builder.about && <p className={`mt-5 whitespace-pre-line text-sm leading-relaxed text-slate-700 ${onOpenPage ? 'line-clamp-4' : ''}`}>{builder.about}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {onOpenPage && (
            <button
              type="button"
              onClick={onOpenPage}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {t('builderPublic.aboutCompany', 'About the company')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <BuilderContacts builder={builder} />
        </div>
      </div>
    </section>
  );
};
