import React, { useState, useEffect } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { AlertProvider } from './context/AlertContext';
import { QueryProvider } from './src/app/providers/QueryProvider';
import { ErrorBoundary } from './src/app/components/ErrorBoundary';
import { UserRole } from './types';
import Onboarding from './components/Onboarding';
import { SearchPage } from './components/BuyerFlow/Search';
import { CityRecommendations } from './components/BuyerFlow';
import CreateListingPage from './components/SellerFlow/SellerDashboard';
import AuthPage from './components/auth/AuthModal';
import PricingPlans from './components/SellerFlow/PricingPlans';
import { SavedSearchesPage } from './components/BuyerFlow/Saved';
import SavedPropertiesPage from './components/BuyerFlow/Saved/SavedHomesPage';
import InboxPage from './components/BuyerFlow/Messaging/InboxPage';
import MyAccountPage from './components/shared/MyAccountPage';
import Sidebar from './components/shared/Sidebar';
import Header from './components/shared/Header';
import Footer from './components/shared/Footer';
import SubscriptionModal from './components/BuyerFlow/Modals/SubscriptionModal';
import AgentsPage from './components/AgentsPage/AgentsPage';
import AgenciesListPage from './components/AgenciesListPage';
import AgencyDetailPage from './components/AgencyDetailPage';
import EnterpriseCreationForm from './components/EnterpriseCreationForm';
import PropertyDetailsPage from './components/BuyerFlow/PropertyDisplay/PropertyDetailsPage';
import PaymentSuccess from './components/PaymentSuccess';
import PaymentCancel from './components/PaymentCancel';
import { LogoIcon } from './constants';
import ListingLimitWarningModal from './components/shared/ListingLimitWarningModal';
import DiscountGameModal from './components/shared/DiscountGameModal';
import AdminDashboard from './components/AdminPanel/AdminDashboard';
import ResetPasswordPage from './components/auth/ResetPasswordPage';

