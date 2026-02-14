import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
// Page transitions use lightweight CSS instead of framer-motion to reduce initial bundle
import { HelmetProvider } from 'react-helmet-async';
import { AppProvider, useAppContext } from './context/AppContext';
import { AlertProvider } from './context/AlertContext';
import { ConfirmationProvider } from './src/shared/hooks/useConfirmation';
import { NotificationProvider } from './src/shared/hooks/useNotification';
import { QueryProvider } from './src/app/providers/QueryProvider';
import { ErrorBoundary } from './src/app/components/ErrorBoundary';
import { QueryErrorBoundary } from './src/app/components/QueryErrorBoundary';
import { AnimationProvider } from './src/components/ui/Animations';
import { useZoomCompensation } from './src/app/hooks/useZoomCompensation';
// Lazy load SEO components (don't block initial render)
const SEO = lazy(() => import('./src/components/seo').then(m => ({ default: m.SEO })));
const OrganizationSchema = lazy(() => import('./src/components/seo').then(m => ({ default: m.OrganizationSchema })));
const FAQSchema = lazy(() => import('./src/components/seo').then(m => ({ default: m.FAQSchema })));
import { realEstateFAQs } from './src/components/seo';

// Lazy load Analytics (only loads if env vars exist)
const Analytics = lazy(() => import('./src/components/marketing/Analytics'));
import { UserRole, HowItWorksTab, AdminSection, Agency } from './types';
import { API_CONFIG, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, ROUTES, HOW_IT_WORKS_TABS, ADMIN_SECTIONS } from './src/shared/constants/app.constants';

// Inline LogoIcon to avoid importing all icons from constants
const LogoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <g fillRule="evenodd">
      <path fill="#003A96" d="M12 21V5L10 7V23L12 21Z M4 21V10L2 12V23L4 21Z" />
      <path fill="#0252CD" d="M12 5H20V21H12V5Z M4 10H10V21H4V10Z" />
    </g>
  </svg>
);

// Initialize i18n
import './src/i18n';

// Language routing utilities
import { parseLanguageFromPath, initializeLanguageFromUrl, buildLocalizedPath } from './src/utils/languageRouting';

// Core layout components (lazy loaded - can render after initial paint)
const Sidebar = lazy(() => import('./components/shared/Sidebar'));
const Header = lazy(() => import('./components/shared/Header'));

// Lazy load all pages and conditional components to reduce initial bundle
const SearchPage = lazy(() => import('./src/features/search/components').then(m => ({ default: m.SearchPage })));
const AuthPage = lazy(() => import('./src/features/auth/components/AuthModal'));
const EmailVerificationRequired = lazy(() => import('./src/features/auth/components/EmailVerificationRequired'));
const AlertDialog = lazy(() => import('./components/shared/AlertDialog'));
const SessionExpiredModal = lazy(() => import('./src/features/auth/components/SessionExpiredModal'));

