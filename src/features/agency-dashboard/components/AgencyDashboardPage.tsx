import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { buildLocalizedPath } from '../../../utils/languageRouting';
import AgencyDashboardLayout from './AgencyDashboardLayout';
import type { AgencyDashboardSection } from '@/types';
import { AGENCY_DASHBOARD_SECTIONS } from '@/src/shared/constants/app.constants';

// Lazy-loaded section components for code splitting
const OverviewSection = React.lazy(() => import('./overview/OverviewSection'));
const AgentManagementSection = React.lazy(() => import('./agents/AgentManagementSection'));
const PropertyManagementSection = React.lazy(() => import('./properties/PropertyManagementSection'));
const LeadsInquiriesSection = React.lazy(() => import('./leads/LeadsInquiriesSection'));
const AnalyticsReportsSection = React.lazy(() => import('./analytics/AnalyticsReportsSection'));
const FinancialBillingSection = React.lazy(() => import('./financial/FinancialBillingSection'));
const AgencyProfileSection = React.lazy(() => import('./profile/AgencyProfileSection'));
const TeamCommunicationSection = React.lazy(() => import('./team/TeamCommunicationSection'));

const AgencyDashboardPage: React.FC = () => {
  const { t } = useTranslation(['agencyDashboard', 'common']);
  const { state, dispatch } = useAppContext();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeSection = state.agencyDashboardSection || 'overview';

  const handleSectionChange = useCallback((section: AgencyDashboardSection) => {
    dispatch({ type: 'SET_AGENCY_DASHBOARD_SECTION', payload: section });
    const newPath = section === 'overview'
      ? '/agency-dashboard'
      : `/agency-dashboard/${section}`;
    window.history.pushState({}, '', buildLocalizedPath(newPath));
  }, [dispatch]);

  useEffect(() => {
    if (!state.currentUser) return;

    const user = state.currentUser;
    const userAgencyId = (user as Record<string, unknown>).agencyId as string | undefined;

    if (!userAgencyId) {
      setError(t('agencyDashboard:errors.noAgency', 'You are not associated with any agency.'));
      return;
    }

    // Check if user is agency owner or agent (further owner/admin check done by backend middleware)
    if (user.role !== 'agent' && user.role !== 'admin' && user.role !== 'super_admin') {
      setError(t('agencyDashboard:errors.accessDenied', 'Agency dashboard access requires an agent role.'));
      return;
    }

    setAgencyId(userAgencyId);
    setIsAuthorized(true);
  }, [state.currentUser, t]);

  if (!state.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('agencyDashboard:errors.accessDenied', 'Access Denied')}
          </h2>
          <p className="text-gray-600 mb-6">
            {t('agencyDashboard:errors.pleaseLogin', 'Please log in to access the agency dashboard.')}
          </p>
          <button
            onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' })}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors"
          >
            {t('common:goHome', 'Go Home')}
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('agencyDashboard:errors.accessDenied', 'Access Denied')}
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' })}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors"
          >
            {t('common:goHome', 'Go Home')}
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthorized || !agencyId) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 font-medium">
            {t('agencyDashboard:loading', 'Loading agency dashboard...')}
          </p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <OverviewSection agencyId={agencyId} />;
      case 'agents':
        return <AgentManagementSection agencyId={agencyId} />;
      case 'properties':
        return <PropertyManagementSection agencyId={agencyId} />;
      case 'leads':
        return <LeadsInquiriesSection agencyId={agencyId} />;
      case 'analytics':
        return <AnalyticsReportsSection agencyId={agencyId} />;
      case 'financial':
        return <FinancialBillingSection agencyId={agencyId} />;
      case 'profile':
        return <AgencyProfileSection agencyId={agencyId} />;
      case 'team':
        return <TeamCommunicationSection agencyId={agencyId} />;
      default:
        return <OverviewSection agencyId={agencyId} />;
    }
  };

  return (
    <AgencyDashboardLayout
      agencyId={agencyId}
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
    >
      <Suspense
        fallback={
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-5 bg-gray-200 rounded w-1/4" />
              <div className="h-40 bg-gray-100 rounded-lg" />
            </div>
          </div>
        }
      >
        {renderContent()}
      </Suspense>
    </AgencyDashboardLayout>
  );
};

export default AgencyDashboardPage;
