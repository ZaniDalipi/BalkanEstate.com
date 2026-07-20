import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense, startTransition, useReducer } from 'react';
import { useSubscriptionExpiry } from './src/features/subscription/hooks/useSubscriptionExpiry';
import { useTranslation } from 'react-i18next';
// Page transitions use lightweight CSS instead of framer-motion to reduce initial bundle
import { HelmetProvider, Helmet } from 'react-helmet-async';
import { MotionConfig } from 'framer-motion';
import { AppProvider, useAppContext } from './context/AppContext';
import { tokenService } from './src/shared/api/tokenService';
import { AlertProvider } from './context/AlertContext';
import { ConfirmationProvider } from './src/shared/hooks/useConfirmation';
import { NotificationProvider } from './src/shared/hooks/useNotification';
import { QueryProvider } from './src/app/providers/QueryProvider';
import { ListingIngestProgressProvider } from './src/features/listing-sources/context/ListingIngestProgressContext';
import ListingIngestDock from './src/features/listing-sources/components/ListingIngestDock';
import { ErrorBoundary } from './src/app/components/ErrorBoundary';
import { QueryErrorBoundary } from './src/app/components/QueryErrorBoundary';
import { AnimationProvider } from './src/components/ui/Animations';
import { ViewTransition, NavigationProvider } from './src/components/ui/ViewTransition';
import { useZoomCompensation } from './src/app/hooks/useZoomCompensation';
import { usePWALinkInterceptor } from './src/shared/hooks/usePWALinkInterceptor';
// Lazy load SEO components (don't block initial render)
const SEO = lazy(() => import('./src/components/seo').then(m => ({ default: m.SEO })));
const OrganizationSchema = lazy(() => import('./src/components/seo').then(m => ({ default: m.OrganizationSchema })));
const FAQSchema = lazy(() => import('./src/components/seo').then(m => ({ default: m.FAQSchema })));
import { realEstateFAQs } from './src/components/seo';

// Lazy load Analytics (only loads if env vars exist)
const Analytics = lazy(() => import('./src/components/marketing/Analytics'));
import { UserRole, HowItWorksTab, AdminSection, AgencyDashboardSection, Agency, AppView } from './types';
import { API_CONFIG, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, ROUTES, HOW_IT_WORKS_TABS, ADMIN_SECTIONS, AGENCY_DASHBOARD_SECTIONS } from './src/shared/constants/app.constants';

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

// Initialize security measures (clickjacking protection, console warning, dev tools)
import { initSecurity } from './src/utils/security';
initSecurity();

// Language routing utilities
import { parseLanguageFromPath, initializeLanguageFromUrl, buildLocalizedPath } from './src/utils/languageRouting';

// Stale-deploy chunk recovery (unregister SW + clear caches + reload once)
import { recoverFromStaleChunk } from './src/utils/chunkRecovery';

// Retry wrapper for lazy imports — handles stale chunk hashes after deployments.
// A stale build requests a chunk whose hashed filename no longer exists; the SPA
// fallback then returns index.html (text/html) and the module fails to parse. We
// retry once for a transient blip, then hand off to recoverFromStaleChunk, which
// tears down the service worker + caches and reloads to a clean bundle (the only
// thing that reliably fixes a precached-SW stale HTML).
function lazyWithRetry(importFn: () => Promise<{ default: React.ComponentType<any> }>) {
  return lazy(() =>
    importFn().catch(() =>
      importFn().catch((err) => {
        void recoverFromStaleChunk();
        throw err;
      })
    )
  );
}

// Core layout components (lazy loaded - can render after initial paint)
const Sidebar = lazyWithRetry(() => import('./components/shared/Sidebar'));
const Header = lazyWithRetry(() => import('./components/shared/Header'));


// Lazy load all pages and conditional components to reduce initial bundle
const SearchPage = lazy(() => import('./src/features/search/components').then(m => ({ default: m.SearchPage })));
const AuthPage = lazyWithRetry(() => import('./src/features/auth/components/AuthModal'));
const EmailVerificationRequired = lazyWithRetry(() => import('./src/features/auth/components/EmailVerificationRequired'));
const AlertDialog = lazy(() => import('./components/shared/AlertDialog'));
const SessionExpiredModal = lazyWithRetry(() => import('./src/features/auth/components/SessionExpiredModal'));
const SubscriptionExpiryModals = lazy(() => import('./src/features/subscription/components/SubscriptionExpiryModals'));

