import type { SoftIconName } from '@/src/shared/illustrations';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';

/** Each category's colour, used where a business has no banner or logo of its own. */
export const CATEGORY_GRADIENTS: Record<string, string> = {
  construction: 'from-amber-500 to-orange-600',
  renovation: 'from-blue-500 to-cyan-600',
  cleaning: 'from-emerald-400 to-teal-600',
  moving: 'from-purple-500 to-indigo-600',
  interior_design: 'from-pink-500 to-rose-600',
  architecture: 'from-slate-500 to-zinc-700',
  plumbing: 'from-sky-500 to-blue-600',
  electrical: 'from-yellow-500 to-amber-600',
  landscaping: 'from-green-500 to-emerald-700',
  security: 'from-red-500 to-rose-700',
  real_estate_law: 'from-indigo-500 to-violet-700',
  insurance: 'from-cyan-500 to-blue-700',
  home_inspection: 'from-orange-400 to-red-600',
  pest_control: 'from-lime-500 to-green-700',
  painting: 'from-fuchsia-500 to-purple-700',
  roofing: 'from-stone-500 to-neutral-700',
  hvac: 'from-blue-400 to-indigo-600',
  furniture: 'from-amber-400 to-yellow-600',
  appliances: 'from-gray-500 to-slate-700',
  other: 'from-primary to-blue-600',
};

export const CATEGORY_ICONS: Record<string, SoftIconName> = {
  construction: 'crane',
  renovation: 'wrench',
  cleaning: 'sparkles',
  moving: 'car',
  interior_design: 'sofa',
  architecture: 'ruler',
  plumbing: 'bath',
  electrical: 'bolt',
  landscaping: 'tree',
  security: 'lock',
  real_estate_law: 'scales',
  insurance: 'shield',
  home_inspection: 'search',
  pest_control: 'warning',
  painting: 'pencil',
  roofing: 'home',
  hvac: 'snowflake',
  furniture: 'bed',
  appliances: 'kitchen',
  other: 'clipboard',
};

export const categoryGradient = (category: string): string => CATEGORY_GRADIENTS[category] ?? CATEGORY_GRADIENTS.other;
export const categoryIcon = (category: string): SoftIconName => CATEGORY_ICONS[category] ?? CATEGORY_ICONS.other;

/** The category as shown: the owner's own words for "other", the translation otherwise. */
export const categoryLabel = (
  l: Pick<BusinessListing, 'category' | 'customCategory'>,
  t: (key: string) => string,
): string => (l.category === 'other' && l.customCategory ? l.customCategory : t(`categories.${l.category}`));
