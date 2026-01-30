import React, { useEffect, useCallback, useRef, memo } from 'react';
import { XMarkIcon } from '../../constants';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
  maxWidth?: string;
  'aria-describedby'?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'lg',
  maxWidth,
  'aria-describedby': ariaDescribedBy,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = title ? `modal-title-${Math.random().toString(36).substr(2, 9)}` : undefined;

  // Lock body scroll when modal is open to prevent map jumping
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Focus the close button when modal opens for accessibility
      closeButtonRef.current?.focus();
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }

      // Trap focus within modal
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  if (!isOpen) return null;

  // Use custom maxWidth if provided, otherwise map size to class
  let sizeClass = maxWidth || 'max-w-lg';
  if (!maxWidth) {
    const sizeMap: Record<string, string> = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      '2xl': 'max-w-2xl',
      '3xl': 'max-w-3xl',
      '4xl': 'max-w-4xl',
      '5xl': 'max-w-5xl',
      '6xl': 'max-w-6xl',
      '7xl': 'max-w-7xl',
    };
    sizeClass = sizeMap[size || 'lg'] || 'max-w-lg';
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[5000] flex justify-center items-center p-2 sm:p-3 md:p-4 overflow-x-hidden overflow-y-auto"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={ariaDescribedBy}
        className={`
          bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/10
          p-3 sm:p-4 md:p-6 w-full ${sizeClass} relative
          overflow-y-auto border border-white/50
          max-h-[calc(100vh-1rem)] sm:max-h-[95vh] md:max-h-[90vh]
          landscape:max-h-[calc(100vh-1rem)] landscape:sm:max-h-[85vh]
        `}
        onClick={handleContentClick}
      >
        <button
          ref={closeButtonRef}
          onClick={onClose}
          className="
            absolute top-2 right-2 sm:top-3 sm:right-3 md:top-4 md:right-4
            text-neutral-600 hover:text-neutral-800 z-20
            min-h-[44px] min-w-[44px] flex items-center justify-center
            rounded-full bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300
            transition-colors touch-manipulation shadow-sm
            focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
          "
          aria-label="Close modal"
        >
          <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        {title && (
          <h2
            id={titleId}
            className="text-base sm:text-lg md:text-xl font-bold text-neutral-800 mb-3 text-center pr-12"
          >
            {title}
          </h2>
        )}
        <div className="overflow-x-hidden">{children}</div>
      </div>
    </div>
  );
};

export default memo(Modal);