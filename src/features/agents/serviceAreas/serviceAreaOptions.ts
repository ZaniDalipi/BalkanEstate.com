import { searchPlaces } from '@/src/features/search/universal/places';
import { normalizePlaceName } from '@/shared/geo';
import type { LocationSuggestion } from '@/src/features/seller/hooks/useLocationSearch';

/** One row of the service-area picker: what it reads, and what is stored. */
export interface ServiceAreaOption {
  id: string;
  title: string;
  subtitle: string;
  /** Stored on the agent — "Budva, Montenegro" — so a search for either word finds it. */
  value: string;
}

const MAX_COUNTRIES = 2;
const MAX_OPTIONS = 8;

/** The text stored for a picked place: its name with its city and country. */
export const serviceAreaValue = (title: string, subtitle: string): string =>
  [title, subtitle].filter(Boolean).join(', ');

/**
 * Everything the site-wide search can find, as service areas.
 *
 * Countries come first — a whole country is a perfectly good area to serve,
 * though the map picker leaves them out because a pin cannot go on one — then
 * the cities, villages and remote places the location search found. Areas the
 * agent already has are left out rather than offered twice.
 */
export const serviceAreaOptions = (
  query: string,
  suggestions: LocationSuggestion[],
  taken: string[]
): ServiceAreaOption[] => {
  const takenKeys = new Set(taken.map(normalizePlaceName));
  const options: ServiceAreaOption[] = [];

  const push = (id: string, title: string, subtitle: string) => {
    const value = serviceAreaValue(title, subtitle);
    const key = normalizePlaceName(value);
    if (!title || takenKeys.has(key)) return;
    takenKeys.add(key);
    options.push({ id, title, subtitle, value });
  };

  if (query.trim().length >= 2) {
    searchPlaces(query, { limit: 8 })
      .filter(({ place }) => place.kind === 'country')
      .slice(0, MAX_COUNTRIES)
      .forEach(({ place }) => push(place.id, place.label.primary, place.label.secondary));
  }

  suggestions.forEach((s) => push(s.id, s.title, s.subtitle));

  return options.slice(0, MAX_OPTIONS);
};
