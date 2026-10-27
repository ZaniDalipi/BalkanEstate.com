/**
 * A small RFC 4180 reader for spreadsheets saved as CSV. It guesses the
 * separator (comma, semicolon — what Excel uses in most Balkan locales — or
 * tab), handles quoted cells with separators and line breaks inside, strips the
 * UTF-8 BOM, and undoes the apostrophe our own export adds before formula-like
 * text, so an exported file imports back unchanged.
 */
const SEPARATORS = [',', ';', '\t'] as const;

/** The separator used most often on the first line, outside quotes. */
export const detectSeparator = (text: string): string => {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const counts = new Map<string, number>(SEPARATORS.map((s) => [s, 0]));
  let quoted = false;
  for (const ch of firstLine) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && counts.has(ch)) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }
  const [best, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return count > 0 ? best : ',';
};

const unneutralise = (cell: string): string => (/^'\s*[=+\-@\t\r]/.test(cell) ? cell.slice(1) : cell);

/** Rows of trimmed cells; fully empty rows are dropped. */
export const parseCsv = (input: string): string[][] => {
  const text = input.replace(/^﻿/, '');
  const sep = detectSeparator(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const endCell = () => {
    row.push(unneutralise(cell.trim()));
    cell = '';
  };
  const endRow = () => {
    endCell();
    if (row.some((c) => c !== '')) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell.trim() === '') {
      quoted = true;
      cell = '';
    } else if (ch === sep) endCell();
    else if (ch === '\n') endRow();
    else if (ch !== '\r') cell += ch;
  }
  if (cell !== '' || row.length) endRow();
  return rows;
};
