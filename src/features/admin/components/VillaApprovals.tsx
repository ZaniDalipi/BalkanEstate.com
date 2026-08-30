import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@/constants';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import {
  getVillaApprovals,
  approveVilla,
  rejectVilla,
  type VillaApprovalStatus,
} from '../api/adminApi';

interface VillaRow {
  _id: string;
  title?: string;
  city?: string;
  country?: string;
  price?: number;
  isNegotiable?: boolean;
  imageUrl?: string;
  createdAt?: string;
  villaApprovalReason?: string;
  sellerId?: { name?: string; email?: string; phone?: string } | string;
}

const TABS: { id: VillaApprovalStatus; labelKey: string; fallback: string }[] = [
  { id: 'pending', labelKey: 'admin:villas.pending', fallback: 'Pending' },
  { id: 'approved', labelKey: 'admin:villas.approved', fallback: 'Approved' },
  { id: 'rejected', labelKey: 'admin:villas.rejected', fallback: 'Rejected' },
];

const VillaApprovals: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const [tab, setTab] = useState<VillaApprovalStatus>('pending');
  const [villas, setVillas] = useState<VillaRow[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchVillas = useCallback(async (status: VillaApprovalStatus) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getVillaApprovals(status);
      setVillas(data.villas || []);
      setTotal(data.count ?? (data.villas || []).length);
      setHasMore(Boolean(data.hasMore));
    } catch {
      setError(t('admin:villas.loadError', 'Failed to load villa approvals'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchVillas(tab); }, [tab, fetchVillas]);

  // Splice the row out for instant feedback, then refetch so the count and any
  // rows beyond the first page come from the server rather than local state.
  const runAction = async (id: string, action: () => Promise<unknown>, errorKey: string, fallback: string) => {
    setProcessingId(id);
    setError(null);
    try {
      await action();
      setVillas(prev => prev.filter(v => v._id !== id));
      await fetchVillas(tab);
    } catch {
      setError(t(errorKey, fallback));
    } finally {
      setProcessingId(null);
    }
  };

  const handleApprove = (id: string) =>
    runAction(id, () => approveVilla(id), 'admin:villas.approveError', 'Failed to approve villa');

  const handleReject = (id: string) => {
    const reason = window.prompt(t('admin:villas.rejectPrompt', 'Reason for rejection (optional):')) ?? undefined;
    return runAction(id, () => rejectVilla(id, reason || undefined), 'admin:villas.rejectError', 'Failed to reject villa');
  };

  const sellerName = (s: VillaRow['sellerId']): string =>
    typeof s === 'object' && s ? (s.name || s.email || '—') : '—';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xl">✦</span>
        <h2 className="text-lg font-bold text-gray-900">{t('admin:villas.title', 'Luxury Villa Approvals')}</h2>
      </div>
      <p className="text-sm text-gray-500 -mt-2">
        {t('admin:villas.subtitle', 'Curate the Luxury Villas tab — only approved villas appear publicly.')}
      </p>

      {/* Status tabs */}
      <div className="flex gap-2">
        {TABS.map(tb => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              tab === tb.id ? 'bg-[#E8B820] text-[#141009]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t(tb.labelKey, tb.fallback)}
            {tab === tb.id && total > 0 && <span className="ml-1.5 opacity-70">{total}</span>}
          </button>
        ))}
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      {loading ? (
        <div className="py-12 text-center text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8B820] mx-auto" />
        </div>
      ) : villas.length === 0 ? (
        <div className="py-12 text-center text-gray-400 flex flex-col items-center gap-2">
          <ClockIcon className="w-10 h-10 opacity-40" />
          <p>{t('admin:villas.empty', 'No villas here.')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {villas.map(v => (
            <div key={v._id} className="flex gap-3 p-3 bg-white border border-gray-200 rounded-xl items-center">
              <div className="w-20 h-20 rounded-lg bg-neutral-100 flex-shrink-0 overflow-hidden">
                {v.imageUrl && (
                  <img
                    src={optimizeCloudinaryUrl(v.imageUrl, { width: 160, quality: 'auto', crop: 'fill' })}
                    alt={v.title || 'Villa'} loading="lazy" className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{v.title || t('admin:villas.untitled', 'Untitled villa')}</p>
                <p className="text-sm text-gray-500 truncate">{v.city}{v.country ? `, ${v.country}` : ''}</p>
                <p className="text-sm mt-0.5">
                  <span className="font-bold" style={{ color: '#B8860B' }}>
                    {v.isNegotiable || !v.price ? t('admin:villas.negotiable', 'By negotiation') : `€${v.price.toLocaleString()}`}
                  </span>
                  <span className="text-gray-400"> · {sellerName(v.sellerId)}</span>
                </p>
                {v.villaApprovalReason && (
                  <p className="text-xs text-red-500 mt-0.5 truncate">✕ {v.villaApprovalReason}</p>
                )}
              </div>
              {tab === 'pending' && (
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleApprove(v._id)}
                    disabled={processingId === v._id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircleIcon className="w-4 h-4" /> {t('admin:villas.approve', 'Approve')}
                  </button>
                  <button
                    onClick={() => handleReject(v._id)}
                    disabled={processingId === v._id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 disabled:opacity-50"
                  >
                    <XCircleIcon className="w-4 h-4" /> {t('admin:villas.reject', 'Reject')}
                  </button>
                </div>
              )}
              {tab === 'rejected' && (
                <button
                  onClick={() => handleApprove(v._id)}
                  disabled={processingId === v._id}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50 flex-shrink-0"
                >
                  <CheckCircleIcon className="w-4 h-4" /> {t('admin:villas.approve', 'Approve')}
                </button>
              )}
              {tab === 'approved' && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-semibold flex-shrink-0">
                  <CheckCircleIcon className="w-4 h-4" /> {t('admin:villas.approved', 'Approved')}
                </span>
              )}
            </div>
          ))}
          {hasMore && (
            <p className="text-xs text-gray-400 text-center pt-1">
              {t('admin:villas.showingFirst', 'Showing the first {{shown}} of {{total}} villas.', {
                shown: villas.length,
                total,
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default VillaApprovals;
