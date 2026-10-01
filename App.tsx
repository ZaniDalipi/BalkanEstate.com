import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo, lazy, Suspense, startTransition, useReducer } from 'react';
import { RouterProvider, Outlet, useLocation } from 'react-router-dom';
import { useSubscriptionExpiry } from './src/features/subscription/hooks/useSubscriptionExpiry';
import { useTranslation } from 'react-i18next';
// Page transitions use lightweight CSS instead of framer-motion to reduce initial bundle
import { HelmetProvider, Helmet } from 'react-helmet-async';
import { MotionConfig } from 'framer-motion';
import { AppProvider, useAppContext } from './context/AppContext';
import { AlertProvider } from './context/AlertContext';
import { ConfirmationProvider } from './src/shared/hooks/useConfirmation';
import { NotificationProvider } from './src/shared/hooks/useNotification';
import { QueryProvider } from './src/app/providers/QueryProvider';
import { ListingIngestProgressProvider } from './src/features/listing-sources/context/ListingIngestProgressContext';
import ListingIngestDock from './src/features/listing-sources/components/ListingIngestDock';
import { ErrorBoundary } from './src/app/components/ErrorBoundary';
import { AnimationProvider } from './src/components/ui/Animations';
import { ViewTransition } from './src/components/ui/ViewTransition';
import { takePendingScrollRestore, applyScrollSnapshot } from './src/app/navigation/navHistory';
import { preloadRouteWhenIdle } from './src/app/navigation/routePreload';
import { createAppRouter } from './src/app/router/routes';
import { navigate, goBack } from './src/app/router/navigation';
import { paths } from './src/app/router/paths';
import { useRouteView } from './src/app/router/useRouteView';
import { OpenSidebarContext } from './src/app/router/layoutContext';
import { lazyWithRetry } from './src/app/router/lazyWithRetry';
import { useZoomCompensation } from './src/app/hooks/useZoomCompensation';
import { usePWALinkInterceptor } from './src/shared/hooks/usePWALinkInterceptor';
import { useCookieConsent } from './src/shared/utils/cookieConsent';
// Lazy load SEO components (don't block initial render)
const SEO = lazy(() => import('./src/components/seo').then(m => ({ default: m.SEO })));
const OrganizationSchema = lazy(() => import('./src/components/seo').then(m => ({ default: m.OrganizationSchema })));
const FAQSchema = lazy(() => import('./src/components/seo').then(m => ({ default: m.FAQSchema })));
import { realEstateFAQs } from './src/components/seo';

// Lazy load Analytics (only loads if env vars exist)
const Analytics = lazy(() => import('./src/components/marketing/Analytics'));

// Initialize i18n
import './src/i18n';

// Initialize security measures (clickjacking protection, console warning, dev tools)
import { initSecurity } from './src/utils/security';
initSecurity();

import type { GameReward } from './components/shared/DiscountGameModal';

// Core layout components (lazy loaded - can render after initial paint)
const Sidebar = lazyWithRetry(() => import('./components/shared/Sidebar'));
const Header = lazyWithRetry(() => import('./components/shared/Header'));

// App-wide components that are not pages. Pages are declared in the route
// table (src/app/router/routes.tsx).
const AuthPage = lazyWithRetry(() => import('./src/features/auth/components/AuthModal'));
const EmailVerificationRequired = lazyWithRetry(() => import('./src/features/auth/components/EmailVerificationRequired'));
const AlertDialog = lazy(() => import('./components/shared/AlertDialog'));
const SessionExpiredModal = lazyWithRetry(() => import('./src/features/auth/components/SessionExpiredModal'));
const SubscriptionExpiryModals = lazy(() => import('./src/features/subscription/components/SubscriptionExpiryModals'));
const EnterpriseCreationForm = lazy(() => import('./src/features/seller/components/EnterpriseCreationForm'));
const ListingLimitWarningModal = lazy(() => import('./components/shared/ListingLimitWarningModal'));
const DiscountGameModal = lazy(() => import('./components/shared/DiscountGameModal'));
const StickyAdBanner = lazy(() => import('./src/features/promo/components/StickyBar'));
const AdPreviewIndicator = lazy(() => import('./src/features/promo/components/PreviewIndicator'));

