// UI Store - Client-side UI state with Zustand
// Manages modals, sidebars, and UI preferences

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type AuthModalView = 'login' | 'signup' | 'forgotPassword' | 'forgotPasswordSuccess' | 'phoneCode' | 'phoneDetails';
export type AppView = 'search' | 'saved-searches' | 'saved-properties' | 'inbox' | 'account' | 'create-listing' | 'agents' | 'agencies' | 'agentProfile' | 'agencyDetail' | 'admin';

interface UIState {
  // Modal states
  isAuthModalOpen: boolean;
  authModalView: AuthModalView;
  isPricingModalOpen: boolean;
  isSubscriptionModalOpen: boolean;
  isEnterpriseModalOpen: boolean;
  isFiltersOpen: boolean;
  isListingLimitWarningOpen: boolean;
  isDiscountGameOpen: boolean;

  // Active selections
  selectedPropertyId: string | null;
  selectedAgentId: string | null;
  selectedAgencyId: string | null;
  activeView: AppView;
  activeConversationId: string | null;

  // UI flags
  isFirstLoginOffer: boolean;
  isAgencyCreationMode: boolean;

  // Actions - Modals
  openAuthModal: (view?: AuthModalView) => void;
  closeAuthModal: () => void;
  setAuthModalView: (view: AuthModalView) => void;
  openPricingModal: (isOffer?: boolean, isAgencyMode?: boolean) => void;
  closePricingModal: () => void;
  openSubscriptionModal: () => void;
  closeSubscriptionModal: () => void;
  openEnterpriseModal: () => void;
  closeEnterpriseModal: () => void;
  toggleFilters: () => void;
  openListingLimitWarning: () => void;
  closeListingLimitWarning: () => void;
  openDiscountGame: () => void;
  closeDiscountGame: () => void;

  // Actions - Selections
  setSelectedProperty: (id: string | null) => void;
  setSelectedAgent: (id: string | null) => void;
  setSelectedAgency: (id: string | null) => void;
  setActiveView: (view: AppView) => void;
  setActiveConversation: (id: string | null) => void;

  // Actions - Flags
  setFirstLoginOffer: (value: boolean) => void;
  setAgencyCreationMode: (value: boolean) => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      // Initial state
      isAuthModalOpen: false,
      authModalView: 'login',
      isPricingModalOpen: false,
      isSubscriptionModalOpen: false,
      isEnterpriseModalOpen: false,
      isFiltersOpen: false,
      isListingLimitWarningOpen: false,
      isDiscountGameOpen: false,
      selectedPropertyId: null,
      selectedAgentId: null,
      selectedAgencyId: null,
      activeView: 'search',
      activeConversationId: null,
      isFirstLoginOffer: false,
      isAgencyCreationMode: false,

      // Modal actions
      openAuthModal: (view = 'login') => set({ isAuthModalOpen: true, authModalView: view }),
      closeAuthModal: () => set({ isAuthModalOpen: false }),
      setAuthModalView: (view) => set({ authModalView: view }),

      openPricingModal: (isOffer = false, isAgencyMode = false) =>
        set({
          isPricingModalOpen: true,
          isFirstLoginOffer: isOffer,
          isAgencyCreationMode: isAgencyMode
        }),
      closePricingModal: () => set({ isPricingModalOpen: false }),

      openSubscriptionModal: () => set({ isSubscriptionModalOpen: true }),
      closeSubscriptionModal: () => set({ isSubscriptionModalOpen: false }),

      openEnterpriseModal: () => set({ isEnterpriseModalOpen: true }),
      closeEnterpriseModal: () => set({ isEnterpriseModalOpen: false }),

      toggleFilters: () => set((state) => ({ isFiltersOpen: !state.isFiltersOpen })),

      openListingLimitWarning: () => set({ isListingLimitWarningOpen: true }),
      closeListingLimitWarning: () => set({ isListingLimitWarningOpen: false }),

      openDiscountGame: () => set({ isDiscountGameOpen: true }),
      closeDiscountGame: () => set({ isDiscountGameOpen: false }),

      // Selection actions
      setSelectedProperty: (id) => set({ selectedPropertyId: id }),
      setSelectedAgent: (id) => set({ selectedAgentId: id }),
      setSelectedAgency: (id) => set({ selectedAgencyId: id }),
      setActiveView: (view) => set({ activeView: view }),
      setActiveConversation: (id) => set({ activeConversationId: id }),

      // Flag actions
      setFirstLoginOffer: (value) => set({ isFirstLoginOffer: value }),
      setAgencyCreationMode: (value) => set({ isAgencyCreationMode: value }),
    }),
    { name: 'ui-store' }
  )
);

// Selector hooks for better performance
export const useAuthModal = () => useUIStore((state) => ({
  isOpen: state.isAuthModalOpen,
  view: state.authModalView,
  open: state.openAuthModal,
  close: state.closeAuthModal,
  setView: state.setAuthModalView,
}));

export const usePricingModal = () => useUIStore((state) => ({
  isOpen: state.isPricingModalOpen,
  open: state.openPricingModal,
  close: state.closePricingModal,
}));

export const useSelectedProperty = () => useUIStore((state) => ({
  id: state.selectedPropertyId,
  setId: state.setSelectedProperty,
}));
