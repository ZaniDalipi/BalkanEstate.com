import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, MapPin, Check, ArrowUpRight, Loader2 } from 'lucide-react';
import { useNearbyDevelopments, useSuggestionActions } from '../../hooks';
import type { NearbySuggestion } from '../../types';

interface ResidenceSuggestionsProps {
  lat: number;
  lng: number;
  country?: string;
  city?: string;
  /** The saved listing id. Without it, attaching is disabled (save first). */
  listingId?: string;
  /** Only query when the location section is actually ready. */
  enabled?: boolean;
}

/**
 * Panel 4 — listing-creation attach suggestions. While a seller creates or
 * edits a listing, surface published residences near the pin so they can
 * attach the listing (when they control the residence) or request access.
 * Self-contained: renders nothing when there are no nearby residences.
 */
export const ResidenceSuggestions: React.FC<ResidenceSuggestionsProps> = ({
  lat,
  lng,
  country,
  city,
  listingId,
  enabled = true,
}) => {
  const { t } = useTranslation('developments');
  const { data: suggestions, isLoading, isError } = useNearbyDevelopments(
    { lat, lng, country, city, limit: 5 },
    enabled
  );

  if (!enabled || isLoading) return null;
  if (isError) {
    return <p className="text-sm text-muted-foreground">{t('suggest.error')}</p>;
  }
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
      <div className="mb-1 flex items-center gap-2">
        <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
        <h3 className="text-base font-semibold text-foreground">{t('suggest.heading')}</h3>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{t('suggest.subtitle')}</p>
      <ul className="space-y-3">
        {suggestions.map((s) => (
          <SuggestionRow key={s.development.id} suggestion={s} listingId={listingId} />
        ))}
      </ul>
    </section>
  );
};

const SuggestionRow: React.FC<{ suggestion: NearbySuggestion; listingId?: string }> = ({
  suggestion,
  listingId,
}) => {
  const { t } = useTranslation('developments');
  const { attach, isAttaching, request, isRequesting } = useSuggestionActions();
  const [done, setDone] = useState<'attached' | 'requested' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { development: dev, distanceM, matchScore, canAttach } = suggestion;
  const km = Math.max(0.1, Math.round((distanceM / 1000) * 10) / 10);

  const onAttach = async () => {
    if (!listingId) return;
    setError(null);
    try {
      await attach({ developmentId: dev.id, listingId });
      setDone('attached');
    } catch {
      setError(t('errors.generic'));
    }
  };

  const onRequest = async () => {
    setError(null);
    try {
      await request({ slug: dev.slug, listingId });
      setDone('requested');
    } catch {
      setError(t('errors.generic'));
    }
  };

  return (
    <li className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <a
            href={`/developments/${dev.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 truncate font-medium text-foreground hover:text-primary"
          >
            <span className="truncate">{dev.name}</span>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          </a>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {dev.city}
            </span>
            <span>{t('suggest.distanceKm', { km })}</span>
            <span className="font-medium text-primary">{t('suggest.match', { score: matchScore })}</span>
          </div>
        </div>
        <div className="shrink-0">
          {done ? (
            <span className="flex items-center gap-1 text-sm font-medium text-green-700 dark:text-green-400">
              <Check className="h-4 w-4" aria-hidden="true" />
              {done === 'attached' ? t('suggest.attached') : t('suggest.requested')}
            </span>
          ) : canAttach ? (
            <button
              type="button"
              onClick={onAttach}
              disabled={!listingId || isAttaching}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {isAttaching && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              {isAttaching ? t('suggest.attaching') : t('suggest.attach')}
            </button>
          ) : (
            <button
              type="button"
              onClick={onRequest}
              disabled={isRequesting}
              className="inline-flex items-center gap-1 rounded-lg border border-input px-3 py-1.5 text-sm font-medium text-foreground disabled:opacity-50"
            >
              {isRequesting && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              {isRequesting ? t('suggest.requesting') : t('suggest.request')}
            </button>
          )}
        </div>
      </div>
      {canAttach && !listingId && !done && (
        <p className="mt-2 text-xs text-muted-foreground">{t('suggest.saveFirst')}</p>
      )}
      {!canAttach && !done && (
        <p className="mt-2 text-xs text-muted-foreground">{t('suggest.requestHint')}</p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </li>
  );
};
