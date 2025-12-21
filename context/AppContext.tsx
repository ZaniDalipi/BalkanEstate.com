import React, { createContext, useReducer, useContext, Dispatch, useCallback } from 'react';
import { User, Property, SavedSearch, Conversation, AppState, AppAction, Filters, Message, AuthModalView, initialFilters, SearchPageState } from '../types';
import * as api from '../services/apiService';
import { MUNICIPALITY_DATA } from '../services/propertyService';
import { socketService } from '../services/socketService';
import { notificationService } from '../services/notificationService';

const initialSearchPageState: SearchPageState = {
    filters: initialFilters,
    activeFilters: initialFilters,
    mapBoundsJSON: null,
    drawnBoundsJSON: null,
    mobileView: 'map',
    searchMode: 'manual',
    aiChatHistory: [{ sender: 'ai', text: "Hello! Welcome to Balkan Estate. How can I help you find a property today?" }],
    isAiChatModalOpen: false,
    isFiltersOpen: false,
    focusMapOnProperty: null,
};

const initialState: AppState = {
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
            console.log('Conversation already exists, not adding again');
            return state;
        }
        console.log('Adding new conversation to state:', action.payload.id);
        return { ...state, conversations: [action.payload, ...state.conversations] };
    }
    case 'DELETE_CONVERSATION': {
        const newConversations = state.conversations.filter(c => c.id !== action.payload);
        const newActiveId = state.activeConversationId === action.payload ? null : state.activeConversationId;
        return { ...state, conversations: newConversations, activeConversationId: newActiveId };
    }
    case 'SET_ACTIVE_CONVERSATION':
        console.log('Setting active conversation in reducer:', action.payload);
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
    loginWithSocial: (provider: 'google' | 'facebook' | 'apple') => void;
    handleOAuthCallback: (token: string, user: User) => void;
    sendPhoneCode: (phone: string) => Promise<void>;
    verifyPhoneCode: (phone: string, code: string) => Promise<{ user: User | null, isNew: boolean }>;
    completePhoneSignup: (phone: string, name: string, email: string) => Promise<User>;
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
    const user = await api.checkAuth();
    dispatch({ type: 'AUTH_CHECK_COMPLETE', payload: { isAuthenticated: !!user, user } });
    if (user) {
        dispatch({ type: 'USER_DATA_LOADING' });
        const userData = await api.getMyData();
        dispatch({ type: 'USER_DATA_SUCCESS', payload: userData });

        // Connect to WebSocket with user ID
        const token = localStorage.getItem('balkan_estate_token');
        if (token) {
          socketService.connect(token, user.id);
        }
    }
  }, []);

  const login = useCallback(async (emailOrPhone: string, pass: string) => {
    const user = await api.login(emailOrPhone, pass);
    dispatch({ type: 'SET_AUTH_STATE', payload: { isAuthenticated: true, user } });
    dispatch({ type: 'USER_DATA_LOADING' });
    const userData = await api.getMyData();
    dispatch({ type: 'USER_DATA_SUCCESS', payload: userData });

    // Connect to WebSocket for real-time chat
    const token = localStorage.getItem('balkan_estate_token');
    if (token) {
      socketService.connect(token, user.id);
    }

    // Initialize browser notifications
    notificationService.initialize();

    // Check if there's a pending subscription and reopen the modal
    if (state.pendingSubscription) {
      setTimeout(() => {
        const pendingSub = state.pendingSubscription;
        if (pendingSub.modalType === 'buyer') {
          dispatch({ type: 'TOGGLE_SUBSCRIPTION_MODAL', payload: { isOpen: true } });
        } else {
          dispatch({ type: 'TOGGLE_PRICING_MODAL', payload: { isOpen: true, isOffer: state.isFirstLoginOffer } });
        }
      }, 500);
    }

    return user;
  }, [state.pendingSubscription, state.isFirstLoginOffer]);

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
    const user = await api.signup(email, pass, options);
    dispatch({ type: 'SET_AUTH_STATE', payload: { isAuthenticated: true, user } });
    dispatch({ type: 'USER_DATA_SUCCESS', payload: { savedHomes: [], savedSearches: [], conversations: [] } });

    // Connect to WebSocket for real-time chat
    const token = localStorage.getItem('balkan_estate_token');
    if (token) {
      socketService.connect(token, user.id);
    }

    // Initialize browser notifications
    notificationService.initialize();

    // Check if there's a pending subscription and reopen the modal
    if (state.pendingSubscription) {
      setTimeout(() => {
        const pendingSub = state.pendingSubscription;
        if (pendingSub.modalType === 'buyer') {
          dispatch({ type: 'TOGGLE_SUBSCRIPTION_MODAL', payload: { isOpen: true } });
        } else {
          dispatch({ type: 'TOGGLE_PRICING_MODAL', payload: { isOpen: true, isOffer: state.isFirstLoginOffer } });
        }
      }, 500);
    }

    return user;
  }, [state.pendingSubscription, state.isFirstLoginOffer]);

  const logout = useCallback(async () => {
    await api.logout();
    // Disconnect from WebSocket
    socketService.disconnect();
    dispatch({ type: 'SET_AUTH_STATE', payload: { isAuthenticated: false, user: null } });
  }, []);

  const logoutAllDevices = useCallback(async () => {
    await api.logoutAllDevices();
    // Disconnect from WebSocket
    socketService.disconnect();
    dispatch({ type: 'SET_AUTH_STATE', payload: { isAuthenticated: false, user: null } });
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
      await api.requestPasswordReset(email);
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    const user = await api.resetPassword(token, newPassword);
    dispatch({ type: 'SET_AUTH_STATE', payload: { isAuthenticated: true, user } });
    dispatch({ type: 'USER_DATA_LOADING' });
    const userData = await api.getMyData();
    dispatch({ type: 'USER_DATA_SUCCESS', payload: userData });
    return user;
  }, []);

  const loginWithSocial = useCallback((provider: 'google' | 'facebook' | 'apple') => {
    // Redirect to OAuth endpoint
    api.loginWithSocial(provider);
  }, []);

  const handleOAuthCallback = useCallback(async (token: string, user: User) => {
    // Store token manually (since we're not going through the normal login flow)
    localStorage.setItem('balkan_estate_token', token);

    dispatch({ type: 'SET_AUTH_STATE', payload: { isAuthenticated: true, user } });
    dispatch({ type: 'USER_DATA_LOADING' });

    // Connect to WebSocket for real-time chat
    socketService.connect(token, user.id);

    try {
      const userData = await api.getMyData();
      dispatch({ type: 'USER_DATA_SUCCESS', payload: userData });
    } catch (error) {
      console.error('Error fetching user data after OAuth:', error);
      // Still mark as successful even if user data fetch fails
      dispatch({ type: 'USER_DATA_SUCCESS', payload: { savedHomes: [], savedSearches: [], conversations: [] } });
    }
  }, []);
  
  const sendPhoneCode = useCallback(async (phone: string) => {
      await api.sendPhoneCode(phone);
  }, []);
  
  const verifyPhoneCode = useCallback(async (phone: string, code: string) => {
      const result = await api.verifyPhoneCode(phone, code);
      if (result.user && !result.isNew) {
          dispatch({ type: 'SET_AUTH_STATE', payload: { isAuthenticated: true, user: result.user } });
          dispatch({ type: 'USER_DATA_LOADING' });
          const userData = await api.getMyData();
          dispatch({ type: 'USER_DATA_SUCCESS', payload: userData });
      }
      return result;
  }, []);
  
  const completePhoneSignup = useCallback(async (phone: string, name: string, email: string) => {
      const user = await api.completePhoneSignup(phone, name, email);
      dispatch({ type: 'SET_AUTH_STATE', payload: { isAuthenticated: true, user } });
      dispatch({ type: 'USER_DATA_SUCCESS', payload: { savedHomes: [], savedSearches: [], conversations: [] } });
      return user;
  }, []);

  const fetchProperties = useCallback(async (filters?: Filters) => {
      dispatch({ type: 'PROPERTIES_LOADING' });
      try {
          const properties = await api.getProperties(filters);
          dispatch({ type: 'PROPERTIES_SUCCESS', payload: properties });
      } catch (e: any) {
          dispatch({ type: 'PROPERTIES_ERROR', payload: e.message || 'Failed to fetch properties.'});
      }
  }, []);

  const toggleSavedHome = useCallback(async (property: Property) => {
    const isSaved = state.savedHomes.some(p => p.id === property.id);
    await api.toggleSavedHome(property.id, isSaved);
    dispatch({ type: 'TOGGLE_SAVED_HOME', payload: property });
  }, [state.savedHomes]);

  const addSavedSearch = useCallback(async (search: SavedSearch) => {
    const newSearch = await api.addSavedSearch(search);
    dispatch({ type: 'ADD_SAVED_SEARCH', payload: newSearch });
  }, []);

  const createConversation = useCallback(async (propertyId: string) => {
      console.log('createConversation called for property:', propertyId);
      const conversation = await api.createConversation(propertyId);
      console.log('API returned conversation:', conversation.id);
      console.log('Dispatching CREATE_CONVERSATION');
      dispatch({ type: 'CREATE_CONVERSATION', payload: conversation });
      console.log('CREATE_CONVERSATION dispatched');
      return conversation;
  }, []);

  const deleteConversation = useCallback(async (conversationId: string) => {
      await api.deleteConversation(conversationId);
      dispatch({ type: 'DELETE_CONVERSATION', payload: conversationId });
  }, []);

  const sendMessage = useCallback(async (conversationId: string, message: Message) => {
      const result = await api.sendMessage(conversationId, message);
      dispatch({ type: 'ADD_MESSAGE', payload: { conversationId, message: result.message }});
      // Handle security warnings if any
      if (result.securityWarnings && result.securityWarnings.length > 0) {
          console.warn('Security warnings:', result.securityWarnings);
      }
  }, []);

  const createListing = useCallback(async (property: Property) => {
      const result = await api.createListing(property);
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
      const updatedProperty = await api.updateListing(property);
      dispatch({ type: 'UPDATE_PROPERTY', payload: updatedProperty });
      return updatedProperty;
  }, []);
  
  const updateUser = useCallback(async (userData: Partial<User>) => {
      const updatedUser = await api.updateUser(userData);
      dispatch({ type: 'UPDATE_USER', payload: updatedUser });
      return updatedUser;
  }, []);

  const updateSearchPageState = useCallback((newState: Partial<SearchPageState>) => {
    dispatch({ type: 'UPDATE_SEARCH_PAGE_STATE', payload: newState });
  }, []);

  const updateSavedSearchAccessTime = useCallback(async (searchId: string, seenPropertyIds?: string[]) => {
    await api.updateSavedSearchAccessTime(searchId, seenPropertyIds);
    dispatch({ type: 'UPDATE_SAVED_SEARCH_ACCESS_TIME', payload: { searchId, seenPropertyIds } });
  }, []);

  // Listen for user updates from WebSocket (agency joins, profile changes, etc.)
  React.useEffect(() => {
    if (!state.currentUser) return;

    const handleUserUpdate = (data: any) => {
      console.log('📢 User update event:', data);

      // Handle agency-joined event
      if (data.type === 'agency-joined' && data.user) {
        dispatch({ type: 'UPDATE_USER', payload: {
          agencyId: data.user.agencyId,
          agencyName: data.user.agencyName,
        }});

        // Show notification to user
        notificationService.showNotification(
          'Agency Joined!',
          data.message || `You have joined ${data.agency?.name}!`,
          { tag: 'agency-joined' }
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
          data.message || 'You have left your agency',
          { tag: 'agency-left' }
        );
      }
    };

    const unsubscribe = socketService.onUserUpdate(handleUserUpdate);

    return () => {
      unsubscribe();
    };
  }, [state.currentUser]);

  const value = { state, dispatch, checkAuthStatus, login, signup, logout, logoutAllDevices, requestPasswordReset, resetPassword, loginWithSocial, handleOAuthCallback, sendPhoneCode, verifyPhoneCode, completePhoneSignup, fetchProperties, toggleSavedHome, addSavedSearch, createConversation, deleteConversation, sendMessage, createListing, updateListing, updateUser, updateSearchPageState, updateSavedSearchAccessTime };

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