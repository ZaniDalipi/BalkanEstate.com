import { BUSINESS_CATEGORIES, type BusinessCategory, type BusinessCategorySummary } from '@/src/shared/types/businessListing.types';

/** A directory filter chip: a built-in category, or a name owners gave "other". */
export type CategoryChoice =
  | { kind: 'builtin'; value: BusinessCategory }
  | { kind: 'custom'; value: string; name: string };

const CUSTOM_PREFIX = 'custom:';
/** How many built-in chips to show when none is in use yet (the row's old length). */
const BUILTIN_FALLBACK = 10;

export const customChoiceValue = (name: string) => `${CUSTOM_PREFIX}${name}`;

/**
 * The chips: built-in categories with listings first (busiest first), then
 * the names owners typed for "other", then "Other" only if some "other"
 * listings have no name. With no counts yet, the first ten built-ins.
 */
export function categoryChoices(summary: BusinessCategorySummary): CategoryChoice[] {
  const counts = new Map(summary.categories.map((c) => [c.key, c.count]));
  const builtIns = BUSINESS_CATEGORIES.filter((c) => c !== 'other');
  const used = builtIns.filter((c) => (counts.get(c) ?? 0) > 0).sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
  const shown = used.length > 0 ? used : builtIns.slice(0, BUILTIN_FALLBACK);
  return [
    ...shown.map((value): CategoryChoice => ({ kind: 'builtin', value })),
    ...summary.custom.map(({ name }): CategoryChoice => ({ kind: 'custom', value: customChoiceValue(name), name })),
    ...((counts.get('other') ?? 0) > 0 ? [{ kind: 'builtin', value: 'other' } as CategoryChoice] : []),
  ];
}

/** The selected chip value → listing filters. */
export function categoryFilters(value: string): { category?: BusinessCategory; customCategory?: string } {
  if (!value) return {};
  if (value.startsWith(CUSTOM_PREFIX)) {
    const name = value.slice(CUSTOM_PREFIX.length).trim();
    return name ? { customCategory: name } : {};
  }
  return (BUSINESS_CATEGORIES as readonly string[]).includes(value) ? { category: value as BusinessCategory } : {};
}
