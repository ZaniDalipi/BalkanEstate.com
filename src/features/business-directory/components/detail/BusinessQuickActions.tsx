import React from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon } from '@/src/shared/illustrations';
import type { ContactChannel } from '../../utils/contactChannels';
import { CHANNEL_META, channelLinkProps } from './channelMeta';

interface BusinessQuickActionsProps {
  actions: ContactChannel[];
  onShare: () => void;
}

const BUTTON =
  'group flex min-h-[64px] min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-2 text-[12px] font-semibold transition active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-[72px] sm:text-[13px]';
const PRIMARY = `${BUTTON} bg-primary text-white shadow-[0_10px_24px_-10px_rgba(2,82,205,0.7)] hover:bg-primary-dark`;
const SECONDARY = `${BUTTON} bg-primary/[0.07] text-primary hover:bg-primary/[0.12]`;

/**
 * The place-card action row: Call (filled), then a messenger, directions,
 * the website — and Share. Equal-width buttons, icon above label, so the
 * most common next step is one tap from the top of the page.
 */
export const BusinessQuickActions = React.forwardRef<HTMLDivElement, BusinessQuickActionsProps>(({ actions, onShare }, ref) => {
  const { t } = useTranslation('businessDirectory');
  return (
    <div ref={ref} className="flex gap-2 sm:gap-2.5" role="group" aria-label={t('detail.actions.label', 'Contact options')}>
      {actions.map((a, i) => {
        const meta = CHANNEL_META[a.id];
        return (
          // Phones fit four buttons: the fourth channel (still in the contact card) makes way for Share.
          <a key={a.id} href={a.href} {...channelLinkProps(a.external)} className={`${i === 0 ? PRIMARY : SECONDARY} ${i >= 3 ? 'max-sm:hidden' : ''}`}>
            {i === 0 ? (
              // Soft icons are coloured: on the filled button they sit on a white disc to stay visible.
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
                <meta.Icon className="h-6 w-6" />
              </span>
            ) : (
              <meta.Icon className="h-7 w-7" />
            )}
            <span className="max-w-full truncate">{t(meta.actionKey, meta.actionDefault)}</span>
          </a>
        );
      })}
      <button type="button" onClick={onShare} className={SECONDARY}>
        <SoftIcon name="share" className="h-7 w-7" />
        <span>{t('detail.share', 'Share')}</span>
      </button>
    </div>
  );
});
BusinessQuickActions.displayName = 'BusinessQuickActions';
