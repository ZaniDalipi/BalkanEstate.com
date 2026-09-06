import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import { API_URL } from '@/src/shared/api/config';
import { tokenService } from '@/src/shared/api/tokenService';

interface AdminStats {
  overview: {
    totalUsers: number;
    totalAgents: number;
    totalAgencies: number;
    totalProperties: number;
    activeDiscountCodes: number;
    totalInquiries?: number;
    newInquiries?: number;
    unverifiedUsers?: number;
    pendingVillas?: number;
  };
}

export type AdminView =
  | 'dashboard'
  | 'heatmap'
  | 'pricing'
  | 'promotionPlans'
  | 'discounts'
  | 'promotionCoupons'
  | 'users'
  | 'properties'
  | 'agencies'
  | 'inquiries'
  | 'agentRequests'
  | 'settings'
  | 'siteSettings'
  | 'activity'
  | 'howItWorks'
  | 'emailTemplates'
  | 'businessListings'
  | 'articles'
  | 'villaApprovals'
  | 'villaDestinations'
  | 'cityShowcase'
  | 'adBanners'
  | 'cityPhotos';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeSection: AdminView;
  onSectionChange: (section: AdminView) => void;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  activeSection,
  onSectionChange
}) => {
  const { t } = useTranslation(['admin']);
  const { state, dispatch } = useAppContext();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Fetch admin stats for header - only if user is admin
  useEffect(() => {
    // Only fetch if user is authenticated and is admin
    const isAdmin = state.currentUser?.role === 'admin';

    if (!isAdmin) {
      // Keep the loading placeholder while the session is still being restored,
      // so the header doesn't flash zeros before currentUser is known.
      if (!state.isAuthenticating) {
        setStats(null);
        setIsLoadingStats(false);
      }
      return;
    }

    let isActive = true;

    const fetchStats = async () => {
      const token = tokenService.getAccessToken();

      if (!token) {
        if (isActive) setIsLoadingStats(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/admin/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (isActive) setStats(data);
        }
      } catch (err) {
        // Error removed
      } finally {
        if (isActive) setIsLoadingStats(false);
      }
    };

    fetchStats();

    // Keep the header counters in sync with the dashboard (same 30s cadence)
    const interval = setInterval(fetchStats, 30000);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [state.currentUser?.role, state.isAuthenticating]);

  const handleBackToSite = () => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar overlay */}
      {sidebarMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <AdminSidebar
        activeSection={activeSection}
        onSectionChange={(section) => {
          onSectionChange(section);
          setSidebarMobileOpen(false);
        }}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        mobileOpen={sidebarMobileOpen}
        onMobileClose={() => setSidebarMobileOpen(false)}
        stats={stats?.overview}
      />

      {/* Main content area */}
      <div
        className={`transition-[margin] duration-300 ${
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'
        }`}
      >
        {/* Header */}
        <AdminHeader
          stats={stats?.overview}
          isLoadingStats={isLoadingStats}
          onMenuClick={() => setSidebarMobileOpen(true)}
          onBackToSite={handleBackToSite}
          userName={state.currentUser?.name || 'Admin'}
          userRole={state.currentUser?.role || 'admin'}
        />

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
