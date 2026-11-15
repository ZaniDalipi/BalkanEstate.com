/**
 * Dates on BalkanEstate are written dd/mm/yyyy, everywhere. These helpers
 * format, parse and type-ahead that format; they are pure and unit-tested.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** A moment → "21/11/2026", in `timeZone` when given (else the viewer's clock). */
export function formatDMY(date: Date | string | number, timeZone?: string): string {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  if (!timeZone) return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const parts = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('day')}/${get('month')}/${get('year')}`;
}

/** "2026-11-21" → "21/11/2026" ('' when not a date). */
export const fromISODate = (iso: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};

/** "21/11/2026" → "2026-11-21" ('' unless it is a real calendar date). */
export const toISODate = (dmy: string): string => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((dmy ?? '').trim());
  if (!m) return '';
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(year, month - 1, day);
  // Rejects 31/02 and the like, which Date would roll into March.
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return '';
  return `${year}-${pad(month)}-${pad(day)}`;
};

/** Typing help: digits only, slashes added → "21/11/2026". */
export const autoFormatDate = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length > 4) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
};
