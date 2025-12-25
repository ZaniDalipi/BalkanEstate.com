import React from 'react';
import { XMarkIcon } from '../../constants';

export type AlertType = 'error' | 'warning' | 'success' | 'info';

export interface AlertAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  href?: string; // Optional link for navigation
}

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: AlertType;
  title: string;
  message: string;
  actions?: AlertAction[];
  showCloseButton?: boolean;
  icon?: React.ReactNode;
}

const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  type,
  title,
  message,
  actions,
  showCloseButton = true,
  icon,
}) => {
  if (!isOpen) return null;

  // Icon colors and backgrounds based on type
  const typeStyles = {
    error: {
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      titleColor: 'text-red-900',
      borderColor: 'border-red-200',
    },
    warning: {
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      titleColor: 'text-amber-900',
      borderColor: 'border-amber-200',
    },
    success: {
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      titleColor: 'text-green-900',
      borderColor: 'border-green-200',
    },
    info: {
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      titleColor: 'text-blue-900',
      borderColor: 'border-blue-200',
    },
  };

  const styles = typeStyles[type];

  // Default icons for each type
  const defaultIcons = {
    error: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    warning: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    success: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    info: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  const displayIcon = icon || defaultIcons[type];

  // Default actions if none provided
  const displayActions = actions || [
    {
      label: 'Close',
      onClick: onClose,
      variant: 'secondary' as const,
    },
  ];

  const getButtonClasses = (variant?: 'primary' | 'secondary' | 'danger') => {
    const baseClasses = 'px-4 py-2 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';

    switch (variant) {
      case 'primary':
        return `${baseClasses} bg-primary text-white hover:bg-primary-dark focus:ring-primary`;
      case 'danger':
        return `${baseClasses} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500`;
      case 'secondary':
      default:
        return `${baseClasses} bg-neutral-200 text-neutral-800 hover:bg-neutral-300 focus:ring-neutral-400`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex justify-center items-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 transition-colors z-10"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}

        {/* Content */}
        <div className="p-6">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className={`${styles.iconBg} ${styles.iconColor} p-3 rounded-full`}>
              {displayIcon}
            </div>
          </div>

          {/* Title */}
          <h3 className={`text-xl font-bold text-center mb-3 ${styles.titleColor}`}>
            {title}
          </h3>

          {/* Message */}
          <p className="text-neutral-700 text-center mb-6 leading-relaxed">
            {message}
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {displayActions.map((action, index) => (
              action.href ? (
                <a
                  key={index}
                  href={action.href}
                  className={getButtonClasses(action.variant)}
                  onClick={action.onClick}
                >
                  {action.label}
                </a>
              ) : (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={getButtonClasses(action.variant)}
                >
                  {action.label}
                </button>
              )
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertDialog;
