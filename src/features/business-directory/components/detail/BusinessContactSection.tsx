import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Copy } from 'lucide-react';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import type { ContactChannel } from '../../utils/contactChannels';
import { CHANNEL_META, channelLinkProps } from './channelMeta';
import { DetailSection } from './DetailSection';
import { BusinessSocialLinks } from './BusinessSocialLinks';

interface BusinessContactSectionProps {
  listing: BusinessListing;
  channels: ContactChannel[];
  onCopy: (value: string) => void;
}

const COPYABLE = new Set(['call', 'email', 'whatsapp', 'viber']);

/** Every way to reach them as tappable rows, and their socials. */
export const BusinessContactSection: React.FC<BusinessContactSectionProps> = ({ listing, channels, onCopy }) => {
  const { t } = useTranslation('businessDirectory');
  const rows = channels.filter((c) => c.id !== 'directions');
  const hasSocial = Object.values(listing.socialMedia ?? {}).some((v) => !!v?.trim());

  return (
    <DetailSection id="business-contact" icon="phone" title={t('detail.contactInfo', 'Contact')} subtitle={t('detail.getInTouch', 'Reach out to get started')}>
      <ul className="-mx-2 divide-y divide-black/[0.06]">
        {rows.map((c) => {
          const meta = CHANNEL_META[c.id];
          const label = t(meta.labelKey, meta.labelDefault);
          return (
            <li key={c.id} className="flex items-center">
              <a href={c.href} {...channelLinkProps(c.external)} className="group flex min-h-[56px] min-w-0 flex-1 items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-black/[0.03]">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/[0.05] ${meta.tint}`}>
                  <meta.Icon className="h-7 w-7" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-medium text-neutral-500">{label}</span>
                  <span className="block truncate text-[15px] font-semibold text-neutral-900 group-hover:text-primary">{c.value}</span>
                </span>
                {!COPYABLE.has(c.id) && <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" aria-hidden="true" />}
              </a>
              {COPYABLE.has(c.id) && (
                <button
                  type="button"
                  onClick={() => onCopy(c.value)}
                  aria-label={t('detail.copyValue', { label, defaultValue: 'Copy {{label}}' })}
                  className="ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-neutral-500 transition hover:bg-black/[0.04] hover:text-neutral-700"
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {hasSocial && (
        <div className="mt-4 border-t border-black/[0.06] pt-4">
          <BusinessSocialLinks social={listing.socialMedia} />
        </div>
      )}

    </DetailSection>
  );
};
