import type { UnitInquiryPayload } from '../../../../types';

export type InquiryField = keyof UnitInquiryPayload;
export type InquiryErrors = Partial<Record<InquiryField, 'required' | 'invalid' | 'tooShort' | 'tooLong'>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^[+()\d\s.-]{6,25}$/;

/** Mirrors the server's checks (POST /developments/:slug/units/:id/inquiries). */
export function validateInquiry(v: UnitInquiryPayload): InquiryErrors {
  const e: InquiryErrors = {};
  const name = v.name.trim();
  if (!name) e.name = 'required';
  else if (name.length < 2) e.name = 'tooShort';
  else if (name.length > 100) e.name = 'tooLong';
  const email = v.email.trim();
  if (!email) e.email = 'required';
  else if (!EMAIL.test(email) || email.length > 254) e.email = 'invalid';
  const phone = v.phone?.trim();
  if (phone && !PHONE.test(phone)) e.phone = 'invalid';
  const msg = v.message.trim();
  if (!msg) e.message = 'required';
  else if (msg.length < 10) e.message = 'tooShort';
  else if (msg.length > 2000) e.message = 'tooLong';
  return e;
}
