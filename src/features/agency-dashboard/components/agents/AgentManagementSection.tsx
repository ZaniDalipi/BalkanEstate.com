import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAgencyAgents } from '../../hooks/useAgencyAgents';
import type { DashboardAgent } from '../../types';
import AgentTable from './AgentTable';
import AgentPerformanceCard from './AgentPerformanceCard';
import InviteAgentPanel from './InviteAgentPanel';
import { SoftIcon } from '@/src/shared/illustrations';

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
        <SoftIcon name="warning" className="w-14 h-14 mx-auto mb-4" />
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
