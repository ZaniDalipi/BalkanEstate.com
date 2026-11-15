import { escapeRegex } from '../../utils/escapeRegex';
import BusinessListing, { BUSINESS_CATEGORIES } from '../../models/BusinessListing';

export const MAX_CUSTOM_CATEGORY_LENGTH = 100;
/** How many owner-named categories the directory offers as choices. */
export const MAX_CUSTOM_CHOICES = 30;

export interface CategoryCount { key: string; count: number }
export interface CustomCategoryCount { name: string; count: number }
export interface BusinessCategorySummary {
  /** Built-in categories with active listings ("other" counts only those without a name of their own). */
  categories: CategoryCount[];
  /** The names owners typed for "other", merged regardless of case and spacing, busiest first. */
  custom: CustomCategoryCount[];
}

/** One spelling per name: trimmed, inner spaces collapsed, compared without case. */
export const normalizeCustomCategory = (name: string): string => name.trim().replace(/\s+/g, ' ');
const keyOf = (name: string) => normalizeCustomCategory(name).toLocaleLowerCase();

/**
 * Merges spellings of the same owner-named category ("360 Virtual Tours",
 * "360 virtual tours ") into one choice shown in its most used spelling.
 */
export function groupCustomCategories(rows: CustomCategoryCount[], max = MAX_CUSTOM_CHOICES): CustomCategoryCount[] {
  const groups = new Map<string, { total: number; spellings: Map<string, number> }>();
  for (const row of rows) {
    const name = normalizeCustomCategory(row.name ?? '');
    if (!name) continue;
    const g = groups.get(keyOf(name)) ?? { total: 0, spellings: new Map<string, number>() };
    g.total += row.count;
    g.spellings.set(name, (g.spellings.get(name) ?? 0) + row.count);
    groups.set(keyOf(name), g);
  }
  return [...groups.values()]
    .map((g) => ({
      name: [...g.spellings.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]![0],
      count: g.total,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, max);
}

/** Mongo filter for listings in an owner-named category, matched like the grouping above. */
export function customCategoryFilter(name: string): Record<string, unknown> | null {
  const clean = normalizeCustomCategory(name);
  if (!clean || clean.length > MAX_CUSTOM_CATEGORY_LENGTH) return null;
  const pattern = clean.split(' ').map(escapeRegex).join('\\s+');
  return { category: 'other', customCategory: { $regex: new RegExp(`^\\s*${pattern}\\s*$`, 'i') } };
}

type GroupRow = { _id: { category: string; custom: string | null }; count: number };

/** Splits the aggregation rows into built-in counts and owner-named choices. */
export function summarizeCategoryRows(rows: GroupRow[]): BusinessCategorySummary {
  const builtIn = new Map<string, number>();
  const custom: CustomCategoryCount[] = [];
  for (const { _id, count } of rows) {
    if (_id.category === 'other' && _id.custom && normalizeCustomCategory(_id.custom)) {
      custom.push({ name: _id.custom, count });
    } else if ((BUSINESS_CATEGORIES as readonly string[]).includes(_id.category)) {
      builtIn.set(_id.category, (builtIn.get(_id.category) ?? 0) + count);
    }
  }
  return {
    categories: [...builtIn.entries()].map(([key, count]) => ({ key, count })),
    custom: groupCustomCategories(custom),
  };
}

/** Category counts over active listings, optionally of one listing type. */
export async function getBusinessCategorySummary(listingType?: string): Promise<BusinessCategorySummary> {
  const match: Record<string, unknown> = { isActive: true };
  if (listingType) match.listingType = listingType;
  const rows = await BusinessListing.aggregate<GroupRow>([
    { $match: match },
    {
      $group: {
        _id: { category: '$category', custom: { $cond: [{ $eq: ['$category', 'other'] }, '$customCategory', null] } },
        count: { $sum: 1 },
      },
    },
  ]);
  return summarizeCategoryRows(rows);
}
