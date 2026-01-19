import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../../../context/AppContext';
import { Loader3D } from '../../../components/shared/Loader3D';

// Admin emails are verified server-side only
// This component provides a lightweight client-side gate
// Real security is enforced by backend middleware

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({ children }) => {
  const { state } = useAppContext();
  const location = useLocation();
  const [isVerifying, setIsVerifying] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const verifyAdminAccess = async () => {
      // Must be authenticated
      if (!state.isAuthenticated || !state.currentUser) {
        setIsVerifying(false);
        setHasAccess(false);
        return;
      }

      // Quick client-side role check (not security, just UX)
      const userRole = state.currentUser.role;
      if (userRole !== 'admin' && userRole !== 'super_admin') {
        setIsVerifying(false);
        setHasAccess(false);
        return;
      }

      // Server-side verification - the real security check
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const token = localStorage.getItem('balkan_estate_token');

        if (!token) {
          setHasAccess(false);
          setIsVerifying(false);
          return;
        }

        const response = await fetch(`${API_URL}/admin/stats`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          setHasAccess(true);
        } else {
          setHasAccess(false);
        }
      } catch {
        setHasAccess(false);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyAdminAccess();
  }, [state.isAuthenticated, state.currentUser]);

  // Still checking
  if (isVerifying || state.isAuthenticating) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader3D size="md" text="Verifying access..." />
      </div>
    );
  }

  // Not authenticated - redirect to home (no indication that admin exists)
  if (!state.isAuthenticated) {
    return <Navigate to="/search" state={{ from: location }} replace />;
  }

  // No access - redirect silently to home (keep admin secret)
  if (!hasAccess) {
    return <Navigate to="/search" replace />;
  }

  return <>{children}</>;
};

export default ProtectedAdminRoute;