const AppContent: React.FC<{ onToggleSidebar: () => void }> = ({ onToggleSidebar }) => {
  const { state, dispatch } = useAppContext();
  const [selectedAgency, setSelectedAgency] = useState<any>(null);
  const [isLoadingAgency, setIsLoadingAgency] = useState(false);

  // Check URL for routing on mount and when URL changes (handles browser/mobile back button)
  useEffect(() => {
    const checkUrlForRouting = () => {
      // Normalize path: remove trailing slashes (except for root '/')
      let path = window.location.pathname;
      if (path.length > 1 && path.endsWith('/')) {
        path = path.slice(0, -1);
      }

      console.log('🔙 Navigation detected:', path);

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
        dispatch({ type: 'SET_SELECTED_PROPERTY', payload: propertyId });
        dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
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

      // Main navigation routes
      const routeMap: { [key: string]: any } = {
        '/': 'search',
        '/search': 'search',
        '/explore-cities': 'explore-cities',
        '/saved-searches': 'saved-searches',
        '/saved-properties': 'saved-properties',
        '/inbox': 'inbox',
        '/account': 'account',
        '/agents': 'agents',
        '/agencies': 'agencies',
        '/create-listing': 'create-listing',
        '/admin': 'admin',
        '/reset-password': 'reset-password',
      };

      const view = routeMap[path];
      if (view) {
        // Clear selected items when navigating to main routes
        dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
        dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: view });
      } else {
        // Unknown route - default to search and clear selections
        console.log('⚠️ Unknown route, defaulting to search');
        dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
        dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
        window.history.replaceState({}, '', '/');
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
          console.log('✅ Agency object already loaded:', agencyId.name);
          setSelectedAgency(agencyId);
          setIsLoadingAgency(false);
          return;
        }

        setIsLoadingAgency(true);
        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
          const agencyIdentifier = state.selectedAgencyId;

          console.log('🔍 Fetching agency with identifier:', agencyIdentifier);

          // Include auth token so backend can identify current user and auto-add owner as member
          const token = localStorage.getItem('balkan_estate_token');
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch(`${API_URL}/agencies/${agencyIdentifier}`, { headers });

          // Check content type before parsing
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            console.error('Backend API not responding correctly. Is the server running?');
            setSelectedAgency(null);
            setIsLoadingAgency(false);
            return;
          }

          if (!response.ok) {
            console.error('Failed to fetch agency:', agencyIdentifier, '-', response.status, '-', response.statusText);
            setSelectedAgency(null);
          } else {
            const data = await response.json();
            console.log('✅ Agency fetched successfully:', data.agency?.name);
            setSelectedAgency(data.agency);
          }
        } catch (error) {
          console.error('Error fetching agency:', error);
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

  // Payment callback routes (highest priority)
  const path = window.location.pathname;
  if (path === '/payment/success') {
    return <PaymentSuccess />;
  }
  if (path === '/payment/cancel') {
    return <PaymentCancel />;
  }

  // Global handler for selected property view
  if (state.selectedProperty) {
    return <PropertyDetailsPage property={state.selectedProperty} />;
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
    return <AgencyDetailPage agency={selectedAgency} />;
  }

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
    case 'agents':
      return <AgentsPage />;
    case 'agencies':
      return <AgenciesListPage />;
    case 'admin':
      return <AdminDashboard />;
    case 'reset-password':
      return <ResetPasswordPage />;
    case 'search':
    default:
      return <SearchPage onToggleSidebar={onToggleSidebar} />;
  }
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
  const isAgencyDetailView = !!state.selectedAgencyId;
  // Agency pages should allow scrolling to show all agents and details
  const isFullHeightView = isSearchPage || state.activeView === 'inbox' || !!state.selectedProperty;
  const showHeader = !(isMobile && (isSearchPage || !!state.selectedProperty));
  // Note: Agency detail pages WILL show header on mobile to allow sidebar access
  
  const anyNonAuthModalOpen = state.isPricingModalOpen || state.isSubscriptionModalOpen || state.isListingLimitWarningOpen || state.isDiscountGameOpen;
  
  const isOverlayVisible = 
    state.isAuthModalOpen || 
    anyNonAuthModalOpen || 
    (isMobile && isSidebarOpen);


  const handleSubscribe = async () => {
    try {
        await updateUser({ isSubscribed: true });
        
        // If a property was pending, create it now
        if (state.pendingProperty) {
            await createListing(state.pendingProperty);
            dispatch({ type: 'SET_PENDING_PROPERTY', payload: null });
            // Optionally, show a success toast here
        }
    } catch (error) {
        console.error("Subscription update failed:", error);
        // Optionally show an error toast
    } finally {
        dispatch({ type: 'TOGGLE_PRICING_MODAL', payload: { isOpen: false } });
        dispatch({ type: 'SET_ACTIVE_DISCOUNT', payload: null });
    }
  };

  const handlePricingClose = () => {
    // If a property was pending and the user closes the modal, we clear it.
    // The component that initiated this will show an error message.
    if (state.pendingProperty) {
        dispatch({ type: 'SET_PENDING_PROPERTY', payload: null });
    }
    dispatch({ type: 'TOGGLE_PRICING_MODAL', payload: { isOpen: false } });
    dispatch({ type: 'SET_ACTIVE_DISCOUNT', payload: null });
  };
  
  const handleWarningConfirm = () => {
    dispatch({ type: 'TOGGLE_LISTING_LIMIT_WARNING', payload: false });
    dispatch({ type: 'TOGGLE_DISCOUNT_GAME', payload: true });
  };

  const handleGameComplete = (discounts: { proYearly: number; proMonthly: number; enterprise: number; }) => {
    dispatch({ type: 'SET_ACTIVE_DISCOUNT', payload: discounts });
    dispatch({ type: 'TOGGLE_DISCOUNT_GAME', payload: false });
    dispatch({ type: 'TOGGLE_PRICING_MODAL', payload: { isOpen: true, isOffer: true } });
  };

  return (
    <div className="min-h-screen bg-neutral-50 font-sans overflow-x-hidden max-w-full">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        <div className={`relative transition-all duration-300 ease-in-out h-screen flex flex-col md:pl-20 overflow-x-hidden max-w-full ${isOverlayVisible ? 'blur-sm pointer-events-none' : ''}`}>
            {showHeader && <Header onToggleSidebar={() => setIsSidebarOpen(true)} isFloating={isSearchPage} />}
            <main className={`flex flex-col flex-grow overflow-x-hidden ${isFullHeightView ? 'overflow-y-hidden' : 'overflow-y-auto'}`}>
                <AppContent onToggleSidebar={() => setIsSidebarOpen(true)} />
            </main>
        </div>

        <ListingLimitWarningModal
            isOpen={state.isListingLimitWarningOpen}
            onClose={() => {
                dispatch({ type: 'SET_PENDING_PROPERTY', payload: null });
                dispatch({ type: 'TOGGLE_LISTING_LIMIT_WARNING', payload: false });
            }}
            onConfirm={handleWarningConfirm}
        />
        <DiscountGameModal
            isOpen={state.isDiscountGameOpen}
            onGameComplete={handleGameComplete}
        />
        <PricingPlans
            isOpen={state.isPricingModalOpen}
            onClose={handlePricingClose}
            onSubscribe={handleSubscribe}
            isOffer={state.isFirstLoginOffer}
            isAgencyMode={state.isAgencyCreationMode}
        />
        <SubscriptionModal
            isOpen={state.isSubscriptionModalOpen}
            onClose={() => dispatch({ type: 'TOGGLE_SUBSCRIPTION_MODAL', payload: { isOpen: false } })}
            initialEmail={state.subscriptionEmail || undefined}
        />
        <EnterpriseCreationForm
            isOpen={state.isEnterpriseModalOpen}
            onClose={() => dispatch({ type: 'TOGGLE_ENTERPRISE_MODAL', payload: false })}
        />
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
    const { state, checkAuthStatus, handleOAuthCallback } = useAppContext();

    useEffect(() => {
        // Check for OAuth callback parameters in URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const userParam = urlParams.get('user');
        const error = urlParams.get('error');

        if (error) {
            console.error('OAuth error:', error);
            alert(`Authentication failed: ${error}`);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }

        if (token && userParam) {
            try {
                const user = JSON.parse(decodeURIComponent(userParam));
                handleOAuthCallback(token, user);
                // Clean up URL
                window.history.replaceState({}, document.title, window.location.pathname);
            } catch (err) {
                console.error('Error parsing OAuth callback data:', err);
                alert('Authentication failed. Please try again.');
                // Clean up URL
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        } else {
            // Normal auth check
            checkAuthStatus();
        }
    }, [checkAuthStatus, handleOAuthCallback]);


    if (state.isAuthenticating) {
        return <FullScreenLoader />;
    }

    if (!state.onboardingComplete) {
        return (
            <>
                <Onboarding />
                {state.isAuthModalOpen && <AuthPage />}
            </>
        )
    }

    return (
        <>
            <MainLayout />
            {state.isAuthModalOpen && <AuthPage />}
        </>
    );
}

const App: React.FC = () => {
  return (
    <ErrorBoundary level="app">
      <QueryProvider>
        <AppProvider>
          <AlertProvider>
            <AppWrapper />
          </AlertProvider>
        </AppProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
};

export default App;