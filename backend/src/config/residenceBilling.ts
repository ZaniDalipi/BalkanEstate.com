/**
 * Residence Pass — what a residence costs and what it includes.
 *
 * Creating and setting up a residence is free. The first publish starts a free
 * trial; after it the residence stays public only with a Residence Pass (or as
 * one of the residences a premium plan includes). A pass includes
 * INCLUDED_BUILDINGS buildings; more are bought per pass period.
 *
 * Prices live in `Product` documents (admin-editable); the numbers here are
 * the fallbacks used when a product is missing.
 */

export const RESIDENCE_TRIAL_DAYS = 15;
export const RESIDENCE_INCLUDED_BUILDINGS = 5;
export const RESIDENCE_PASS_MONTHS = 12;

/** Abuse guard: one residence on trial at a time, and this many trials ever. */
export const MAX_TRIALS_PER_OWNER = 3;

/** Reminder emails, in days after the trial started (expiry is always sent). */
export const RESIDENCE_REMINDER_DAYS = [10, 14] as const;

/** Published residences a premium plan includes without a pass, by `user.subscription.tier`. */
export const INCLUDED_RESIDENCES_BY_TIER: Readonly<Record<string, number>> = {
  pro: 1,
  agency_owner: 3,
};

/** Premium owners pay this much less for passes beyond the included ones. */
export const PREMIUM_PASS_DISCOUNT = 0.3;

export const RESIDENCE_PRODUCTS = {
  pass: 'residence_pass_yearly',
  extraBuilding: 'residence_extra_building_yearly',
} as const;

/** Fallback prices (EUR) when the Product documents are missing. */
export const RESIDENCE_FALLBACK_PRICES = { pass: 149, extraBuilding: 29 } as const;

export const RESIDENCE_PURCHASE_KINDS = ['pass', 'extra_building'] as const;
export type ResidencePurchaseKind = (typeof RESIDENCE_PURCHASE_KINDS)[number];

export const RESIDENCE_PURCHASE_PROVIDERS = ['coupon', 'admin', 'paysera'] as const;
export type ResidencePurchaseProvider = (typeof RESIDENCE_PURCHASE_PROVIDERS)[number];

export const RESIDENCE_PURCHASE_STATUSES = ['pending', 'completed', 'refunded'] as const;
export type ResidencePurchaseStatus = (typeof RESIDENCE_PURCHASE_STATUSES)[number];

/** Most extra buildings bought in one go; keeps a typo from creating a huge order. */
export const MAX_EXTRA_BUILDINGS_PER_PURCHASE = 50;

/** What a residence's visibility currently rests on. */
export const RESIDENCE_ACCESS_STATES = ['none', 'trial', 'active', 'included', 'expired'] as const;
export type ResidenceAccessState = (typeof RESIDENCE_ACCESS_STATES)[number];
