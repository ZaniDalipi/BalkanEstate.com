import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('read-excel-file/browser', () => ({
  default: vi.fn(),
}));

import readExcelFile from 'read-excel-file/browser';
import {
  parseSpreadsheetFile,
  validateFileBeforeParse,
  detectFileKind,
  SpreadsheetImportError,
  MAX_FILE_SIZE_BYTES,
  MAX_ROWS,
} from './spreadsheetImport';

const csvFile = (content: string, name = 'listings.csv') => new File([content], name, { type: 'text/csv' });

describe('detectFileKind', () => {
  it('recognizes csv by extension', () => {
    expect(detectFileKind(csvFile('a,b', 'file.csv'))).toBe('csv');
  });

  it('recognizes xlsx by extension', () => {
    const f = new File(['x'], 'file.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    expect(detectFileKind(f)).toBe('excel');
  });

  it('returns null for unsupported types', () => {
    const f = new File(['x'], 'file.pdf', { type: 'application/pdf' });
    expect(detectFileKind(f)).toBeNull();
  });
});

describe('validateFileBeforeParse', () => {
  it('rejects empty files', () => {
    const f = new File([], 'empty.csv', { type: 'text/csv' });
    expect(() => validateFileBeforeParse(f)).toThrow(SpreadsheetImportError);
  });

  it('rejects files over the size limit', () => {
    const big = new File([new ArrayBuffer(MAX_FILE_SIZE_BYTES + 1)], 'big.csv', { type: 'text/csv' });
    expect(() => validateFileBeforeParse(big)).toThrow(/too large/i);
  });

  it('rejects unsupported extensions', () => {
    const f = new File(['hello'], 'notes.pdf', { type: 'application/pdf' });
    expect(() => validateFileBeforeParse(f)).toThrow(/unsupported/i);
  });

  it('accepts a normal csv file', () => {
    expect(() => validateFileBeforeParse(csvFile('title,price\nFlat,1000'))).not.toThrow();
  });
});

describe('parseSpreadsheetFile — CSV', () => {
  it('parses headers and rows into objects', async () => {
    const file = csvFile('Title,Price (EUR),City\nModern flat,95000,Zagreb\nCottage,150000,Split');
    const result = await parseSpreadsheetFile(file);
    expect(result.kind).toBe('csv');
    expect(result.headers).toEqual(['Title', 'Price (EUR)', 'City']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({ Title: 'Modern flat', City: 'Zagreb' });
    expect(result.rows[0]['Price (EUR)']).toBe(95000);
  });

  it('throws when there are no data rows', async () => {
    const file = csvFile('Title,Price,City');
    await expect(parseSpreadsheetFile(file)).rejects.toThrow(/no data rows/i);
  });

  it('throws for a completely empty file', async () => {
    const file = new File([], 'empty.csv', { type: 'text/csv' });
    await expect(parseSpreadsheetFile(file)).rejects.toThrow(/empty/i);
  });

  it('skips blank rows (CSV parser drops them before they reach the row builder)', async () => {
    const file = csvFile('Title,Price\nFlat,1000\n,\nHouse,2000');
    const result = await parseSpreadsheetFile(file);
    expect(result.rows).toHaveLength(2);
  });

  it('de-duplicates repeated column headers', async () => {
    const file = csvFile('Title,Price,Price\nFlat,1000,1000EUR');
    const result = await parseSpreadsheetFile(file);
    expect(result.headers).toEqual(['Title', 'Price', 'Price (2)']);
    expect(result.warnings.some((w) => /duplicate column/i.test(w))).toBe(true);
  });

  it('caps rows at MAX_ROWS and warns', async () => {
    const lines = ['Title,Price'];
    for (let i = 0; i < MAX_ROWS + 10; i++) lines.push(`Flat ${i},1000`);
    const file = csvFile(lines.join('\n'));
    const result = await parseSpreadsheetFile(file);
    expect(result.rows).toHaveLength(MAX_ROWS);
    expect(result.warnings.some((w) => /only the first/i.test(w))).toBe(true);
  });

  it('fills unnamed trailing columns with a synthetic header', async () => {
    const file = csvFile('Title,Price,\nFlat,1000,extra');
    const result = await parseSpreadsheetFile(file);
    expect(result.headers[2]).toBe('column_3');
  });
});

describe('parseSpreadsheetFile — Excel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('parses the first sheet into row objects', async () => {
    vi.mocked(readExcelFile).mockResolvedValue([
      {
        sheet: 'Sheet1',
        data: [
          ['Title', 'Price', 'Bedrooms'],
          ['Modern flat', 95000, 2],
          ['Cottage', 150000, 3],
        ],
      },
    ] as never);

    const file = new File(['x'], 'listings.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const result = await parseSpreadsheetFile(file);
    expect(result.kind).toBe('excel');
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({ Title: 'Modern flat', Price: 95000, Bedrooms: 2 });
  });

  it('picks the sheet with the most data when multiple sheets exist', async () => {
    vi.mocked(readExcelFile).mockResolvedValue([
      { sheet: 'Notes', data: [['note'], ['just one row, no header+data pair']] },
      {
        sheet: 'Listings',
        data: [
          ['Title', 'Price'],
          ['Flat', 1000],
          ['House', 2000],
        ],
      },
    ] as never);

    const file = new File(['x'], 'workbook.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const result = await parseSpreadsheetFile(file);
    expect(result.rows).toHaveLength(2);
    expect(result.warnings.some((w) => /Listings/.test(w))).toBe(true);
  });

  it('throws a friendly error when the workbook cannot be read', async () => {
    vi.mocked(readExcelFile).mockRejectedValue(new Error('corrupt zip'));
    const file = new File(['x'], 'broken.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    await expect(parseSpreadsheetFile(file)).rejects.toThrow(/could not read/i);
  });

  it('skips blank rows in a sheet and reports them as a warning', async () => {
    vi.mocked(readExcelFile).mockResolvedValue([
      {
        sheet: 'Sheet1',
        data: [
          ['Title', 'Price'],
          ['Flat', 1000],
          [null, ''],
          ['House', 2000],
        ],
      },
    ] as never);

    const file = new File(['x'], 'listings.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const result = await parseSpreadsheetFile(file);
    expect(result.rows).toHaveLength(2);
    expect(result.warnings.some((w) => /blank row/i.test(w))).toBe(true);
  });

  it('throws when every sheet is empty', async () => {
    vi.mocked(readExcelFile).mockResolvedValue([{ sheet: 'Sheet1', data: [] }] as never);
    const file = new File(['x'], 'empty.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    await expect(parseSpreadsheetFile(file)).rejects.toThrow(/no data rows/i);
  });
});
