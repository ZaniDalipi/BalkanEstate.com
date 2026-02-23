import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAgencyAgents } from '../../hooks/useAgencyAgents';
import type { DashboardAgent } from '../../types';
import AgentTable from './AgentTable';
import AgentPerformanceCard from './AgentPerformanceCard';
import InviteAgentPanel from './InviteAgentPanel';

interface AgentManagementSectionProps {
  agencyId: string;
}

const AgentManagementSection: React.FC<AgentManagementSectionProps> = ({ agencyId }) => {
  const { t } = useTranslation(['agencyDashboard']);
  const { agents, isLoading, error, refetch } = useAgencyAgents(agencyId);
  const [selectedAgent, setSelectedAgent] = useState<DashboardAgent | null>(null);

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {t('agencyDashboard:agents.errorTitle', 'Failed to load agents')}
        </h3>
        <p className="text-gray-500 mb-4">
          {t('agencyDashboard:agents.errorDescription', 'Could not retrieve your team data.')}
        </p>
        <button
          onClick={() => refetch()}
          className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
        >
          {t('agencyDashboard:agents.retry', 'Try Again')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        {t('agencyDashboard:agents.title', 'Agent Management')}
      </h2>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <AgentTable
            agents={agents}
            isLoading={isLoading}
            onSelectAgent={setSelectedAgent}
            selectedAgentId={selectedAgent?.userId}
          />

          {selectedAgent && (
            <AgentPerformanceCard agent={selectedAgent} />
          )}
        </div>

        <div className="xl:col-span-1">
          <InviteAgentPanel agencyId={agencyId} />
        </div>
      </div>
    </div>
  );
};

export default AgentManagementSection;
