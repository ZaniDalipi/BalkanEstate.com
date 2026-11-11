/** Turning what an admin types into the alert email list. Pure. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Several addresses can be pasted at once, separated by commas, semicolons or spaces. */
export const splitEmailInput = (text: string): string[] =>
  text.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);

export type AddEmailsResult =
  | { ok: true; list: string[] }
  | { ok: false; reason: 'empty' | 'invalid' | 'tooMany'; invalid: string[] };

export function addEmails(list: readonly string[], text: string, max: number): AddEmailsResult {
  const typed = splitEmailInput(text);
  if (typed.length === 0) return { ok: false, reason: 'empty', invalid: [] };
  const invalid = typed.filter((e) => e.length > 254 || !EMAIL_RE.test(e));
  if (invalid.length > 0) return { ok: false, reason: 'invalid', invalid };
  const next = [...new Set([...list, ...typed])];
  if (next.length > max) return { ok: false, reason: 'tooMany', invalid: [] };
  return { ok: true, list: next };
}

export const sameList = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((e, i) => e === b[i]);
