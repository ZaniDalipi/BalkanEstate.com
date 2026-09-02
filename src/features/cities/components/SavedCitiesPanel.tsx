import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bookmark, Mail, AlertTriangle } from 'lucide-react';
import type { CityMarketData } from '@/services/apiService';
import type { SavedCity } from '../api/savedCitiesApi';
import { savedCityKey } from '../api/savedCitiesApi';
import CityMarketCard from './CityMarketCard';

export interface SavedCitiesPanelProps {
  savedCities: SavedCity[];
  /** Every city the page has market data for, used to render full cards. */
  allCities: CityMarketData[];
  isSignedIn: boolean;
  isLoading: boolean;
  hasError: boolean;
  pendingKey: string | null;
  onToggleSave: (city: CityMarketData) => void;
  onOpen: (city: CityMarketData) => void;
  onViewListings: (event: React.MouseEvent, city: CityMarketData) => void;
  onOpenEmailSettings: () => void;
}

/**
 * The "Saved places" tab.
 *
 * Renders the same card as the main grid — the follow list is an ordering of
 * the market data the page already has, not a second copy of it. A saved city
 * the page has no market row for still gets a row of its own rather than
 * disappearing, so the reader can always see (and undo) what they follow.
 */
const SavedCitiesPanel: React.FC<SavedCitiesPanelProps> = ({
  savedCities, allCities, isSignedIn, isLoading, hasError, pendingKey,
  onToggleSave, onOpen, onViewListings, onOpenEmailSettings,
}) => {
  const { t } = useTranslation(['exploreCities']);

  if (!isSignedIn) {
    return (
      <EmptyState
        title={t('saved.signedOutTitle', 'Sign in to save places')}
        message={t('saved.signedOutMessage', 'Follow the cities you care about and we will email you when their market moves.')}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-white rounded-xl border border-neutral-200 p-6 animate-pulse">
            <div className="h-6 bg-neutral-200 rounded w-3/4 mb-4" />
            <div className="h-4 bg-neutral-200 rounded w-1/2 mb-6" />
            <div className="space-y-3">
              <div className="h-4 bg-neutral-200 rounded w-full" />
              <div className="h-4 bg-neutral-200 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3.5 text-sm text-amber-800">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <span>{t('saved.loadError', 'We could not load your saved places. Please try again.')}</span>
      </div>
    );
  }

  if (savedCities.length === 0) {
    return (
      <EmptyState
        title={t('saved.emptyTitle', 'No saved places yet')}
        message={t('saved.emptyMessage', 'Tap the bookmark on any city to follow it. We will email you when prices there move.')}
      />
    );
  }

  const marketByKey = new Map(allCities.map(city => [savedCityKey(city.city, city.country), city]));

  return (
    <>
      {/* What following actually does — stated where the reader acts on it. */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-primary/5 border border-primary/15 px-4 py-3">
        <p className="flex items-center gap-2 text-sm text-neutral-700">
          <Mail className="w-4 h-4 text-primary flex-shrink-0" />
          {t('saved.emailNotice', 'You get an email when the market in these cities moves.')}
        </p>
        <button
          type="button"
          onClick={onOpenEmailSettings}
          className="text-sm font-semibold text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/30 rounded"
        >
          {t('saved.manageEmails', 'Email settings')}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {savedCities.map(saved => {
          const key = savedCityKey(saved.city, saved.country);
          const market = marketByKey.get(key);

          if (market) {
            return (
              <CityMarketCard
                key={key}
                city={market}
                isSaved
                canSave
                isSavePending={pendingKey === key}
                onToggleSave={onToggleSave}
                onOpen={onOpen}
                onViewListings={onViewListings}
              />
            );
          }

          return (
            <div key={key} className="bg-white rounded-xl border border-neutral-200 p-5 shadow-md flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-neutral-900">{saved.city}</h3>
                <p className="text-sm text-neutral-500">{saved.country}</p>
                <p className="mt-3 text-xs text-neutral-500">
                  {t('saved.marketDataPending', 'Market figures for this city are not available right now — you are still following it.')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onToggleSave({
                  city: saved.city,
                  country: saved.country,
                  countryCode: saved.countryCode,
                } as CityMarketData)}
                disabled={pendingKey === key}
                className="mt-4 self-start text-sm font-semibold text-primary hover:underline disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary/30 rounded"
              >
                {t('saved.unfollow', 'Unfollow')}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
};

const EmptyState: React.FC<{ title: string; message: string }> = ({ title, message }) => (
  <div className="bg-white rounded-2xl shadow-md border border-neutral-200 p-12 text-center">
    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
      <Bookmark className="w-9 h-9 text-primary" />
    </div>
    <h3 className="text-xl font-semibold text-neutral-800 mb-2">{title}</h3>
    <p className="text-neutral-500 max-w-md mx-auto">{message}</p>
  </div>
);

export default SavedCitiesPanel;
