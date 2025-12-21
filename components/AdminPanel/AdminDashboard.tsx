import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import AdminNav from './AdminNav';
import DiscountCodeManager from './DiscountCodeManager';
import PromotionCouponManager from './PromotionCouponManager';
import UserManager from './UserManager';
import AnalyticsDashboard from './AnalyticsDashboard';
import PropertyManager from './PropertyManager';
import AgencyManager from './AgencyManager';

type AdminView = 'dashboard' | 'discounts' | 'promotionCoupons' | 'users' | 'properties' | 'agencies';

const AdminDashboard: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [activeSection, setActiveSection] = useState<AdminView>('dashboard');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user has admin access
  useEffect(() => {
    const checkAdminAccess = async () => {
      const token = localStorage.getItem('balkan_estate_token');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      // Check if user has admin role
      if (state.currentUser?.role !== 'admin' && state.currentUser?.role !== 'super_admin') {
        setError('Admin access required');
        return;
      }

      try {
        // Test admin access by hitting a test endpoint
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_URL}/admin/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.status === 403) {
          const data = await response.json();
          setError(data.message || 'Admin access denied');
          return;
        }

        if (!response.ok) {
          setError('Failed to connect to admin panel');
          return;
        }

        setIsAuthorized(true);
      } catch (err) {
        setError('Failed to connect to admin panel');
        console.error('Admin access check failed:', err);
      }
    };

    checkAdminAccess();
  }, [state.currentUser]);

  // Redirect to home if not authenticated
  if (!state.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600">Please log in to access the admin panel.</p>
          <button
            onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' })}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  // Show error if not authorized
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          {error.includes('VPN') && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800">
                The admin panel requires VPN connection for security. Please connect to the authorized VPN and refresh.
              </p>
            </div>
          )}
          <button
            onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' })}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  // Show loading state while checking authorization
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <AnalyticsDashboard />;
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
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' })}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                ← Back to Site
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>Admin Access</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <AdminNav activeSection={activeSection} onSectionChange={setActiveSection} />

          {/* Main Content */}
          <div className="flex-1">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
