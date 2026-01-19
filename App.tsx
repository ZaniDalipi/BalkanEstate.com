import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AppProvider, useAppContext } from './context/AppContext';
import { AlertProvider } from './context/AlertContext';
import { ConfirmationProvider } from './src/shared/hooks/useConfirmation';
import { NotificationProvider } from './src/shared/hooks/useNotification';
import { QueryProvider } from './src/app/providers/QueryProvider';
import { ErrorBoundary } from './src/app/components/ErrorBoundary';

// Lazy load SEO components (don't block initial render)
const SEO = lazy(() => import('./src/components/seo').then(m => ({ default: m.SEO })));
const OrganizationSchema = lazy(() => import('./src/components/seo').then(m => ({ default: m.OrganizationSchema })));
const FAQSchema = lazy(() => import('./src/components/seo').then(m => ({ default: m.FAQSchema })));
import { realEstateFAQs } from './src/components/seo';

// Lazy load Analytics (only loads if env vars exist)
const Analytics = lazy(() => import('./src/components/marketing/Analytics'));

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
import { buildLocalizedPath, initializeLanguageFromUrl } from './src/utils/languageRouting';

// Core layout components
import Sidebar from './components/shared/Sidebar';
import Header from './components/shared/Header';

// Route configuration with code splitting
import AppRoutes from './src/app/routes';

// Lazy load modals and auth components
const Onboarding = lazy(() => import('./src/features/onboarding/components/Onboarding'));
const AuthPage = lazy(() => import('./src/features/auth/components/AuthModal'));
const EmailVerificationRequired = lazy(() => import('./src/features/auth/components/EmailVerificationRequired'));
const AlertDialog = lazy(() => import('./components/shared/AlertDialog'));
const SubscriptionModal = lazy(() => import('./src/features/property-details/components/SubscriptionModal'));
const EnterpriseCreationForm = lazy(() => import('./src/features/seller/components/EnterpriseCreationForm'));
const ListingLimitWarningModal = lazy(() => import('./components/shared/ListingLimitWarningModal'));
const DiscountGameModal = lazy(() => import('./components/shared/DiscountGameModal'));

// Cookie Consent Banner (lazy loaded - shown after initial render)
const CookieConsent = lazy(() => import('./src/shared/components/CookieConsent'));

// Lightweight loader (extracted for smaller initial bundle)
import { Loader3D } from './components/shared/Loader3D';

// Microsoft Clarity - Heatmaps & Session Recordings (lazy loaded)
const ClarityInit = lazy(() => import('./src/app/components/ClarityInit'));

// Loading fallback component with 3D animation
const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <Loader3D size="md" text="Loading..." />
  </div>
);

