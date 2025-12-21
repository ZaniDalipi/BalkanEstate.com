import React, { createContext, useContext, useState, useCallback } from 'react';
import AlertDialog, { AlertType, AlertAction } from '../components/shared/AlertDialog';

interface AlertConfig {
  type: AlertType;
  title: string;
  message: string;
  actions?: AlertAction[];
  showCloseButton?: boolean;
  icon?: React.ReactNode;
}

interface AlertContextType {
  showAlert: (config: AlertConfig) => void;
  showError: (title: string, message: string, actions?: AlertAction[]) => void;
  showWarning: (title: string, message: string, actions?: AlertAction[]) => void;
  showSuccess: (title: string, message: string, actions?: AlertAction[]) => void;
  showInfo: (title: string, message: string, actions?: AlertAction[]) => void;
  closeAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alert, setAlert] = useState<AlertConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const showAlert = useCallback((config: AlertConfig) => {
    setAlert(config);
    setIsOpen(true);
  }, []);

  const showError = useCallback((title: string, message: string, actions?: AlertAction[]) => {
    showAlert({
      type: 'error',
      title,
      message,
      actions: actions || [{ label: 'Close', onClick: () => setIsOpen(false), variant: 'secondary' }],
    });
  }, [showAlert]);

  const showWarning = useCallback((title: string, message: string, actions?: AlertAction[]) => {
    showAlert({
      type: 'warning',
      title,
      message,
      actions: actions || [{ label: 'Close', onClick: () => setIsOpen(false), variant: 'secondary' }],
    });
  }, [showAlert]);

  const showSuccess = useCallback((title: string, message: string, actions?: AlertAction[]) => {
    showAlert({
      type: 'success',
      title,
      message,
      actions: actions || [{ label: 'Close', onClick: () => setIsOpen(false), variant: 'secondary' }],
    });
  }, [showAlert]);

  const showInfo = useCallback((title: string, message: string, actions?: AlertAction[]) => {
    showAlert({
      type: 'info',
      title,
      message,
      actions: actions || [{ label: 'Close', onClick: () => setIsOpen(false), variant: 'secondary' }],
    });
  }, [showAlert]);

  const closeAlert = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert, showError, showWarning, showSuccess, showInfo, closeAlert }}>
      {children}
      {alert && (
        <AlertDialog
          isOpen={isOpen}
          onClose={closeAlert}
          type={alert.type}
          title={alert.title}
          message={alert.message}
          actions={alert.actions}
          showCloseButton={alert.showCloseButton}
          icon={alert.icon}
        />
      )}
    </AlertContext.Provider>
  );
};

export const useAlert = (): AlertContextType => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
