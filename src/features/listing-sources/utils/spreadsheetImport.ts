/**
 * CSV / Excel → listing rows parser.
 *
 * Converts a user-uploaded spreadsheet into an array of plain JSON objects
 * keyed by (cleaned) header name, so the result can be fed straight into the
 * existing `detectFeed('sampleJson', …)` pipeline — the backend's
 * `buildJsonFieldMap` heuristics already know how to map header names like
 * "Price (EUR)" or "Bedrooms" to canonical property fields, so we get smart
 * field mapping for free without touching the backend.
 */
import Papa from 'papaparse';
import readExcelFile from 'read-excel-file/browser';

export const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB — comfortably under the 10MB JSON body limit once re-serialized.
export const MAX_ROWS = 2000;

export type SpreadsheetFileKind = 'csv' | 'excel';

export interface ParsedSpreadsheet {
  kind: SpreadsheetFileKind;
  headers: string[];
  rows: Record<string, unknown>[];
  /** Non-fatal issues surfaced to the user (dropped rows, renamed duplicate columns, etc.). */
  warnings: string[];
  /** True when the workbook had more than one sheet with data and we picked the largest one. */
  multiSheet?: boolean;
}

export class SpreadsheetImportError extends Error {}

const CSV_EXTENSIONS = ['.csv', '.tsv', '.txt'];
const EXCEL_EXTENSIONS = ['.xlsx', '.xls'];

const getExtension = (fileName: string): string => {
  const idx = fileName.lastIndexOf('.');
  return idx === -1 ? '' : fileName.slice(idx).toLowerCase();
};

export const detectFileKind = (file: File): SpreadsheetFileKind | null => {
  const ext = getExtension(file.name);
  if (CSV_EXTENSIONS.includes(ext) || file.type === 'text/csv') return 'csv';
  if (
    EXCEL_EXTENSIONS.includes(ext) ||
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.type === 'application/vnd.ms-excel'
  ) {
    return 'excel';
  }
  return null;
};

export const validateFileBeforeParse = (file: File): void => {
  if (file.size === 0) {
    throw new SpreadsheetImportError('That file is empty.');
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new SpreadsheetImportError(
      `File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`
    );
  }
  if (!detectFileKind(file)) {
    throw new SpreadsheetImportError('Unsupported file type. Please upload a .csv, .xlsx, or .xls file.');
  }
};

/** Trim, collapse whitespace, and drop a leading BOM/quote artefact from a raw header cell. */
const cleanHeader = (raw: unknown, index: number): string => {
  const s = String(raw ?? '').replace(/^﻿/, '').trim().replace(/\s+/g, ' ');
  return s || `column_${index + 1}`;
};

/** De-duplicate header names (spreadsheets frequently have blank/duplicate columns from merged cells). */
const dedupeHeaders = (headers: string[], warnings: string[]): string[] => {
  const seen = new Map<string, number>();
  return headers.map((h) => {
    const count = seen.get(h) ?? 0;
    seen.set(h, count + 1);
    if (count === 0) return h;
    const renamed = `${h} (${count + 1})`;
    warnings.push(`Duplicate column "${h}" renamed to "${renamed}".`);
    return renamed;
  });
};

const isRowBlank = (row: unknown[]): boolean => row.every((c) => c == null || String(c).trim() === '');

const rowsFromMatrix = (matrix: unknown[][], warnings: string[]): { headers: string[]; rows: Record<string, unknown>[] } => {
  // Skip fully-blank leading rows (common in exports with a title/logo row above the header).
  let headerIdx = matrix.findIndex((r) => !isRowBlank(r));
  if (headerIdx === -1) headerIdx = 0;

  const headerRow = matrix[headerIdx] ?? [];
  const headers = dedupeHeaders(headerRow.map((h, i) => cleanHeader(h, i)), warnings);

  const rows: Record<string, unknown>[] = [];
  let skippedBlank = 0;
  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const raw = matrix[i] ?? [];
    if (isRowBlank(raw)) {
      skippedBlank++;
      continue;
    }
    const obj: Record<string, unknown> = {};
    headers.forEach((h, colIdx) => {
      const cell = raw[colIdx];
      obj[h] = cell === undefined ? '' : cell;
    });
    rows.push(obj);
  }

  if (skippedBlank > 0) warnings.push(`Skipped ${skippedBlank} blank row(s).`);
  return { headers, rows };
};

