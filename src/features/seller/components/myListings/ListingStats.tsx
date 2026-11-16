import React from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon, type SoftIconName } from '@/src/shared/illustrations';

interface ListingStatsProps {
  views?: number;
  saves?: number;
  inquiries?: number;
  /** Shown while the listing is live. */
  lastRenewed?: string | number | Date | null;
  /** Shown while the listing is rented. */
  rentedUntil?: string | number | Date | null;
}

const formatDay = (value: string | number | Date): string | null => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const Stat: React.FC<{ icon: SoftIconName; label: string; children: React.ReactNode; className?: string }> = ({
  icon, label, children, className = '',
}) => (
  <div className={`flex items-center gap-1.5 ${className}`} title={label}>
    <SoftIcon name={icon} className="h-5 w-5 shrink-0" />
    <span className="sr-only">{label}:</span>
    {children}
  </div>
);

/** Views, saves, inquiries and the date that matters for the listing's state. */
export const ListingStats: React.FC<ListingStatsProps> = ({ views, saves, inquiries, lastRenewed, rentedUntil }) => {
  const { t } = useTranslation(['seller', 'account']);
  const renewedOn = lastRenewed ? formatDay(lastRenewed) : null;
  const rentedUntilDay = rentedUntil ? formatDay(rentedUntil) : null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-neutral-100 pt-3 text-sm text-neutral-500">
      <Stat icon="eye" label={t('account:ui.myListings.views', 'Views')}>{views || 0}</Stat>
      <Stat icon="heart" label={t('account:ui.myListings.saves', 'Saves')}>{saves || 0}</Stat>
      <Stat icon="chat" label={t('account:ui.myListings.inquiries', 'Inquiries')}>{inquiries || 0}</Stat>
      {renewedOn && (
        <Stat icon="calendar" label={t('account:ui.myListings.lastRenewed', 'Last Renewed')} className="text-green-700">
          <span className="text-xs font-medium">{renewedOn}</span>
        </Stat>
      )}
      {rentedUntilDay && (
        <Stat icon="calendar" label={t('account:ui.myListings.rentedUntil', 'Rented until')} className="text-orange-700">
          <span className="text-xs font-medium">
            {t('seller:myListings.rentedUntil', 'Rented until {{date}}', { date: rentedUntilDay })}
          </span>
        </Stat>
      )}
    </div>
  );
};
