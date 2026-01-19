import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { Loader3D } from '../../../components/shared/Loader3D';
import ProtectedAdminRoute from './ProtectedAdminRoute';
import { buildLocalizedPath, SUPPORTED_LANG_CODES } from '../../utils/languageRouting';
import i18n from '../../i18n';
import { useAppContext } from '../../../context/AppContext';

// Page loader component
const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <Loader3D size="md" text="Loading..." />
  </div>
);

// Lazy load all pages for code splitting
// Each page becomes its own chunk, loaded only when visited

// Public pages
const SearchPage = lazy(() => import('../../features/search/components').then(m => ({ default: m.SearchPage })));
const CityRecommendations = lazy(() => import('../../features/cities/components/CityRecommendations'));
const PropertyDetailsPageComponent = lazy(() => import('../../features/property-details/components/PropertyDetailsPage'));
const AgentsPage = lazy(() => import('../../features/agents/components/AgentsPage'));
const AgenciesListPage = lazy(() => import('../../../components/AgenciesListPage'));
const AgencyDetailPageComponent = lazy(() => import('../../../components/AgencyDetailPage'));
const HowItWorksPage = lazy(() => import('../../../components/shared/HowItWorksPage'));
const ValuationPage = lazy(() => import('../../features/valuation/components/ValuationPage'));
const MortgageCalculatorPage = lazy(() => import('../../features/calculators/components/MortgageCalculatorPage'));
const PricingPage = lazy(() => import('../../features/pricing/components/PricingPage'));
const AnalyticsPage = lazy(() => import('../../features/analytics/components/AnalyticsPage'));

// Auth pages
const ResetPasswordPage = lazy(() => import('../../features/auth/components/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('../../features/auth/components/VerifyEmailPage'));

// Legal pages
const PrivacyPolicyPage = lazy(() => import('../../features/legal/components/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('../../features/legal/components/TermsOfServicePage'));
const CookiePolicyPage = lazy(() => import('../../features/legal/components/CookiePolicyPage'));
const RefundPolicyPage = lazy(() => import('../../features/legal/components/RefundPolicyPage'));

// Payment pages
const PaymentSuccess = lazy(() => import('../../features/payments/components/PaymentSuccess'));
const PaymentCancel = lazy(() => import('../../features/payments/components/PaymentCancel'));

// Authenticated user pages
const SavedSearchesPage = lazy(() => import('../../features/saved/components/SavedSearchesPage'));
const SavedPropertiesPage = lazy(() => import('../../features/saved/components/SavedHomesPage'));
const InboxPage = lazy(() => import('../../features/messaging/components/InboxPage'));
const MyAccountPage = lazy(() => import('../../../components/shared/MyAccountPage'));
const SellerDashboard = lazy(() => import('../../features/seller/components/SellerDashboard'));

// Admin page - only loaded when authorized
const AdminDashboard = lazy(() => import('../../features/admin/components/AdminDashboard'));

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Wrapper for PropertyDetailsPage - fetches property from URL param
const PropertyDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProperty = async () => {
      if (!id) {
        setError('Property not found');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/properties/${id}`);
        if (!response.ok) {
          setError('Property not found');
          setLoading(false);
          return;
        }
        const data = await response.json();
        if (data.property) {
          // Transform backend property to frontend format
          const transformedProperty = {
            ...data.property,
            id: data.property._id || data.property.id,
            sellerId: data.property.sellerId?._id || data.property.sellerId,
          };
          setProperty(transformedProperty);
        } else {
          setError('Property not found');
        }
      } catch (err) {
        setError('Failed to load property');
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id]);

  if (loading) {
    return <PageLoader />;
  }

  if (error || !property) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700">{error || 'Property not found'}</h2>
          <a href="/" className="mt-4 text-blue-600 hover:underline">Back to search</a>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <PropertyDetailsPageComponent property={property} />
    </Suspense>
  );
};

// Wrapper for AgencyDetailPage - fetches agency from URL param
const AgencyDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [agency, setAgency] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgency = async () => {
      if (!slug) {
        setError('Agency not found');
        setLoading(false);
        return;
      }

      try {
        // Normalize slug: remove country prefix with comma if present
        let normalizedSlug = slug;
        if (normalizedSlug.includes(',')) {
          normalizedSlug = normalizedSlug.split(',')[1];
        }

        const token = localStorage.getItem('balkan_estate_token');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/agencies/${normalizedSlug}`, { headers });

        if (!response.ok) {
          setError('Agency not found');
          setLoading(false);
          return;
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          setError('Invalid response');
          setLoading(false);
          return;
        }

        const data = await response.json();
        setAgency(data.agency);
      } catch (err) {
        setError('Failed to load agency');
      } finally {
        setLoading(false);
      }
    };

    fetchAgency();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading agency details...</p>
        </div>
      </div>
    );
  }

  if (error || !agency) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700">{error || 'Agency not found'}</h2>
          <a href="/" className="mt-4 text-blue-600 hover:underline">Back to agencies</a>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <AgencyDetailPageComponent agency={agency} />
    </Suspense>
  );
};

