/**
 * Money for plan purchases. Amounts are stored and compared in whole cents so
 * a €24.99 plan never turns into 24.989999 on the way through.
 */

/** Euros to whole cents. */
export const toCents = (euros: number): number => Math.round(euros * 100);

/** Whole cents to euros. */
export const toEuros = (cents: number): number => Math.round(cents) / 100;

/** What is left to pay after a discount, in euros, rounded to the cent and never below zero. */
export const remainingAfterDiscount = (price: number, discount: number): number =>
  Math.max(0, toEuros(toCents(price) - toCents(discount)));

/** "€24.99" */
export const formatEuros = (cents: number): string => `€${toEuros(cents).toFixed(2)}`;
