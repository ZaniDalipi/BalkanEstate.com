import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bike, Car, ExternalLink, Footprints, Loader2 } from 'lucide-react';
import { SoftIcon } from '@/src/shared/illustrations';
import type { VisitorLocation } from '../../hooks/useVisitorLocation';
import { appleMapsDirections, googleMapsDirections, haversineKm, prefersAppleMaps, type LatLng, type TravelMode, type TravelRoute } from '../../utils/travel';
import { GlassSegmented, type SegmentOption } from './GlassSegmented';
import { PRIMARY_ACTION, SECONDARY_ACTION } from './glassStyles';
import { RouteSummary } from './RouteSummary';

interface RoutePlannerProps {
  business: LatLng;
  location: VisitorLocation;
  onLocate: () => void;
  mode: TravelMode;
  onModeChange: (mode: TravelMode) => void;
  route: { data: TravelRoute | undefined; isLoading: boolean; isError: boolean };
}

const icon = (I: typeof Car): React.FC<{ className?: string }> => ({ className }) => <I className={className} aria-hidden="true" />;

/** How to get there from here: ask for the visitor's location, then time and distance by car, on foot or by bike. */
export const RoutePlanner: React.FC<RoutePlannerProps> = ({ business, location, onLocate, mode, onModeChange, route }) => {
  const { t } = useTranslation('businessDirectory');
  const from = location.status === 'ready' ? location.position : null;
  const google = googleMapsDirections(business, mode, from);
  const apple = appleMapsDirections(business, mode, from);
  const appleFirst = typeof navigator !== 'undefined' && prefersAppleMaps(navigator.userAgent);
  const modes: Array<SegmentOption<TravelMode>> = [
    { value: 'car', label: t('detail.route.car', 'Drive'), Icon: icon(Car) },
    { value: 'foot', label: t('detail.route.foot', 'Walk'), Icon: icon(Footprints) },
    { value: 'bike', label: t('detail.route.bike', 'Cycle'), Icon: icon(Bike) },
  ];
  const openIn = (href: string, name: string, primary: boolean) => (
    <a
      key={name}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('detail.route.openIn', { app: name, defaultValue: 'Open in {{app}}' })}
      className={`${primary ? PRIMARY_ACTION : SECONDARY_ACTION} min-h-[48px] flex-1 whitespace-nowrap !px-3 text-[15px]`}
    >
      {name}
      <ExternalLink className="h-4 w-4 opacity-80" aria-hidden="true" />
    </a>
  );
  const links = appleFirst ? [openIn(apple, 'Apple Maps', true), openIn(google, 'Google Maps', false)] : [openIn(google, 'Google Maps', true), openIn(apple, 'Apple Maps', false)];

  if (location.status === 'ready') {
    return (
      <div className="space-y-3">
        <GlassSegmented options={modes} value={mode} onChange={onModeChange} label={t('detail.route.modeLabel', 'Travel mode')} className="flex w-full" />
        <RouteSummary straightKm={haversineKm(location.position, business)} route={route.data} isLoading={route.isLoading} failed={route.isError} />
        <div className="flex gap-2">{links}</div>
      </div>
    );
  }

  const blocked = location.status === 'denied' || location.status === 'unavailable';
  return (
    <div className="space-y-3">
      {location.status !== 'unsupported' && (
        <button type="button" onClick={onLocate} disabled={location.status === 'locating'} className={`${SECONDARY_ACTION} min-h-[52px] w-full text-[15px] disabled:opacity-70`}>
          {location.status === 'locating'
            ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            : <SoftIcon name="target" className="h-6 w-6" />}
          {location.status === 'locating' ? t('detail.route.locating', 'Finding you…') : blocked ? t('detail.route.retry', 'Try my location again') : t('detail.route.fromMe', 'Distance & route from my location')}
        </button>
      )}
      {blocked ? (
        <p role="alert" className="flex items-start gap-2 text-sm text-rose-700">
          <SoftIcon name="warning" className="h-5 w-5 shrink-0" />
          {location.status === 'denied'
            ? t('detail.route.denied', 'Location is turned off for this site. Allow it in your browser settings — or let your maps app find you.')
            : t('detail.route.unavailable', 'We couldn’t find your location. Your maps app can still take you there.')}
        </p>
      ) : (
        <p className="text-[13px] text-neutral-500">{t('detail.route.privacy', 'Your location is only used to work out the route. It isn’t saved.')}</p>
      )}
      <div className="flex gap-2">{links}</div>
    </div>
  );
};