// Lazy loaded components (loaded on demand)
// All these components use default exports
const CityRecommendations = lazy(() => import('./src/features/cities/components/CityRecommendations'));
const CreateListingPage = lazy(() => import('./src/features/seller/components/SellerDashboard'));
const RentalSearchPage = lazy(() => import('./src/features/rental/components/RentalSearchPage'));
const SavedSearchesPage = lazy(() => import('./src/features/saved/components/SavedSearchesPage'));
const SavedPropertiesPage = lazy(() => import('./src/features/saved/components/SavedHomesPage'));
const InboxPage = lazy(() => import('./src/features/messaging/components/InboxPage'));
const MyAccountPage = lazy(() => import('./components/shared/MyAccountPage'));
const AgentsPage = lazy(() => import('./src/features/agents/components/AgentsPage'));
const AgenciesListPage = lazy(() => import('./components/AgenciesListPage'));
const AgencyDetailPage = lazy(() => import('./components/AgencyDetailPage'));
const EnterpriseCreationForm = lazy(() => import('./src/features/seller/components/EnterpriseCreationForm'));
const PropertyDetailsPage = lazy(() => import('./src/features/property-details/components/PropertyDetailsPage'));
const PaymentSuccess = lazy(() => import('./src/features/payments/components/PaymentSuccess'));
const PaymentCancel = lazy(() => import('./src/features/payments/components/PaymentCancel'));
const ListingLimitWarningModal = lazy(() => import('./components/shared/ListingLimitWarningModal'));
const DiscountGameModal = lazy(() => import('./components/shared/DiscountGameModal'));
const AdminDashboard = lazy(() => import('./src/features/admin/components/AdminDashboard'));
const NotFoundPage = lazy(() => import('./src/components/ui/not-found-2').then(m => ({ default: m.NotFound })));
const ResetPasswordPage = lazy(() => import('./src/features/auth/components/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('./src/features/auth/components/VerifyEmailPage'));
const AnalyticsPage = lazy(() => import('./src/features/analytics/components/AnalyticsPage'));
const HowItWorksPage = lazy(() => import('./components/shared/HowItWorksPage'));
const ValuationPage = lazy(() => import('./src/features/valuation/components/ValuationPage'));
const MortgageCalculatorPage = lazy(() => import('./src/features/calculators/components/MortgageCalculatorPage'));
const PricingPage = lazy(() => import('./src/features/pricing/components/PricingPage'));
const PrivacyPolicyPage = lazy(() => import('./src/features/legal/components/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('./src/features/legal/components/TermsOfServicePage'));
const CookiePolicyPage = lazy(() => import('./src/features/legal/components/CookiePolicyPage'));
const RefundPolicyPage = lazy(() => import('./src/features/legal/components/RefundPolicyPage'));
const ContactUsPage = lazy(() => import('./src/features/contact/components/ContactUsPage'));

// Agency creation pages
const CreateAgencyPage = lazy(() => import('./src/features/agencies/components/CreateAgencyPage'));
const AgencyPaymentPage = lazy(() => import('./src/features/agencies/components/AgencyPaymentPage'));

// Google Maps API is deferred - only loads when map pages are visited (see MapComponent.tsx)

// Cookie Consent Banner (lazy loaded - shown after initial render)
const CookieConsent = lazy(() => import('./src/shared/components/CookieConsent'));

// Splash screen (lazy loaded - shown on initial app load to hide loading)
const SplashScreen = lazy(() => import('./src/components/ui/SplashScreen'));

// Global liquid glass SVG filter (needed for glass buttons & controls)
import { LiquidGlassFilter } from './components/ui/liquid-glass-button';

// PWA Install Prompt (lazy loaded)
const PWAInstallPrompt = lazy(() => import('./src/shared/components/PWAInstallPrompt'));

// Microsoft Clarity - Heatmaps & Session Recordings (lazy loaded)
const ClarityInit = lazy(() => import('./src/app/components/ClarityInit'));

// Loading fallback component with simple logo animation
const PageLoader: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[50vh]">
    <LogoIcon className="w-12 h-12 text-primary animate-pulse" />
  </div>
);

const AppContent: React.FC<{ onToggleSidebar: () => void }> = ({ onToggleSidebar }) => {
  const { state, dispatch } = useAppContext();
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [isLoadingAgency, setIsLoadingAgency] = useState(false);

  // Listen for session expiration events from httpClient
  useEffect(() => {
    const handleSessionExpired = () => {
      dispatch({ type: 'SESSION_EXPIRED' });
    };

    window.addEventListener('session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('session-expired', handleSessionExpired);
    };
  }, [dispatch]);

  // Check URL for routing on mount and when URL changes (handles browser/mobile back button)
  useEffect(() => {
    const checkUrlForRouting = () => {
      // Initialize language from URL (handles redirect if no language prefix)
      const { lang, path: cleanPath } = initializeLanguageFromUrl();

      // Normalize path: remove trailing slashes (except for root '/')
      let path = cleanPath;
      if (path.length > 1 && path.endsWith('/')) {
        path = path.slice(0, -1);
      }

      // Payment callback routes (highest priority)
      if (path === '/payment/success' || path === '/payment/cancel') {
        // Don't change active view, let the component handle it
        dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
        dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
        return;
      }

      // Property detail route: /property/:id
      const propertyMatch = path.match(/^\/property\/(.+)$/);
      if (propertyMatch) {
        const propertyId = decodeURIComponent(propertyMatch[1]);
        dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });

        // Fetch property from API to ensure we have full data
        fetch(`${API_CONFIG.BASE_URL}/properties/${propertyId}`)
          .then(res => {
            if (!res.ok) {
              throw new Error(`Property not found (${res.status})`);
            }
            return res.json();
          })
          .then(data => {
            if (data.property) {
              // Transform backend property to frontend format
              const property = {
                ...data.property,
                id: data.property._id || data.property.id,
                sellerId: data.property.sellerId?._id || data.property.sellerId,
              };
              dispatch({ type: 'SET_SELECTED_PROPERTY_OBJECT', payload: property });
            } else {
              dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
            }
          })
          .catch(() => {
            dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
          });
        return;
      }

      // Edit listing route: /edit-listing/:id
      const editListingMatch = path.match(/^\/edit-listing\/(.+)$/);
      if (editListingMatch) {
        const propertyId = decodeURIComponent(editListingMatch[1]);
        // Find the property and set it for editing
        fetch(`${API_CONFIG.BASE_URL}/properties/${propertyId}`)
          .then(res => {
            if (!res.ok) {
              throw new Error(`Property not found (${res.status})`);
            }
            return res.json();
          })
          .then(data => {
            if (data.property) {
              // Transform backend property to frontend format (backend uses _id, frontend uses id)
              const property = {
                ...data.property,
                id: data.property._id || data.property.id,
                sellerId: data.property.sellerId?._id || data.property.sellerId,
              };
              dispatch({ type: 'SET_PROPERTY_TO_EDIT', payload: property });
              dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'create-listing' });
            }
          })
          .catch(() => {
            // Property not found - redirect to search
            dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
          });
        dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
        dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
        return;
      }

      // Agent profile route: /agents/:id
      const agentMatch = path.match(/^\/agents\/(.+)$/);
      if (agentMatch) {
        const agentId = decodeURIComponent(agentMatch[1]);
        dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
        dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
        dispatch({ type: 'SET_SELECTED_AGENT', payload: agentId });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agents' });
        return;
      }

      // Agency detail route: /agencies/:slug
      const agencyMatch = path.match(/^\/agencies\/(.+)$/);
      if (agencyMatch) {
        let agencySlug = decodeURIComponent(agencyMatch[1]);

        // Normalize slug: remove country prefix with comma if present
        // Handles old format: "serbia,belgrade-premium-properties" -> "belgrade-premium-properties"
        if (agencySlug.includes(',')) {
          agencySlug = agencySlug.split(',')[1];
        }

        // Clear property selection when viewing agency
        dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
        dispatch({ type: 'SET_SELECTED_AGENCY', payload: agencySlug });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencies' });
        return;
      }

      // Create listing route (new listing, not edit)
      if (path === '/create-listing') {
        dispatch({ type: 'SET_PROPERTY_TO_EDIT', payload: null });
        dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
        dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'create-listing' });
        return;
      }

      // Create rental listing route
      if (path === '/create-rental') {
        dispatch({ type: 'SET_PROPERTY_TO_EDIT', payload: null });
        dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
        dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'create-rental' });
        return;
      }

      // Account sub-routes: /account/:tab
      const accountMatch = path.match(/^\/account(?:\/(.+))?$/);
      if (accountMatch) {
        const tab = accountMatch[1] || 'listings'; // Default to listings
        dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
        dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
        dispatch({ type: 'SET_ACCOUNT_TAB', payload: tab });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' });
        return;
      }

      // How-it-works routes with tab support: /how-it-works/:tab
      const howItWorksMatch = path.match(/^\/how-it-works(?:\/(.+))?$/);
      if (howItWorksMatch) {
        const tab = howItWorksMatch[1] || 'getting-started'; // Default to getting-started tab
        const validTab: HowItWorksTab = HOW_IT_WORKS_TABS.includes(tab as typeof HOW_IT_WORKS_TABS[number])
          ? tab as HowItWorksTab
          : 'getting-started';
        dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
        dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
        dispatch({ type: 'SET_HOW_IT_WORKS_TAB', payload: validTab });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'how-it-works' });
        return;
      }

      // Admin routes with section support: /admin/:section
      const adminMatch = path.match(/^\/admin(?:\/(.+))?$/);
      if (adminMatch) {
        const section = adminMatch[1] || 'dashboard'; // Default to dashboard
        const validSection: AdminSection = ADMIN_SECTIONS.includes(section as typeof ADMIN_SECTIONS[number])
          ? section as AdminSection
          : 'dashboard';
        dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
        dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
        dispatch({ type: 'SET_ADMIN_SECTION', payload: validSection });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'admin' });
        return;
      }

      // Main navigation routes
      const routeMap: Record<string, string> = {
        '/': 'search',
        '/search': 'search',
        '/explore-cities': 'explore-cities',
        '/saved-searches': 'saved-searches',
        '/saved-properties': 'saved-properties',
        '/inbox': 'inbox',
        '/agents': 'agents',
        '/agencies': 'agencies',
        '/reset-password': 'reset-password',
        '/verify-email': 'verify-email',
        '/analytics': 'analytics',
        '/valuation': 'valuation',
        '/mortgage-calculator': 'mortgage-calculator',
        '/subscribe': 'pricing',
        '/privacy': 'privacy',
        '/privacy-policy': 'privacy',
        '/terms': 'terms',
        '/terms-of-service': 'terms',
        '/cookies': 'cookies',
        '/cookie-policy': 'cookies',
        '/refund': 'refund',
        '/refund-policy': 'refund',
        '/contact': 'contact',
        '/rent': 'rentals',
        '/rentals': 'rentals',
        '/create-agency': 'createAgency',
        '/create-agency/payment': 'createAgencyPayment',
        '/create-agency/confirm': 'createAgencyConfirm',
      };

      // Redirect /pricing to /subscribe
      if (path === '/pricing') {
        window.history.replaceState({}, '', buildLocalizedPath('/subscribe'));
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'pricing' });
        return;
      }

      const view = routeMap[path];
      if (view) {
        // Clear selected items when navigating to main routes
        dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
        dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
        // Clear selected agent when navigating to agents list (not agent profile)
        if (view === 'agents') {
          dispatch({ type: 'SET_SELECTED_AGENT', payload: null });
        }
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: view });
        // Redirect root to /search for cleaner URL
        if (path === '/') {
          window.history.replaceState({}, '', buildLocalizedPath('/search'));
        }
      } else {
        // Unknown route - show 404 page
        dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
        dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'not-found' });
      }
    };

    checkUrlForRouting();

    // Listen for browser back/forward navigation (works on web and mobile)
    // This includes:
    // - Browser back button
    // - Browser forward button
    // - Mobile swipe back gesture
    // - History API navigation
    window.addEventListener('popstate', checkUrlForRouting);

    return () => window.removeEventListener('popstate', checkUrlForRouting);
  }, [dispatch]);

  // Fetch selected agency when selectedAgencyId changes
  useEffect(() => {
    const fetchAgency = async () => {
      if (state.selectedAgencyId) {
        // Check if selectedAgencyId is already an agency object
        const agencyId = state.selectedAgencyId;
        if (typeof agencyId === 'object' && agencyId !== null && '_id' in agencyId && 'name' in agencyId) {
          setSelectedAgency(agencyId as Agency);
          setIsLoadingAgency(false);
          return;
        }

        setIsLoadingAgency(true);
        try {
          const agencyIdentifier = state.selectedAgencyId;

          // Include auth token so backend can identify current user and auto-add owner as member
          const token = localStorage.getItem('balkan_estate_token');
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch(`${API_CONFIG.BASE_URL}/agencies/${agencyIdentifier}`, { headers });

          // Check content type before parsing
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            setSelectedAgency(null);
            setIsLoadingAgency(false);
            return;
          }

          if (!response.ok) {
            setSelectedAgency(null);
          } else {
            const data = await response.json();
            setSelectedAgency(data.agency as Agency);
          }
        } catch {
          setSelectedAgency(null);
        } finally {
          setIsLoadingAgency(false);
        }
      } else {
        setSelectedAgency(null);
        setIsLoadingAgency(false);
      }
    };
    fetchAgency();
  }, [state.selectedAgencyId]);

  // Scroll to top when active view changes
  useEffect(() => {
    // Scroll window to top
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

    // Also scroll main content container if it exists
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.scrollTop = 0;
    }

    // Scroll any data-scroll-container elements
    document.querySelectorAll('[data-scroll-container]').forEach(el => {
      el.scrollTop = 0;
    });
  }, [state.activeView]);

  // Also scroll to top when selected property or agency changes
  useEffect(() => {
    if (state.selectedProperty || state.selectedAgencyId) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

      // Also scroll main content container
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.scrollTop = 0;
      }
    }
  }, [state.selectedProperty, state.selectedAgencyId]);

  // Payment callback routes (highest priority)
  const path = window.location.pathname;
  if (path === '/payment/success') {
    return (
      <Suspense fallback={<PageLoader />}>
        <PaymentSuccess />
      </Suspense>
    );
  }
  if (path === '/payment/cancel') {
    return (
      <Suspense fallback={<PageLoader />}>
        <PaymentCancel />
      </Suspense>
    );
  }

  // Global handler for selected property view
  if (state.selectedProperty) {
    return (
      <QueryErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <PropertyDetailsPage property={state.selectedProperty} />
        </Suspense>
      </QueryErrorBoundary>
    );
  }

  // Global handler for selected agency view - show detail page if we have a selectedAgencyId
  if (state.selectedAgencyId) {
    if (isLoadingAgency || !selectedAgency) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading agency details...</p>
          </div>
        </div>
      );
    }
    return (
      <QueryErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <AgencyDetailPage agency={selectedAgency} />
        </Suspense>
      </QueryErrorBoundary>
    );
  }

  // Wrap lazy loaded views in Suspense
  const renderView = () => {
    switch (state.activeView) {
      case 'explore-cities':
        return <CityRecommendations />;
      case 'saved-searches':
        return <SavedSearchesPage />;
      case 'saved-properties':
        return <SavedPropertiesPage />;
      case 'inbox':
        return <InboxPage />;
      case 'account':
        return <MyAccountPage />;
      case 'create-listing':
        return <CreateListingPage />;
      case 'rentals':
        return <QueryErrorBoundary><RentalSearchPage onToggleSidebar={onToggleSidebar} /></QueryErrorBoundary>;
      case 'create-rental':
        return <CreateListingPage />;
      case 'agents':
        return <QueryErrorBoundary><AgentsPage /></QueryErrorBoundary>;
      case 'agencies':
        return <QueryErrorBoundary><AgenciesListPage /></QueryErrorBoundary>;
      case 'admin':
        // Only load admin dashboard for admin/super_admin users
        if (state.currentUser?.role === UserRole.ADMIN || state.currentUser?.role === UserRole.SUPER_ADMIN) {
          return <QueryErrorBoundary><AdminDashboard /></QueryErrorBoundary>;
        }
        // Redirect non-admins to search
        return <SearchPage onToggleSidebar={onToggleSidebar} />;
      case 'reset-password':
        return <ResetPasswordPage />;
      case 'verify-email':
        return <VerifyEmailPage />;
      case 'analytics':
        return <QueryErrorBoundary><AnalyticsPage /></QueryErrorBoundary>;
      case 'how-it-works':
        return <HowItWorksPage />;
      case 'valuation':
        return <ValuationPage />;
      case 'mortgage-calculator':
        return <MortgageCalculatorPage />;
      case 'pricing':
        return <PricingPage />;
      case 'privacy':
        return <PrivacyPolicyPage />;
      case 'terms':
        return <TermsOfServicePage />;
      case 'cookies':
        return <CookiePolicyPage />;
      case 'refund':
        return <RefundPolicyPage />;
      case 'contact':
        return <ContactUsPage />;
      case 'createAgency':
        return <CreateAgencyPage />;
      case 'createAgencyPayment':
        return <AgencyPaymentPage />;
      case 'createAgencyConfirm':
        return <AgencyPaymentPage />;
      case 'not-found':
        return <NotFoundPage />;
      case 'search':
      default:
        return <QueryErrorBoundary><SearchPage onToggleSidebar={onToggleSidebar} /></QueryErrorBoundary>;
    }
  };

  // Compute a stable key for the current view to trigger transitions
  const viewKey = state.selectedProperty
    ? `property-${state.selectedProperty.id || 'detail'}`
    : state.selectedAgencyId
      ? `agency-${state.selectedAgencyId}`
      : state.activeView;

  // All views now use Suspense since SearchPage is lazy loaded
  // CSS fade transition (replaces framer-motion AnimatePresence for lighter bundle)
  return (
    <div key={viewKey} className="h-full animate-fade-in">
      <ErrorBoundary level="route" key={state.activeView}>
        <Suspense fallback={<PageLoader />}>
          {renderView()}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

const MainLayout: React.FC = () => {
  const { state, dispatch, updateUser, createListing } = useAppContext();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const isSearchPage = state.activeView === 'search';
  const isRentalPage = state.activeView === 'rentals';
  const isFloatingHeaderView = isSearchPage || isRentalPage;
  const isAgencyDetailView = !!state.selectedAgencyId;
  // Agency pages should allow scrolling to show all agents and details
  const isFullHeightView = isSearchPage || isRentalPage || state.activeView === 'inbox' || !!state.selectedProperty;
  const showHeader = !(isMobile && (isSearchPage || isRentalPage || !!state.selectedProperty));
  // Note: Agency detail pages WILL show header on mobile to allow sidebar access
  
  const anyNonAuthModalOpen = state.isListingLimitWarningOpen || state.isDiscountGameOpen;
  
  const isOverlayVisible = 
    state.isAuthModalOpen || 
    anyNonAuthModalOpen || 
    (isMobile && isSidebarOpen);


  const navigateToPricing = () => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'pricing' });
    window.history.pushState({}, '', buildLocalizedPath('/subscribe'));
  };
  
  const handleWarningConfirm = () => {
    dispatch({ type: 'TOGGLE_LISTING_LIMIT_WARNING', payload: false });
    dispatch({ type: 'TOGGLE_DISCOUNT_GAME', payload: true });
  };

  const handleGameComplete = (discounts: { proYearly: number; proMonthly: number; enterprise: number; }) => {
    dispatch({ type: 'SET_ACTIVE_DISCOUNT', payload: discounts });
    dispatch({ type: 'TOGGLE_DISCOUNT_GAME', payload: false });
    navigateToPricing();
  };

  return (
    <div className="min-h-screen bg-neutral-50 font-sans overflow-x-hidden max-w-full" style={{ height: '100dvh' }}>
        <Suspense fallback={null}>
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        </Suspense>

        <div className={`relative transition-all duration-300 ease-in-out h-full flex flex-col md:pl-20 overflow-x-hidden max-w-full ${isOverlayVisible ? 'blur-sm pointer-events-none' : ''}`}>
            <Suspense fallback={null}>
              {showHeader && <Header onToggleSidebar={() => setIsSidebarOpen(true)} isFloating={isFloatingHeaderView} />}
            </Suspense>
            <main id="main-content" data-scroll-container className={`flex flex-col flex-1 overflow-x-hidden ${isFullHeightView ? 'overflow-y-hidden h-full min-h-0' : 'overflow-y-auto'}`}>
                <AppContent onToggleSidebar={() => setIsSidebarOpen(true)} />
            </main>
        </div>

        {/* Lazy loaded modals - only render when open */}
        <Suspense fallback={null}>
          {state.isListingLimitWarningOpen && (
            <ListingLimitWarningModal
                isOpen={state.isListingLimitWarningOpen}
                onClose={() => {
                    dispatch({ type: 'SET_PENDING_PROPERTY', payload: null });
                    dispatch({ type: 'TOGGLE_LISTING_LIMIT_WARNING', payload: false });
                }}
                onConfirm={handleWarningConfirm}
            />
          )}
          {state.isDiscountGameOpen && (
            <DiscountGameModal
                isOpen={state.isDiscountGameOpen}
                onGameComplete={handleGameComplete}
            />
          )}
          {state.isEnterpriseModalOpen && (
            <EnterpriseCreationForm
                isOpen={state.isEnterpriseModalOpen}
                onClose={() => dispatch({ type: 'TOGGLE_ENTERPRISE_MODAL', payload: false })}
            />
          )}
        </Suspense>

        {/* Global Alert Dialog */}
        <Suspense fallback={null}>
          {state.alertDialog && (
            <AlertDialog
              isOpen={state.alertDialog.isOpen}
              type={state.alertDialog.type}
              title={state.alertDialog.title}
              message={state.alertDialog.message}
              onClose={() => dispatch({ type: 'HIDE_ALERT' })}
            />
          )}
        </Suspense>

        {/* Session Expired Modal */}
        <Suspense fallback={null}>
          {state.isSessionExpiredModalOpen && <SessionExpiredModal />}
        </Suspense>
    </div>
  );
};

