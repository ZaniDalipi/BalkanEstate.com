import React, { createContext, useReducer, useContext, Dispatch, useCallback, useEffect } from 'react';
import { User, Property, SavedSearch, Conversation, AppState, AppAction, Filters, Message, AuthModalView, initialFilters, SearchPageState } from '../types';
import {
  checkAuth as apiCheckAuth,
  getMyData as apiGetMyData,
  login as apiLogin,
  signup as apiSignup,
  logout as apiLogout,
  logoutAllDevices as apiLogoutAllDevices,
  requestPasswordReset as apiRequestPasswordReset,
  resetPassword as apiResetPassword,
  loginWithSocial as apiLoginWithSocial,
  getProperties as apiGetProperties,
  toggleSavedHome as apiToggleSavedHome,
  addSavedSearch as apiAddSavedSearch,
  createConversation as apiCreateConversation,
  deleteConversation as apiDeleteConversation,
  sendMessage as apiSendMessage,
  createListing as apiCreateListing,
  updateListing as apiUpdateListing,
  updateUser as apiUpdateUser,
  updateSavedSearchAccessTime as apiUpdateSavedSearchAccessTime
} from '../services/apiService';
import { MUNICIPALITY_DATA } from '../services/propertyService';
import { socketService } from '../services/socketService';
import { notificationService } from '../services/notificationService';
import { tokenService } from '../src/shared/api/tokenService';

const initialSearchPageState: SearchPageState = {
    filters: initialFilters,
    activeFilters: initialFilters,
    mapBoundsJSON: null,
    drawnBoundsJSON: null,
    mobileView: 'list',
    searchMode: 'manual',
    aiChatHistory: [{ sender: 'ai', text: "Hello! Welcome to Balkan Estate. How can I help you find a property today?" }],
    isAiChatModalOpen: false,
    isFiltersOpen: false,
    focusMapOnProperty: null,
};

const initialState: AppState = {
  user: null,
  onboardingComplete: false,
  isAuthenticating: true,
  activeView: 'search',
  isPricingModalOpen: false,
  isFirstLoginOffer: false,
  isAgencyCreationMode: false,
  isSubscriptionModalOpen: false,
  subscriptionEmail: null,
  isAuthModalOpen: false,
  authModalView: 'login',
  properties: [],
  isLoadingProperties: false,
  propertiesError: null,
  selectedProperty: null,
  propertyToEdit: null,
  isAuthenticated: false,
  isLoadingUserData: false,
  currentUser: null,
  savedSearches: [],
  savedHomes: [],
  comparisonList: [],
  conversations: [],
  activeConversationId: null,
  selectedAgentId: null,
  selectedAgencyId: null,
  pendingProperty: null,
  pendingSubscription: null,
  pendingAgencyData: null,
  searchPageState: initialSearchPageState,
  activeDiscount: null,
  isListingLimitWarningOpen: false,
  isDiscountGameOpen: false,
  isEnterpriseModalOpen: false,
  // FIX: Initialize allMunicipalities in the initial state.
  allMunicipalities: MUNICIPALITY_DATA,
  pendingRedirect: null,
  alertDialog: null,
  accountTab: 'listings',
  howItWorksTab: 'getting-started',
  adminSection: 'dashboard',
  isSessionExpiredModalOpen: false,
};


