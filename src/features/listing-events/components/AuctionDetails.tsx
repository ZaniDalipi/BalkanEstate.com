import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatPrice } from '@/utils/currency';
import { safeHttpUrl } from '../utils/eventFormat';
import type { ListingEvent } from '../types';

type Auction = Extract<ListingEvent, { kind: 'auction' }>;

/** Where and how the auction happens, the starting price and the deposit terms. */
const AuctionDetails: React.FC<{ auction: Auction; country?: string }> = ({ auction, country }) => {
  const { t } = useTranslation('property');
  const link = safeHttpUrl(auction.url);
  const rows: [string, React.ReactNode][] = [];
  rows.push([
    t('listingEvents.auctionMode', { defaultValue: 'Where' }),
    auction.mode === 'online'
      ? t('listingEvents.online', { defaultValue: 'Online' })
      : auction.location ?? t('listingEvents.inPerson', { defaultValue: 'In person' }),
  ]);
  if (auction.startingPrice) {
    rows.push([t('listingEvents.startingPrice', { defaultValue: 'Starting price' }), formatPrice(auction.startingPrice, country)]);
  }
  if (auction.depositNote) rows.push([t('listingEvents.deposit', { defaultValue: 'Deposit & terms' }), auction.depositNote]);

  return (
    <div className="mt-2 space-y-1 text-sm">
      <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
        {rows.map(([k, v]) => (
          <React.Fragment key={k}>
            <dt className="text-neutral-500">{k}</dt>
            <dd className="font-medium text-neutral-900">{v}</dd>
          </React.Fragment>
        ))}
      </dl>
      {link && (
        <a href={link} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex min-h-[44px] items-center font-semibold text-amber-800 underline">
          {t('listingEvents.auctionLink', { defaultValue: 'Go to the auction page' })}
        </a>
      )}
      <p className="text-xs text-neutral-500">
        {t('listingEvents.auctionDisclaimer', { defaultValue: 'The auction is run by the seller or their auction house, not by BalkanEstate. Check the terms with them before bidding.' })}
      </p>
    </div>
  );
};

export default AuctionDetails;