const FullScreenLoader: React.FC = () => (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-neutral-50">
        <LogoIcon className="w-16 h-16 text-primary animate-pulse" />
        <p className="mt-4 text-neutral-600 font-semibold">Loading Balkan Estate...</p>
    </div>
);


const AppWrapper: React.FC = () => {
    const { state, dispatch, checkAuthStatus, handleOAuthCallback } = useAppContext();

    // Show splash only on first visit or after login/register
    const hasVisited = useRef(localStorage.getItem('balkanestate_visited') === 'true');
    const [showSplash, setShowSplash] = useState(!hasVisited.current);
    const prevAuthenticated = useRef(state.isAuthenticated);

    // Show splash only for explicit login/signup, not session restore
    useEffect(() => {
        if (!prevAuthenticated.current && state.isAuthenticated) {
            const justAuthed = sessionStorage.getItem('balkanestate_just_authed');
            if (justAuthed) {
                sessionStorage.removeItem('balkanestate_just_authed');
                setShowSplash(true);
            }
        }
        prevAuthenticated.current = state.isAuthenticated;
    }, [state.isAuthenticated]);

    const handleSplashComplete = useCallback(() => {
        setShowSplash(false);
        localStorage.setItem('balkanestate_visited', 'true');
        // Signal map markers to play entrance fly-in animation
        (window as any).__balkanestateSplashDone = Date.now();
    }, []);

    useEffect(() => {
        // Check for OAuth callback parameters in URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const refreshToken = urlParams.get('refresh');
        const error = urlParams.get('error');

        // Check if this is a page that uses 'token' param for non-OAuth purposes
        // - reset-password: uses token for password reset
        // - verify-email: uses token for email verification
        const isTokenUsedPage = window.location.pathname.includes('reset-password') ||
                                window.location.pathname.includes('verify-email');

        // Only process as OAuth callback if NOT on a page that uses token for other purposes
        if (!isTokenUsedPage) {
            // SECURITY: Immediately clean up URL to remove OAuth tokens from browser history
            // This prevents tokens from being logged or leaked via Referer headers
            if (token || refreshToken || error) {
                window.history.replaceState({}, document.title, window.location.pathname);
            }

            if (error) {
                dispatch({
                    type: 'SHOW_ALERT',
                    payload: {
                        type: 'error',
                        title: 'Authentication Failed',
                        message: 'Authentication failed. Please try again.',
                    },
                });
                return;
            }

            if (token) {
                // SECURITY: Only tokens are passed in URL, user data is fetched securely via API
                handleOAuthCallback(token, refreshToken || undefined);
                return;
            }
        }

        // Normal auth check (for all pages including reset-password and verify-email)
        checkAuthStatus();
    }, [checkAuthStatus, handleOAuthCallback, dispatch]);

    // While splash is active, render app content behind it so resources start loading
    if (showSplash) {
        return (
            <>
                {/* Render main layout behind the splash so map/resources start loading */}
                <div className="opacity-0 pointer-events-none" aria-hidden="true">
                    {!state.isAuthenticating && <MainLayout />}
                </div>
                <Suspense fallback={<FullScreenLoader />}>
                    <SplashScreen
                        onComplete={handleSplashComplete}
                        userName={state.currentUser?.name || state.currentUser?.email?.split('@')[0]}
                    />
                </Suspense>
            </>
        );
    }

    if (state.isAuthenticating) {
        return <FullScreenLoader />;
    }

    // Allow password reset and email verification pages to bypass onboarding and verification check
    const isAuthFlowPage = window.location.pathname.includes('reset-password') ||
                           window.location.pathname.includes('verify-email');

    // Check if user needs to verify their email
    // Only applies to authenticated local users (not OAuth users like Google/Apple)
    const needsEmailVerification = state.isAuthenticated &&
                                   state.currentUser &&
                                   state.currentUser.provider === 'local' &&
                                   !state.currentUser.isEmailVerified &&
                                   !isAuthFlowPage;

    if (needsEmailVerification && state.currentUser) {
        return (
            <Suspense fallback={<FullScreenLoader />}>
                <EmailVerificationRequired email={state.currentUser.email} />
            </Suspense>
        );
    }

    // Render 404 page outside MainLayout for true full-screen (no sidebar)
    if (state.activeView === 'not-found') {
        return (
            <Suspense fallback={<FullScreenLoader />}>
                <NotFoundPage />
            </Suspense>
        );
    }

    return (
        <>
            <MainLayout />
            <Suspense fallback={null}>
                {state.isAuthModalOpen && <AuthPage />}
                <CookieConsent />
                <PWAInstallPrompt />
            </Suspense>
        </>
    );
}

