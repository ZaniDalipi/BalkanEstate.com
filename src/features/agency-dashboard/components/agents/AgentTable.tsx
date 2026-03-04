import React from 'react';
import { useTranslation } from 'react-i18next';
import { UsersIcon, TicketIcon } from '@/constants';
import type { DashboardAgent } from '../../types';

interface AgentTableProps {
  agents: DashboardAgent[];
  isLoading: boolean;
  onSelectAgent?: (agent: DashboardAgent) => void;
  selectedAgentId?: string;
}

const SkeletonRow: React.FC = () => (
  <tr className="animate-pulse">
    <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-9 h-9 bg-gray-200 rounded-full" /><div className="h-4 bg-gray-200 rounded w-24" /></div></td>
    <td className="px-4 py-3 hidden sm:table-cell"><div className="h-4 bg-gray-200 rounded w-10 mx-auto" /></td>
    <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 bg-gray-200 rounded w-10 mx-auto" /></td>
    <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 bg-gray-200 rounded w-20 mx-auto" /></td>
    <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 bg-gray-200 rounded w-16 mx-auto" /></td>
    <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 bg-gray-200 rounded w-20 mx-auto" /></td>
    <td className="px-4 py-3"><div className="h-5 bg-gray-200 rounded-full w-16" /></td>
  </tr>
);

const statusStyles: Record<DashboardAgent['status'], string> = {
  active: 'bg-green-50 text-green-700',
  inactive: 'bg-gray-100 text-gray-600',
  pending: 'bg-amber-50 text-amber-700',
};

const AgentTable: React.FC<AgentTableProps> = ({
  agents,
  isLoading,
  onSelectAgent,
  selectedAgentId,
}) => {
  const { t } = useTranslation(['agencyDashboard']);

  const formatDate = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (!isLoading && agents.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <UsersIcon className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {t('agencyDashboard:agents.emptyTitle', 'No agents yet')}
        </h3>
        <p className="text-gray-500 text-sm">
          {t('agencyDashboard:agents.emptyDescription', 'Invite agents using the invitation panel to grow your team.')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">
          {t('agencyDashboard:agents.tableTitle', 'Team Members')}
          {!isLoading && (
            <span className="ml-2 text-sm text-gray-400 font-normal">({agents.length})</span>
          )}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left font-semibold">{t('agencyDashboard:agents.name', 'Agent')}</th>
              <th className="px-4 py-3 text-center font-semibold hidden sm:table-cell">{t('agencyDashboard:agents.listings', 'Listings')}</th>
              <th className="px-4 py-3 text-center font-semibold hidden md:table-cell">{t('agencyDashboard:agents.inquiries', 'Inquiries')}</th>
              <th className="px-4 py-3 text-center font-semibold hidden md:table-cell">{t('agencyDashboard:agents.couponCode', 'Code Used')}</th>
              <th className="px-4 py-3 text-center font-semibold hidden lg:table-cell">{t('agencyDashboard:agents.responseTime', 'Avg Response')}</th>
              <th className="px-4 py-3 text-center font-semibold hidden lg:table-cell">{t('agencyDashboard:agents.joined', 'Joined')}</th>
              <th className="px-4 py-3 text-center font-semibold">{t('agencyDashboard:agents.status', 'Status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
            ) : (
              agents.map((agent) => (
                <tr
                  key={agent.userId}
                  onClick={() => onSelectAgent?.(agent)}
                  className={`cursor-pointer transition-colors hover:bg-indigo-50/50 ${
                    selectedAgentId === agent.userId ? 'bg-indigo-50' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {agent.avatar ? (
                        <img src={agent.avatar} alt={agent.name} className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-indigo-700 font-semibold text-sm">{agent.name.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <span className="font-medium text-gray-900 truncate max-w-[160px]">{agent.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700 hidden sm:table-cell">{agent.activeListings}</td>
                  <td className="px-4 py-3 text-center text-gray-700 hidden md:table-cell">{agent.inquiriesHandled}</td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    {agent.couponCode ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-700 rounded-md font-mono text-[11px]">
                        <TicketIcon className="w-3 h-3" />
                        {agent.couponCode}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500 hidden lg:table-cell">{agent.avgResponseTime}</td>
                  <td className="px-4 py-3 text-center text-gray-500 hidden lg:table-cell">{formatDate(agent.joinedAt)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusStyles[agent.status]}`}>
                      {agent.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AgentTable;
