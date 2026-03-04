import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import AgencyDashboardSidebar from './AgencyDashboardSidebar';
import AgencyDashboardHeader from './AgencyDashboardHeader';
import { useAgencyOverview } from '../hooks/useAgencyOverview';
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const { overview, isLoading: isLoadingOverview } = useAgencyOverview(agencyId);

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