// Wrapper for AgentsPage - sets selected agent from URL param
const AgentsPageWrapper: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { dispatch } = useAppContext();

  useEffect(() => {
    // Set selected agent in context when URL has agent ID
    if (id) {
      dispatch({ type: 'SET_SELECTED_AGENT', payload: id });
    } else {
      dispatch({ type: 'SET_SELECTED_AGENT', payload: null });
    }
  }, [id, dispatch]);

  return (
    <Suspense fallback={<PageLoader />}>
      <AgentsPage />
    </Suspense>
  );
};

// Wrapper for HowItWorksPage - sets tab from URL param
const HowItWorksPageWrapper: React.FC = () => {
  const { tab } = useParams<{ tab: string }>();
  const { dispatch } = useAppContext();
  const validTabs = ['getting-started', 'premium-features', 'agencies', 'agents', 'buyers', 'sellers'];

  useEffect(() => {
    const validTab = tab && validTabs.includes(tab) ? tab : 'getting-started';
    dispatch({ type: 'SET_HOW_IT_WORKS_TAB', payload: validTab });
  }, [tab, dispatch]);

  return (
    <Suspense fallback={<PageLoader />}>
      <HowItWorksPage />
    </Suspense>
  );
};

// Wrapper for MyAccountPage - sets tab from URL param
const MyAccountPageWrapper: React.FC = () => {
  const { tab } = useParams<{ tab: string }>();
  const { dispatch } = useAppContext();

  useEffect(() => {
    dispatch({ type: 'SET_ACCOUNT_TAB', payload: tab || 'listings' });
  }, [tab, dispatch]);

  return (
    <Suspense fallback={<PageLoader />}>
      <MyAccountPage />
    </Suspense>
  );
};

// Wrapper for SellerDashboard - sets property to edit from URL param
const SellerDashboardWrapper: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { dispatch } = useAppContext();
  const location = useLocation();
  const isEditMode = location.pathname.includes('/edit-listing/');

  useEffect(() => {
    const loadPropertyForEdit = async () => {
      if (isEditMode && id) {
        try {
          const response = await fetch(`${API_URL}/properties/${id}`);
          if (response.ok) {
            const data = await response.json();
            if (data.property) {
              const property = {
                ...data.property,
                id: data.property._id || data.property.id,
                sellerId: data.property.sellerId?._id || data.property.sellerId,
              };
              dispatch({ type: 'SET_PROPERTY_TO_EDIT', payload: property });
            }
          }
        } catch (err) {
          console.error('Failed to load property for editing:', err);
        }
      } else {
        dispatch({ type: 'SET_PROPERTY_TO_EDIT', payload: null });
      }
    };

    loadPropertyForEdit();
  }, [id, isEditMode, dispatch]);

  return (
    <Suspense fallback={<PageLoader />}>
      <SellerDashboard />
    </Suspense>
  );
};

// Wrapper for AdminDashboard - sets section from URL param
const AdminDashboardWrapper: React.FC = () => {
  const { section } = useParams<{ section: string }>();
  const { dispatch } = useAppContext();
  const validSections = ['dashboard', 'users', 'inquiries', 'agent-requests', 'discounts', 'promotions', 'properties', 'agencies', 'pricing', 'activity', 'settings', 'how-it-works'];

  useEffect(() => {
    const validSection = section && validSections.includes(section) ? section : 'dashboard';
    dispatch({ type: 'SET_ADMIN_SECTION', payload: validSection });
  }, [section, dispatch]);

  return (
    <Suspense fallback={<PageLoader />}>
      <AdminDashboard />
    </Suspense>
  );
};

// Wrapper to pass props to SearchPage
interface AppRoutesProps {
  onToggleSidebar: () => void;
}

