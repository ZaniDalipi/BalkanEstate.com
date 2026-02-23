import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAgencyInquiries, useAgencyAgents, useAssignInquiry } from '../../hooks';
import type { InquiryFilters } from '../../types';
import InquiryTable from './InquiryTable';
import InquiryFiltersBar from './InquiryFilters';

interface LeadsInquiriesSectionProps {
  agencyId: string;
}

const DEFAULT_LIMIT = 10;

const LeadsInquiriesSection: React.FC<LeadsInquiriesSectionProps> = ({ agencyId }) => {
  const { t } = useTranslation(['agencyDashboard', 'common']);
  const [filters, setFilters] = useState<InquiryFilters>({ page: 1, limit: DEFAULT_LIMIT });
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const { inquiries, total, isLoading } = useAgencyInquiries(agencyId, filters);
  const { agents } = useAgencyAgents(agencyId);
  const { assignInquiry, isLoading: isAssigning } = useAssignInquiry(agencyId);

  const agentOptions = agents.map((a) => ({ id: a.userId, name: a.name }));

  const handleFiltersChange = useCallback((updated: InquiryFilters) => {
    setFilters({ ...updated, page: 1, limit: filters.limit });
  }, [filters.limit]);

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const handleAssign = useCallback(async (inquiryId: string, agentId: string) => {
    try {
      await assignInquiry({ inquiryId, agentId });
      const agentName = agentOptions.find((a) => a.id === agentId)?.name ?? '';
      setToastMsg(
        t('agencyDashboard:leads.assignSuccess', 'Inquiry assigned to {{agent}}', { agent: agentName })
      );
      setTimeout(() => setToastMsg(null), 3000);
    } catch {
      setToastMsg(t('agencyDashboard:leads.assignError', 'Failed to assign inquiry'));
      setTimeout(() => setToastMsg(null), 3000);
    }
  }, [assignInquiry, agentOptions, t]);

  return (
    <div className="space-y-4 relative">
      <h2 className="text-xl font-semibold text-gray-900">
        {t('agencyDashboard:leads.title', 'Leads & Inquiries')}
      </h2>

      <InquiryFiltersBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        agents={agentOptions}
      />

      <InquiryTable
        inquiries={inquiries}
        isLoading={isLoading || isAssigning}
        agents={agentOptions}
        onAssign={handleAssign}
        total={total}
        page={filters.page ?? 1}
        limit={filters.limit ?? DEFAULT_LIMIT}
        onPageChange={handlePageChange}
      />

      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-gray-900 text-white text-sm rounded-xl shadow-lg animate-fade-in">
          {toastMsg}
        </div>
      )}
    </div>
  );
};

export default LeadsInquiriesSection;
