import { useMemo } from 'react';
import { BALKAN_LOCATIONS } from '@/utils/balkanLocations';
import type { SelectOption } from '../../shared/FormSelect';

/** The location part of a development form, as text the inputs hold. */
export interface LocationValue {
  country: string;
  city: string;
  municipality: string;
  address: string;
  lat: string;
  lng: string;
}

const withCurrent = (options: SelectOption[], current: string): SelectOption[] =>
  current && !options.some((o) => o.value === current) ? [{ value: current, label: current }, ...options] : options;

/**
 * Country → city dropdowns from the app's Balkan location catalog. Picking a
 * country resets the city; picking a city fills its coordinates and a default
 * address. A saved value that is not in the catalog stays selectable so
 * editing an older development never silently drops it.
 */
export const useLocationFields = (value: LocationValue, onChange: (patch: Partial<LocationValue>) => void) => {
  const cities = useMemo(() => BALKAN_LOCATIONS.find((c) => c.name === value.country)?.cities ?? [], [value.country]);
  const countryOptions = useMemo(
    () =>
      withCurrent(
        BALKAN_LOCATIONS.map((c) => ({ value: c.name, label: c.name })),
        value.country,
      ),
    [value.country],
  );
  const cityOptions = useMemo(
    () =>
      withCurrent(
        cities.map((c) => ({ value: c.name, label: c.name })),
        value.city,
      ),
    [cities, value.city],
  );

  const onCountryChange = (country: string) => onChange({ country, city: '', lat: '', lng: '', address: '' });

  const onCityChange = (city: string) => {
    const match = cities.find((c) => c.name === city);
    if (!match) return onChange({ city });
    // Replace the address only while it is empty or still the previous default.
    const isDefault = !value.address.trim() || value.address === `${value.city}, ${value.country}`;
    onChange({
      city,
      lat: String(match.lat),
      lng: String(match.lng),
      ...(isDefault ? { address: `${city}, ${value.country}` } : {}),
    });
  };

  return { countryOptions, cityOptions, onCountryChange, onCityChange };
};
