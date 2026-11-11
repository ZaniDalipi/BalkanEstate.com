/**
 * Phone numbers as owners type them — "+355 068 606 0190", "00355686060190",
 * "+3550686060190" — turned into one dialable form and one readable form.
 *
 * Most countries the directory serves write a trunk "0" before the area code
 * at home and drop it after the country code ("068…" → "+355 68…"). Owners
 * often keep it, which makes the number fail from abroad and on WhatsApp.
 */

/** Country codes whose national trunk prefix is "0" (and must go after the code). */
const TRUNK_ZERO_CODES = ['355', '359', '381', '382', '383', '385', '386', '387', '389', '40', '90', '49', '43', '41', '44', '33', '36'];
/** Every code we recognise for grouping, longest first so "38x" wins over "3x". */
const KNOWN_CODES = [...TRUNK_ZERO_CODES, '30', '39', '1', '7', '34', '31', '32', '45', '46', '47', '48', '420', '421']
  .sort((a, b) => b.length - a.length);

const countryCodeOf = (digits: string): string | null => KNOWN_CODES.find((c) => digits.startsWith(c)) ?? null;

/** "+35568…" for an international number, or the bare digits for a local one. Empty for none. */
export function toDialable(raw: string | undefined): string {
  if (!raw) return '';
  let value = raw.trim().replace(/[^\d+]/g, '');
  if (value.startsWith('00')) value = `+${value.slice(2)}`;
  const international = value.startsWith('+');
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  if (!international) return digits;
  const code = countryCodeOf(digits);
  if (code && TRUNK_ZERO_CODES.includes(code) && digits[code.length] === '0') {
    return `+${code}${digits.slice(code.length + 1)}`;
  }
  return `+${digits}`;
}

/** Split a national number into readable groups: "686060190" → "68 606 0190". */
const groupNational = (n: string): string => {
  if (n.length <= 4) return n;
  if (n.length <= 7) return `${n.slice(0, 3)} ${n.slice(3)}`;
  const head = n.slice(0, 2);
  const rest = n.slice(2);
  const tail = rest.length > 6 ? rest.slice(-4) : rest.slice(-3);
  const middle = rest.slice(0, rest.length - tail.length);
  return [head, middle, tail].filter(Boolean).join(' ');
};

/** "+355 68 606 0190" — readable, still copy-paste dialable. Falls back to the text as typed. */
export function formatPhone(raw: string | undefined): string {
  const dial = toDialable(raw);
  if (!dial) return raw?.trim() ?? '';
  if (!dial.startsWith('+')) return raw!.trim();
  const digits = dial.slice(1);
  const code = countryCodeOf(digits);
  if (!code) return raw!.trim();
  return `+${code} ${groupNational(digits.slice(code.length))}`;
}

export const telHref = (raw: string | undefined): string => `tel:${toDialable(raw)}`;

/** wa.me takes digits only, no "+". */
export const whatsappHref = (raw: string | undefined, text?: string): string =>
  `https://wa.me/${toDialable(raw).replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

export const viberHref = (raw: string | undefined): string =>
  `viber://chat?number=${encodeURIComponent(toDialable(raw))}`;