// Lazy loaded components (loaded on demand)
// All these components use default exports
const CityRecommendations = lazy(() => import('./src/features/cities/components/CityRecommendations'));
const CityDashboard = lazy(() => import('./src/features/cities/components/CityDashboard'));
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
const AgencyDashboardPage = lazy(() => import('./src/features/agency-dashboard/components/AgencyDashboardPage'));
const NotFoundPage = lazy(() => import('./src/components/ui/not-found-2').then(m => ({ default: m.NotFound })));
const ResetPasswordPage = lazyWithRetry(() => import('./src/features/auth/components/ResetPasswordPage'));
const VerifyEmailPage = lazyWithRetry(() => import('./src/features/auth/components/VerifyEmailPage'));
// LoginPage and RegisterPage are no longer used as standalone pages.
// The /login and /register routes now open the AuthModal over the search page.
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
const BuyingGuidesPage = lazy(() => import('./src/features/guides/components/BuyingGuidesPage'));
const HomePage = lazyWithRetry(() => import('./src/features/home/components/HomePage'));
const StickyAdBanner = lazyWithRetry(() => import('./src/features/ads/components/AdBannerSlot'));
const BusinessDirectoryPage = lazy(() => import('./src/features/business-directory/components/BusinessDirectoryPage'));
const BlogPage = lazy(() => import('./src/features/blog/components/BlogPage'));
const ArticlePage = lazy(() => import('./src/features/blog/components/ArticlePage'));

// Agency creation pages
const CreateAgencyPage = lazy(() => import('./src/features/agencies/components/CreateAgencyPage'));
const AgencyPaymentPage = lazy(() => import('./src/features/agencies/components/AgencyPaymentPage'));

// Google Maps API is deferred - only loads when map pages are visited (see MapComponent.tsx)

// Cookie Consent Banner (lazy loaded - shown after initial render)
const ConsentBanner = lazy(() => import('./src/shared/components/ConsentBanner'));
const PushNotificationPrompt = lazy(() => import('./src/features/notifications/components/PushNotificationPrompt'));

// Splash screen (lazy loaded - shown on initial app load to hide loading)
const SplashScreen = lazy(() => import('./src/components/ui/SplashScreen'));

// Global liquid glass SVG filter (needed for glass buttons & controls)
import { LiquidGlassFilter } from './components/ui/liquid-glass-button';
import { LogoLoader } from './src/shared/components/ui/LogoLoader';

// PWA Install Prompt (lazy loaded)
const PWAInstallPrompt = lazy(() => import('./src/shared/components/PWAInstallPrompt'));

// Microsoft Clarity - Heatmaps & Session Recordings (lazy loaded)
const ClarityInit = lazy(() => import('./src/app/components/ClarityInit'));

// Loading fallback component with animated logo
const PageLoader: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[50vh]">
    <LogoLoader size="md" showText={false} />
  </div>
);

