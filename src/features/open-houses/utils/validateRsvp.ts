import { validateEmail, validatePhone } from '@/src/shared/utils/validation';
import type { RsvpInput } from '../types';

export type RsvpField = 'name' | 'email' | 'phone';
export type RsvpErrors = Partial<Record<RsvpField, { key: string; defaultValue: string }>>;

/** Name and email are needed; a phone is optional but must look like one. */
export function validateRsvp(v: RsvpInput): { ok: true; value: RsvpInput } | { ok: false; errors: RsvpErrors } {
  const errors: RsvpErrors = {};
  const name = v.name.trim();
  const email = v.email.trim();
  const phone = v.phone?.trim() ?? '';
  if (!name) errors.name = { key: 'property:openHouse.errors.nameRequired', defaultValue: 'Please enter your name' };
  if (validateEmail(email).isValid === false) {
    errors.email = { key: 'property:openHouse.errors.emailInvalid', defaultValue: 'Please enter a valid email address' };
  }
  if (phone && validatePhone(phone).isValid === false) {
    errors.phone = { key: 'property:openHouse.errors.phoneInvalid', defaultValue: 'Please enter a valid phone number, or leave it empty' };
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { name, email, phone: phone || undefined } };
}
