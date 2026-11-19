import { describe, it, expect } from 'vitest';
import { describeInquiryError } from '../utils/inquiryErrors';

const t = (_key: string, fallback: string) => fallback;
const apiError = (code: string, message = 'server text') => Object.assign(new Error(message), { code });

describe('describeInquiryError', () => {
  it('routes phone problems to the phone field', () => {
    expect(describeInquiryError(apiError('invalid_phone'), t, 'x')).toMatchObject({ field: 'buyerPhone' });
    expect(describeInquiryError(apiError('phone_mismatch'), t, 'x')).toMatchObject({ field: 'buyerPhone' });
  });

  it('shows duplicate and rate-limit refusals as a form message', () => {
    const dup = describeInquiryError(apiError('duplicate_inquiry'), t, 'x');
    expect(dup.field).toBeUndefined();
    expect(dup.message).toMatch(/already sent/);
    expect(describeInquiryError(apiError('sender_limit'), t, 'x').message).toMatch(/try again/);
  });

  it('uses the translation for a known code', () => {
    const tr = (key: string) => `T(${key})`;
    expect(describeInquiryError(apiError('invalid_email'), tr, 'x')).toEqual({ field: 'buyerEmail', message: 'T(common:inquiryErrors.invalidEmail)' });
  });

  it('falls back to the server message, then to the given text', () => {
    expect(describeInquiryError(apiError('something_else', 'Property not found'), t, 'x').message).toBe('Property not found');
    expect(describeInquiryError('weird', t, 'Failed to send')).toEqual({ message: 'Failed to send' });
  });
});