const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'AUTH_CHECK_START':
      return { ...state, isAuthenticating: true };
    case 'AUTH_CHECK_COMPLETE':
      if (!action.payload.isAuthenticated) {
        return { ...state, isAuthenticating: false, isAuthenticated: false, currentUser: null, onboardingComplete: state.onboardingComplete };
      }
      return { ...state, isAuthenticating: false, isAuthenticated: action.payload.isAuthenticated, currentUser: action.payload.user, onboardingComplete: state.onboardingComplete || action.payload.isAuthenticated };
    case 'COMPLETE_ONBOARDING':
      return { ...state, onboardingComplete: true };
    case 'SET_ACTIVE_VIEW': {
        const newState: AppState = { ...state, activeView: action.payload, selectedProperty: null };
        if (action.payload !== 'create-listing') newState.propertyToEdit = null;
        if (action.payload !== 'agents') newState.selectedAgentId = null;
        return newState;
    }
    case 'TOGGLE_PRICING_MODAL':
      return {
        ...state,
        isPricingModalOpen: action.payload.isOpen,
        isFirstLoginOffer: action.payload.isOffer ?? state.isFirstLoginOffer,
        isAgencyCreationMode: action.payload.isAgencyMode ?? false
      };
    case 'TOGGLE_SUBSCRIPTION_MODAL':
      return {
        ...state,
        isSubscriptionModalOpen: action.payload.isOpen,
        subscriptionEmail: action.payload.email || state.subscriptionEmail
      };
    case 'TOGGLE_ENTERPRISE_MODAL':
      return { ...state, isEnterpriseModalOpen: action.payload };
    case 'TOGGLE_AUTH_MODAL':
      return { ...state, isAuthModalOpen: action.payload.isOpen, authModalView: action.payload.isOpen ? (action.payload.view || 'login') : state.authModalView };
    case 'SET_AUTH_MODAL_VIEW':
      return { ...state, authModalView: action.payload };
    case 'SET_SELECTED_PROPERTY':
      return { ...state, selectedProperty: state.properties.find(p => p.id === action.payload) || null };
    case 'SET_SELECTED_PROPERTY_OBJECT':
      return { ...state, selectedProperty: action.payload };
    case 'SET_PROPERTY_TO_EDIT':
      return { ...state, propertyToEdit: action.payload };
    case 'SET_SELECTED_AGENT':
      return { ...state, selectedAgentId: action.payload };
    case 'SET_SELECTED_AGENCY':
      return { ...state, selectedAgencyId: action.payload };
    case 'PROPERTIES_LOADING':
        return { ...state, isLoadingProperties: true, propertiesError: null };
    case 'PROPERTIES_SUCCESS':
        return { ...state, isLoadingProperties: false, properties: action.payload };
    case 'PROPERTIES_ERROR':
        return { ...state, isLoadingProperties: false, propertiesError: action.payload };
    case 'USER_DATA_LOADING':
        return { ...state, isLoadingUserData: true };
    case 'USER_DATA_SUCCESS':
        return { ...state, ...action.payload, isLoadingUserData: false };
    case 'ADD_SAVED_SEARCH':
      return { ...state, savedSearches: [action.payload, ...state.savedSearches] };
    case 'UPDATE_SAVED_SEARCH':
      return { ...state, savedSearches: state.savedSearches.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'REMOVE_SAVED_SEARCH':
      return { ...state, savedSearches: state.savedSearches.filter(s => s.id !== action.payload) };
    case 'CLEAR_ALL_SAVED_SEARCHES':
      return { ...state, savedSearches: [] };
    case 'TOGGLE_SAVED_HOME':
        const isSaved = state.savedHomes.some(p => p.id === action.payload.id);
        return { ...state, savedHomes: isSaved ? state.savedHomes.filter(p => p.id !== action.payload.id) : [action.payload, ...state.savedHomes] };
    case 'ADD_TO_COMPARISON':
        if (state.comparisonList.length < 5 && !state.comparisonList.includes(action.payload)) return { ...state, comparisonList: [...state.comparisonList, action.payload] };
        return state;
    case 'REMOVE_FROM_COMPARISON':
        return { ...state, comparisonList: state.comparisonList.filter(id => id !== action.payload) };
    case 'CLEAR_COMPARISON':
        return { ...state, comparisonList: [] };
    case 'SET_AUTH_STATE':
        if (!action.payload.isAuthenticated) { // logging out
            return { ...state, isAuthenticated: false, currentUser: null, savedHomes: [], savedSearches: [], conversations: [] };
        }
        // logging in
        return { ...state, isAuthenticated: true, currentUser: action.payload.user, onboardingComplete: true, isLoadingUserData: true };
    case 'ADD_PROPERTY':
      // Add the new property to the beginning of the list to ensure it's visible.
      return { ...state, properties: [action.payload, ...state.properties] };
    case 'UPDATE_PROPERTY':
      return {
        ...state,
        properties: state.properties.map(p =>
          p.id === action.payload.id ? action.payload : p
        ),
        // Also update selectedProperty if it matches the updated property
        selectedProperty: state.selectedProperty?.id === action.payload.id
          ? action.payload
          : state.selectedProperty,
      };
    case 'RENEW_PROPERTY':
        // Find the property and update its lastRenewed timestamp.
        return {
            ...state,
            properties: state.properties.map(p =>
                p.id === action.payload ? { ...p, lastRenewed: Date.now() } : p
            ),
        };
    case 'MARK_PROPERTY_SOLD':
        // Find the property and update its status to 'sold'.
        return {
            ...state,
            properties: state.properties.map(p =>
                p.id === action.payload ? { ...p, status: 'sold' } : p
            ),
        };
    case 'DELETE_PROPERTY':
        // Remove the property from the list.
        return {
            ...state,
            properties: state.properties.filter(p => p.id !== action.payload),
        };
    case 'UPDATE_USER':
      return { ...state, currentUser: state.currentUser ? { ...state.currentUser, ...action.payload } : null };
    case 'CREATE_CONVERSATION': {
        // Check if conversation already exists
        const exists = state.conversations.some(c => c.id === action.payload.id);
        if (exists) {
            return state;
        }
        return { ...state, conversations: [action.payload, ...state.conversations] };
    }
    case 'DELETE_CONVERSATION': {
        const newConversations = state.conversations.filter(c => c.id !== action.payload);
        const newActiveId = state.activeConversationId === action.payload ? null : state.activeConversationId;
        return { ...state, conversations: newConversations, activeConversationId: newActiveId };
    }
    case 'SET_ACTIVE_CONVERSATION':
        return { ...state, activeConversationId: action.payload };
    case 'ADD_MESSAGE': {
        const { conversationId, message } = action.payload;
        return {
            ...state,
            conversations: state.conversations.map(c => {
                if (c.id !== conversationId) return c;
                // Avoid adding duplicate messages
                if (c.messages.some(m => m.id === message.id)) {
                    return c;
                }
                return { ...c, messages: [...c.messages, message] };
            })
        };
    }
    // FIX: Add missing reducer case for creating a new conversation or adding a message to an existing one.
    case 'CREATE_OR_ADD_MESSAGE': {
        const { propertyId, message } = action.payload;
        const existingConversation = state.conversations.find(c => c.propertyId === propertyId);
        if (existingConversation) {
            return {
                ...state,
                conversations: state.conversations.map(c =>
                    c.id === existingConversation.id ? { ...c, messages: [...c.messages, message] } : c
                )
            };
        } else {
            const property = state.properties.find(p => p.id === propertyId);
            if (!property || !state.currentUser) return state;
            const newConversation: Conversation = {
                id: `conv-${Date.now()}`,
                propertyId,
                buyerId: state.currentUser.id,
                sellerId: property.sellerId,
                participants: [state.currentUser.id, property.sellerId],
                messages: [message],
                createdAt: Date.now(),
                isRead: false,
                buyerUnreadCount: 0,
                sellerUnreadCount: 1,
            };
            return { ...state, conversations: [newConversation, ...state.conversations] };
        }
    }
    // FIX: Add missing reducer case for marking a conversation as read.
    case 'MARK_CONVERSATION_AS_READ': {
        const conversationId = action.payload;
        return {
            ...state,
            conversations: state.conversations.map(c =>
                c.id === conversationId
                    ? { ...c, messages: c.messages.map(m => ({ ...m, isRead: true })) }
                    : c
            )
        };
    }
    case 'SET_PENDING_PROPERTY':
        return { ...state, pendingProperty: action.payload };
    case 'SET_PENDING_SUBSCRIPTION':
        return { ...state, pendingSubscription: action.payload };
    case 'SET_PENDING_AGENCY_DATA':
        return { ...state, pendingAgencyData: action.payload };
    case 'UPDATE_SEARCH_PAGE_STATE':
        return {
            ...state,
            searchPageState: {
                ...state.searchPageState,
                ...action.payload,
            },
        };
    case 'SET_ACTIVE_DISCOUNT':
        return { ...state, activeDiscount: action.payload };
    case 'TOGGLE_LISTING_LIMIT_WARNING':
        return { ...state, isListingLimitWarningOpen: action.payload };
    case 'TOGGLE_DISCOUNT_GAME':
        return { ...state, isDiscountGameOpen: action.payload };
    case 'UPDATE_SAVED_SEARCH_ACCESS_TIME':
        return {
            ...state,
            savedSearches: state.savedSearches.map(s =>
                s.id === action.payload.searchId ? {
                    ...s,
                    lastAccessed: Date.now(),
                    seenPropertyIds: action.payload.seenPropertyIds || s.seenPropertyIds || []
                } : s
            ),
        };
    case 'SET_PENDING_REDIRECT':
        return { ...state, pendingRedirect: action.payload };
    case 'SHOW_ALERT':
        return {
            ...state,
            alertDialog: {
                isOpen: true,
                type: action.payload.type,
                title: action.payload.title,
                message: action.payload.message,
            },
        };
    case 'HIDE_ALERT':
        return { ...state, alertDialog: null };
    case 'SET_ACCOUNT_TAB':
        return { ...state, accountTab: action.payload };
    case 'SET_HOW_IT_WORKS_TAB':
        return { ...state, howItWorksTab: action.payload };
    case 'SET_ADMIN_SECTION':
        return { ...state, adminSection: action.payload };
    case 'SESSION_EXPIRED':
        return {
            ...state,
            isSessionExpiredModalOpen: true,
            isAuthenticated: false,
            currentUser: null,
        };
    case 'HIDE_SESSION_EXPIRED_MODAL':
        return { ...state, isSessionExpiredModalOpen: false };
    default:
      return state;
  }
};

