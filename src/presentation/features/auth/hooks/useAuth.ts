// useAuth Hook - Connects auth use cases to UI
// Custom hook that uses domain use cases for authentication

import { useCallback } from 'react';
import { useAuthContext } from '../state/AuthContext';
import { LoginUseCase, SignupUseCase, LogoutUseCase } from '../../../../domain/usecases/auth';
import { authRepository } from '../../../../data/repositories/AuthRepository';
import { User } from '../../../../domain/entities/User';
import { socketService } from '../../../../../services/socketService';
import { notificationService } from '../../../../../services/notificationService';

// Initialize use cases
const loginUseCase = new LoginUseCase(authRepository);
const signupUseCase = new SignupUseCase(authRepository);
const logoutUseCase = new LogoutUseCase(authRepository);

export function useAuth() {
  const { state, dispatch } = useAuthContext();

  const checkAuthStatus = useCallback(async () => {
    dispatch({ type: 'AUTH_CHECK_START' });
    try {
      const user = await authRepository.getCurrentUser();
      dispatch({ type: 'AUTH_CHECK_COMPLETE', payload: { isAuthenticated: !!user, user } });

      if (user) {
        // Connect to WebSocket
        const token = localStorage.getItem('balkan_estate_token');
        if (token) {
          socketService.connect(token, user.id);
        }
      }
    } catch (error) {
      dispatch({ type: 'AUTH_CHECK_COMPLETE', payload: { isAuthenticated: false, user: null } });
    }
  }, [dispatch]);

  const login = useCallback(async (emailOrPhone: string, password: string): Promise<User> => {
    const { user, token } = await loginUseCase.execute({ email: emailOrPhone, password });

    dispatch({ type: 'LOGIN_SUCCESS', payload: user });

    // Connect to WebSocket
    socketService.connect(token, user.id);

    // Initialize browser notifications
    notificationService.initialize();

    return user;
  }, [dispatch]);

  const signup = useCallback(async (
    email: string,
    password: string,
    options?: {
      name?: string;
      phone?: string;
      role?: 'buyer' | 'private_seller' | 'agent';
    }
  ): Promise<User> => {
    const { user, token } = await signupUseCase.execute({
      email,
      password,
      name: options?.name || email.split('@')[0],
      phone: options?.phone || '',
      role: options?.role || 'buyer',
    });

    dispatch({ type: 'SIGNUP_SUCCESS', payload: user });

    // Connect to WebSocket
    socketService.connect(token, user.id);

    // Initialize browser notifications
    notificationService.initialize();

    return user;
  }, [dispatch]);

  const logout = useCallback(async () => {
    await logoutUseCase.execute();

    // Disconnect from WebSocket
    socketService.disconnect();

    dispatch({ type: 'LOGOUT' });
  }, [dispatch]);

  const requestPasswordReset = useCallback(async (email: string) => {
    await authRepository.requestPasswordReset(email);
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string): Promise<User> => {
    await authRepository.resetPassword(token, newPassword);
    const user = await authRepository.getCurrentUser();
    if (user) {
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
      return user;
    }
    throw new Error('Failed to get user after password reset');
  }, [dispatch]);

  const updateUser = useCallback(async (userData: Partial<User>): Promise<User> => {
    if (!state.currentUser) {
      throw new Error('No user logged in');
    }

    // TODO: Use UpdateUserProfileUseCase when it's ready
    // For now, update state directly
    dispatch({ type: 'UPDATE_USER', payload: userData });

    return state.currentUser;
  }, [state.currentUser, dispatch]);

  const toggleAuthModal = useCallback((isOpen: boolean, view?: string) => {
    dispatch({
      type: 'TOGGLE_AUTH_MODAL',
      payload: { isOpen, view: view as any },
    });
  }, [dispatch]);

  const setAuthModalView = useCallback((view: string) => {
    dispatch({ type: 'SET_AUTH_MODAL_VIEW', payload: view as any });
  }, [dispatch]);

  return {
    // State
    isAuthenticating: state.isAuthenticating,
    isAuthenticated: state.isAuthenticated,
    currentUser: state.currentUser,
    isAuthModalOpen: state.isAuthModalOpen,
    authModalView: state.authModalView,

    // Actions
    checkAuthStatus,
    login,
    signup,
    logout,
    requestPasswordReset,
    resetPassword,
    updateUser,
    toggleAuthModal,
    setAuthModalView,
  };
}
