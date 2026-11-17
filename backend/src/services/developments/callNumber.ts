/**
 * The number a buyer can call about a residence: its contact phone, else its
 * builder's. Only something that looks like a phone number goes out.
 */
import type { IDevelopment } from '../../models/Development';

/** Digits, spaces and the usual separators, optionally a leading +; 6–20 digits. */
const PHONE = /^\+?[0-9 ()./-]+$/;

/** The trimmed number when it looks callable, else undefined (pure). */
export const callableNumber = (raw: unknown): string | undefined => {
  if (typeof raw !== 'string') return undefined;
  const phone = raw.trim();
  if (!PHONE.test(phone)) return undefined;
  const digits = phone.replace(/\D/g, '').length;
  return digits >= 6 && digits <= 20 ? phone : undefined;
};

export const residenceCallNumber = (development: Pick<IDevelopment, 'contact' | 'builder'>): string | undefined =>
  callableNumber(development.contact?.phone) ?? callableNumber(development.builder?.phone);
