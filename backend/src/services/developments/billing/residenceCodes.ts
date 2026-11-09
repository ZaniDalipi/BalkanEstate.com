/**
 * Residence unlock codes, the pure part: what an admin may ask for, what a
 * code looks like, and where a code stands. A code names one residence
 * product (DiscountCode, source 'residence') and takes a percentage or an
 * amount off its price. One that covers the whole price unlocks it at once;
 * any other lowers the price the owner pays (by arrangement while online
 * payment is off).
 */
import crypto from 'crypto';
import { RESIDENCE_PRODUCTS } from '../../../config/residenceBilling';
import { ValidationError } from '../developmentService';

export const RESIDENCE_CODE_KINDS = ['pass', 'extra_building'] as const;
export type ResidenceCodeKind = (typeof RESIDENCE_CODE_KINDS)[number];
export const RESIDENCE_CODE_PRODUCTS: Record<ResidenceCodeKind, string> = { pass: RESIDENCE_PRODUCTS.pass, extra_building: RESIDENCE_PRODUCTS.extraBuilding };
export const RESIDENCE_PRODUCT_IDS: string[] = Object.values(RESIDENCE_CODE_PRODUCTS);

export const CODE_LIMITS = { maxCount: 50, maxUses: 100, minDays: 1, maxDays: 730, defaultDays: 90, note: 200, maxPercent: 100, maxFixed: 10000 } as const;

export const CODE_DISCOUNT_TYPES = ['percentage', 'fixed'] as const;
export type CodeDiscountType = (typeof CODE_DISCOUNT_TYPES)[number];

export type ResidenceCodeStatus = 'active' | 'used' | 'expired' | 'disabled' | 'scheduled';

/** No 0/O or 1/I: codes are read out and typed by people. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** A fresh code: RES-XXXX-XXXX from a cryptographic source (32 symbols, so every byte maps evenly). */
export function newResidenceCode(random: (n: number) => Buffer = crypto.randomBytes): string {
  const bytes = random(8);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
  return `RES-${chars.slice(0, 4)}-${chars.slice(4, 8)}`;
}

export interface CreateCodesInput {
  kind: ResidenceCodeKind;
  /** Percentage (1–100; 100 is the whole price) or euros off (1–10 000). */
  discountType: CodeDiscountType;
  discountValue: number;
  count: number;
  usageLimit: number;
  validUntil: Date;
  note?: string;
}

const wholeIn = (v: unknown, field: string, min: number, max: number, fallback: number): number => {
  const n = v === undefined || v === null || v === '' ? fallback : Number(v);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new ValidationError(`${field} must be a whole number from ${min} to ${max}`, { code: 'FIELD_RANGE', field, params: { min, max } });
  }
  return n;
};

/** Check what the admin asked for; the end date is `days` from now (end of that day). */
export function parseCreateCodes(body: Record<string, unknown> | undefined, now = new Date()): CreateCodesInput {
  const raw = body ?? {};
  const kind = raw.kind as ResidenceCodeKind;
  if (!RESIDENCE_CODE_KINDS.includes(kind)) throw new ValidationError('kind must be "pass" or "extra_building"', { code: 'FIELD_INVALID', field: 'kind' });
  const discountType = (raw.discountType ?? 'percentage') as CodeDiscountType;
  if (!CODE_DISCOUNT_TYPES.includes(discountType)) throw new ValidationError('discountType must be "percentage" or "fixed"', { code: 'FIELD_INVALID', field: 'discountType' });
  const discountValue =
    discountType === 'percentage'
      ? wholeIn(raw.discountValue, 'discountValue', 1, CODE_LIMITS.maxPercent, 100)
      : wholeIn(raw.discountValue, 'discountValue', 1, CODE_LIMITS.maxFixed, Number.NaN);
  const count = wholeIn(raw.count, 'count', 1, CODE_LIMITS.maxCount, 1);
  const usageLimit = wholeIn(raw.usageLimit, 'usageLimit', 1, CODE_LIMITS.maxUses, 1);
  const days = wholeIn(raw.days, 'days', CODE_LIMITS.minDays, CODE_LIMITS.maxDays, CODE_LIMITS.defaultDays);
  const note = typeof raw.note === 'string' ? raw.note.trim() : '';
  if (raw.note !== undefined && raw.note !== null && typeof raw.note !== 'string') throw new ValidationError('note must be text', { code: 'FIELD_INVALID', field: 'note' });
  if (note.length > CODE_LIMITS.note) throw new ValidationError('note is too long', { code: 'FIELD_TOO_LONG', field: 'note', params: { max: CODE_LIMITS.note } });
  const validUntil = new Date(now.getTime() + days * 86_400_000);
  validUntil.setUTCHours(23, 59, 59, 999);
  return { kind, discountType, discountValue, count, usageLimit, validUntil, ...(note ? { note } : {}) };
}

/** Where a code stands, in the order an admin cares about. */
export function codeStatus(code: { isActive: boolean; validFrom: Date; validUntil: Date; usedCount: number; usageLimit: number }, now = new Date()): ResidenceCodeStatus {
  if (!code.isActive) return 'disabled';
  if (code.usedCount >= code.usageLimit) return 'used';
  if (now > code.validUntil) return 'expired';
  if (now < code.validFrom) return 'scheduled';
  return 'active';
}

/** The query for one status (the list's filter). */
export function statusQuery(status: unknown, now = new Date()): Record<string, unknown> {
  switch (status) {
    case 'active':
      return { isActive: true, validFrom: { $lte: now }, validUntil: { $gte: now }, $expr: { $lt: ['$usedCount', '$usageLimit'] } };
    case 'used':
      return { isActive: true, $expr: { $gte: ['$usedCount', '$usageLimit'] } };
    case 'expired':
      return { isActive: true, validUntil: { $lt: now }, $expr: { $lt: ['$usedCount', '$usageLimit'] } };
    case 'disabled':
      return { isActive: false };
    default:
      return {};
  }
}

/** The kind a code unlocks, from the residence product it names. */
export const kindOf = (applicablePlans: string[] | undefined): ResidenceCodeKind =>
  applicablePlans?.includes(RESIDENCE_CODE_PRODUCTS.extra_building) && !applicablePlans.includes(RESIDENCE_CODE_PRODUCTS.pass) ? 'extra_building' : 'pass';
