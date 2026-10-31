import React, { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { downloadTemplate } from './downloadTemplate';
import type { SheetError } from './useCsvSheet';

interface ImportFilePickerProps {
  onFile: (file: File) => void;
  error: SheetError | null;
}

const SHEET_ERROR_DEFAULTS: Record<SheetError, string> = {
  tooBig: 'The file is larger than 10 MB.',
  empty: 'The file needs a header row and at least one unit.',
  unreadable: 'This file could not be read. Save it as .xlsx or .csv and try again.',
  oldExcel: 'This is an old Excel file (.xls). In Excel choose File → Save as → Excel Workbook (.xlsx), then import that.',
};

/** Drop or choose an Excel (.xlsx) or CSV file; offers a template to fill in. */
export const ImportFilePicker: React.FC<ImportFilePickerProps> = ({ onFile, error }) => {
  const { t } = useTranslation('developments');
  const inputId = useId();
  const [over, setOver] = useState(false);
  return (
    <div className="space-y-4">
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onFile(file);
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          over ? 'border-primary bg-primary/5' : 'border-slate-300 hover:border-primary/60 hover:bg-slate-50'
        )}
      >
        <FileSpreadsheet className="h-10 w-10 text-primary" aria-hidden="true" />
        <span className="text-base font-semibold text-slate-900">{t('import.drop', 'Drop your spreadsheet here, or choose a file')}</span>
        <span className="max-w-md text-sm text-slate-600">
          {t('import.dropHintXlsx', 'Excel (.xlsx) or CSV — straight from Excel, Google Sheets or Numbers. Columns can be in any order and language; we recognise them.')}
        </span>
        <input id={inputId} type="file" accept=".xlsx,.csv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </label>
      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {t(`import.error.${error}`, { defaultValue: SHEET_ERROR_DEFAULTS[error] })}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <span>{t('import.templateHint', 'Starting from scratch? Fill in our template — one row per apartment.')}</span>
        <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">
          <Download className="h-4 w-4" aria-hidden="true" />
          {t('import.template', 'Download template')}
        </button>
      </div>
    </div>
  );
};
