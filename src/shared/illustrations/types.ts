// Every illustration name, as a typed union, so a misspelt name fails the
// type check instead of rendering an empty box.

import type { SOFT_ICONS, SPEC_ILLUSTRATIONS } from './generated/names';

/** Soft 3D icons drawn by scripts/illustrations/soft.mjs. */
export type SoftIconName = (typeof SOFT_ICONS)[number];

/** Isometric property-spec scenes drawn by scripts/illustrations/iso.mjs. */
export type SpecIllustrationName = (typeof SPEC_ILLUSTRATIONS)[number];

/** Hand-made sidebar pictures in public/images/illustrations/nav. */
export const NAV_PICTURES = [
  'account', 'agencies', 'agents', 'analytics', 'blog', 'business', 'buy',
  'explore', 'home', 'how-it-works', 'inbox', 'language', 'logout',
  'new-listing', 'rent', 'saved', 'saved-searches', 'subscription',
  'tools', 'villas',
] as const;
export type NavPictureName = (typeof NAV_PICTURES)[number];

/** Hand-made home-page category pictures in public/images/illustrations/categories. */
export const CATEGORY_PICTURES = ['apartments', 'houses', 'villas', 'land', 'rent', 'luxury'] as const;
export type CategoryPictureName = (typeof CATEGORY_PICTURES)[number];

export interface IllustrationProps<N extends string> {
  name: N;
  className?: string;
}