const AppContent: React.FC<{ onToggleSidebar: () => void }> = ({ onToggleSidebar }) => {
  const { state, dispatch } = useAppContext();
  const { t } = useTranslation('common');
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [isLoadingAgency, setIsLoadingAgency] = useState(false);
  const [isLoadingPropertyFromUrl, setIsLoadingPropertyFromUrl] = useState(false);

  // In PWA standalone mode, intercept <a href> clicks to internal pages so the
  // OS never opens a second browser window — navigation stays within the app.
  usePWALinkInterceptor();

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
      // Wrap routing dispatches in startTransition to avoid blocking user interactions
      startTransition(() => { checkUrlForRoutingInner(); });
    };
    const checkUrlForRoutingInner = () => {
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
        // Show loader immediately so we don't flash the home page
        setIsLoadingPropertyFromUrl(true);

        // Fetch property from API to ensure we have full data
        fetch(`${API_CONFIG.BASE_URL}/properties/${propertyId}`)
          .then(res => {
            if (!res.ok) {
              throw new Error(`Property not found (${res.status})`);
            }
            return res.json();
          })
          .then(data => {
            setIsLoadingPropertyFromUrl(false);
            if (data.property) {
              // Transform backend property to frontend format
              // Backend now returns obfuscated `id` (not raw `_id`)
              const property = {
                ...data.property,
                id: data.property.id || data.property._id,
                sellerId: data.property.sellerId?.id || data.property.sellerId?._id || data.property.sellerId,
              };
              dispatch({ type: 'SET_SELECTED_PROPERTY_OBJECT', payload: property });
            } else {
              dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'not-found' });
            }
          })
          .catch(() => {
            setIsLoadingPropertyFromUrl(false);
            dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
            dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'not-found' });
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
              // Transform backend property to frontend format (backend now uses obfuscated id)
              const property = {
                ...data.property,
                id: data.property.id || data.property._id,
                sellerId: data.property.sellerId?.id || data.property.sellerId?._id || data.property.sellerId,
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

      // Business directory tab routes: /business-directory/businesses, /business-directory/individuals
      if (path === '/business-directory/businesses') {
        dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
        dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
        dispatch({ type: 'SET_SELECTED_BUSINESS_LISTING', payload: null });
        dispatch({ type: 'SET_BUSINESS_DIRECTORY_TAB', payload: 'businesses' });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'business-directory' });
        return;
      }
      if (path === '/business-directory/individuals') {
        dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
        dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
        dispatch({ type: 'SET_SELECTED_BUSINESS_LISTING', payload: null });
        dispatch({ type: 'SET_BUSINESS_DIRECTORY_TAB', payload: 'individuals' });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'business-directory' });
        return;
      }

      // Business directory detail route: /business-directory/:slugOrId
      // Supports SEO slugs like "company-name-category-in-city_EncodedId" and plain encoded IDs
      const businessMatch = path.match(/^\/business-directory\/(.+)$/);
      if (businessMatch) {
        const rawParam = decodeURIComponent(businessMatch[1]);
        // Extract the encoded ID from slug suffix (after last underscore), or use the full param
        const underscoreIdx = rawParam.lastIndexOf('_');
        const listingId = underscoreIdx > 0 ? rawParam.slice(underscoreIdx + 1) : rawParam;
        dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
        dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
        dispatch({ type: 'SET_SELECTED_BUSINESS_LISTING', payload: listingId });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'business-directory' });
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

      // Redirect legacy /settings/notifications to /account/notifications
      if (path === '/settings/notifications' || path === '/settings/notifications/') {
        dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
        dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
        dispatch({ type: 'SET_ACCOUNT_TAB', payload: 'notifications' });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' });
        window.history.replaceState(null, '', '/account/notifications');
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

      // Agency dashboard routes with section support: /agency-dashboard/:section
      const agencyDashboardMatch = path.match(/^\/agency-dashboard(?:\/(.+))?$/);
      if (agencyDashboardMatch) {
        const section = agencyDashboardMatch[1] || 'overview';
        const validSection: AgencyDashboardSection = AGENCY_DASHBOARD_SECTIONS.includes(section as typeof AGENCY_DASHBOARD_SECTIONS[number])
          ? section as AgencyDashboardSection
          : 'overview';
        dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
        dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
        dispatch({ type: 'SET_AGENCY_DASHBOARD_SECTION', payload: validSection });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agency-dashboard' });
        return;
      }

      // City dashboard route: /explore-cities/:city/:country
      const cityDashboardMatch = path.match(/^\/explore-cities\/([^/]+)\/([^/]+)$/);
      if (cityDashboardMatch) {
        dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
        dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'city-dashboard' });
        return;
      }

      // Blog article route: /blog/:slug
      const blogArticleMatch = path.match(/^\/blog\/(.+)$/);
      if (blogArticleMatch && path !== '/blog') {
        dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
        dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'blog' });
        return;
      }

      // Main navigation routes
      const routeMap: Record<string, AppView> = {
        '/': 'home',
        '/home': 'home',
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
        '/guides': 'guides',
        '/business-directory': 'business-directory',
        '/blog': 'blog',
        '/rent': 'rentals',
        '/rentals': 'rentals',
        '/create-agency': 'createAgency',
        '/create-agency/payment': 'createAgencyPayment',
        '/create-agency/confirm': 'createAgencyConfirm',
      };

      // /auth/callback is handled by AppWrapper's OAuth useEffect — preserve the URL and token
      if (path === '/auth/callback') {
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
        return;
      }

      // /login and /register open the AuthModal over the search page
      if (path === '/login' || path === '/register') {
        dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
        dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
        dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: path === '/register' ? 'signup' : 'login' } });
        return;
      }

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
        // Clear selected business listing when navigating to directory list (not detail)
        if (view === 'business-directory') {
          dispatch({ type: 'SET_SELECTED_BUSINESS_LISTING', payload: null });
        }
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: view });
      } else {
        // Unknown route - redirect to landing page
        dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
        dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'home' });
        window.history.replaceState({}, '', buildLocalizedPath('/'));
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
          const token = tokenService.getAccessToken();
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
    // Reset any browser zoom that was triggered by focused inputs (iOS auto-zoom)
    const viewport = document.querySelector('meta[name=viewport]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover');
      setTimeout(() => {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
      }, 300);
    }

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

  // Also scroll to top when selected property, agency, or business listing changes
  useEffect(() => {
    if (state.selectedProperty || state.selectedAgencyId || state.selectedBusinessListingId) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

      // Also scroll main content container
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.scrollTop = 0;
      }
    }
  }, [state.selectedProperty, state.selectedAgencyId, state.selectedBusinessListingId]);

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

  // Show loader while fetching property from a direct URL (prevents home page flash)
  if (isLoadingPropertyFromUrl) {
    return <PageLoader />;
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
          <LogoLoader size="md" showText={true} />
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

  // Show email verification required before any other view (highest priority)
  if (state.pendingEmailVerification) {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <LogoLoader size="md" showText={false} />
        </div>
      }>
        <EmailVerificationRequired email={state.pendingEmailVerification} />
      </Suspense>
    );
  }

  // Wrap lazy loaded views in Suspense
  const renderView = () => {
    switch (state.activeView) {
      case 'home':
        return <QueryErrorBoundary><HomePage onToggleSidebar={onToggleSidebar} /></QueryErrorBoundary>;
      case 'explore-cities':
        return <CityRecommendations />;
      case 'city-dashboard':
        return <CityDashboard />;
      case 'saved-searches':
        return <><Helmet><meta name="robots" content="noindex, nofollow" /></Helmet><SavedSearchesPage /></>;
      case 'saved-properties':
        return <><Helmet><meta name="robots" content="noindex, nofollow" /></Helmet><SavedPropertiesPage /></>;
      case 'inbox':
        return <><Helmet><meta name="robots" content="noindex, nofollow" /></Helmet><InboxPage /></>;
      case 'account':
        return <><Helmet><meta name="robots" content="noindex, nofollow" /></Helmet><MyAccountPage /></>;
      case 'create-listing':
        return <><Helmet><meta name="robots" content="noindex, nofollow" /></Helmet><CreateListingPage /></>;
      case 'rentals':
        return <QueryErrorBoundary><RentalSearchPage onToggleSidebar={onToggleSidebar} /></QueryErrorBoundary>;
      case 'create-rental':
        return <><Helmet><meta name="robots" content="noindex, nofollow" /></Helmet><CreateListingPage /></>;
      case 'agents':
        return <QueryErrorBoundary><AgentsPage /></QueryErrorBoundary>;
      case 'agencies':
        return <QueryErrorBoundary><AgenciesListPage /></QueryErrorBoundary>;
      case 'business-directory':
        return <QueryErrorBoundary><BusinessDirectoryPage selectedListingId={state.selectedBusinessListingId} /></QueryErrorBoundary>;
      case 'admin':
        // Only load admin dashboard for admin/super_admin users
        if (state.currentUser?.role === UserRole.ADMIN || state.currentUser?.role === UserRole.SUPER_ADMIN) {
          return <><Helmet><meta name="robots" content="noindex, nofollow" /></Helmet><QueryErrorBoundary><AdminDashboard /></QueryErrorBoundary></>;
        }
        // Redirect non-admins to search
        return <SearchPage onToggleSidebar={onToggleSidebar} />;
      case 'agency-dashboard':
        // Only load agency dashboard for authenticated users (component handles owner/admin check)
        if (state.isAuthenticated) {
          return <><Helmet><meta name="robots" content="noindex, nofollow" /></Helmet><QueryErrorBoundary><AgencyDashboardPage /></QueryErrorBoundary></>;
        }
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
      case 'guides':
        return <BuyingGuidesPage />;
      case 'blog':
        return <QueryErrorBoundary><BlogPage /></QueryErrorBoundary>;
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
  // Direction-aware page transitions (slide, morph, blur dissolve)
  return (
    <ViewTransition viewKey={viewKey}>
      <ErrorBoundary level="route" key={state.activeView}>
        <Suspense fallback={<PageLoader />}>
          {renderView()}
        </Suspense>
      </ErrorBoundary>
    </ViewTransition>
  );
};

const MainLayout: React.FC = () => {
  const { state, dispatch, updateUser, createListing } = useAppContext();
  const { t, i18n } = useTranslation(['nav', 'common']);
  const currentLang = (i18n.language || 'en').split('-')[0];
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Subscription expiry modals
  const userId = state.currentUser?.id || state.currentUser?._id || state.currentUser?.email || '';
  const {
    expiryInfo,
    refetch: refetchExpiry,
    expiredPhase,
    dismissExpiredModal,
    dismissExpiredModalFinal,
    clearExpiredModal,
  } = useSubscriptionExpiry(state.isAuthenticated, userId);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => startTransition(() => setIsMobile(window.innerWidth < 768));
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const isSearchPage = state.activeView === 'search';
  const isRentalPage = state.activeView === 'rentals';
  const isFloatingHeaderView = true;
  const isAgencyDetailView = !!state.selectedAgencyId;
  // Agency pages should allow scrolling to show all agents and details
  const isFullHeightView = isSearchPage || isRentalPage || state.activeView === 'inbox' || !!state.selectedProperty;
  // On mobile: floating header hidden, PWA top bar handles navigation
  // On desktop: floating header shown (except property details which has its own)
  // Agency dashboard has its own full header bar (Browse Properties / Back to Agency /
  // Back to Site / account), so the global floating header is suppressed there to avoid
  // it overlapping and covering those controls.
  const hasOwnHeader = state.activeView === 'agency-dashboard';
  const showHeader = !isMobile && !state.selectedProperty && !state.selectedAgentId && !state.selectedAgencyId && !state.selectedBusinessListingId && !hasOwnHeader;

  // PWA top bar: shown on mobile for internal pages only
  // NOT shown on: search/rental (have their own search headers), property details (has its own header)
  const isHomeView = state.activeView === 'home';
  const isHomePage = isSearchPage || isRentalPage || isHomeView;
  const showPWATopBar = isMobile && !state.selectedProperty && !state.selectedBusinessListingId && !isHomePage;

  // Main tab views show hamburger menu; detail views show back button
  const isMainTabView = !state.selectedAgentId && !state.selectedAgencyId && !state.selectedBusinessListingId && [
    'agents', 'agencies', 'saved-properties', 'saved-searches', 'explore-cities', 'city-dashboard',
    'inbox', 'pricing', 'how-it-works', 'valuation', 'mortgage-calculator', 'analytics', 'admin', 'agency-dashboard', 'business-directory',
    'account', 'blog', 'guides',
  ].includes(state.activeView);


  // Map activeView to readable page title
  const pageTitle = useMemo(() => {
    if (state.selectedAgencyId) return t('nav:pageTitles.agency');
    if (state.selectedAgentId) return t('nav:pageTitles.agent');
    const titleKeys: Record<string, string> = {
      home: 'nav:pageTitles.home',
      search: 'nav:pageTitles.search',
      rentals: 'nav:pageTitles.rentals',
      inbox: 'nav:pageTitles.inbox',
      account: 'nav:pageTitles.account',
      'saved-properties': 'nav:pageTitles.savedProperties',
      'saved-searches': 'nav:pageTitles.savedSearches',
      agents: 'nav:pageTitles.agents',
      agencies: 'nav:pageTitles.agencies',
      'business-directory': 'nav:pageTitles.businessDirectory',
      pricing: 'nav:pageTitles.pricing',
      'create-listing': 'nav:pageTitles.createListing',
      'edit-listing': 'nav:pageTitles.editListing',
      'explore-cities': 'nav:pageTitles.exploreCities',
      'city-dashboard': 'nav:pageTitles.cityDashboard',
      'how-it-works': 'nav:pageTitles.howItWorks',
      analytics: 'nav:pageTitles.analytics',
      admin: 'nav:pageTitles.admin',
      'agency-dashboard': 'nav:pageTitles.agencyDashboard',
      valuation: 'nav:pageTitles.valuation',
      'mortgage-calculator': 'nav:pageTitles.mortgageCalculator',
      blog: 'nav:pageTitles.blog',
      guides: 'nav:pageTitles.guides',
    };
    const key = titleKeys[state.activeView];
    return key ? t(key) : t('nav:pageTitles.default');
  }, [state.activeView, state.selectedAgencyId, state.selectedAgentId, t]);

  const handlePWABack = useCallback(() => {
    // Clear any detail selections
    if (state.selectedAgencyId) {
      dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencies' });
      window.history.pushState({}, '', buildLocalizedPath('/agencies'));
      return;
    }
    if (state.selectedAgentId) {
      dispatch({ type: 'SET_SELECTED_AGENT', payload: null });
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agents' });
      window.history.pushState({}, '', buildLocalizedPath('/agents'));
      return;
    }
    if (state.selectedBusinessListingId) {
      dispatch({ type: 'SET_SELECTED_BUSINESS_LISTING', payload: null });
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'business-directory' });
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.history.pushState({}, '', buildLocalizedPath('/business-directory'));
      }
      return;
    }
    // Use browser history for proper back navigation
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback: go to search (home)
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
      window.history.pushState({}, '', buildLocalizedPath('/search'));
    }
  }, [state.selectedAgencyId, state.selectedAgentId, state.selectedBusinessListingId, dispatch]);

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
    <div className="min-h-screen bg-white font-sans overflow-x-hidden max-w-full" style={{ height: '100dvh', WebkitTapHighlightColor: 'transparent' }}>
        <Suspense fallback={null}>
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        </Suspense>

        {/* Mobile floating hamburger for home page — rendered outside all scroll/overflow containers
            so position:fixed works correctly in iOS Safari PWA standalone mode */}
        {isMobile && isHomeView && !state.selectedProperty && !state.selectedAgentId && !state.selectedAgencyId && !state.selectedBusinessListingId && (
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden fixed z-[200] bg-white/90 backdrop-blur-md rounded-full p-2.5 shadow-lg border border-neutral-200/60 active:scale-95 transition-transform"
            style={{
              top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
              left: 'calc(env(safe-area-inset-left, 0px) + 12px)',
            }}
            aria-label={t('common:aria.openMenu', 'Open menu')}
          >
            <svg className="w-5 h-5 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        )}

        <div className={`relative transition-all duration-300 ease-in-out h-full flex flex-col md:pl-20 overflow-x-hidden max-w-full ${isOverlayVisible ? 'blur-sm pointer-events-none' : ''}`}>
            <Suspense fallback={null}>
              {showHeader && <Header onToggleSidebar={() => setIsSidebarOpen(true)} isFloating={isFloatingHeaderView} />}
            </Suspense>

            {/* PWA Top Bar - mobile navigation bar with back button and title */}
            {showPWATopBar && (
              <div
                className="bg-white/95 backdrop-blur-md border-b border-neutral-200/60 flex-shrink-0 z-20"
                style={{
                  paddingTop: 'env(safe-area-inset-top, 0px)',
                  paddingLeft: 'env(safe-area-inset-left, 0px)',
                  paddingRight: 'env(safe-area-inset-right, 0px)',
                }}
              >
                <div className="grid grid-cols-[auto_1fr_auto] items-center h-11 px-1">
                  {/* Left: Hamburger menu for main tabs, Back button for detail pages */}
                  {isMainTabView ? (
                    <button
                      type="button"
                      onClick={() => setIsSidebarOpen(true)}
                      className="flex items-center justify-center min-w-[44px] min-h-[44px] text-neutral-700 active:opacity-70 transition-opacity pl-2"
                      aria-label={t('common:aria.openMenu', 'Open menu')}
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePWABack}
                      className="flex items-center gap-1 text-primary font-medium text-sm min-w-[44px] min-h-[44px] pl-2 pr-3 active:opacity-70 transition-opacity"
                      aria-label={t('common:aria.goBack')}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                      </svg>
                      <span>{t('common:back')}</span>
                    </button>
                  )}

                  {/* Center: Page title */}
                  <span className="text-sm font-semibold text-neutral-800 truncate text-center">{pageTitle}</span>

                  {/* Right: Home button - quick shortcut to search from deep navigation */}
                  <button
                    type="button"
                    onClick={() => {
                      dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
                      dispatch({ type: 'SET_SELECTED_AGENT', payload: null });
                      dispatch({ type: 'SET_SELECTED_BUSINESS_LISTING', payload: null });
                      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'home' });
                      window.history.pushState({}, '', buildLocalizedPath('/'));
                    }}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-neutral-500 active:text-primary active:opacity-70 transition-opacity pr-2"
                    aria-label={t('common:aria.goHome', 'Go to home')}
                  >
                    <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/*
              Bottom padding for non-full-height views on mobile:
              BottomNav is fixed bottom-0 (~48px tall) + safe-area-inset-bottom.
              Full-height views (search, inbox, property) handle their own internal scroll.
            */}
            <main
              id="main-content"
              data-scroll-container
              className={`relative flex flex-col flex-1 overflow-x-hidden ${isFullHeightView ? 'overflow-y-hidden h-full min-h-0' : 'overflow-y-auto'}`}
              style={!isFullHeightView && isMobile ? { paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' } : undefined}
            >
                <AppContent onToggleSidebar={() => setIsSidebarOpen(true)} />
            </main>

        </div>

        {/* Site-wide sticky advertiser banner (managed from Admin → Ad Banners).
            Hidden on property detail (mobile action bar owns the bottom) and admin. */}
        {!state.selectedProperty && state.activeView !== 'admin' && (
          <Suspense fallback={null}>
            <StickyAdBanner placement="global-sticky-bottom" />
          </Suspense>
        )}

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

        {/* Subscription Expiry Modals (warning + expired) */}
        <Suspense fallback={null}>
          {state.isAuthenticated && expiryInfo && (
            <SubscriptionExpiryModals
              expiryInfo={expiryInfo}
              expiredPhase={expiredPhase}
              onDismissWarning={refetchExpiry}
              onDismissExpired={dismissExpiredModal}
              onDismissExpiredFinal={dismissExpiredModalFinal}
              onPaymentSuccess={clearExpiredModal}
            />
          )}
        </Suspense>
    </div>
  );
};

