import React from 'react';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, CalendarDays, MapPin, Trophy } from 'lucide-react';
import { optimizeImageUrl } from '@/config/mediaConfig';
import type { DevelopmentBuilder } from '../../../types';
import { yearsActive } from '../../../utils/builderLinks';
import { BuilderContacts } from './BuilderContacts';
import { BuilderLogo } from './BuilderLogo';

/**
 * "The builder" on the residence page: the company's banner with its logo,
 * name and tagline, its track record (founded, years, completed projects,
 * licence), what it says about itself, and how to reach it.
 */
export const BuilderShowcase: React.FC<{ builder?: DevelopmentBuilder }> = ({ builder }) => {
  const { t } = useTranslation('developments');
  if (!builder?.name) return null;
  const years = yearsActive(builder.foundedYear);
  const facts = [
    builder.foundedYear ? { icon: CalendarDays, label: t('builderPublic.founded', 'Founded'), value: years ? t('builderPublic.foundedValue', { year: builder.foundedYear, years, defaultValue: '{{year}} · {{years}} years' }) : String(builder.foundedYear) } : null,
    typeof builder.completedProjects === 'number' ? { icon: Trophy, label: t('builderPublic.projects', 'Completed projects'), value: String(builder.completedProjects) } : null,
    builder.licenseNumber ? { icon: BadgeCheck, label: t('builderPublic.license', 'Licence'), value: builder.licenseNumber } : null,
    builder.address ? { icon: MapPin, label: t('builderPublic.office', 'Office'), value: builder.address } : null,
  ].filter((f): f is { icon: typeof CalendarDays; label: string; value: string } => !!f);

  return (
    <section id="builder" aria-labelledby="builder-public-heading" className="mt-8 scroll-mt-20 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="relative h-36 bg-gradient-to-br from-slate-900 via-slate-800 to-primary sm:h-52">
        {builder.banner?.url && (
          <img src={optimizeImageUrl(builder.banner.url, { width: 1600 })} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" aria-hidden="true" />
        <p className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 sm:left-6">
          {t('builderPublic.label', 'The builder')}
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
        {facts.length > 0 && (
          <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {facts.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
                  <dd className="break-words text-sm font-semibold text-slate-900">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        )}
        {builder.about && <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-slate-700">{builder.about}</p>}
        <div className="mt-5">
          <BuilderContacts builder={builder} />
        </div>
      </div>
    </section>
  );
};