interface AppContextType {
    state: AppState;
    dispatch: Dispatch<AppAction>;
    checkAuthStatus: () => Promise<void>;
    login: (emailOrPhone: string, pass: string) => Promise<User>;
    signup: (email: string, pass: string, options?: { name?: string; phone?: string; role?: 'buyer' | 'private_seller' | 'agent'; licenseNumber?: string; agencyInvitationCode?: string; }) => Promise<User>;
    logout: () => Promise<void>;
    logoutAllDevices: () => Promise<void>;
    requestPasswordReset: (email: string) => Promise<void>;
    resetPassword: (token: string, newPassword: string) => Promise<User>;
    loginWithSocial: (provider: 'google' | 'apple') => void;
    handleOAuthCallback: (token: string, refreshToken?: string) => void;
    fetchProperties: (filters?: Filters) => Promise<void>;
    toggleSavedHome: (property: Property) => Promise<void>;
    addSavedSearch: (search: SavedSearch) => Promise<void>;
    createConversation: (propertyId: string) => Promise<Conversation>;
    deleteConversation: (conversationId: string) => Promise<void>;
    sendMessage: (conversationId: string, message: Message) => Promise<void>;
    createListing: (property: Property) => Promise<Property>;
    updateListing: (property: Property) => Promise<Property>;
    updateUser: (userData: Partial<User>) => Promise<User>;
    updateSearchPageState: (newState: Partial<SearchPageState>) => void;
    updateSavedSearchAccessTime: (searchId: string, seenPropertyIds?: string[]) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);


