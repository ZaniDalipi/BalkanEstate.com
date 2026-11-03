import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Pencil, Share } from 'lucide-react';
import { GLASS_BAR, GLASS_ICON_BUTTON } from './glassStyles';
import { TopBarAccountActions } from './TopBarAccountActions';

interface BusinessTopBarProps {
  name: string;
  /** The page title has scrolled away: show the name in the bar. */
  showTitle: boolean;
  isOwner: boolean;
  onBack: () => void;
  onEdit: () => void;
  onShare: () => void;
}

/**
 * The frosted navigation bar: back to the directory, the business name once
 * the big title has scrolled off (iOS large-title style), share, and the
 * app-wide account actions.
 */
export const BusinessTopBar: React.FC<BusinessTopBarProps> = ({ name, showTitle, isOwner, onBack, onEdit, onShare }) => {
  const { t } = useTranslation('businessDirectory');
  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors ${GLASS_BAR} ${showTitle ? 'border-black/[0.08]' : 'border-transparent'}`}
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* Installed app: iOS draws the clock and battery in white over the page,
          so give them a dark strip to sit on; in a browser tab the strip has no height. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 hidden bg-gradient-to-b from-slate-900/85 to-slate-900/70 pwa:block"
        style={{ height: 'env(safe-area-inset-top, 0px)' }}
      />
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-2 sm:px-4">
        <button
          type="button"
          onClick={onBack}
          className="flex min-h-[44px] shrink-0 items-center gap-0.5 rounded-full pl-1 pr-3 text-[17px] text-primary transition hover:bg-primary/[0.06]"
        >
          <ChevronLeft className="h-7 w-7" strokeWidth={2.25} aria-hidden="true" />
          <span className={showTitle ? 'sr-only sm:not-sr-only' : ''}>{t('detail.directory', 'Directory')}</span>
        </button>

        <p
          className={`min-w-0 flex-1 truncate text-center text-[17px] font-semibold text-neutral-900 transition-opacity duration-200 ${showTitle ? 'opacity-100' : 'opacity-0'}`}
          aria-hidden={!showTitle}
        >
          {name}
        </p>

        <div className="flex shrink-0 items-center gap-1.5">
          {isOwner && (
            <button type="button" onClick={onEdit} className={`${GLASS_ICON_BUTTON} sm:w-auto sm:gap-1.5 sm:px-4`} aria-label={t('edit.button', 'Edit Listing')}>
              <Pencil className="h-[18px] w-[18px]" aria-hidden="true" />
              <span className="hidden text-sm font-semibold sm:inline">{t('edit.short', 'Edit')}</span>
            </button>
          )}
          <button type="button" onClick={onShare} className={GLASS_ICON_BUTTON} aria-label={t('detail.share', 'Share')}>
            <Share className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
          <span className="hidden h-6 w-px bg-black/10 sm:block" aria-hidden="true" />
          <TopBarAccountActions />
        </div>
      </div>
    </header>
  );
};
