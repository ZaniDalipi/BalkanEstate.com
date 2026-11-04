import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon } from '@/src/shared/illustrations';
import type { SoftIconName } from '@/src/shared/illustrations/types';
import HomePlacePicker from './HomePlacePicker';
import TravelTime from './TravelTime';
import { TRAVEL_MODES, directionsUrl, formatDistance, type LatLng, type TravelMode } from './spotlightUtils';
import type { SpotlightRoute as RouteState } from './useSpotlightRoute';

const MODE_ICON: Record<TravelMode, SoftIconName> = { driving: 'car', walking: 'user', transit: 'ticket' };

/** Where you start, how you travel, and how long it takes — drawn on the map. */
const SpotlightRoute: React.FC<{ route: RouteState; destination: LatLng }> = ({ route, destination }) => {
  const { t } = useTranslation(['search']);
  const [picking, setPicking] = useState(false);
  const modeLabel: Record<TravelMode, string> = {
    driving: t('search:spotlight.route.modes.driving', 'Car'),
    walking: t('search:spotlight.route.modes.walking', 'Walk'),
    transit: t('search:spotlight.route.modes.transit', 'Transit'),
  };

  if (!route.origin || picking) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-neutral-600">{t('search:spotlight.route.pickStart', 'Choose where you start to see the route and travel time.')}</p>
        <HomePlacePicker locateMe={route.locateMe} isLocating={route.isLocating}
          onPick={(place) => { route.setHome(place); setPicking(false); }} />
      </div>
    );
  }

  const result = route.result;
  const from = route.home?.label || t('search:spotlight.route.myLocation', 'Current location');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl bg-neutral-50 px-3 py-2 ring-1 ring-neutral-100">
        <SoftIcon name="home" className="h-6 w-6 flex-none" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wide text-neutral-500">{t('search:spotlight.route.from', 'From')}</p>
          <p className="truncate text-sm font-medium text-neutral-900">{from}</p>
        </div>
        <button type="button" onClick={() => setPicking(true)} className="min-h-[44px] px-2 text-sm font-semibold text-primary">
          {t('search:spotlight.route.change', 'Change')}
        </button>
      </div>

      <div role="radiogroup" aria-label={t('search:spotlight.route.modeLabel', 'How you travel')} className="grid grid-cols-3 gap-2">
        {TRAVEL_MODES.map((m) => (
          <button key={m} type="button" role="radio" aria-checked={route.mode === m} onClick={() => route.setMode(m)}
            className={`flex min-h-[44px] flex-col items-center gap-1 rounded-xl py-2 text-xs font-semibold transition-colors ${route.mode === m ? 'bg-primary text-white shadow-md shadow-primary/25' : 'bg-white text-neutral-700 ring-1 ring-neutral-200'}`}>
            <SoftIcon name={MODE_ICON[m]} className="h-5 w-5" />{modeLabel[m]}
          </button>
        ))}
      </div>

      <div aria-live="polite" className="min-h-[64px] rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-3 ring-1 ring-blue-100">
        {route.isRouting ? (
          <p className="text-sm text-blue-900">{t('search:spotlight.route.calculating', 'Finding the best route…')}</p>
        ) : result?.ok ? (
          <p className="text-blue-950">
            <span className="text-2xl font-bold"><TravelTime seconds={result.seconds} /></span>
            <span className="ml-2 text-sm">{formatDistance(result.meters)}</span>
          </p>
        ) : (
          <p role="alert" className="text-sm text-blue-950">
            {result?.ok === false && result.reason === 'no-route'
              ? t('search:spotlight.route.noRoute', 'No route for this way of travel. Try another.')
              : t('search:spotlight.route.unavailable', "Live directions aren't available here. Open the route in Google Maps instead.")}
            {route.straightMeters !== null && (
              <span className="mt-1 block text-blue-900/80">
                {t('search:spotlight.route.straightLine', '{{distance}} as the crow flies', { distance: formatDistance(route.straightMeters) })}
              </span>
            )}
          </p>
        )}
      </div>

      <a href={directionsUrl(route.origin, destination, route.mode)} target="_blank" rel="noopener noreferrer"
        className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white">
        {t('search:spotlight.route.openInGoogle', 'Open in Google Maps')} ↗
      </a>
    </div>
  );
};

export default SpotlightRoute;