const FullScreenLoader: React.FC = () => {
    return (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-neutral-50">
            <LogoLoader size="lg" showText={true} />
        </div>
    );
};


const AppWrapper: React.FC = () => {
    const { state, dispatch, checkAuthStatus, handleOAuthCallback } = useAppContext();
    const { t } = useTranslation('common');

    const hasVisited = useRef(localStorage.getItem('balkanestate_visited') === 'true');
    const [showSplash, setShowSplash] = useState(!hasVisited.current);

    // Read synchronously during render — avoids a one-frame flash of the main layout.
    // login()/signup()/handleOAuthCallback() set this key BEFORE dispatching state
    // changes, so by the time React re-renders AppWrapper the flag is already true.
    const justAuthed = sessionStorage.getItem('balkanestate_just_authed') === 'true';
    const shouldShowSplash = showSplash || justAuthed;

    // Used to guarantee a re-render after handleSplashComplete even when showSplash
    // was already false (returning users). Without this, setShowSplash(false) is a
    // no-op and React never re-reads justAuthed from sessionStorage, leaving the app
    // stuck behind the 0.01-opacity overlay with no splash visible.
    const [, forceUpdate] = useReducer((n: number) => n + 1, 0);

    const handleSplashComplete = useCallback(() => {
        setShowSplash(false);
        // Clear the post-login flag so subsequent renders don't re-trigger the splash
        sessionStorage.removeItem('balkanestate_just_authed');
        // Always increment so React re-renders even when showSplash was already false
        forceUpdate();
        localStorage.setItem('balkanestate_visited', 'true');
        (window as any).__balkanestateSplashDone = Date.now();
    }, [forceUpdate]);

    // Monitor user's email verification status and clear pending verification when verified
    useEffect(() => {
        if (state.pendingEmailVerification && state.currentUser?.isEmailVerified) {
            // Email has been verified, clear the pending state
            dispatch({ type: 'SET_PENDING_EMAIL_VERIFICATION', payload: null });
        }
    }, [state.currentUser?.isEmailVerified, state.pendingEmailVerification, dispatch]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const refreshToken = urlParams.get('refresh');
        const error = urlParams.get('error');
        const pathname = window.location.pathname;

        // OAuth tokens are ONLY valid when the backend has redirected to /auth/callback.
        // Restricting to this path prevents arbitrary ?token= params on other pages
        // (e.g. crafted phishing links) from being processed as OAuth credentials.
        const isOAuthCallback = pathname.includes('auth/callback');

        // reset-password and verify-email also use a ?token= param for different purposes.
        const isTokenUsedPage = pathname.includes('reset-password') ||
                                pathname.includes('verify-email');

        if (isOAuthCallback && !isTokenUsedPage) {
            // SECURITY: Strip OAuth params from URL immediately so they don't appear
            // in browser history, server logs, or leak via the Referer header.
            if (token || refreshToken || error) {
                window.history.replaceState({}, document.title, pathname);
            }

            if (error) {
                dispatch({
                    type: 'SHOW_ALERT',
                    payload: {
                        type: 'error',
                        title: t('common:errors.authFailed'),
                        message: t('common:errors.authFailedMessage'),
                    },
                });
                return;
            }

            if (token) {
                handleOAuthCallback(token, refreshToken || undefined);
                return;
            }
        }

        // Normal auth check for all other pages
        checkAuthStatus();
    }, [checkAuthStatus, handleOAuthCallback, dispatch]);

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

    // Determine app body — always rendered at the same position in the tree so that
    // the splash screen (rendered as an overlay below) never causes MainLayout to
    // unmount/remount. Previously the hidden-div + conditional-return pattern caused
    // MainLayout to live in a different DOM position before vs after the splash,
    // which made React tear it down and rebuild it — appearing as a ~10 s "restart".
    let appBody: React.ReactNode;
    if (state.isAuthenticating) {
        appBody = <FullScreenLoader />;
    } else if (state.pendingEmailVerification && state.currentUser?.isEmailVerified === false) {
        appBody = (
            <Suspense fallback={<FullScreenLoader />}>
                <EmailVerificationRequired email={state.pendingEmailVerification} />
            </Suspense>
        );
    } else if (needsEmailVerification && state.currentUser) {
        appBody = (
            <Suspense fallback={<FullScreenLoader />}>
                <EmailVerificationRequired email={state.currentUser.email} />
            </Suspense>
        );
    } else if (state.activeView === 'not-found') {
        appBody = (
            <Suspense fallback={<FullScreenLoader />}>
                <NotFoundPage />
            </Suspense>
        );
    } else {
        appBody = (
            <>
                <MainLayout />
                <Suspense fallback={null}>
                    {state.isAuthModalOpen && <AuthPage />}
                    <ConsentBanner />
                    <PWAInstallPrompt />
                    <PushNotificationPrompt />
                </Suspense>
            </>
        );
    }

    // The splash is a fixed overlay — it never wraps or replaces appBody, so appBody
    // stays mounted in the same position the whole time and resources load during the splash.
    return (
        <>
            {appBody}
            {shouldShowSplash && !state.pendingEmailVerification && (
                <Suspense fallback={<FullScreenLoader />}>
                    <SplashScreen
                        onComplete={handleSplashComplete}
                        userName={state.currentUser?.name || state.currentUser?.email?.split('@')[0]}
                    />
                </Suspense>
            )}
        </>
    );
}

