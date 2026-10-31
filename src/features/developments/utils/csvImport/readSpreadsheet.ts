/**
 * Read an uploaded spreadsheet into plain rows of text, whatever its format:
 * CSV/TXT through `parseCsv`, Excel .xlsx through `read-excel-file` (loaded
 * only when an Excel file is chosen, so it never weighs on the page). Every
 * worksheet that has data comes back, so the owner can pick one.
 */
import { parseCsv } from './parseCsv';

export interface SheetRows {
  name: string;
  rows: string[][];
}

export class SpreadsheetError extends Error {
  constructor(public readonly code: 'oldExcel' | 'unreadable') {
    super(code);
  }
}

const isXlsx = (file: File) =>
  /\.xlsx$/i.test(file.name) || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const isOldExcel = (file: File) => /\.xls$/i.test(file.name) || file.type === 'application/vnd.ms-excel';

/**
 * One cell as text our value readers understand. Numbers are written with a
 * dot decimal; a value with exactly three decimals gets a trailing zero
 * ("1.2340") so it is never mistaken for a thousands group ("1.234" → 1234).
 */
export const cellText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '';
    if (Number.isInteger(value)) return String(value);
    const text = String(Math.round(value * 1e6) / 1e6);
    return /\.\d{3}$/.test(text) ? `${text}0` : text;
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value).trim();
};

const hasData = (rows: string[][]) => rows.filter((r) => r.some((c) => c !== '')).length >= 2;

export const readSpreadsheet = async (file: File): Promise<SheetRows[]> => {
  if (isOldExcel(file) && !isXlsx(file)) throw new SpreadsheetError('oldExcel');
  if (!isXlsx(file)) return [{ name: file.name, rows: parseCsv(await file.text()) }];
  try {
    const { default: readXlsxFile } = await import('read-excel-file/browser');
    const sheets = await readXlsxFile(file);
    return sheets
      .map((s) => ({ name: s.sheet, rows: s.data.map((row) => row.map(cellText)).filter((r) => r.some((c) => c !== '')) }))
      .filter((s) => hasData(s.rows));
  } catch {
    throw new SpreadsheetError('unreadable');
  }
};
