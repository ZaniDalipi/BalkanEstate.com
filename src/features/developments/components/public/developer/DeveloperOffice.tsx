import React from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, MapPin } from 'lucide-react';
import type { DevelopmentBuilder } from '../../../types';
import { mailHref, mapsSearchHref, safeWebHref, telHref } from '../../../utils/builderLinks';
import { BuilderContacts } from '../builder/BuilderContacts';

/** Where the company is and how to reach it: its office address (with a map search) and its contacts. */
export const DeveloperOffice: React.FC<{ builder: DevelopmentBuilder }> = ({ builder }) => {
  const { t } = useTranslation('developments');
  const address = builder.address?.trim();
  const map = mapsSearchHref(address);
  const hasContacts = !!(safeWebHref(builder.website) || telHref(builder.phone) || mailHref(builder.email) || Object.values(builder.socials ?? {}).some((v) => safeWebHref(v)));
  if (!address && !hasContacts) return null;

  return (
    <section aria-labelledby="developer-office-heading" className="mt-10">
      <h2 id="developer-office-heading" className="text-xl font-bold tracking-tight text-slate-900">
        {t('builderPublic.officeContact', 'Office and contact')}
      </h2>
      <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        {address && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex min-w-0 items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0 break-words text-base font-medium text-slate-900">
                <span className="sr-only">{t('builderPublic.office', 'Office')}: </span>
                {address}
              </span>
            </p>
            {map && (
              <a
                href={map}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] shrink-0 items-center gap-2 self-start rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:self-auto"
              >
                {t('builderPublic.openInMaps', 'Open in Maps')}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">{t('explorer.tour.newTab', '(opens in a new tab)')}</span>
              </a>
            )}
          </div>
        )}
        {hasContacts && (
          <div className={address ? 'mt-5 border-t border-slate-100 pt-5' : undefined}>
            <BuilderContacts builder={builder} />
          </div>
        )}
      </div>
    </section>
  );
};
