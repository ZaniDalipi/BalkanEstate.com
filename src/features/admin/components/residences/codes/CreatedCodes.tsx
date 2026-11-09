import React from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon } from '@/src/shared/illustrations';
import type { CreatedResidenceCodes } from '../../../api/residenceCodeAdminApi';
import { useCopyText } from './useCopyText';
import { useResidenceCodeText } from './useResidenceCodeText';

interface CreatedCodesProps {
  result: CreatedResidenceCodes;
  onDone: () => void;
}

/** The codes just created, ready to copy one by one or all at once and send to the owner. */
export const CreatedCodes: React.FC<CreatedCodesProps> = ({ result, onDone }) => {
  const { t, i18n } = useTranslation(['admin']);
  const { kindLabel } = useResidenceCodeText();
  const { copied, failed, copy } = useCopyText();
  const until = new Date(result.validUntil).toLocaleDateString(i18n.language, { dateStyle: 'medium' });

  return (
    <section aria-labelledby="created-codes-heading" className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <SoftIcon name="check" className="h-9 w-9 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 id="created-codes-heading" className="text-base font-semibold text-gray-900">
            {t('admin:residenceCodes.created.title', { count: result.codes.length, defaultValue: 'Codes ready: {{count}}' })}
          </h2>
          <p className="text-sm text-gray-600">
            {t('admin:residenceCodes.created.subtitle', { kind: kindLabel(result.kind), date: until, uses: result.usageLimit, defaultValue: '{{kind}} · valid until {{date}} · {{uses}} use(s) each' })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void copy('all', result.codes.join('\n'))}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800"
        >
          <SoftIcon name="clipboard" className="h-5 w-5" />
          {copied === 'all' ? t('admin:residenceCodes.copied', 'Copied') : t('admin:residenceCodes.created.copyAll', 'Copy all')}
        </button>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {result.codes.map((code) => (
          <li key={code} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-emerald-200">
            <code className="select-all font-mono text-base font-semibold tracking-wider text-gray-900">{code}</code>
            <button type="button" onClick={() => void copy(code, code)} className="min-h-[44px] rounded-lg px-3 text-sm font-medium text-blue-700 hover:bg-blue-50" aria-label={t('admin:residenceCodes.copyCode', { code, defaultValue: 'Copy {{code}}' })}>
              {copied === code ? t('admin:residenceCodes.copied', 'Copied') : t('admin:residenceCodes.copy', 'Copy')}
            </button>
          </li>
        ))}
      </ul>
      {failed && <p role="alert" className="mt-2 text-sm text-amber-700">{t('admin:residenceCodes.copyFailed', 'Copying is not allowed here: select the code and copy it by hand.')}</p>}
      <div className="mt-4 flex justify-end">
        <button type="button" onClick={onDone} className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50">
          {t('admin:residenceCodes.created.done', 'Done')}
        </button>
      </div>
    </section>
  );
};
