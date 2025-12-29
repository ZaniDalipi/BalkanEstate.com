import React, { useState, useCallback, createContext, useContext, ReactNode } from 'react';
import NotificationModal, { NotificationType } from '../components/ui/NotificationModal';

export interface NotificationOptions {
  title: string;
  message: string;
  type?: NotificationType;
  buttonLabel?: string;
  icon?: React.ReactNode;
}

interface NotificationContextValue {
  notify: (options: NotificationOptions) => Promise<void>;
  success: (title: string, message: string) => Promise<void>;
  error: (title: string, message: string) => Promise<void>;
  warning: (title: string, message: string) => Promise<void>;
  info: (title: string, message: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

interface NotificationState extends NotificationOptions {
  isOpen: boolean;
  resolve: (() => void) | null;
}

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<NotificationState>({
    isOpen: false,
    title: '',
    message: '',
    resolve: null,
  });

  const notify = useCallback((options: NotificationOptions): Promise<void> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        ...options,
        resolve,
      });
    });
  }, []);

  const handleClose = useCallback(() => {
    if (state.resolve) {
      state.resolve();
    }
    setState((prev) => ({ ...prev, isOpen: false, resolve: null }));
  }, [state.resolve]);

  // Convenience methods for common notification types
  const success = useCallback((title: string, message: string) => {
    return notify({ title, message, type: 'success' });
  }, [notify]);

  const error = useCallback((title: string, message: string) => {
    return notify({ title, message, type: 'error' });
  }, [notify]);

  const warning = useCallback((title: string, message: string) => {
    return notify({ title, message, type: 'warning' });
  }, [notify]);

  const info = useCallback((title: string, message: string) => {
    return notify({ title, message, type: 'info' });
  }, [notify]);

  return (
    <NotificationContext.Provider value={{ notify, success, error, warning, info }}>
      {children}
      <NotificationModal
        isOpen={state.isOpen}
        onClose={handleClose}
        title={state.title}
        message={state.message}
        type={state.type}
        buttonLabel={state.buttonLabel}
        icon={state.icon}
      />
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextValue => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export default useNotification;
