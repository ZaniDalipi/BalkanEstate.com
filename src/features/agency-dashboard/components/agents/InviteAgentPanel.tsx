import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardDocumentIcon, UsersIcon, TicketIcon, CheckBadgeIcon } from '@/constants';
import { useAgency } from '@/src/features/agencies/hooks/useAgency';

interface InviteAgentPanelProps {
  agencyId: string;
}

const couponStatusStyles: Record<string, { bg: string; text: string; label: string }> = {
  available: { bg: 'bg-green-50', text: 'text-green-700', label: 'Available' },
  used: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Used' },
  expired: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Expired' },
};

const InviteAgentPanel: React.FC<InviteAgentPanelProps> = ({ agencyId }) => {
  const { t } = useTranslation(['agencyDashboard']);
  const { agency, isLoading } = useAgency(agencyId);
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const invitationCode = agency?.invitationCode ?? null;

  const couponStats = agency?.agentCoupons
    ? {
        available: agency.agentCoupons.available,
        used: agency.agentCoupons.used,
        total: agency.agentCoupons.coupons.length,
      }
    : null;

  const handleCopy = useCallback(async () => {
    if (!invitationCode) return;
    try {
      await navigator.clipboard.writeText(invitationCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = invitationCode;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [invitationCode]);

  const handleCopyCoupon = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
          <UsersIcon className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">
            {t('agencyDashboard:agents.invite.title', 'Invite Agents')}
          </h3>
          <p className="text-xs text-gray-500">
            {t('agencyDashboard:agents.invite.subtitle', 'Share code to grow your team')}
          </p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          {t('agencyDashboard:agents.invite.codeLabel', 'Invitation Code')}
        </label>
        {isLoading ? (
          <div className="animate-pulse h-12 bg-gray-100 rounded-xl" />
        ) : invitationCode ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-mono text-sm text-gray-800 tracking-wide select-all">
              {invitationCode}
            </div>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                copied
                  ? 'bg-green-100 text-green-700'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
              title={t('agencyDashboard:agents.invite.copy', 'Copy code')}
            >
              <ClipboardDocumentIcon className="w-4 h-4" />
              <span className="hidden sm:inline">
                {copied
                  ? t('agencyDashboard:agents.invite.copied', 'Copied!')
                  : t('agencyDashboard:agents.invite.copy', 'Copy')}
              </span>
            </button>
          </div>
        ) : (
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl px-4 py-3 text-center text-sm text-gray-400">
            {t('agencyDashboard:agents.invite.noCode', 'No invitation code available')}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 leading-relaxed">
        {t(
          'agencyDashboard:agents.invite.instructions',
          'Share this code with agents so they can request to join your agency. You can approve or reject requests from the team section.'
        )}
      </p>

      {couponStats && (
        <div className="border-t border-gray-100 pt-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {t('agencyDashboard:agents.invite.couponStats', 'Agent Coupon Codes')}
          </h4>
          <div className="grid grid-cols-3 gap-2 text-center mb-3">
            <div className="bg-green-50 rounded-xl py-2.5 px-2">
              <div className="text-lg font-bold text-green-700">{couponStats.available}</div>
              <div className="text-[10px] font-medium text-green-600 uppercase">
                {t('agencyDashboard:agents.invite.available', 'Available')}
              </div>
            </div>
            <div className="bg-blue-50 rounded-xl py-2.5 px-2">
              <div className="text-lg font-bold text-blue-700">{couponStats.used}</div>
              <div className="text-[10px] font-medium text-blue-600 uppercase">
                {t('agencyDashboard:agents.invite.used', 'Used')}
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl py-2.5 px-2">
              <div className="text-lg font-bold text-gray-700">{couponStats.total}</div>
              <div className="text-[10px] font-medium text-gray-500 uppercase">
                {t('agencyDashboard:agents.invite.total', 'Total')}
              </div>
            </div>
          </div>

          {agency?.agentCoupons?.coupons && agency.agentCoupons.coupons.length > 0 && (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                {t('agencyDashboard:agents.invite.allCodes', 'All Codes (sent via email)')}
              </p>
              {agency.agentCoupons.coupons.map((coupon, idx) => {
                const style = couponStatusStyles[coupon.status] || couponStatusStyles.available;
                const isCopiedCode = copiedCode === coupon.code;
                return (
                  <div
                    key={coupon.code || idx}
                    className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg ${style.bg}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {coupon.status === 'used' ? (
                        <CheckBadgeIcon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      ) : (
                        <TicketIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      )}
                      <span className="font-mono text-[11px] text-gray-700 truncate">{coupon.code}</span>
                      {coupon.status === 'available' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyCoupon(coupon.code);
                          }}
                          className="ml-1 text-gray-400 hover:text-indigo-600 transition-colors"
                          title={t('agencyDashboard:agents.invite.copyCoupon', 'Copy code')}
                        >
                          <ClipboardDocumentIcon className="w-3 h-3" />
                        </button>
                      )}
                      {isCopiedCode && (
                        <span className="text-[10px] text-green-600 font-medium">
                          {t('agencyDashboard:agents.invite.copied', 'Copied!')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 text-[11px]">
                      {coupon.status === 'used' && coupon.usedBy && (
                        <span className="text-gray-700 font-medium truncate max-w-[80px]" title={coupon.usedBy.name}>
                          {coupon.usedBy.name}
                        </span>
                      )}
                      {coupon.status === 'used' && coupon.usedAt && (
                        <span className="text-gray-400">
                          {new Date(coupon.usedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize ${style.bg} ${style.text}`}>
                        {t(`agencyDashboard:agents.invite.status_${coupon.status}`, style.label)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InviteAgentPanel;
