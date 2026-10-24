import React from 'react';
import { useTranslation } from 'react-i18next';
import { Building2 } from 'lucide-react';
import { useNearbyDevelopments } from '../../hooks';
import { SuggestionRow } from './suggestions/SuggestionRow';

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
 * put the listing on its apartment (when they control the residence), link it
 * to the residence only, or request access. Shows where it is attached today.
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
    { lat, lng, country, city, limit: 5, listingId },
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
