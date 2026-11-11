/**
 * JSON pasted from a website, a chat or a document often carries characters
 * JSON doesn't allow: non-breaking spaces as indentation, zero-width spaces,
 * "smart" quotes, Unicode line separators, a trailing comma. Clean those
 * up, then parse — and when it still fails, say where.
 */

export const cleanPastedJson = (raw: string): string =>
  raw
    .replace(/^\uFEFF/, '')
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/[\u2028\u2029]/g, '\n')
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/,(\s*[}\]])/g, '$1')
    .trim();

export type PastedJson =
  | { ok: true; value: unknown }
  | { ok: false; empty: true }
  | { ok: false; empty: false; line?: number; column?: number; reason: string };

/** Line and column (1-based) of a character offset. */
const locate = (text: string, offset: number): { line: number; column: number } => {
  const before = text.slice(0, offset).split('\n');
  return { line: before.length, column: before[before.length - 1].length + 1 };
};

export const parsePastedJson = (raw: string): PastedJson => {
  const text = cleanPastedJson(raw);
  if (!text) return { ok: false, empty: true };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (err) {
    const message = (err as Error).message.split('\n')[0];
    const position = message.match(/position (\d+)/i);
    const where = position ? locate(text, Number(position[1])) : undefined;
    const reason = message.replace(/\s*\(line \d+ column \d+\)/i, '').replace(/ in JSON at position \d+/i, '');
    return { ok: false, empty: false, reason, ...where };
  }
};
