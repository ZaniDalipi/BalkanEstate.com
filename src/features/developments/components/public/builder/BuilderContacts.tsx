import React from 'react';
import { useTranslation } from 'react-i18next';
import { Facebook, Globe, Instagram, Linkedin, Mail, Phone, Youtube, type LucideIcon } from 'lucide-react';
import { BUILDER_SOCIAL_LABELS, BUILDER_SOCIAL_NETWORKS, type BuilderSocialNetwork, type DevelopmentBuilder } from '../../../types';
import { mailHref, safeWebHref, siteLabel, telHref } from '../../../utils/builderLinks';

const SOCIAL_ICON: Record<BuilderSocialNetwork, LucideIcon> = { facebook: Facebook, instagram: Instagram, linkedin: Linkedin, youtube: Youtube };
const btn = 'inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

/** Website, call, email and social links of the builder; external links open in a new tab. */
export const BuilderContacts: React.FC<{ builder: DevelopmentBuilder }> = ({ builder }) => {
  const { t } = useTranslation('developments');
  const web = safeWebHref(builder.website);
  const tel = telHref(builder.phone);
  const mail = mailHref(builder.email);
  const socials = BUILDER_SOCIAL_NETWORKS.map((n) => ({ n, href: safeWebHref(builder.socials?.[n]) })).filter((s) => s.href);
  if (!web && !tel && !mail && socials.length === 0) return null;
  const newTab = <span className="sr-only">{t('explorer.tour.newTab', '(opens in a new tab)')}</span>;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {web && (
        <a href={web} target="_blank" rel="noopener noreferrer" className={btn}>
          <Globe className="h-4 w-4" aria-hidden="true" />
          {siteLabel(web)}
          {newTab}
        </a>
      )}
      {tel && (
        <a href={tel} className={btn}>
          <Phone className="h-4 w-4" aria-hidden="true" />
          {builder.phone}
        </a>
      )}
      {mail && (
        <a href={mail} className={btn}>
          <Mail className="h-4 w-4" aria-hidden="true" />
          {t('builderPublic.email', 'Email')}
        </a>
      )}
      {socials.map(({ n, href }) => {
        const Icon = SOCIAL_ICON[n];
        const label = BUILDER_SOCIAL_LABELS[n];
        return (
          <a key={n} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} ${t('explorer.tour.newTab', '(opens in a new tab)')}`} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </a>
        );
      })}
    </div>
  );
};
