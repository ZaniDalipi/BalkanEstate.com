import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { buildLocalizedPath } from '../../../utils/languageRouting';
import AdminLayout from './AdminLayout';
import type { AdminView } from './AdminLayout';
import DiscountCodeManager from './DiscountCodeManager';
import PromotionCouponManager from './PromotionCouponManager';
import PromotionPlansManager from './PromotionPlansManager';
import UserManager from './UserManager';
import AnalyticsDashboard from './AnalyticsDashboard';
import PropertyManager from './PropertyManager';
import AgencyManager from './AgencyManager';
import PricingManager from './PricingManager';
import InquiryManager from './InquiryManager';
import AgentRequestManager from './AgentRequestManager';
import SystemSettings from './SystemSettings';
import ActivityLog from './ActivityLog';
import HowItWorksManager from './HowItWorksManager';
import EmailManager from './EmailManager';
import SiteSettingsManager from './SiteSettingsManager';
import type { AdminSection } from '@/types';

// Map URL sections to AdminView types
const urlToAdminView: Record<AdminSection, AdminView> = {
  'dashboard': 'dashboard',
  'users': 'users',
  'inquiries': 'inquiries',
  'agent-requests': 'agentRequests',
  'discounts': 'discounts',
  'promotions': 'promotionCoupons',
  'promotion-plans': 'promotionPlans',
  'properties': 'properties',
  'agencies': 'agencies',
  'pricing': 'pricing',
  'activity': 'activity',
  'settings': 'settings',
  'how-it-works': 'howItWorks',
  'email-templates': 'emailTemplates',
  'site-settings': 'siteSettings',
};

// Map AdminView to URL sections
const adminViewToUrl: Record<AdminView, string> = {
  'dashboard': 'dashboard',
  'users': 'users',
  'inquiries': 'inquiries',
  'agentRequests': 'agent-requests',
  'discounts': 'discounts',
  'promotionCoupons': 'promotions',
  'promotionPlans': 'promotion-plans',
  'properties': 'properties',
  'agencies': 'agencies',
  'pricing': 'pricing',
  'activity': 'activity',
  'settings': 'settings',
  'howItWorks': 'how-it-works',
  'emailTemplates': 'email-templates',
  'siteSettings': 'site-settings',
};

const AdminDashboard: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const { state, dispatch } = useAppContext();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current section from state, map to AdminView
  const activeSection: AdminView = urlToAdminView[state.adminSection] || 'dashboard';

  // Update URL when section changes
  const handleSectionChange = useCallback((section: AdminView) => {
    const urlSection = adminViewToUrl[section];
    dispatch({ type: 'SET_ADMIN_SECTION', payload: urlSection as AdminSection });
    // Update URL without full reload
    const newPath = urlSection === 'dashboard' ? '/admin' : `/admin/${urlSection}`;
    window.history.pushState({}, '', buildLocalizedPath(newPath));
  }, [dispatch]);

  // Check if user has admin access
  useEffect(() => {
    const checkAdminAccess = async () => {
      const token = localStorage.getItem('balkan_estate_token');
      if (!token) {
        setError(t('admin:errors.notAuthenticated', 'Not authenticated'));
        return;
      }

      // Wait for user data to load before checking role
      if (!state.currentUser) {
        return; // Will re-run when currentUser is loaded
      }

      // Check if user has admin role
      if (state.currentUser.role !== 'admin' && state.currentUser.role !== 'super_admin') {
        setError(t('admin:errors.adminAccessRequired', 'Admin access required'));
        return;
      }

      // User is admin, authorize without extra API call
      setIsAuthorized(true);
    };

    checkAdminAccess();
  }, [state.currentUser]);

  // Redirect to home if not authenticated
  if (!state.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('admin:errors.accessDenied')}</h2>
          <p className="text-gray-600 mb-6">{t('admin:errors.pleaseLogin')}</p>
          <button
            onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' })}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors"
          >
            {t('admin:errors.goHome')}
          </button>
        </div>
      </div>
    );
  }

  // Show error if not authorized
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('admin:errors.accessDenied')}</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' })}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors"
          >
            {t('admin:errors.goHome')}
          </button>
        </div>
      </div>
    );
  }

  // Show loading state while checking authorization
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">{t('admin:table.loading')}</p>
          <p className="mt-1 text-gray-400 text-sm">{t('admin:errors.verifyingAccess', 'Verifying admin access...')}</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <AnalyticsDashboard />;
      case 'inquiries':
        return <InquiryManager />;
      case 'agentRequests':
        return <AgentRequestManager />;
      case 'activity':
        return <ActivityLog />;
      case 'pricing':
        return <PricingManager />;
      case 'promotionPlans':
        return <PromotionPlansManager />;
      case 'discounts':
        return <DiscountCodeManager />;
      case 'promotionCoupons':
        return <PromotionCouponManager />;
      case 'users':
        return <UserManager />;
      case 'properties':
        return <PropertyManager />;
      case 'agencies':
        return <AgencyManager />;
      case 'settings':
        return <SystemSettings />;
      case 'howItWorks':
        return <HowItWorksManager />;
      case 'emailTemplates':
        return <EmailManager />;
      case 'siteSettings':
        return <SiteSettingsManager />;
      default:
        return <AnalyticsDashboard />;
    }
  };

  return (
    <AdminLayout
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
    >
      {renderContent()}
    </AdminLayout>
  );
};

export default AdminDashboard;
