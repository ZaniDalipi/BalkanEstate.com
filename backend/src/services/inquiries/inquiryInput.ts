/**
 * Validation of the sender fields every public inquiry form posts (property,
 * agent and area-search inquiries). Pure: no database, so it is unit-tested
 * on its own.
 *
 * The browser checks the same fields, but these endpoints are public and can
 * be called straight from a console, so the server never trusts the client:
 * every field must be a string of sane length, the email must look like one,
 * and a phone, when given, must be a real dialable number (not just "some
 * digits after a plus").
 */
import { isValidPhoneNumber, parsePhoneNumberFromString } from 'libphonenumber-js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const NAME_MIN = 2;
export const NAME_MAX = 100;
export const EMAIL_MAX = 254;
export const MESSAGE_MIN = 2;
/** Room for the "[ref - title]" line the property form puts before the text. */
export const MESSAGE_MAX = 2500;

/** Name of the hidden field real visitors never fill in (bots do). */
export const HONEYPOT_FIELD = 'confirm_details';

export type InquiryField = 'buyerName' | 'buyerEmail' | 'buyerPhone' | 'message';

export type InquiryErrorCode =
  | 'invalid_name'
  | 'invalid_email'
  | 'invalid_phone'
  | 'invalid_message';

export interface InquiryFieldError {
  field: InquiryField;
  code: InquiryErrorCode;
  message: string;
}

export interface BuyerContact {
  buyerName: string;
  buyerEmail: string;
  /** E.164, e.g. "+38971234567". */
  buyerPhone?: string;
  message: string;
}

export type ContactParseResult =
  | { ok: true; value: BuyerContact }
  | { ok: false; errors: InquiryFieldError[] };

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** A real number in E.164 form, or null when it isn't one. */
export const normalizePhone = (raw: string): string | null => {
  const compact = raw.replace(/[\s\-().]/g, '');
  if (!/^\+[0-9]{7,15}$/.test(compact)) return null;
  if (!isValidPhoneNumber(compact)) return null;
  return parsePhoneNumberFromString(compact)?.number ?? null;
};

/** True when the hidden honeypot field came back filled in. */
export const isHoneypotFilled = (body: Record<string, unknown>): boolean =>
  str(body[HONEYPOT_FIELD]).length > 0;

/** Validate and normalise the sender part of an inquiry payload. */
export const parseBuyerContact = (raw: unknown): ContactParseResult => {
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const buyerName = str(body.buyerName);
  const buyerEmail = str(body.buyerEmail).toLowerCase();
  const message = str(body.message);
  const errors: InquiryFieldError[] = [];

  if (buyerName.length < NAME_MIN || buyerName.length > NAME_MAX) {
    errors.push({ field: 'buyerName', code: 'invalid_name', message: `Name must be ${NAME_MIN}–${NAME_MAX} characters` });
  }
  if (!buyerEmail || buyerEmail.length > EMAIL_MAX || !EMAIL_RE.test(buyerEmail)) {
    errors.push({ field: 'buyerEmail', code: 'invalid_email', message: 'A valid email is required' });
  }

  let buyerPhone: string | undefined;
  const rawPhone = body.buyerPhone;
  if (rawPhone !== undefined && rawPhone !== null && rawPhone !== '') {
    const normalized = typeof rawPhone === 'string' ? normalizePhone(rawPhone) : null;
    if (normalized === null) {
      errors.push({ field: 'buyerPhone', code: 'invalid_phone', message: 'Enter a valid phone number with its country code' });
    } else {
      buyerPhone = normalized;
    }
  }

  if (message.length < MESSAGE_MIN || message.length > MESSAGE_MAX) {
    errors.push({ field: 'message', code: 'invalid_message', message: `Message must be ${MESSAGE_MIN}–${MESSAGE_MAX} characters` });
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { buyerName, buyerEmail, buyerPhone, message } };
};