// Language route wrapper - handles language prefix
const LanguageRouteWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { lang } = useParams<{ lang: string }>();

  useEffect(() => {
    // Update i18n language when URL language changes
    if (lang && SUPPORTED_LANG_CODES.includes(lang)) {
      if (i18n.language !== lang) {
        i18n.changeLanguage(lang);
        localStorage.setItem('balkanestate_language', lang);
      }
    }
  }, [lang]);

  return <>{children}</>;
};

// Redirect to add language prefix
const LanguageRedirect: React.FC = () => {
  const location = useLocation();
  const storedLang = localStorage.getItem('balkanestate_language');
  const browserLang = navigator.language.split('-')[0];
  const detectedLang = storedLang && SUPPORTED_LANG_CODES.includes(storedLang)
    ? storedLang
    : SUPPORTED_LANG_CODES.includes(browserLang) ? browserLang : 'en';

  const newPath = buildLocalizedPath(location.pathname, detectedLang as any) + location.search;
  return <Navigate to={newPath} replace />;
};

// Define all routes (without language prefix - added by wrapper)
const LocalizedRoutes: React.FC<AppRoutesProps> = ({ onToggleSidebar }) => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Default route */}
        <Route path="/" element={<Navigate to="search" replace />} />

        {/* Public pages */}
        <Route path="search" element={<SearchPage onToggleSidebar={onToggleSidebar} />} />
        <Route path="explore-cities" element={<CityRecommendations />} />
        <Route path="property/:id" element={<PropertyDetailsPage />} />
        <Route path="agents" element={<AgentsPageWrapper />} />
        <Route path="agents/:id" element={<AgentsPageWrapper />} />
        <Route path="agencies" element={<AgenciesListPage />} />
        <Route path="agencies/:slug" element={<AgencyDetailPage />} />
        <Route path="how-it-works" element={<HowItWorksPageWrapper />} />
        <Route path="how-it-works/:tab" element={<HowItWorksPageWrapper />} />
        <Route path="valuation" element={<ValuationPage />} />
        <Route path="mortgage-calculator" element={<MortgageCalculatorPage />} />
        <Route path="subscribe" element={<PricingPage />} />
        <Route path="pricing" element={<Navigate to="subscribe" replace />} />
        <Route path="analytics" element={<AnalyticsPage />} />

        {/* Auth pages */}
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />

        {/* Legal pages */}
        <Route path="privacy" element={<PrivacyPolicyPage />} />
        <Route path="privacy-policy" element={<Navigate to="privacy" replace />} />
        <Route path="terms" element={<TermsOfServicePage />} />
        <Route path="terms-of-service" element={<Navigate to="terms" replace />} />
        <Route path="cookies" element={<CookiePolicyPage />} />
        <Route path="cookie-policy" element={<Navigate to="cookies" replace />} />
        <Route path="refund" element={<RefundPolicyPage />} />
        <Route path="refund-policy" element={<Navigate to="refund" replace />} />

        {/* Payment callbacks */}
        <Route path="payment/success" element={<PaymentSuccess />} />
        <Route path="payment/cancel" element={<PaymentCancel />} />

        {/* Authenticated user pages */}
        <Route path="saved-searches" element={<SavedSearchesPage />} />
        <Route path="saved-properties" element={<SavedPropertiesPage />} />
        <Route path="inbox" element={<InboxPage />} />
        <Route path="account" element={<MyAccountPageWrapper />} />
        <Route path="account/:tab" element={<MyAccountPageWrapper />} />
        <Route path="create-listing" element={<SellerDashboardWrapper />} />
        <Route path="edit-listing/:id" element={<SellerDashboardWrapper />} />

        {/* Admin routes - protected and secret */}
        <Route
          path="admin"
          element={
            <ProtectedAdminRoute>
              <AdminDashboardWrapper />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="admin/:section"
          element={
            <ProtectedAdminRoute>
              <AdminDashboardWrapper />
            </ProtectedAdminRoute>
          }
        />

        {/* Catch-all redirect to search */}
        <Route path="*" element={<Navigate to="search" replace />} />
      </Routes>
    </Suspense>
  );
};

const AppRoutes: React.FC<AppRoutesProps> = ({ onToggleSidebar }) => {
  return (
    <Routes>
      {/* Language-prefixed routes (e.g., /en/search, /sq/agencies) */}
      <Route
        path="/:lang/*"
        element={
          <LanguageRouteWrapper>
            <LocalizedRoutes onToggleSidebar={onToggleSidebar} />
          </LanguageRouteWrapper>
        }
      />

      {/* Root without language - redirect to add language prefix */}
      <Route path="/*" element={<LanguageRedirect />} />
    </Routes>
  );
};

export default AppRoutes;
