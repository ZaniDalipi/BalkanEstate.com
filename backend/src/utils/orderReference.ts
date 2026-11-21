import { randomInt } from 'crypto';

/**
 * Short references customers quote on a bank transfer, e.g. BE-7K3Q-9F2M.
 * No 0/O, 1/I/L, so they survive being read out or typed by hand.
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** BE: a plan order. CP: a 100%-off code redemption. */
export type ReferencePrefix = 'BE' | 'CP';

export const ORDER_REFERENCE_PATTERN = /^(BE|CP)-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/;

export function newOrderReference(
  prefix: ReferencePrefix = 'BE',
  pick: (max: number) => number = randomInt
): string {
  const group = () => Array.from({ length: 4 }, () => ALPHABET[pick(ALPHABET.length)]).join('');
  return `${prefix}-${group()}-${group()}`;
}

/** Trim and upper-case what a person typed, so "be-7k3q-9f2m " finds BE-7K3Q-9F2M. */
export const normalizeOrderReference = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toUpperCase() : '';
