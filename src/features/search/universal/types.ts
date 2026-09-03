/**
 * What the omnibox can offer.
 *
 * One dropdown, several kinds of answer — a place to fly the map to, a
 * listing to open, a sentence to run as a search, something searched before.
 * They share a shape so the list can be rendered, keyboard-navigated and
 * measured as a single list, which is the only way ↑/↓ can cross a group
 * boundary the way it does on Google.
 */

import type { Property } from '@/types';
import type { IndexedPlace } from './places';
import type { QueryIntent } from '@/shared/search';

export type SuggestionType = 'query' | 'place' | 'property' | 'recent';

interface SuggestionBase {
  id: string;
  type: SuggestionType;
  /** Bold first line. */
  title: string;
  /** Grey second line — context, never a repeat of the title. */
  subtitle?: string;
}

export interface QuerySuggestion extends SuggestionBase {
  type: 'query';
  /** Text to run as the search. */
  text: string;
  /** Filters read out of the text, when the sentence carried any. */
  intent?: QueryIntent;
}

export interface PlaceSuggestion extends SuggestionBase {
  type: 'place';
  /** Present for a place the app holds itself; absent for a geocoder hit. */
  place?: IndexedPlace;
  searchValue: string;
  lat?: number;
  lng?: number;
  zoom?: number;
  /** Bounding box from the geocoder, when it gave one. */
  boundingbox?: [string, string, string, string];
  source: 'local' | 'geocoder';
  distanceKm?: number;
}

export interface PropertySuggestion extends SuggestionBase {
  type: 'property';
  property: Property;
}

export interface RecentSuggestion extends SuggestionBase {
  type: 'recent';
  text: string;
}

export type Suggestion = QuerySuggestion | PlaceSuggestion | PropertySuggestion | RecentSuggestion;

export interface SuggestionGroup {
  /** i18n key for the group heading; empty for an unlabelled first group. */
  labelKey: string;
  suggestions: Suggestion[];
}
