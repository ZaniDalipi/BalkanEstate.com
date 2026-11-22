import React from 'react';
import { SkeletonCard } from '@/src/components/ui/Animations';
import { SEO } from '@/src/components/seo';
import Footer from '@/components/shared/Footer';
import { AppLink } from '@/src/app/router/AppLink';
import { paths } from '@/src/app/router/paths';
import type { MarketCountryRef, MarketDeal } from '../types';
import { countryLabel, marketHeading } from '../utils/marketPageText';
import { useMarketText } from '../hooks/useMarketText';

const PRIMARY_LINK =
  'inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700';
const SECONDARY_LINK =
  'inline-flex min-h-[44px] items-center justify-center rounded-full border border-neutral-300 px-5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50';

export const MarketShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
    <div className="mx-auto max-w-6xl px-4 pb-12 pt-6 sm:px-6 landscape:pt-3">{children}</div>
    <Footer />
  </div>
);

const searchPathFor = (deal: MarketDeal) => (deal === 'rent' ? paths.rentals() : paths.search());

export const MarketLoading: React.FC = () => {
  const { t } = useMarketText();
  return (
    <MarketShell>
      <div role="status" aria-live="polite">
        <span className="sr-only">{t('marketPages:loading', { defaultValue: 'Loading listings…' })}</span>
        <div className="h-8 w-2/3 animate-pulse rounded bg-neutral-200" aria-hidden="true" />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    </MarketShell>
  );
};

interface MarketErrorProps {
  deal: MarketDeal;
  onRetry: () => void;
}

/** The API could not be reached: say so, offer to retry, and offer the map. */
export const MarketError: React.FC<MarketErrorProps> = ({ deal, onRetry }) => {
  const { t } = useMarketText();
  return (
    <MarketShell>
      <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h1 className="text-xl font-semibold text-red-900">
          {t('marketPages:error.title', { defaultValue: 'This page could not be loaded' })}
        </h1>
        <p className="mt-2 text-red-800">
          {t('marketPages:error.body', { defaultValue: 'Check your connection and try again, or search the map instead.' })}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={onRetry} className={PRIMARY_LINK}>
            {t('marketPages:error.retry', { defaultValue: 'Try again' })}
          </button>
          <AppLink to={searchPathFor(deal)} className={SECONDARY_LINK}>
            {t('marketPages:error.search', { defaultValue: 'Search the map' })}
          </AppLink>
        </div>
      </div>
    </MarketShell>
  );
};

interface MarketNotFoundProps {
  deal: MarketDeal;
  /** Set when the country exists but the city has no listings: offer the country. */
  country?: MarketCountryRef;
}

export const MarketNotFound: React.FC<MarketNotFoundProps> = ({ deal, country }) => {
  const { t } = useMarketText();
  const title = country
    ? t('marketPages:notFound.title', { defaultValue: 'No listings in this city right now' })
    : t('marketPages:notFound.page', { defaultValue: 'This page does not exist' });
  return (
    <MarketShell>
      <SEO title={title} noindex />
      <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl landscape:text-2xl">{title}</h1>
      {country && (
        <p className="mt-3 text-neutral-700">
          {t('marketPages:notFound.body', {
            defaultValue: 'We have no live listings in this city at the moment. Here are the listings across the rest of the country.',
          })}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        {country ? (
          <AppLink to={paths.market(deal, country.slug)} className={PRIMARY_LINK}>
            {t('marketPages:notFound.country', { country: countryLabel(t, country), defaultValue: 'Property in {{country}}' })}
          </AppLink>
        ) : (
          <AppLink to={paths.market(deal)} className={PRIMARY_LINK}>
            {marketHeading(t, deal, {})}
          </AppLink>
        )}
        <AppLink to={searchPathFor(deal)} className={SECONDARY_LINK}>
          {t('marketPages:error.search', { defaultValue: 'Search the map' })}
        </AppLink>
      </div>
    </MarketShell>
  );
};