// Google Maps API is deferred - only loads when map pages are visited (see MapComponent.tsx)

// Cookie Consent Banner (lazy loaded - shown after initial render)
const ConsentBanner = lazy(() => import('./src/shared/components/ConsentBanner'));
const PushNotificationPrompt = lazy(() => import('./src/features/notifications/components/PushNotificationPrompt'));

// Splash screen (lazy loaded - shown on initial app load to hide loading)
const SplashScreen = lazy(() => import('./src/components/ui/SplashScreen'));

// Global liquid glass SVG filter (needed for glass buttons & controls)
import { LiquidGlassFilter } from './components/ui/liquid-glass-button';
import { LogoLoader } from './src/shared/components/ui/LogoLoader';
import { RouteLoader } from './src/shared/components/ui/RouteLoader';

// PWA Install Prompt (lazy loaded)
const PWAInstallPrompt = lazy(() => import('./src/shared/components/PWAInstallPrompt'));

// Microsoft Clarity - Heatmaps & Session Recordings (lazy loaded)
const ClarityInit = lazy(() => import('./src/app/components/ClarityInit'));

// Route-level loading fallback. RouteLoader holds off for ~200ms so a cached
// chunk never flashes a logo on its way in, and keeps one appearance across
// every stage of a navigation.
const PageLoader: React.FC = () => <RouteLoader />;

/**
 * The page the URL names, inside the shared page chrome.
 *
 * Every route — detail pages included — renders through this one
 * ViewTransition, so the direction-aware entrance and the edge swipe-back it
 * owns apply everywhere. The ErrorBoundary is keyed by the page's identity so
 * switching pages gets a clean mount (and clears any error from the last one),
 * while a tab or section change within a page keeps it mounted.
 */
const PageOutlet: React.FC = () => {
  const { state } = useAppContext();
  const { pageKey, scrollKey, noindex } = useRouteView();

  // In PWA standalone mode, intercept <a href> clicks to internal pages so the
  // OS never opens a second browser window — navigation stays within the app.
  usePWALinkInterceptor();

  // Warm the listing detail chunk once the browser is idle. Almost every
  // session opens at least one listing, and paying for that chunk during a
  // quiet moment is the difference between a tap that renders immediately and
  // one that waits on the network first.
  useEffect(() => {
    preloadRouteWhenIdle('propertyDetails');
  }, []);

  // Scroll handling on navigation.
  //
  // Layout effect, not passive: this runs in the commit that swapped the page,
  // before the browser paints it. A passive effect paints one frame at the
  // wrong offset first — the top of a list the reader was halfway down — and a
  // paired transition can capture that frame as the arriving page, which is
  // what made going back jump after it had already animated.
  //
  // The viewport meta is deliberately left alone here: rewriting it (to undo
  // iOS input zoom) makes iOS recompute `env(safe-area-inset-*)`, which moved
  // every notch-aligned element on each navigation in the installed app.
  useLayoutEffect(() => {
    // Coming back to an entry we have offsets for: put the user where they
    // were, instead of at the top of a list they were halfway down.
    const restore = takePendingScrollRestore();
    if (restore) {
      return applyScrollSnapshot(restore);
    }

    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.scrollTop = 0;
    }
    document.querySelectorAll('[data-scroll-container]').forEach(el => {
      el.scrollTop = 0;
    });
  }, [scrollKey]);

  // Show email verification required before any page (highest priority)
  if (state.pendingEmailVerification) {
    return (
      <Suspense fallback={<PageLoader />}>
        <EmailVerificationRequired email={state.pendingEmailVerification} />
      </Suspense>
    );
  }

  return (
    <ViewTransition>
      <ErrorBoundary level="route" key={pageKey}>
        {noindex && (
          <Helmet>
            <meta name="robots" content="noindex, nofollow" />
          </Helmet>
        )}
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
    </ViewTransition>
  );
};

