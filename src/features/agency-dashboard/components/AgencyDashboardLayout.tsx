import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/context/AppContext';
import AgencyDashboardSidebar from './AgencyDashboardSidebar';
import AgencyDashboardHeader from './AgencyDashboardHeader';
import { useAgencyOverview } from '../hooks/useAgencyOverview';
import { agencyDashboardKeys } from '../api/agencyDashboardKeys';
import { socketService } from '@/services/socketService';
import { getAgencyJoinRequests } from '@/src/features/agencies/api/agencyApi';
import type { AgencyDashboardSection } from '@/types';

interface AgencyDashboardLayoutProps {
  children: React.ReactNode;
  agencyId: string;
  activeSection: AgencyDashboardSection;
  onSectionChange: (section: AgencyDashboardSection) => void;
}

const AgencyDashboardLayout: React.FC<AgencyDashboardLayoutProps> = ({
  children,
  agencyId,
  activeSection,
  onSectionChange,
}) => {
  const { state, dispatch } = useAppContext();
  const queryClient = useQueryClient();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const { overview, isLoading: isLoadingOverview } = useAgencyOverview(agencyId);

  // Fetch pending join requests count
  const { data: joinRequestsData } = useQuery({
    queryKey: ['agencyJoinRequests', agencyId],
    queryFn: () => getAgencyJoinRequests(agencyId),
    staleTime: 60_000,
    enabled: !!agencyId,
  });

  const pendingJoinRequestCount = (joinRequestsData?.joinRequests || [])
    .filter((r: { status: string }) => r.status === 'pending').length;

  // Listen for real-time agency updates (agent removed/left, coupon freed, etc.)
  useEffect(() => {
    if (!agencyId) return;

    const unsubscribe = socketService.onAgencyUpdate(agencyId, (data) => {
      if (data.type === 'member-removed' || data.type === 'member-joined') {
        queryClient.invalidateQueries({ queryKey: agencyDashboardKeys.agents(agencyId) });
        queryClient.invalidateQueries({ queryKey: agencyDashboardKeys.financial(agencyId) });
        queryClient.invalidateQueries({ queryKey: agencyDashboardKeys.overview(agencyId) });
      }
      if (data.type === 'join-request-new') {
        queryClient.invalidateQueries({ queryKey: ['agencyJoinRequests', agencyId] });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [agencyId, queryClient]);

  const handleBackToSite = () => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
  };

  const handleBrowseProperties = () => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
    window.history.pushState({}, '', '/search');
  };

  const handleBackToAgency = () => {
    dispatch({ type: 'SET_SELECTED_AGENCY', payload: agencyId });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {sidebarMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <AgencyDashboardSidebar
        activeSection={activeSection}
        onSectionChange={(section) => {
          onSectionChange(section);
          setSidebarMobileOpen(false);
        }}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        mobileOpen={sidebarMobileOpen}
        onMobileClose={() => setSidebarMobileOpen(false)}
        overview={overview}
        pendingJoinRequests={pendingJoinRequestCount}
        onBrowseProperties={handleBrowseProperties}
        onBackToAgency={handleBackToAgency}
      />

      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'
        }`}
      >
        <AgencyDashboardHeader
          overview={overview}
          isLoadingOverview={isLoadingOverview}
          onMenuClick={() => setSidebarMobileOpen(true)}
          onBackToSite={handleBackToSite}
          onBackToAgency={handleBackToAgency}
          onBrowseProperties={handleBrowseProperties}
          userName={state.currentUser?.name || 'Agency Owner'}
        />

        <main className="p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AgencyDashboardLayout;