const capRowsWarning = (totalRows: number, warnings: string[]): string[] => {
  if (totalRows > MAX_ROWS) {
    warnings.push(`File has ${totalRows} rows — only the first ${MAX_ROWS} were imported. Split large files for full coverage.`);
  }
  return warnings;
};

const parseCsvFile = (file: File): Promise<ParsedSpreadsheet> =>
  new Promise((resolve, reject) => {
    Papa.parse<unknown[]>(file, {
      skipEmptyLines: 'greedy',
      dynamicTyping: true,
      complete: (result) => {
        try {
          const warnings: string[] = [];
          const parseErrors = (result.errors ?? []).filter((e) => e.code !== 'TooFewFields' && e.code !== 'TooManyFields');
          if (parseErrors.length > 0) {
            warnings.push(`${parseErrors.length} row(s) had formatting issues and may be incomplete.`);
          }
          const { headers, rows } = rowsFromMatrix(result.data as unknown[][], warnings);
          if (rows.length === 0) {
            reject(new SpreadsheetImportError('No data rows found in this CSV file — only headers (or nothing) were detected.'));
            return;
          }
          resolve({ kind: 'csv', headers, rows: rows.slice(0, MAX_ROWS), warnings: capRowsWarning(rows.length, warnings) });
        } catch (err) {
          reject(err instanceof Error ? err : new SpreadsheetImportError('Failed to parse CSV file.'));
        }
      },
      error: (err) => reject(new SpreadsheetImportError(`Failed to read CSV file: ${err.message}`)),
    });
  });

const parseExcelFile = async (file: File): Promise<ParsedSpreadsheet> => {
  const warnings: string[] = [];

  let sheets: { sheet: string; data: unknown[][] }[];
  try {
    sheets = (await readExcelFile(file)) as unknown as { sheet: string; data: unknown[][] }[];
  } catch (err) {
    throw new SpreadsheetImportError(
      `Could not read this Excel file — ${(err as Error).message || "check it isn't corrupted or password-protected."}`
    );
  }

  const withData = sheets
    .map((s) => ({ ...s, dataRowCount: s.data.filter((r) => !isRowBlank(r)).length }))
    .filter((s) => s.dataRowCount > 1);

  if (withData.length === 0) {
    throw new SpreadsheetImportError('No data rows found in this Excel file — only headers (or nothing) were detected.');
  }

  const best = withData.reduce((a, b) => (b.dataRowCount > a.dataRowCount ? b : a));

  if (sheets.length > 1) {
    warnings.push(`Multiple sheets found — imported "${best.sheet}" (the one with the most data). Other sheets were ignored.`);
  }

  const { headers, rows } = rowsFromMatrix(best.data, warnings);
  if (rows.length === 0) {
    throw new SpreadsheetImportError('No data rows found in this Excel file — only headers (or nothing) were detected.');
  }

  return {
    kind: 'excel',
    headers,
    rows: rows.slice(0, MAX_ROWS),
    warnings: capRowsWarning(rows.length, warnings),
    multiSheet: sheets.length > 1,
  };
};

/**
 * Parse a user-uploaded .csv/.tsv/.xlsx/.xls file into row objects keyed by
 * header name. Throws `SpreadsheetImportError` with a user-facing message on
 * any unrecoverable problem (wrong type, unreadable file, no data rows).
 */
export const parseSpreadsheetFile = async (file: File): Promise<ParsedSpreadsheet> => {
  validateFileBeforeParse(file);
  const kind = detectFileKind(file);
  if (kind === 'csv') return parseCsvFile(file);
  if (kind === 'excel') return parseExcelFile(file);
  throw new SpreadsheetImportError('Unsupported file type. Please upload a .csv, .xlsx, or .xls file.');
};