/**
 * Site-wide head tags and analytics. Inside the router so they re-render — and
 * analytics records a page view — on every navigation, not only on the
 * browser's back and forward buttons.
 */
const GlobalHead: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en').split('-')[0];
  const { pathname } = useLocation();

  // Get analytics IDs from environment variables
  const googleAnalyticsId = import.meta.env.VITE_GA_ID;
  const facebookPixelId = import.meta.env.VITE_FB_PIXEL_ID;

  // Analytics and marketing tags may only load once the user has consented to
  // that category — they are not strictly necessary, so they need prior consent.
  const cookieConsent = useCookieConsent();

  return (
    <Suspense fallback={null}>
      <SEO key={pathname} />
      <OrganizationSchema language={currentLang} />
      <FAQSchema faqs={realEstateFAQs} language={currentLang} />
      {/* Analytics - only loaded if IDs are provided AND the user consented */}
      {((googleAnalyticsId && cookieConsent.analytics) ||
        (facebookPixelId && cookieConsent.marketing)) && (
        <Analytics
          googleAnalyticsId={cookieConsent.analytics ? googleAnalyticsId : undefined}
          facebookPixelId={cookieConsent.marketing ? facebookPixelId : undefined}
        />
      )}
      {/* Microsoft Clarity - Heatmaps & Session Recordings (analytics consent) */}
      {cookieConsent.analytics && <ClarityInit />}
    </Suspense>
  );
};

