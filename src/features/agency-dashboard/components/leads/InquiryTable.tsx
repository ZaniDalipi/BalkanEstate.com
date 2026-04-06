import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon, ChevronRightIcon, EnvelopeIcon } from '@/constants';
import type { DashboardInquiry } from '../../types';

interface InquiryTableProps {
  inquiries: DashboardInquiry[];
  isLoading: boolean;
  agents: { id: string; name: string }[];
  onAssign: (inquiryId: string, agentId: string) => void;
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  'in-progress': 'bg-yellow-100 text-yellow-800',
  responded: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-600',
};

const SKEL_WIDTHS = ['w-28', 'w-24', 'w-40', 'w-20', 'w-16', 'w-28'];
const SkeletonRow: React.FC = () => (
  <tr className="animate-pulse">
    {SKEL_WIDTHS.map((w, i) => (
      <td key={i} className="px-4 py-3"><div className={`h-4 bg-gray-200 rounded ${w}`} /></td>
    ))}
  </tr>
);

const InquiryTable: React.FC<InquiryTableProps> = ({
  inquiries, isLoading, agents, onAssign, total, page, limit, onPageChange,
}) => {
  const { t } = useTranslation(['agencyDashboard', 'common']);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  if (!isLoading && inquiries.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <EnvelopeIcon className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          {t('agencyDashboard:leads.emptyTitle', 'No inquiries found')}
        </h3>
        <p className="text-sm text-gray-500">
          {t('agencyDashboard:leads.emptyDesc', 'Inquiries from potential buyers will appear here.')}
        </p>
      </div>
    );
  }

  const handleAgentSelect = (inquiryId: string, agentId: string) => {
    onAssign(inquiryId, agentId);
    setOpenDropdown(null);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-gray-600 font-medium">{t('agencyDashboard:leads.colProperty', 'Property')}</th>
              <th className="px-4 py-3 text-gray-600 font-medium">{t('agencyDashboard:leads.colBuyer', 'Buyer')}</th>
              <th className="px-4 py-3 text-gray-600 font-medium">{t('agencyDashboard:leads.colMessage', 'Message')}</th>
              <th className="px-4 py-3 text-gray-600 font-medium">{t('agencyDashboard:leads.colDate', 'Date')}</th>
              <th className="px-4 py-3 text-gray-600 font-medium">{t('agencyDashboard:leads.colStatus', 'Status')}</th>
              <th className="px-4 py-3 text-gray-600 font-medium">{t('agencyDashboard:leads.colAgent', 'Assigned Agent')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              : inquiries.map((inq) => (
                <tr key={inq.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[180px] truncate">
                    {inq.propertyTitle}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{inq.buyerName}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[220px] truncate" title={inq.message}>
                    {inq.message.length > 60 ? `${inq.message.slice(0, 60)}...` : inq.message}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(inq.date).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[inq.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {inq.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 relative">
                    <button
                      onClick={() => setOpenDropdown(openDropdown === inq.id ? null : inq.id)}
                      className="px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors whitespace-nowrap"
                    >
                      {inq.assignedAgentName || t('agencyDashboard:leads.unassigned', 'Unassigned')}
                      <span className="ml-1 text-[10px]">&#9662;</span>
                    </button>
                    {openDropdown === inq.id && (
                      <div className="absolute right-4 top-10 z-20 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                        {agents.map((agent) => (
                          <button
                            key={agent.id}
                            onClick={() => handleAgentSelect(inq.id, agent.id)}
                            className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                          >
                            {agent.name}
                          </button>
                        ))}
                        {agents.length === 0 && (
                          <span className="block px-3 py-2 text-sm text-gray-400">
                            {t('agencyDashboard:leads.noAgents', 'No agents available')}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
        <span className="text-sm text-gray-600">
          {t('agencyDashboard:leads.showing', 'Showing {{from}}-{{to}} of {{total}}', {
            from: (page - 1) * limit + 1, to: Math.min(page * limit, total), total,
          })}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
            className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
          </button>
          <span className="px-3 py-1 text-sm font-medium text-gray-700">{page} / {totalPages}</span>
          <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
            className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <ChevronRightIcon className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InquiryTable;
