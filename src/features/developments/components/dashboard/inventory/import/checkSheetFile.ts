/** The largest spreadsheet we read in the browser. */
export const MAX_SHEET_BYTES = 10 * 1024 * 1024;

export type SheetFileProblem = 'tooBig' | 'oldExcel' | 'wrongType';

/** Why a chosen file can't be imported, or null when it looks like an .xlsx or .csv we can read. */
export const sheetFileProblem = (file: Pick<File, 'name' | 'size'>): SheetFileProblem | null => {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xls')) return 'oldExcel';
  if (!/\.(xlsx|csv|txt)$/.test(name)) return 'wrongType';
  if (file.size > MAX_SHEET_BYTES) return 'tooBig';
  return null;
};
