import React from 'react';
import { useTranslation } from 'react-i18next';

interface AuctionModePickerProps {
  value: 'online' | 'in_person';
  onChange: (mode: 'online' | 'in_person') => void;
}

/** In person or online — a two-option radio group. */
const AuctionModePicker: React.FC<AuctionModePickerProps> = ({ value, onChange }) => {
  const { t } = useTranslation('property');
  const options = [
    { id: 'in_person' as const, label: t('listingEvents.inPerson', { defaultValue: 'In person' }) },
    { id: 'online' as const, label: t('listingEvents.online', { defaultValue: 'Online' }) },
  ];
  return (
    <fieldset>
      <legend className="mb-1 block text-sm font-medium text-neutral-700">{t('listingEvents.auctionMode', { defaultValue: 'Where' })}</legend>
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => (
          <label
            key={o.id}
            className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg border text-sm font-semibold ${value === o.id ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-neutral-300 bg-white text-neutral-700'}`}
          >
            <input type="radio" name="auction-mode" value={o.id} checked={value === o.id} onChange={() => onChange(o.id)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
};

export default AuctionModePicker;
