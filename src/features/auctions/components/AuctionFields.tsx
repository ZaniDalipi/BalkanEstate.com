import React, { useId } from 'react';
import { useTranslation } from 'react-i18next';
import FormField from '@/src/features/open-houses/components/FormField';
import { todayInputValue } from '@/src/features/open-houses/utils/openHouseDraft';
import { EMPTY_AUCTION_FORM, type AuctionError, type AuctionFormValues } from '../utils/auctionDraft';
import AuctionModePicker from './AuctionModePicker';

interface AuctionFieldsProps {
  /** `null` = the listing is not sold at auction (the default). */
  value: AuctionFormValues | null;
  onChange: (next: AuctionFormValues | null) => void;
  /** The first problem found when publishing, shown next to its field. */
  error?: AuctionError | null;
  /** A complaint from the server, shown under the section. */
  serverError?: string;
}

/**
 * Optional "Selling at auction" part of the listing form. Off by default;
 * switching it on opens the fields, switching it off removes the auction.
 */
const AuctionFields: React.FC<AuctionFieldsProps> = ({ value, onChange, error, serverError }) => {
  const { t } = useTranslation('property');
  const panelId = useId();
  const on = value !== null;
  const set = (field: keyof AuctionFormValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    value && onChange({ ...value, [field]: e.target.value });
  const errorFor = (field: AuctionError['field']) => (error?.field === field ? t(error.key, { defaultValue: error.defaultValue }) : undefined);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <label className="flex min-h-[44px] cursor-pointer items-start justify-between gap-3">
        <span>
          <span className="block font-semibold text-neutral-900">
            {t('listingEvents.sellingAtAuction', { defaultValue: 'Selling at auction' })}{' '}
            <span className="font-normal text-neutral-500">{t('openHouse.optional', { defaultValue: '(optional)' })}</span>
          </span>
          <span className="block text-sm text-neutral-600">
            {t('listingEvents.auctionHint', { defaultValue: 'Add the date if the home is sold at an auction (bank, notary or auction house). Buyers see it on the listing, in search and on the map.' })}
          </span>
        </span>
        <input
          type="checkbox"
          role="switch"
          aria-checked={on}
          aria-controls={panelId}
          checked={on}
          onChange={(e) => onChange(e.target.checked ? EMPTY_AUCTION_FORM : null)}
          className="mt-1 h-5 w-5 rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
        />
      </label>

      {value && (
        <div id={panelId} className="mt-3 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label={t('openHouse.date', { defaultValue: 'Date' })} type="date" min={todayInputValue(new Date())} value={value.date} onChange={set('date')} error={errorFor('date')} />
            <FormField label={t('listingEvents.time', { defaultValue: 'Time' })} type="time" step={900} value={value.time} onChange={set('time')} error={errorFor('time')} />
          </div>
          <AuctionModePicker value={value.mode} onChange={(mode) => onChange({ ...value, mode })} />
          {value.mode === 'in_person' ? (
            <FormField label={t('listingEvents.auctionPlace', { defaultValue: 'Place' })} placeholder={t('listingEvents.auctionPlaceHint', { defaultValue: 'e.g. Notary office, Main St 12, Budva' })} maxLength={300} value={value.location} onChange={set('location')} error={errorFor('location')} />
          ) : null}
          <FormField
            label={value.mode === 'online' ? t('listingEvents.auctionLinkLabel', { defaultValue: 'Auction link' }) : t('listingEvents.auctionLinkOptional', { defaultValue: 'Auction link (optional)' })}
            type="url" inputMode="url" placeholder="https://" maxLength={500} value={value.url} onChange={set('url')} error={errorFor('url')}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label={t('listingEvents.startingPriceOptional', { defaultValue: 'Starting price (optional)' })} inputMode="numeric" value={value.startingPrice} onChange={set('startingPrice')} error={errorFor('startingPrice')} />
            <FormField label={t('listingEvents.depositOptional', { defaultValue: 'Deposit & terms (optional)' })} maxLength={500} value={value.depositNote} onChange={set('depositNote')} />
          </div>
          {serverError && <p role="alert" className="text-sm text-red-600">{serverError}</p>}
        </div>
      )}
    </div>
  );
};

export default AuctionFields;
