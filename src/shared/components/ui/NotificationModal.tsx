import React, { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, InformationCircleIcon } from '../../../../constants';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttonLabel?: string;
  type?: NotificationType;
  icon?: React.ReactNode;
}

const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  buttonLabel,
  type = 'info',
  icon,
}) => {
  const { t } = useTranslation(['common']);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const resolvedButtonLabel = buttonLabel || t('common:ok');

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Focus button when modal opens
      setTimeout(() => buttonRef.current?.focus(), 100);
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle Enter key to close
  useEffect(() => {
    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEnter);
    return () => document.removeEventListener('keydown', handleEnter);
  }, [isOpen, onClose]);

  const handleBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  if (!isOpen) return null;

  // Type-based styling
  const typeStyles = {
    success: {
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      button: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500',
      gradient: 'from-emerald-500 to-teal-600',
    },
    error: {
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
      gradient: 'from-red-500 to-rose-600',
    },
    warning: {
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      button: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
      gradient: 'from-amber-500 to-orange-600',
    },
    info: {
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
      gradient: 'from-blue-500 to-indigo-600',
    },
  };

  const styles = typeStyles[type];

  // Default icons based on type
  const defaultIcons = {
    success: <CheckCircleIcon className="w-6 h-6" />,
    error: <XCircleIcon className="w-6 h-6" />,
    warning: <ExclamationTriangleIcon className="w-6 h-6" />,
    info: <InformationCircleIcon className="w-6 h-6" />,
  };

  const displayIcon = icon || defaultIcons[type];

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex justify-center items-center p-4"
      onClick={handleBackdropClick}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="notification-title"
      aria-describedby="notification-message"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full relative overflow-hidden animate-fade-in"
        onClick={handleContentClick}
      >
        {/* Decorative gradient header */}
        <div className={`h-1.5 bg-gradient-to-r ${styles.gradient}`} />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors z-10"
          aria-label="Close"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-6 pt-8">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className={`${styles.iconBg} ${styles.iconColor} p-4 rounded-full shadow-lg`}>
              {displayIcon}
            </div>
          </div>

          {/* Title */}
          <h3
            id="notification-title"
            className="text-xl font-bold text-center mb-3 text-slate-900"
          >
            {title}
          </h3>

          {/* Message */}
          <p
            id="notification-message"
            className="text-slate-600 text-center mb-6 leading-relaxed whitespace-pre-line"
          >
            {message}
          </p>

          {/* Action Button */}
          <div className="flex justify-center">
            <button
              ref={buttonRef}
              onClick={onClose}
              className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 text-white ${styles.button} shadow-lg hover:shadow-xl transform hover:-translate-y-0.5`}
            >
              {resolvedButtonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;
