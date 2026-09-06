import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@/constants';
import {
  getPendingLicenses,
  approveLicense,
  rejectLicense,
  PendingLicenseAgent,
} from '../api/adminApi';
import UserAvatar from '@/components/shared/UserAvatar';

const PendingLicenses: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const [agents, setAgents] = useState<PendingLicenseAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const data = await getPendingLicenses();
      setAgents(data.agents);
    } catch {
      setError('Failed to load pending licenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPending(); }, []);

  const handleApprove = async (userId: string) => {
    setProcessingId(userId);
    try {
      await approveLicense(userId);
      setAgents((prev) => prev.filter((a) => {
        const id = typeof a.userId === 'object' ? a.userId._id : a.userId;
        return id !== userId;
      }));
    } catch {
      setError('Failed to approve license');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId: string) => {
    const reason = prompt(t('pendingLicenses.rejectReason', 'Enter rejection reason (optional):'));
    setProcessingId(userId);
    try {
      await rejectLicense(userId, reason || undefined);
      setAgents((prev) => prev.filter((a) => {
        const id = typeof a.userId === 'object' ? a.userId._id : a.userId;
        return id !== userId;
      }));
    } catch {
      setError('Failed to reject license');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <ShieldCheckIcon className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            {t('pendingLicenses.title', 'Pending License Verifications')}
          </h2>
          <p className="text-sm text-gray-500">
            {t('pendingLicenses.subtitle', '{{count}} agents awaiting license review', { count: agents.length })}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {agents.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <CheckCircleIcon className="w-10 h-10 text-green-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">
            {t('pendingLicenses.empty', 'No pending license verifications')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => {
            const user = typeof agent.userId === 'object' ? agent.userId : null;
            const userId = user?._id || String(agent.userId);
            const isProcessing = processingId === userId;

            return (
              <div
                key={userId}
                className={`bg-white border border-gray-200 rounded-xl p-4 transition-all ${
                  isProcessing ? 'opacity-50 pointer-events-none' : 'hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-blue-50">
                      <UserAvatar
                        src={user?.avatarUrl}
                        alt={user?.name || ''}
                        gender={user?.gender}
                        seed={userId || user?.name}
                        avatarOptions={user?.avatarOptions}
                        width={80}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{user?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
                      {user?.country && (
                        <p className="text-xs text-gray-400">{user.city ? `${user.city}, ` : ''}{user.country}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleApprove(userId)}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                      {t('pendingLicenses.approve', 'Approve')}
                    </button>
                    <button
                      onClick={() => handleReject(userId)}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <XCircleIcon className="w-3.5 h-3.5" />
                      {t('pendingLicenses.reject', 'Reject')}
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400 font-medium">{t('pendingLicenses.license', 'License')}:</span>
                    <span className="font-mono text-gray-700 bg-gray-50 px-2 py-0.5 rounded">{agent.licenseNumber}</span>
                  </div>
                  {agent.licenseCountry && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400 font-medium">{t('pendingLicenses.country', 'Country')}:</span>
                      <span className="text-gray-700">{agent.licenseCountry}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-amber-600">
                    <ClockIcon className="w-3.5 h-3.5" />
                    <span>{t('pendingLicenses.pending', 'Pending')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PendingLicenses;
