// Auth State - Authentication and user management
// Pure state definition with actions (MVI pattern)

import { User } from '../../../domain/entities/User';

export type AuthModalView = 'login' | 'signup' | 'forgotPassword' | 'forgotPasswordSuccess' | 'phoneCode' | 'phoneDetails';

export class AuthState {
  constructor(
    public readonly isAuthenticating: boolean = true,
    public readonly isAuthenticated: boolean = false,
    public readonly currentUser: User | null = null,
    public readonly isAuthModalOpen: boolean = false,
    public readonly authModalView: AuthModalView = 'login',
    public readonly pendingSubscription: {
      planName: string;
      planPrice: number;
      planInterval: 'month' | 'year';
      discountPercent?: number;
      modalType: 'buyer' | 'seller';
    } | null = null
  ) {}

  static getInitialState(): AuthState {
    return new AuthState();
  }
}

// Actions - User intents for authentication
export type AuthAction =
  | { type: 'AUTH_CHECK_START' }
  | { type: 'AUTH_CHECK_COMPLETE'; payload: { isAuthenticated: boolean; user: User | null } }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'SIGNUP_SUCCESS'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'TOGGLE_AUTH_MODAL'; payload: { isOpen: boolean; view?: AuthModalView } }
  | { type: 'SET_AUTH_MODAL_VIEW'; payload: AuthModalView }
  | { type: 'SET_PENDING_SUBSCRIPTION'; payload: AuthState['pendingSubscription'] };

// Reducer
export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_CHECK_START':
      return new AuthState(
        true,
        state.isAuthenticated,
        state.currentUser,
        state.isAuthModalOpen,
        state.authModalView,
        state.pendingSubscription
      );

    case 'AUTH_CHECK_COMPLETE':
      return new AuthState(
        false,
        action.payload.isAuthenticated,
        action.payload.user,
        state.isAuthModalOpen,
        state.authModalView,
        state.pendingSubscription
      );

    case 'LOGIN_SUCCESS':
    case 'SIGNUP_SUCCESS':
      return new AuthState(
        false,
        true,
        action.payload,
        false,
        'login',
        state.pendingSubscription
      );

    case 'LOGOUT':
      return new AuthState(
        false,
        false,
        null,
        false,
        'login',
        null
      );

    case 'UPDATE_USER':
      if (!state.currentUser) return state;
      const updatedUser = new User(
        state.currentUser.id,
        action.payload.name ?? state.currentUser.name,
        action.payload.email ?? state.currentUser.email,
        action.payload.phone ?? state.currentUser.phone,
        action.payload.role ?? state.currentUser.role,
        action.payload.isSubscribed ?? state.currentUser.isSubscribed,
        action.payload.avatarUrl ?? state.currentUser.avatarUrl,
        action.payload.city ?? state.currentUser.city,
        action.payload.country ?? state.currentUser.country,
        action.payload.agencyName ?? state.currentUser.agencyName,
        action.payload.agentId ?? state.currentUser.agentId,
        action.payload.agencyId ?? state.currentUser.agencyId,
        action.payload.licenseNumber ?? state.currentUser.licenseNumber,
        action.payload.licenseVerified ?? state.currentUser.licenseVerified,
        action.payload.licenseVerificationDate ?? state.currentUser.licenseVerificationDate,
        action.payload.listingsCount ?? state.currentUser.listingsCount,
        action.payload.totalListingsCreated ?? state.currentUser.totalListingsCreated,
        action.payload.testimonials ?? state.currentUser.testimonials,
        action.payload.publicKey ?? state.currentUser.publicKey,
        state.currentUser._id
      );
      return new AuthState(
        state.isAuthenticating,
        state.isAuthenticated,
        updatedUser,
        state.isAuthModalOpen,
        state.authModalView,
        state.pendingSubscription
      );

    case 'TOGGLE_AUTH_MODAL':
      return new AuthState(
        state.isAuthenticating,
        state.isAuthenticated,
        state.currentUser,
        action.payload.isOpen,
        action.payload.view || state.authModalView,
        state.pendingSubscription
      );

    case 'SET_AUTH_MODAL_VIEW':
      return new AuthState(
        state.isAuthenticating,
        state.isAuthenticated,
        state.currentUser,
        state.isAuthModalOpen,
        action.payload,
        state.pendingSubscription
      );

    case 'SET_PENDING_SUBSCRIPTION':
      return new AuthState(
        state.isAuthenticating,
        state.isAuthenticated,
        state.currentUser,
        state.isAuthModalOpen,
        state.authModalView,
        action.payload
      );

    default:
      return state;
  }
}
