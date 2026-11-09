import React from 'react';
import { useTranslation } from 'react-i18next';
import { imageSrcSet, optimizeImageUrl } from '@/config/mediaConfig';
import type { DevelopmentBuilder } from '../../../types';
import { BuilderLogo } from '../builder/BuilderLogo';

interface DeveloperHeroProps {
  builder: DevelopmentBuilder;
  /** The residence the buyer came from ("Developer of Aria Residences"). */
  residenceName: string;
}

/** The top of the company page: its banner, logo, name and tagline. */
export const DeveloperHero: React.FC<DeveloperHeroProps> = ({ builder, residenceName }) => {
  const { t } = useTranslation('developments');
  const banner = builder.banner?.url;
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
            {t('builderPublic.developerOf', { name: residenceName, defaultValue: 'Developer of {{name}}' })}
          </p>
          <h1 className="break-words text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{builder.name}</h1>
          {builder.tagline && <p className="mt-1 text-base text-slate-600">{builder.tagline}</p>}
        </div>
      </div>
    </header>
  );
};