const App: React.FC = () => {
  // Compensate for browser zoom so UI remains usable at 125%+
  useZoomCompensation();

  // Get analytics IDs from environment variables
  const googleAnalyticsId = import.meta.env.VITE_GA_ID;
  const facebookPixelId = import.meta.env.VITE_FB_PIXEL_ID;

  return (
    <ErrorBoundary level="app">
      <HelmetProvider>
        <QueryProvider>
          <AppProvider>
            <AlertProvider>
              <NotificationProvider>
                <ConfirmationProvider>
                  <AnimationProvider>
                    {/* Global SVG filter for liquid glass effects */}
                    <LiquidGlassFilter />
                    {/* Lazy loaded SEO & Analytics components (don't block initial render) */}
                    <Suspense fallback={null}>
                      <SEO />
                      <OrganizationSchema />
                      <FAQSchema faqs={realEstateFAQs} />
                      {/* Analytics - only loaded if IDs are provided */}
                      {(googleAnalyticsId || facebookPixelId) && (
                        <Analytics
                          googleAnalyticsId={googleAnalyticsId}
                          facebookPixelId={facebookPixelId}
                        />
                      )}
                      {/* Microsoft Clarity - Heatmaps & Session Recordings */}
                      <ClarityInit />
                    </Suspense>

                    <AppWrapper />
                  </AnimationProvider>
                </ConfirmationProvider>
              </NotificationProvider>
            </AlertProvider>
          </AppProvider>
        </QueryProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;