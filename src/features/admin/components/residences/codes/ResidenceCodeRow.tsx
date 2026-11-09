import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { SoftIcon } from '@/src/shared/illustrations';
import type { ResidenceCode } from '../../../api/residenceCodeAdminApi';
import { ResidenceCodeStatusBadge } from './ResidenceCodeStatusBadge';
import { useResidenceCodeText } from './useResidenceCodeText';

interface ResidenceCodeRowProps {
  code: ResidenceCode;
  copied: boolean;
  busy: boolean;
  onCopy: () => void;
  onChange: (patch: { isActive?: boolean; isSent?: boolean }) => void;
  onDelete: () => void;
}

const ACTION = 'min-h-[44px] rounded-lg border px-3 text-sm font-medium disabled:opacity-60';

/**
 * One unlock code: the code to copy, what it unlocks, where it stands, its
 * uses (and the residences that used it), its note; mark it sent, switch it
 * off or on, and delete it while nobody has used it (a second press confirms).
 */
export const ResidenceCodeRow: React.FC<ResidenceCodeRowProps> = ({ code, copied, busy, onCopy, onChange, onDelete }) => {
  const { t, i18n } = useTranslation(['admin']);
  const { kindLabel } = useResidenceCodeText();
  const [confirming, setConfirming] = useState(false);
  const day = (iso: string) => new Date(iso).toLocaleDateString(i18n.language, { dateStyle: 'medium' });

  return (
    <li className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <SoftIcon name={code.kind === 'pass' ? 'key' : 'building'} className="h-9 w-9 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <code className="select-all font-mono text-base font-semibold tracking-wider text-gray-900">{code.code}</code>
            <ResidenceCodeStatusBadge status={code.status} />
            {code.isSent && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800">{t('admin:residenceCodes.sent', 'Sent')}</span>}
          </div>
          <p className="text-sm text-gray-600">
            {kindLabel(code.kind)} · {t('admin:residenceCodes.uses', { used: code.usedCount, limit: code.usageLimit, defaultValue: '{{used}} of {{limit}} used' })} · {t('admin:residenceCodes.until', { date: day(code.validUntil), defaultValue: 'until {{date}}' })}
          </p>
          {code.note && <p className="mt-0.5 break-words text-sm text-gray-800">{code.note}</p>}
          {code.uses.length > 0 && (
            <p className="mt-1 flex flex-wrap items-center gap-1 text-sm text-gray-600">
              {t('admin:residenceCodes.usedBy', 'Used by')}
              {code.uses.map((u, i) =>
                u.residence ? (
                  <button key={i} type="button" onClick={() => navigate(paths.development(u.residence!.slug))} className="min-h-[32px] rounded-md px-1.5 font-medium text-blue-700 underline-offset-2 hover:underline">
                    {u.residence.name} ({day(u.at)})
                  </button>
                ) : (
                  <span key={i}>{t('admin:residenceCodes.removedResidence', 'a removed residence')} ({day(u.at)})</span>
                )
              )}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onCopy} className={`${ACTION} border-gray-300 text-gray-800 hover:bg-gray-50`} aria-label={t('admin:residenceCodes.copyCode', { code: code.code, defaultValue: 'Copy {{code}}' })}>
          {copied ? t('admin:residenceCodes.copied', 'Copied') : t('admin:residenceCodes.copy', 'Copy')}
        </button>
        <button type="button" disabled={busy} onClick={() => onChange({ isSent: !code.isSent })} className={`${ACTION} border-gray-300 text-gray-800 hover:bg-gray-50`}>
          {code.isSent ? t('admin:residenceCodes.markUnsent', 'Mark not sent') : t('admin:residenceCodes.markSent', 'Mark sent')}
        </button>
        <button type="button" disabled={busy} onClick={() => onChange({ isActive: code.status === 'disabled' })} className={`${ACTION} border-gray-300 text-gray-800 hover:bg-gray-50`}>
          {code.status === 'disabled' ? t('admin:residenceCodes.enable', 'Switch on') : t('admin:residenceCodes.disable', 'Switch off')}
        </button>
        {code.usedCount === 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => (confirming ? onDelete() : setConfirming(true))}
            onBlur={() => setConfirming(false)}
            className={`${ACTION} ${confirming ? 'border-red-600 bg-red-600 text-white' : 'border-red-200 text-red-700 hover:bg-red-50'}`}
          >
            {confirming ? t('admin:residenceCodes.confirmDelete', 'Press again to delete') : t('admin:residenceCodes.delete', 'Delete')}
          </button>
        )}
      </div>
    </li>
  );
};
