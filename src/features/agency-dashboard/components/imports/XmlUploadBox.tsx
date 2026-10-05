import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CloudArrowUpIcon } from '@/constants';
import MutationError from './MutationError';

interface XmlUploadBoxProps {
  /** Draft feeds always preview; an active feed imports unless "preview only" is ticked. */
  activated: boolean;
  busy: boolean;
  error: unknown;
  onUpload: (file: Blob, filename: string, previewOnly: boolean) => void;
}

const MAX_MB = 15;

/** Choose an .xml file or paste XML. Pasted text is sent as a file, exactly as typed. */
const XmlUploadBox: React.FC<XmlUploadBoxProps> = ({ activated, busy, error, onUpload }) => {
  const { t } = useTranslation(['agencyDashboard']);
  const [mode, setMode] = useState<'file' | 'paste'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [pasted, setPasted] = useState('');
  const [previewOnly, setPreviewOnly] = useState(false);
  const tooLarge = file !== null && file.size > MAX_MB * 1024 * 1024;
  const ready = mode === 'file' ? file !== null && !tooLarge : pasted.trim().startsWith('<');

  const submit = () => {
    if (mode === 'file' && file) onUpload(file, file.name, previewOnly);
    if (mode === 'paste') onUpload(new Blob([pasted], { type: 'application/xml' }), 'pasted.xml', previewOnly);
  };

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-gray-300 p-4">
      <div className="flex gap-2 text-sm" role="tablist">
        {(['file', 'paste'] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
            className={`px-3 py-1.5 rounded-lg font-medium ${mode === m ? 'bg-indigo-100 text-indigo-800' : 'text-gray-600 hover:bg-gray-100'}`}>
            {m === 'file' ? t('agencyDashboard:imports.upload.chooseFile', 'Choose file') : t('agencyDashboard:imports.upload.paste', 'Paste XML')}
          </button>
        ))}
      </div>

      {mode === 'file' ? (
        <label className="flex flex-col items-center justify-center gap-2 rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-600 cursor-pointer hover:bg-gray-100">
          <CloudArrowUpIcon className="w-8 h-8 text-gray-400" />
          <span className="font-medium text-gray-900">
            {file ? file.name : t('agencyDashboard:imports.upload.pick', 'Select an .xml file')}
          </span>
          <span className="text-xs">{t('agencyDashboard:imports.upload.limit', 'XML only, up to {{mb}} MB', { mb: MAX_MB })}</span>
          <input type="file" accept=".xml,application/xml,text/xml" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
      ) : (
        <textarea
          className="w-full h-48 px-3 py-2 font-mono text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          spellCheck={false}
          placeholder={'<balkanestate-feed version="1.0">\n  <listing>…</listing>\n</balkanestate-feed>'}
          aria-label={t('agencyDashboard:imports.upload.paste', 'Paste XML')}
        />
      )}
      {tooLarge && <p className="text-sm text-red-700">{t('agencyDashboard:imports.upload.tooLarge', 'This file is larger than {{mb}} MB.', { mb: MAX_MB })}</p>}

      {activated && (
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" className="rounded border-gray-300 text-indigo-600" checked={previewOnly} onChange={(e) => setPreviewOnly(e.target.checked)} />
          {t('agencyDashboard:imports.upload.previewOnly', 'Preview only — check the file without changing any listings')}
        </label>
      )}
      <MutationError error={error} />
      <button type="button" onClick={submit} disabled={!ready || busy}
        className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
        {!activated || previewOnly
          ? t('agencyDashboard:imports.upload.preview', 'Upload and preview')
          : t('agencyDashboard:imports.upload.import', 'Upload and import')}
      </button>
    </div>
  );
};

export default XmlUploadBox;