const MainLayout: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  // Determine page type for layout
  const isSearchPage = location.pathname.includes('/search');
  const isInboxPage = location.pathname.includes('/inbox');
  const isPropertyPage = location.pathname.includes('/property/');
  const isFullHeightView = isSearchPage || isInboxPage || isPropertyPage;
  const showHeader = !(isMobile && (isSearchPage || isPropertyPage));

  const anyNonAuthModalOpen = state.isSubscriptionModalOpen || state.isListingLimitWarningOpen || state.isDiscountGameOpen;

  const isOverlayVisible =
    state.isAuthModalOpen ||
    anyNonAuthModalOpen ||
    (isMobile && isSidebarOpen);

  const navigateToPricing = () => {
    navigate(buildLocalizedPath('/subscribe'));
  };

  const handleWarningConfirm = () => {
    dispatch({ type: 'TOGGLE_LISTING_LIMIT_WARNING', payload: false });
    dispatch({ type: 'TOGGLE_DISCOUNT_GAME', payload: true });
  };

  const handleGameComplete = (discounts: { proYearly: number; proMonthly: number; enterprise: number }) => {
    dispatch({ type: 'SET_ACTIVE_DISCOUNT', payload: discounts });
    dispatch({ type: 'TOGGLE_DISCOUNT_GAME', payload: false });
    navigateToPricing();
  };

  return (
    <div className="min-h-screen bg-neutral-50 font-sans overflow-x-hidden max-w-full">
      <Suspense fallback={null}>
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      </Suspense>

      <div className={`relative transition-all duration-300 ease-in-out h-screen flex flex-col md:pl-20 overflow-x-hidden max-w-full ${isOverlayVisible ? 'blur-sm pointer-events-none' : ''}`}>
        <Suspense fallback={null}>
          {showHeader && <Header onToggleSidebar={() => setIsSidebarOpen(true)} isFloating={isSearchPage} />}
        </Suspense>
        <main id="main-content" className={`flex flex-col flex-grow overflow-x-hidden ${isFullHeightView ? 'overflow-y-hidden' : 'overflow-y-auto'}`}>
          <AppRoutes onToggleSidebar={() => setIsSidebarOpen(true)} />
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
        {state.isSubscriptionModalOpen && (
          <SubscriptionModal
            isOpen={state.isSubscriptionModalOpen}
            onClose={() => dispatch({ type: 'TOGGLE_SUBSCRIPTION_MODAL', payload: { isOpen: false } })}
            initialEmail={state.subscriptionEmail || undefined}
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
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize language from URL on first load
    initializeLanguageFromUrl();
  }, []);

  useEffect(() => {
    // Check for OAuth callback parameters in URL
    const urlParams = new URLSearchParams(location.search);
    const token = urlParams.get('token');
    const refreshToken = urlParams.get('refresh');
    const error = urlParams.get('error');

    // Check if this is a page that uses 'token' param for non-OAuth purposes
    const isTokenUsedPage = location.pathname.includes('reset-password') ||
      location.pathname.includes('verify-email');

    // Only process as OAuth callback if NOT on a page that uses token for other purposes
    if (!isTokenUsedPage) {
      // SECURITY: Immediately clean up URL to remove OAuth tokens from browser history
      if (token || refreshToken || error) {
        navigate(location.pathname, { replace: true });
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

    // Normal auth check
    checkAuthStatus();
  }, [checkAuthStatus, handleOAuthCallback, dispatch, location.pathname, location.search, navigate]);

  if (state.isAuthenticating) {
    return <FullScreenLoader />;
  }

  // Allow password reset and email verification pages to bypass onboarding and verification check
  const isAuthFlowPage = location.pathname.includes('reset-password') ||
    location.pathname.includes('verify-email');

  // Check if user needs to verify their email
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

  if (!state.onboardingComplete && !isAuthFlowPage) {
    return (
      <>
        <Suspense fallback={<FullScreenLoader />}>
          <Onboarding />
        </Suspense>
        <Suspense fallback={null}>
          {state.isAuthModalOpen && <AuthPage />}
        </Suspense>
      </>
    );
  }

  return (
    <>
      <MainLayout />
      <Suspense fallback={null}>
        {state.isAuthModalOpen && <AuthPage />}
        <CookieConsent />
      </Suspense>
    </>
  );
};

const App: React.FC = () => {
  // Get analytics IDs from environment variables
  const googleAnalyticsId = import.meta.env.VITE_GA_ID;
  const facebookPixelId = import.meta.env.VITE_FB_PIXEL_ID;

  return (
    <ErrorBoundary level="app">
      <HelmetProvider>
        <QueryProvider>
          <BrowserRouter>
            <AppProvider>
              <AlertProvider>
                <NotificationProvider>
                  <ConfirmationProvider>
                    {/* Lazy loaded SEO & Analytics components */}
                    <Suspense fallback={null}>
                      <SEO />
                      <OrganizationSchema />
                      <FAQSchema faqs={realEstateFAQs} />
                      {(googleAnalyticsId || facebookPixelId) && (
                        <Analytics
                          googleAnalyticsId={googleAnalyticsId}
                          facebookPixelId={facebookPixelId}
                        />
                      )}
                      <ClarityInit />
                    </Suspense>

                    <AppWrapper />
                  </ConfirmationProvider>
                </NotificationProvider>
              </AlertProvider>
            </AppProvider>
          </BrowserRouter>
        </QueryProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;
