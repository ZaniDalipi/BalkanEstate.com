import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import QuickUploadButton from './QuickUploadButton';
import { inputClass } from './formatters';

interface QuickLinkImportProps {
  busy: boolean;
  onLink: (url: string) => void;
  onFile: (file: File) => void;
  /** Opens the full form (credentials, mapping, safeguards). */
  onAdvanced: () => void;
}

/**
 * The portal-style start: paste the XML link your website or CRM gives you and
 * press Import. The format is recognised automatically and a preview is made;
 * nothing is published until you confirm it.
 */
const QuickLinkImport: React.FC<QuickLinkImportProps> = ({ busy, onLink, onFile, onAdvanced }) => {
  const { t } = useTranslation(['agencyDashboard']);
  const [url, setUrl] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (trimmed) onLink(trimmed);
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 space-y-3">
      <div>
        <h3 className="text-base font-semibold text-gray-900">{t('agencyDashboard:imports.quickLink.title', 'Import your listings')}</h3>
        <p className="text-sm text-gray-600">
          {t('agencyDashboard:imports.quickLink.help', 'Paste the XML link from your website or CRM. We recognise the format, show you a preview, and after you confirm, keep your listings updated every day.')}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className={`${inputClass} sm:flex-1`}
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.your-agency.com/export.xml"
          aria-label={t('agencyDashboard:imports.quickLink.label', 'XML feed link')}
          spellCheck={false}
        />
        <button type="submit" disabled={busy || !url.trim()}
          className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
          {busy ? t('agencyDashboard:imports.quickLink.busy', 'Checking…') : t('agencyDashboard:imports.quickLink.button', 'Import')}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-600">
        <span>{t('agencyDashboard:imports.quickLink.or', 'No link?')}</span>
        <QuickUploadButton busy={busy} onFile={onFile} />
        <button type="button" onClick={onAdvanced} className="text-indigo-700 hover:underline">
          {t('agencyDashboard:imports.quickLink.advanced', 'Advanced setup (password-protected feed, own field mapping)')}
        </button>
      </div>
    </form>
  );
};

export default QuickLinkImport;
