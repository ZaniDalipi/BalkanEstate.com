import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/src/shared/components/ui/Input';
import { FormSelect } from '../../shared/FormSelect';
import { formatCoordinate } from '../../../utils/format';
import { LocationPinMap } from './LocationPinMap';
import { useLocationFields, type LocationValue } from './useLocationFields';

/** Tidy a typed coordinate to the app's 6 decimals once the field is left. */
const tidy = (v: string) => (v.trim() && Number.isFinite(Number(v)) ? formatCoordinate(Number(v)) : v);

type LocationErrorKey = 'country' | 'city' | 'lat' | 'lng';

interface LocationFieldsProps {
  value: LocationValue;
  onChange: (patch: Partial<LocationValue>) => void;
  /** Translated error messages per field. */
  errors?: Partial<Record<LocationErrorKey, string>>;
  /** Also show municipality and the exact map coordinates (the edit form). */
  detailed?: boolean;
  disabled?: boolean;
}

/** Country, city, address — and optionally municipality and coordinates — shared by the create and edit forms. */
export const LocationFields: React.FC<LocationFieldsProps> = ({ value, onChange, errors = {}, detailed = false, disabled = false }) => {
  const { t } = useTranslation('developments');
  const { countryOptions, cityOptions, onCountryChange, onCityChange } = useLocationFields(value, onChange);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormSelect
          label={t('wizard.country')}
          placeholder={t('wizard.selectCountry')}
          options={countryOptions}
          value={value.country}
          onChange={(e) => onCountryChange(e.target.value)}
          error={errors.country}
          disabled={disabled}
          required
        />
        <FormSelect
          label={t('wizard.city')}
          placeholder={value.country ? t('wizard.selectCity') : t('wizard.selectCountryFirst')}
          options={cityOptions}
          value={value.city}
          onChange={(e) => onCityChange(e.target.value)}
          error={errors.city}
          disabled={disabled || !value.country}
          required
        />
      </div>
      {detailed && (
        <Input
          label={t('details.municipality', 'Municipality / area')}
          value={value.municipality}
          onChange={(e) => onChange({ municipality: e.target.value })}
          maxLength={120}
          disabled={disabled}
        />
      )}
      <Input
        label={t('wizard.address')}
        value={value.address}
        onChange={(e) => onChange({ address: e.target.value })}
        helperText={t('wizard.addressHelper')}
        maxLength={300}
        disabled={disabled}
      />
      {detailed && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={t('details.lat', 'Latitude')}
            value={value.lat}
            onChange={(e) => onChange({ lat: e.target.value })}
            onBlur={() => onChange({ lat: tidy(value.lat) })}
            error={errors.lat}
            inputMode="decimal"
            placeholder="41.327500"
            disabled={disabled}
          />
          <Input
            label={t('details.lng', 'Longitude')}
            value={value.lng}
            onChange={(e) => onChange({ lng: e.target.value })}
            onBlur={() => onChange({ lng: tidy(value.lng) })}
            error={errors.lng}
            inputMode="decimal"
            placeholder="19.818700"
            disabled={disabled}
          />
          <p className="text-sm text-slate-600 sm:col-span-2">
            {t('details.coordinatesHelper', 'Filled in from the city. Drag the pin on the map, or type them, to place the residence exactly.')}
          </p>
        </div>
      )}
      {detailed && <LocationPinMap value={value} onChange={onChange} disabled={disabled} />}
    </div>
  );
};
