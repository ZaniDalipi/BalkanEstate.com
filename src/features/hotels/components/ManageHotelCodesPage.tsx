import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useHotelCodes, useGenerateHotelCodes, useRevokeHotelCode } from '../hooks';
import type { HotelListingCode } from '@/src/shared/types/hotel.types';
import { PlusIcon, TrashIcon, CheckIcon } from '@/constants';

interface ManageHotelCodesPageProps {
  onBack: () => void;
}

const StatusBadge: React.FC<{ status: HotelListingCode['status']; t: (k: string) => string }> = ({ status, t }) => {
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    redeemed: 'bg-neutral-200 text-neutral-600',
    revoked: 'bg-red-100 text-red-600',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${map[status]}`}>{t(`codes.status.${status}`)}</span>;
};

const ManageHotelCodesPage: React.FC<ManageHotelCodesPageProps> = ({ onBack }) => {
  const { t } = useTranslation('hotels');
  const { codes, stats, isLoading, refetch } = useHotelCodes();
  const { generate, isLoading: generating } = useGenerateHotelCodes();
  const { revoke } = useRevokeHotelCode();

  const [count, setCount] = useState(5);
  const [note, setNote] = useState('');
  const [justGenerated, setJustGenerated] = useState<HotelListingCode[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    const res = await generate({ count: Math.min(100, Math.max(1, count)), note: note.trim() || undefined });
    setJustGenerated(res.codes);
    setNote('');
    refetch();
  }, [generate, count, note, refetch]);

  const copy = useCallback((code: string) => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied((c) => (c === code ? null : c)), 1500);
    });
  }, []);

  const copyAll = useCallback(() => {
    const text = justGenerated.map((c) => c.code).join('\n');
    navigator.clipboard?.writeText(text);
    setCopied('__all__');
    setTimeout(() => setCopied((c) => (c === '__all__' ? null : c)), 1500);
  }, [justGenerated]);

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button onClick={onBack} className="text-sm text-white/70 hover:text-white font-medium mb-4">← {t('detail.backToList')}</button>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{t('codes.title')}</h1>
          <p className="mt-1 text-white/70 text-sm">{t('codes.subtitle')}</p>
          <div className="mt-4 flex gap-6 text-white/80 text-sm">
            <span>{t('codes.statActive', { count: stats.active })}</span>
            <span>{t('codes.statRedeemed', { count: stats.redeemed })}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Generate */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">{t('codes.generate')}</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">{t('codes.count')}</label>
              <input
                type="number" min={1} max={100}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-28 px-3 py-2.5 rounded-xl border border-neutral-300"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-neutral-500 mb-1">{t('codes.note')}</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('codes.notePlaceholder')}
                maxLength={200}
                className="w-full px-3 py-2.5 rounded-xl border border-neutral-300"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 disabled:opacity-60"
              >
                <PlusIcon className="w-4 h-4" /> {generating ? t('codes.generating') : t('codes.generate')}
              </button>
            </div>
          </div>

          {justGenerated.length > 0 && (
            <div className="mt-5 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-emerald-800">{t('codes.generatedTitle', { count: justGenerated.length })}</p>
                <button onClick={copyAll} className="text-xs font-semibold text-emerald-700 hover:underline">
                  {copied === '__all__' ? t('codes.copied') : t('codes.copyAll')}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {justGenerated.map((c) => (
                  <button key={c.id} onClick={() => copy(c.code)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-sm font-mono text-neutral-800 hover:bg-emerald-100">
                    {c.code}
                    {copied === c.code ? <CheckIcon className="w-3.5 h-3.5 text-emerald-600" /> : null}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">{t('codes.allCodes')}</h2>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 rounded-lg bg-neutral-100 animate-pulse" />)}</div>
          ) : codes.length === 0 ? (
            <p className="text-sm text-neutral-400 py-6 text-center">{t('codes.empty')}</p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {codes.map((c) => (
                <div key={c.id} className="flex items-center gap-3 py-3">
                  <button onClick={() => copy(c.code)} className="font-mono text-sm text-neutral-800 hover:text-primary flex items-center gap-1.5">
                    {c.code}
                    {copied === c.code ? <CheckIcon className="w-3.5 h-3.5 text-emerald-600" /> : null}
                  </button>
                  <StatusBadge status={c.status} t={t} />
                  {c.note && <span className="text-xs text-neutral-400 truncate">{c.note}</span>}
                  {c.redeemedHotel?.name && <span className="text-xs text-neutral-500 truncate">→ {c.redeemedHotel.name}</span>}
                  {c.status === 'active' && (
                    <button onClick={() => revoke(c.id)} className="ml-auto text-red-500 hover:text-red-600" title={t('codes.revoke')}>
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageHotelCodesPage;
