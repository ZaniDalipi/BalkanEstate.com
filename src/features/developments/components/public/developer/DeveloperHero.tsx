import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight } from 'lucide-react';
import { imageSrcSet, optimizeImageUrl } from '@/config/mediaConfig';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import type { DevelopmentBuilder } from '../../../types';
import { BuilderLogo } from '../builder/BuilderLogo';
import { isAgencyCompany } from '../../../utils/companyLabel';
import { SoftIcon } from '@/src/shared/illustrations';

interface DeveloperHeroProps {
  builder: DevelopmentBuilder;
  /** The residence the buyer came from ("Developer of Aria Residences"). */
  residenceName: string;
}

/** The top of the company page: its banner, logo, name and tagline; for an agency, the way to its own page. */
export const DeveloperHero: React.FC<DeveloperHeroProps> = ({ builder, residenceName }) => {
  const { t } = useTranslation('developments');
  const banner = builder.banner?.url;
  const agency = isAgencyCompany(builder);
  return (
    <header className="pt-4 sm:pt-6">
      <div className="relative h-44 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-primary sm:h-64 lg:h-80 landscape:h-32">
        {banner && (
          <img
            src={optimizeImageUrl(banner, { width: 1600 })}
            srcSet={imageSrcSet(banner, [640, 960, 1280, 1920]) || undefined}
            sizes="(min-width: 1152px) 1120px, 100vw"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-slate-950/10 to-transparent" aria-hidden="true" />
      </div>
      {/* The logo overlaps the banner; the name starts below it. */}
      <div className="relative z-10 -mt-12 flex flex-col gap-3 px-2 sm:-mt-14 sm:flex-row sm:items-start sm:gap-5 sm:px-6">
        <BuilderLogo name={builder.name} url={builder.logo?.url} size={104} className="rounded-2xl shadow-lg ring-4 ring-white" />
        <div className="min-w-0 sm:pt-[4.5rem]">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {agency
              ? t('builderPublic.companyOf', { name: residenceName, defaultValue: 'The company behind {{name}}' })
              : t('builderPublic.developerOf', { name: residenceName, defaultValue: 'Developer of {{name}}' })}
          </p>
          <h1 className="break-words text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{builder.name}</h1>
          {builder.tagline && <p className="mt-1 text-base text-slate-600">{builder.tagline}</p>}
          {builder.source === 'business' && builder.businessSlug && (
            <button
              type="button"
              onClick={() => navigate(paths.businessListing(builder.businessSlug as string))}
              className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <SoftIcon name="store" className="h-5 w-5" />
              {t('builderPublic.businessPage', 'Business Directory page')}
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          {agency && builder.agencySlug && (
            <button
              type="button"
              onClick={() => navigate(paths.agency(builder.agencySlug as string))}
              className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t('builderPublic.agencyPage', 'Agency profile')}
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