const App: React.FC = () => {
  // Compensate for browser zoom so UI remains usable at 125%+
  useZoomCompensation();

  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en').split('-')[0];

  // Get analytics IDs from environment variables
  const googleAnalyticsId = import.meta.env.VITE_GA_ID;
  const facebookPixelId = import.meta.env.VITE_FB_PIXEL_ID;

  return (
    <ErrorBoundary level="app">
      {/* reducedMotion="user" makes every framer-motion animation honor the
          OS "Reduce Motion" setting without touching each component. */}
      <MotionConfig reducedMotion="user">
      <HelmetProvider>
        <QueryProvider>
          <AppProvider>
            <AlertProvider>
              <NotificationProvider>
                <ConfirmationProvider>
                  <AnimationProvider>
                    <NavigationProvider>
                      <ListingIngestProgressProvider>
                      {/* Global SVG filter for liquid glass effects */}
                      <LiquidGlassFilter />
                      {/* Lazy loaded SEO & Analytics components (don't block initial render) */}
                      <Suspense fallback={null}>
                        <SEO />
                        <OrganizationSchema language={currentLang} />
                        <FAQSchema faqs={realEstateFAQs} language={currentLang} />
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
                      <ListingIngestDock />
                      </ListingIngestProgressProvider>
                    </NavigationProvider>
                  </AnimationProvider>
                </ConfirmationProvider>
              </NotificationProvider>
            </AlertProvider>
          </AppProvider>
        </QueryProvider>
      </HelmetProvider>
      </MotionConfig>
    </ErrorBoundary>
  );
};

export default App;