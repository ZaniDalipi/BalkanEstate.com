import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { searchLocation } from '@/services/osmService';
import { SoftIcon } from '@/src/shared/illustrations';
import type { HomePlace } from './homePlace';
import type { LocateResult } from './useHomePlace';
import { isValidLatLng } from './spotlightUtils';

interface HomePlacePickerProps {
  onPick: (place: HomePlace) => void;
  locateMe: (label: string) => Promise<LocateResult>;
  isLocating: boolean;
}

type Hit = { label: string; lat: number; lng: number };

/** Choose where trips start: the current position, or a typed address. */
const HomePlacePicker: React.FC<HomePlacePickerProps> = ({ onPick, locateMe, isLocating }) => {
  const { t } = useTranslation(['search']);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLocate = async () => {
    setError(null);
    const result = await locateMe(t('search:spotlight.route.myLocation', 'Current location'));
    if (result.ok === false) {
      setError(result.reason === 'denied'
        ? t('search:spotlight.route.locationDenied', 'Location access is off. Type your address instead.')
        : t('search:spotlight.route.locationUnavailable', "Couldn't find your position. Type your address instead."));
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 3) return;
    setIsSearching(true);
    setError(null);
    const results = await searchLocation(query);
    const valid = results
      .map((r) => ({ label: r.display_name, lat: Number(r.lat), lng: Number(r.lon) }))
      .filter((h) => isValidLatLng(h))
      .slice(0, 5);
    setHits(valid);
    setIsSearching(false);
    if (valid.length === 0) setError(t('search:spotlight.route.noResults', 'No place found. Try a street and city.'));
  };

  return (
    <div className="space-y-3">
      <button type="button" onClick={handleLocate} disabled={isLocating}
        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
        <SoftIcon name="pin" className="h-5 w-5" />
        {isLocating ? t('search:spotlight.route.locating', 'Finding you…') : t('search:spotlight.route.useMyLocation', 'Use my location')}
      </button>
      <form onSubmit={handleSearch} className="flex gap-2">
        <label className="sr-only" htmlFor="spotlight-home-address">{t('search:spotlight.route.typeAddress', 'Or type your address')}</label>
        <input id="spotlight-home-address" value={query} onChange={(e) => setQuery(e.target.value)} maxLength={160}
          placeholder={t('search:spotlight.route.typeAddress', 'Or type your address')}
          className="min-h-[44px] flex-1 rounded-xl border border-neutral-300 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <button type="submit" disabled={isSearching || query.trim().length < 3}
          className="min-h-[44px] rounded-xl bg-neutral-900 px-4 text-sm font-semibold text-white disabled:opacity-40">
          {isSearching ? '…' : t('search:spotlight.route.find', 'Find')}
        </button>
      </form>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {hits && hits.length > 0 && (
        <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl ring-1 ring-neutral-200">
          {hits.map((h) => (
            <li key={`${h.lat},${h.lng}`}>
              <button type="button" onClick={() => onPick({ ...h, label: h.label.slice(0, 160), source: 'address' })}
                className="min-h-[44px] w-full px-3 py-2 text-left text-sm hover:bg-neutral-50">{h.label}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default HomePlacePicker;