export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const checkAuthStatus = useCallback(async () => {
    dispatch({ type: 'AUTH_CHECK_START' });
    const user = await apiCheckAuth();
    dispatch({ type: 'AUTH_CHECK_COMPLETE', payload: { isAuthenticated: !!user, user } });
    if (user) {
        dispatch({ type: 'USER_DATA_LOADING' });
        const userData = await apiGetMyData();
        dispatch({ type: 'USER_DATA_SUCCESS', payload: userData });

        // Connect to WebSocket with user ID
        const token = localStorage.getItem('balkan_estate_token');
        if (token) {
          socketService.connect(token, user.id);
        }

        // Initialize proactive token refresh
        tokenService.initializeProactiveRefresh();
    }
  }, []);

  const login = useCallback(async (emailOrPhone: string, pass: string) => {
    const user = await apiLogin(emailOrPhone, pass);
    dispatch({ type: 'SET_AUTH_STATE', payload: { isAuthenticated: true, user } });
    dispatch({ type: 'USER_DATA_LOADING' });
    const userData = await apiGetMyData();
    dispatch({ type: 'USER_DATA_SUCCESS', payload: userData });

    // Connect to WebSocket for real-time chat
    const token = localStorage.getItem('balkan_estate_token');
    if (token) {
      socketService.connect(token, user.id);
    }

    // Initialize browser notifications
    notificationService.initialize();

    // Initialize proactive token refresh
    tokenService.initializeProactiveRefresh();

    // Check if there's a pending redirect (e.g., from "I want to sell" flow)
    if (state.pendingRedirect) {
      const redirectTo = state.pendingRedirect;
      dispatch({ type: 'SET_PENDING_REDIRECT', payload: null });
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: redirectTo });
    }

    // Check if there's a pending subscription and navigate to pricing page
    if (state.pendingSubscription) {
      setTimeout(() => {
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'pricing' });
        const currentLang = window.location.pathname.split('/')[1] || 'en';
        const validLangs = ['en', 'sq', 'sr', 'de', 'mk'];
        const lang = validLangs.includes(currentLang) ? currentLang : 'en';
        window.history.pushState({}, '', `/${lang}/subscribe`);
      }, 500);
    }

    return user;
  }, [state.pendingSubscription, state.isFirstLoginOffer, state.pendingRedirect]);

  const signup = useCallback(async (
    email: string,
    pass: string,
    options?: {
      name?: string;
      phone?: string;
      role?: 'buyer' | 'private_seller' | 'agent';
      licenseNumber?: string;
      agencyInvitationCode?: string;
    }
  ) => {
    const user = await apiSignup(email, pass, options);
    dispatch({ type: 'SET_AUTH_STATE', payload: { isAuthenticated: true, user } });
    dispatch({ type: 'USER_DATA_SUCCESS', payload: { savedHomes: [], savedSearches: [], conversations: [] } });

    // Connect to WebSocket for real-time chat
    const token = localStorage.getItem('balkan_estate_token');
    if (token) {
      socketService.connect(token, user.id);
    }

    // Initialize browser notifications
    notificationService.initialize();

    // Initialize proactive token refresh
    tokenService.initializeProactiveRefresh();

    // Check if there's a pending redirect (e.g., from "I want to sell" flow)
    if (state.pendingRedirect) {
      const redirectTo = state.pendingRedirect;
      dispatch({ type: 'SET_PENDING_REDIRECT', payload: null });
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: redirectTo });
    }

    // Check if there's a pending subscription and navigate to pricing page
    if (state.pendingSubscription) {
      setTimeout(() => {
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'pricing' });
        const currentLang = window.location.pathname.split('/')[1] || 'en';
        const validLangs = ['en', 'sq', 'sr', 'de', 'mk'];
        const lang = validLangs.includes(currentLang) ? currentLang : 'en';
        window.history.pushState({}, '', `/${lang}/subscribe`);
      }, 500);
    }

    return user;
  }, [state.pendingSubscription, state.isFirstLoginOffer, state.pendingRedirect]);

  const logout = useCallback(async () => {
    await apiLogout();
    // Disconnect from WebSocket
    socketService.disconnect();
    dispatch({ type: 'SET_AUTH_STATE', payload: { isAuthenticated: false, user: null } });
  }, []);

  const logoutAllDevices = useCallback(async () => {
    await apiLogoutAllDevices();
    // Disconnect from WebSocket
    socketService.disconnect();
    dispatch({ type: 'SET_AUTH_STATE', payload: { isAuthenticated: false, user: null } });
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
      await apiRequestPasswordReset(email);
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    const user = await apiResetPassword(token, newPassword);
    dispatch({ type: 'SET_AUTH_STATE', payload: { isAuthenticated: true, user } });
    dispatch({ type: 'USER_DATA_LOADING' });
    const userData = await apiGetMyData();
    dispatch({ type: 'USER_DATA_SUCCESS', payload: userData });
    return user;
  }, []);

  const loginWithSocial = useCallback((provider: 'google' | 'apple') => {
    // Redirect to OAuth endpoint
    apiLoginWithSocial(provider);
  }, []);

  const handleOAuthCallback = useCallback(async (token: string, refreshToken?: string) => {
    // SECURITY: Store tokens securely, then fetch user data via API
    // User data is NOT passed in URL to prevent logging in browser history/server logs
    localStorage.setItem('balkan_estate_token', token);
    if (refreshToken) {
      localStorage.setItem('balkan_estate_refresh_token', refreshToken);
    }

    dispatch({ type: 'USER_DATA_LOADING' });

    try {
      // Fetch user profile securely via authenticated API call
      const user = await apiCheckAuth();
      if (user) {
        dispatch({ type: 'SET_AUTH_STATE', payload: { isAuthenticated: true, user } });
        // Mark auth check as complete so the app can proceed
        dispatch({ type: 'AUTH_CHECK_COMPLETE', payload: { isAuthenticated: true, user } });

        // Connect to WebSocket for real-time chat
        socketService.connect(token, user.id);

        // Initialize proactive token refresh
        tokenService.initializeProactiveRefresh();

        // Fetch additional user data
        const userData = await apiGetMyData();
        dispatch({ type: 'USER_DATA_SUCCESS', payload: userData });
      } else {
        throw new Error('Failed to fetch user profile');
      }
    } catch (_error) {
      // Clear tokens on failure
      localStorage.removeItem('balkan_estate_token');
      localStorage.removeItem('balkan_estate_refresh_token');
      dispatch({ type: 'SET_AUTH_STATE', payload: { isAuthenticated: false, user: null } });
      dispatch({ type: 'AUTH_CHECK_COMPLETE', payload: { isAuthenticated: false, user: null } });
      dispatch({ type: 'USER_DATA_SUCCESS', payload: { savedHomes: [], savedSearches: [], conversations: [] } });
    }
  }, []);

  const fetchProperties = useCallback(async (filters?: Filters) => {
      dispatch({ type: 'PROPERTIES_LOADING' });
      try {
          const properties = await apiGetProperties(filters);
          dispatch({ type: 'PROPERTIES_SUCCESS', payload: properties });
      } catch (e: any) {
          dispatch({ type: 'PROPERTIES_ERROR', payload: e.message || 'Failed to fetch properties.'});
      }
  }, []);

  const toggleSavedHome = useCallback(async (property: Property) => {
    const isSaved = state.savedHomes.some(p => p.id === property.id);
    await apiToggleSavedHome(property.id, isSaved);
    dispatch({ type: 'TOGGLE_SAVED_HOME', payload: property });
  }, [state.savedHomes]);

  const addSavedSearch = useCallback(async (search: SavedSearch) => {
    const newSearch = await apiAddSavedSearch(search);
    dispatch({ type: 'ADD_SAVED_SEARCH', payload: newSearch });
  }, []);

  const createConversation = useCallback(async (propertyId: string) => {
      const conversation = await apiCreateConversation(propertyId);
      dispatch({ type: 'CREATE_CONVERSATION', payload: conversation });
      return conversation;
  }, []);

  const deleteConversation = useCallback(async (conversationId: string) => {
      await apiDeleteConversation(conversationId);
      dispatch({ type: 'DELETE_CONVERSATION', payload: conversationId });
  }, []);

  const sendMessage = useCallback(async (conversationId: string, message: Message) => {
      const result = await apiSendMessage(conversationId, message);
      dispatch({ type: 'ADD_MESSAGE', payload: { conversationId, message: result.message }});
  }, []);

  const createListing = useCallback(async (property: Property) => {
      const result = await apiCreateListing(property);
      // Add the new property to the list
      dispatch({ type: 'ADD_PROPERTY', payload: result.property });

      // Update user's subscription counts if returned from backend
      if (result.updatedSubscription) {
        dispatch({
          type: 'UPDATE_USER',
          payload: {
            subscription: {
              ...state.currentUser?.subscription,
              ...result.updatedSubscription,
            } as any
          }
        });
      }

      return result.property;
  }, [state.currentUser]);

  const updateListing = useCallback(async (property: Property) => {
      const updatedProperty = await apiUpdateListing(property);
      dispatch({ type: 'UPDATE_PROPERTY', payload: updatedProperty });
      return updatedProperty;
  }, []);
  
  const updateUser = useCallback(async (userData: Partial<User>) => {
      const updatedUser = await apiUpdateUser(userData);
      dispatch({ type: 'UPDATE_USER', payload: updatedUser });
      return updatedUser;
  }, []);

  const updateSearchPageState = useCallback((newState: Partial<SearchPageState>) => {
    dispatch({ type: 'UPDATE_SEARCH_PAGE_STATE', payload: newState });
  }, []);

  const updateSavedSearchAccessTime = useCallback(async (searchId: string, seenPropertyIds?: string[]) => {
    await apiUpdateSavedSearchAccessTime(searchId, seenPropertyIds);
    dispatch({ type: 'UPDATE_SAVED_SEARCH_ACCESS_TIME', payload: { searchId, seenPropertyIds } });
  }, []);

  // Set up session expired callback for proactive token refresh
  useEffect(() => {
    tokenService.onSessionExpired(() => {
      // Disconnect from WebSocket
      socketService.disconnect();
      // Clear auth state
      dispatch({ type: 'SET_AUTH_STATE', payload: { isAuthenticated: false, user: null } });
      // Show notification to user
      notificationService.showNotification(
        'Session Expired',
        { body: 'Your session has expired. Please log in again.', tag: 'session-expired' }
      );
      // Open auth modal
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
    });
  }, []);

  // Listen for user updates from WebSocket (agency joins, profile changes, etc.)
  React.useEffect(() => {
    if (!state.currentUser) return;

    const handleUserUpdate = (data: any) => {
      // Handle agency-joined event
      if (data.type === 'agency-joined' && data.user) {
        dispatch({ type: 'UPDATE_USER', payload: {
          agencyId: data.user.agencyId,
          agencyName: data.user.agencyName,
        }});

        // Show notification to user
        notificationService.showNotification(
          'Agency Joined!',
          { body: data.message || `You have joined ${data.agency?.name}!`, tag: 'agency-joined' }
        );
      }

      // Handle agency-left event
      if (data.type === 'agency-left' && data.user) {
        dispatch({ type: 'UPDATE_USER', payload: {
          agencyId: null,
          agencyName: 'Independent Agent',
        }});

        // Show notification to user
        notificationService.showNotification(
          'Agency Left',
          { body: data.message || 'You have left your agency', tag: 'agency-left' }
        );
      }
    };

    const unsubscribe = socketService.onUserUpdate(handleUserUpdate);

    return () => {
      unsubscribe();
    };
  }, [state.currentUser]);

  const value = { state, dispatch, checkAuthStatus, login, signup, logout, logoutAllDevices, requestPasswordReset, resetPassword, loginWithSocial, handleOAuthCallback, fetchProperties, toggleSavedHome, addSavedSearch, createConversation, deleteConversation, sendMessage, createListing, updateListing, updateUser, updateSearchPageState, updateSavedSearchAccessTime };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};