import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Building2, MapPin } from 'lucide-react';
import { imageSrcSet, optimizeImageUrl } from '@/config/mediaConfig';
import { AppLink } from '@/src/app/router/AppLink';
import { paths } from '@/src/app/router/paths';
import type { Development } from '@/src/features/developments/types';
import { residencePhotos } from '@/src/features/developments/utils/residencePhotos';

/**
 * A residence as a big photo card for the home page stack: its cover (or
 * first photo), category and building stage, name, place, how many homes are
 * available, the builder, and a way in. The whole card is one link.
 */
export const ResidenceStackCard: React.FC<{ development: Development }> = ({ development: d }) => {
  const { t } = useTranslation(['home', 'developments']);
  const photo = residencePhotos(d)[0] ?? d.previewImage;
  const units = d.stats?.units ?? 0;
  const available = d.stats?.available ?? 0;

  return (
    <AppLink
      to={paths.development(d.slug)}
      className="group relative mx-auto block h-[420px] w-full max-w-5xl overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-800 via-slate-700 to-primary shadow-2xl ring-1 ring-black/5 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 sm:h-[500px]"
    >
      {photo ? (
        <img
          src={optimizeImageUrl(photo, { width: 1280 })}
          srcSet={imageSrcSet(photo) || undefined}
          sizes="(max-width: 1024px) 100vw, 1024px"
          alt=""
          loading="lazy"
          // A photo that can't load hides itself: the card's gradient shows instead of a broken-image icon.
          onError={(e) => {
            e.currentTarget.style.visibility = 'hidden';
          }}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transition-none"
        />
      ) : (
        <Building2 className="absolute right-8 top-8 h-24 w-24 text-white/15" aria-hidden="true" />
      )}
      <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/85 via-black/40 to-transparent" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 space-y-3 p-6 sm:p-10">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">{t(`developments:category.${d.category}`)}</span>
          <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">{t(`developments:construction.${d.constructionStatus}`)}</span>
        </div>
        <h3 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">{d.name}</h3>
        <p className="flex items-center gap-1.5 text-sm text-white/90 sm:text-base">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
          {[d.city, d.country].filter(Boolean).join(', ')}
          {d.builder?.name && <span className="text-white/70"> · {t('home:residences.builtBy', { name: d.builder.name, defaultValue: 'Built by {{name}}' })}</span>}
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {units > 0 && (
            <span className="rounded-xl bg-emerald-500/90 px-3 py-1.5 text-sm font-semibold text-white">
              {t('home:residences.available', { available, total: units, defaultValue: '{{available}} of {{total}} homes available' })}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-lg transition-transform group-hover:translate-x-0.5">
            {t('home:residences.explore', 'Explore residence')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
      </div>
    </AppLink>
  );
};