const MainLayout: React.FC = () => {
  const { state, dispatch, checkAuthStatus } = useAppContext();
  const { t } = useTranslation(['nav', 'common']);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);

  // Which page is on screen comes from the matched route, never from state.
  const { view, detail } = useRouteView();
  const isPropertyDetail = detail === 'property';
  const isAgentDetail = detail === 'agent';
  const isAgencyDetail = detail === 'agency';
  const isBusinessDetail = detail === 'business-listing';

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
  
  const isSearchPage = view === 'search';
  const isRentalPage = view === 'rentals';
  const isVillaPage = view === 'villas';
  const isFloatingHeaderView = true;
  // Agency pages should allow scrolling to show all agents and details
  const isFullHeightView = isSearchPage || isRentalPage || isVillaPage || view === 'inbox' || isPropertyDetail;
  // On mobile: floating header hidden, PWA top bar handles navigation
  // On desktop: floating header shown (except property details which has its own)
  // Agency dashboard has its own full header bar (Browse Properties / Back to Agency /
  // Back to Site / account), so the global floating header is suppressed there to avoid
  // it overlapping and covering those controls.
  const hasOwnHeader = view === 'agency-dashboard';
  const showHeader = !isMobile && !isPropertyDetail && !isAgentDetail && !isAgencyDetail && !isBusinessDetail && !hasOwnHeader;

  // PWA top bar: shown on mobile for internal pages only
  // NOT shown on: search/rental (have their own search headers), property details (has its own header)
  const isHomeView = view === 'home';
  const isHomePage = isSearchPage || isRentalPage || isVillaPage || isHomeView;
  const showPWATopBar = isMobile && !isPropertyDetail && !isBusinessDetail && !isHomePage;

  // Main tab views show hamburger menu; detail views show back button
  const isMainTabView = !isAgentDetail && !isAgencyDetail && !isBusinessDetail && [
    'agents', 'agencies', 'saved-properties', 'saved-searches', 'explore-cities', 'city-dashboard',
    'inbox', 'pricing', 'how-it-works', 'valuation', 'mortgage-calculator', 'analytics', 'admin', 'agency-dashboard', 'business-directory',
    'account', 'blog', 'guides',
  ].includes(view);

  // Map the current view to an ad-banner "page" so advertisers can target placements.
  // Admin / dashboard / auth / checkout style views never show ads.
  const adPage = useMemo<import('./src/features/promo/types').AdPage | null>(() => {
    if (isPropertyDetail) return 'property-details';
    if (view === 'agents') return 'agents';
    if (view === 'agencies') return 'agencies';
    switch (view) {
      case 'home': return 'home';
      case 'search': return 'search';
      case 'rentals': return 'rentals';
      case 'villas': return 'villas';
      case 'business-directory': return 'business-directory';
      case 'blog': return 'blog';
      case 'guides': return 'guides';
      // Views where ads would be intrusive or out of place.
      case 'admin':
      case 'agency-dashboard':
      case 'inbox':
      case 'account':
      case 'create-listing':
      case 'create-rental':
      case 'analytics':
      case 'reset-password':
      case 'verify-email':
      case 'createAgency':
      case 'createAgencyPayment':
      case 'createAgencyConfirm':
      case 'not-found':
        return null;
      default: return 'all';
    }
  }, [view, isPropertyDetail]);


  // Map activeView to readable page title
  const pageTitle = useMemo(() => {
    if (isAgencyDetail) return t('nav:pageTitles.agency');
    if (isAgentDetail) return t('nav:pageTitles.agent');
    const titleKeys: Record<string, string> = {
      home: 'nav:pageTitles.home',
      search: 'nav:pageTitles.search',
      rentals: 'nav:pageTitles.rentals',
      villas: 'nav:pageTitles.villas',
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
    const key = titleKeys[view];
    return key ? t(key) : t('nav:pageTitles.default');
  }, [view, isAgencyDetail, isAgentDetail, t]);

  const handlePWABack = useCallback(() => {
    // Step back through history whenever there is an in-app entry to step back
    // to, like the platform's own back button. Opened straight onto a detail
    // page (a shared link, a fresh install) there is nothing behind it, so fall
    // back to its parent list, animated as a step back.
    const parent = isAgencyDetail
      ? paths.agencies()
      : isAgentDetail
        ? paths.agents()
        : isBusinessDetail
          ? paths.businessDirectory()
          : paths.search();
    goBack(parent);
  }, [isAgencyDetail, isAgentDetail, isBusinessDetail]);

  const anyNonAuthModalOpen = state.isListingLimitWarningOpen || state.isDiscountGameOpen;

  /*
   * Two different things used to be one flag.
   *
   * A modal needs the page behind it pushed back, and `blur-sm` on this
   * container is how that is done. The mobile drawer does not: it already has a
   * full-viewport scrim with `backdrop-blur-sm` over exactly this content, so
   * blurring the content as well rendered the same pixels through two blur
   * passes — one of them animated, since this container transitions — on every
   * open and every close. On a phone that is the most expensive thing happening
   * during a navigation, and it happens while the arriving page is mounting.
   *
   * The scrim is left to do the blurring for the drawer. It looks the same; it
   * costs half as much, and the half that is gone is the half on the layer the
   * new page renders into.
   */
  const isBlurredBehindModal = state.isAuthModalOpen || anyNonAuthModalOpen;

  const isOverlayVisible =
    isBlurredBehindModal ||
    (isMobile && isSidebarOpen);


  const navigateToPricing = () => navigate(paths.pricing());
  
  const handleWarningConfirm = () => {
    dispatch({ type: 'TOGGLE_LISTING_LIMIT_WARNING', payload: false });
    dispatch({ type: 'TOGGLE_DISCOUNT_GAME', payload: true });
  };

  // Users already paying for listings win bonus listings; everyone else wins a discount code.
  // Mirrors the backend rule in propertyController / gameRewardController.
  const listingSubscription = state.currentUser?.subscription;
  const listingTier = listingSubscription?.tier || 'free';
  const isListingSubscriber = !!(
    (state.currentUser?.subscriptionPlan || listingSubscription?.plan) &&
    ['pro', 'agency_agent', 'agency_owner'].includes(listingTier)
  );
  const listingTierName = isListingSubscriber
    ? (listingTier === 'pro' ? 'Pro' : 'Agency')
    : 'Free';
  const listingTierLimit = isListingSubscriber ? (listingSubscription?.listingsLimit || 20) : 3;

  const closeDiscountGame = () => dispatch({ type: 'TOGGLE_DISCOUNT_GAME', payload: false });

  const handleGameViewPlans = (reward: Extract<GameReward, { type: 'discount' }>) => {
    const percent = reward.discountPercent;
    dispatch({
      type: 'SET_ACTIVE_DISCOUNT',
      payload: { proYearly: percent, proMonthly: percent, enterprise: percent, code: reward.code, validUntil: reward.validUntil },
    });
    closeDiscountGame();
    navigateToPricing();
  };

  const handleGameListingsAdded = async () => {
    try {
      await checkAuthStatus();
    } finally {
      closeDiscountGame();
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden max-w-full" style={{ height: '100dvh', WebkitTapHighlightColor: 'transparent' }}>
        <Suspense fallback={null}>
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        </Suspense>

        {/* Sticky advertising banner — rendered outside scroll/overflow containers
            so position:fixed works in iOS Safari PWA standalone mode. Hidden on
            admin/dashboard/auth views (adPage === null), and on the property
            details page which has its own in-content + sidebar ad slots (so the
            sticky bar doesn't overlap them). */}
        {adPage && !isPropertyDetail && (
          <Suspense fallback={null}>
            <StickyAdBanner page={adPage} placement="sticky-bottom" />
          </Suspense>
        )}

        {/* Ad preview mode indicator (opened from admin "View on site") */}
        <Suspense fallback={null}>
          <AdPreviewIndicator />
        </Suspense>


        {/* Mobile floating hamburger for home page — rendered outside all scroll/overflow containers
            so position:fixed works correctly in iOS Safari PWA standalone mode */}
        {isMobile && isHomeView && !isPropertyDetail && !isAgentDetail && !isAgencyDetail && !isBusinessDetail && (
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

        <div className={`relative transition-[filter] duration-300 ease-in-out h-full flex flex-col md:pl-20 overflow-x-hidden max-w-full ${isBlurredBehindModal ? 'blur-sm' : ''} ${isOverlayVisible ? 'pointer-events-none' : ''}`}>
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
                    onClick={() => navigate(paths.home())}
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
                <OpenSidebarContext.Provider value={openSidebar}>
                  <PageOutlet />
                </OpenSidebarContext.Provider>
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
                tierName={listingTierName}
                listingLimit={listingTierLimit}
                isSubscriber={isListingSubscriber}
                onUseCode={(code) => {
                    dispatch({ type: 'TOGGLE_LISTING_LIMIT_WARNING', payload: false });
                    handleGameViewPlans(code);
                }}
                onViewPlans={() => {
                    dispatch({ type: 'TOGGLE_LISTING_LIMIT_WARNING', payload: false });
                    navigateToPricing();
                }}
            />
          )}
          {state.isDiscountGameOpen && (
            <DiscountGameModal
                isOpen={state.isDiscountGameOpen}
                isSubscriber={isListingSubscriber}
                onClose={closeDiscountGame}
                onViewPlans={handleGameViewPlans}
                onListingsAdded={handleGameListingsAdded}
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


/**
 * The app shell: the router's root element. Resolves the session, gates on
 * email verification, and renders the layout whose outlet hosts the page.
 */
const AppShell: React.FC = () => {
    const { state, dispatch, checkAuthStatus, handleOAuthCallback } = useAppContext();
    const { t } = useTranslation('common');
    const { view } = useRouteView();

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
    const isAuthFlowPage = view === 'reset-password' || view === 'verify-email';

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
            <GlobalHead />
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

// Created once: the route table is static, and the shell renders inside every
// provider below, so the router itself needs no React context.
const router = createAppRouter(<AppShell />);

const App: React.FC = () => {
  // Compensate for browser zoom so UI remains usable at 125%+
  useZoomCompensation();

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
                      <ListingIngestProgressProvider>
                      {/* Global SVG filter for liquid glass effects */}
                      <LiquidGlassFilter />
                      <RouterProvider router={router} />
                      <ListingIngestDock />
                      </ListingIngestProgressProvider>
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
