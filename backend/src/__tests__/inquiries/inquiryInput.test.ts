import { isHoneypotFilled, normalizePhone, parseBuyerContact } from '../../services/inquiries/inquiryInput';

const valid = { buyerName: 'Ana Buyer', buyerEmail: 'Ana@Example.com ', buyerPhone: '+382 67 123 456', message: 'Is it available?' };

describe('normalizePhone', () => {
  it.each(['+38971234567', '+355 69 123 4567', '+381 (64) 123-4567', '+382 67 123 456'])('accepts the real number %s', (p) => {
    expect(normalizePhone(p)).toMatch(/^\+\d+$/);
  });

  // The three numbers a scripted sender used against production.
  it.each(['+134535624332', '+154323523', '+1543647547', '12345678', '+1', 'call me', '+38900000000000000'])(
    'rejects %s',
    (p) => expect(normalizePhone(p)).toBeNull()
  );
});

describe('parseBuyerContact', () => {
  it('normalises a valid payload', () => {
    const r = parseBuyerContact(valid);
    expect(r).toEqual({
      ok: true,
      value: { buyerName: 'Ana Buyer', buyerEmail: 'ana@example.com', buyerPhone: '+38267123456', message: 'Is it available?' },
    });
  });

  it('treats a missing or empty phone as no phone', () => {
    const r = parseBuyerContact({ ...valid, buyerPhone: '' });
    expect(r.ok && r.value.buyerPhone).toBeUndefined();
  });

  it('lists every bad field with a code', () => {
    const r = parseBuyerContact({ buyerName: 'A', buyerEmail: 'nope', buyerPhone: '+154323523', message: '' });
    expect(r.ok).toBe(false);
    if (r.ok === false) {
      expect(r.errors.map((e) => e.code)).toEqual(['invalid_name', 'invalid_email', 'invalid_phone', 'invalid_message']);
    }
  });

  it('rejects non-string values (e.g. objects posted from a console)', () => {
    const r = parseBuyerContact({ ...valid, buyerEmail: { $gt: '' }, buyerPhone: 12345678 });
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.errors.map((e) => e.field)).toEqual(['buyerEmail', 'buyerPhone']);
  });

  it('rejects an over-long message', () => {
    expect(parseBuyerContact({ ...valid, message: 'x'.repeat(2501) }).ok).toBe(false);
  });
});

describe('isHoneypotFilled', () => {
  it('is false for an absent or blank field and true when filled', () => {
    expect(isHoneypotFilled({})).toBe(false);
    expect(isHoneypotFilled({ confirm_details: '  ' })).toBe(false);
    expect(isHoneypotFilled({ confirm_details: 'http://spam' })).toBe(true);
  });
});
