import React, { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileSpreadsheet, X } from 'lucide-react';
import { sheetFileProblem, type SheetFileProblem } from './inventory/import/checkSheetFile';
import { downloadTemplate } from './inventory/import/downloadTemplate';

const PROBLEM_TEXT: Record<SheetFileProblem, { key: string; text: string }> = {
  wrongType: { key: 'import.error.wrongType', text: 'Choose an Excel (.xlsx) or CSV file.' },
  tooBig: { key: 'import.error.tooBig', text: 'The file is larger than 10 MB.' },
  oldExcel: { key: 'import.error.oldExcel', text: 'This is an old Excel file (.xls). In Excel choose File → Save as → Excel Workbook (.xlsx), then import that.' },
};

interface CreateImportPickerProps {
  file: File | null;
  onChange: (file: File | null) => void;
}

/**
 * Optional on the create page: the apartments as a spreadsheet (Excel or CSV).
 * Nothing is imported yet; once the residence exists, its import opens with
 * this file so the owner checks the columns and a preview before anything is
 * written.
 */
export const CreateImportPicker: React.FC<CreateImportPickerProps> = ({ file, onChange }) => {
  const { t } = useTranslation('developments');
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [problem, setProblem] = useState<SheetFileProblem | null>(null);

  const choose = (next: File | undefined) => {
    if (!next) return;
    const p = sheetFileProblem(next);
    setProblem(p);
    onChange(p ? null : next);
  };

  return (
    <section aria-labelledby={`${inputId}-heading`} className="space-y-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
      <h2 id={`${inputId}-heading`} className="text-sm font-semibold text-slate-900">
        {t('wizard.importHeading', 'Apartments from a spreadsheet (optional)')}
      </h2>
      <p className="text-sm text-slate-600">
        {t('wizard.importHint', 'Already have your buildings and apartments in Excel or CSV? Add the file now — right after creating, we open the import with it so you can check every column before anything is saved.')}
      </p>
      {file ? (
        <div className="flex min-h-[44px] items-center gap-2 rounded-lg bg-white px-3 ring-1 ring-slate-200">
          <FileSpreadsheet className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{file.name}</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={t('wizard.importRemove', { name: file.name, defaultValue: 'Remove {{name}}' })}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor={inputId} className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:border-primary/50 focus-within:ring-2 focus-within:ring-primary">
            <FileSpreadsheet className="h-4 w-4 text-primary" aria-hidden="true" />
            {t('wizard.importChoose', 'Choose spreadsheet')}
            <input
              id={inputId}
              type="file"
              accept=".xlsx,.csv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              aria-describedby={problem ? errorId : undefined}
              onChange={(e) => {
                choose(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
          <button type="button" onClick={downloadTemplate} className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            <Download className="h-4 w-4" aria-hidden="true" />
            {t('import.template', 'Download template')}
          </button>
        </div>
      )}
      {problem && (
        <p id={errorId} role="alert" className="text-sm text-red-700">
          {t(PROBLEM_TEXT[problem].key, PROBLEM_TEXT[problem].text)}
        </p>
      )}
    </section>
  );
};
