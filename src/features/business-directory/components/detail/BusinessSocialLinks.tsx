import React from 'react';
import { useTranslation } from 'react-i18next';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import { websiteHref } from '../../utils/businessFacts';
import { FacebookIcon, InstagramIcon, LinkedInIcon, TikTokIcon } from './brandIcons';

const BRANDS = {
  facebook: { label: 'Facebook', Icon: FacebookIcon, className: 'bg-[#1877F2] text-white' },
  instagram: { label: 'Instagram', Icon: InstagramIcon, className: 'bg-gradient-to-br from-[#FEDA75] via-[#D62976] to-[#4F5BD5] text-white' },
  linkedin: { label: 'LinkedIn', Icon: LinkedInIcon, className: 'bg-[#0A66C2] text-white' },
  tiktok: { label: 'TikTok', Icon: TikTokIcon, className: 'bg-neutral-900 text-white' },
} as const;

type Platform = keyof typeof BRANDS;

/** Round brand buttons for each social profile the business added; nothing when there are none. */
export const BusinessSocialLinks: React.FC<{ social: BusinessListing['socialMedia'] }> = ({ social }) => {
  const { t } = useTranslation('businessDirectory');
  const links = (Object.keys(BRANDS) as Platform[])
    .map((p) => ({ p, url: social?.[p]?.trim() }))
    .filter((x): x is { p: Platform; url: string } => !!x.url);
  if (links.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2.5 text-[13px] font-semibold uppercase tracking-wide text-neutral-500">{t('detail.socialMedia', 'Social Media')}</h3>
      <ul className="flex flex-wrap gap-2.5">
        {links.map(({ p, url }) => {
          const brand = BRANDS[p];
          return (
            <li key={p}>
              <a
                href={websiteHref(url)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('detail.openSocial', { network: brand.label, defaultValue: '{{network}} (opens in a new tab)' })}
                title={brand.label}
                className={`flex h-11 w-11 items-center justify-center rounded-full shadow-[0_6px_16px_-6px_rgba(15,23,42,0.4)] transition hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${brand.className}`}
              >
                <brand.Icon className="h-5 w-5" />
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
