import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CloudArrowUpIcon } from '@/constants';

interface QuickUploadButtonProps {
  busy: boolean;
  onFile: (file: File) => void;
}

/** "Upload XML" in one step: opens the file picker straight away. */
const QuickUploadButton: React.FC<QuickUploadButtonProps> = ({ busy, onFile }) => {
  const { t } = useTranslation(['agencyDashboard']);
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
      >
        <CloudArrowUpIcon className="w-4 h-4" />
        {busy ? t('agencyDashboard:imports.quickUpload.busy', 'Uploading…') : t('agencyDashboard:imports.quickUpload.button', 'Upload XML')}
      </button>
      <input
        ref={input}
        type="file"
        accept=".xml,application/xml,text/xml"
        className="sr-only"
        aria-label={t('agencyDashboard:imports.quickUpload.button', 'Upload XML')}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ''; // allow choosing the same file again
          if (file) onFile(file);
        }}
      />
    </>
  );
};

export default QuickUploadButton;
