import React, { useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '../../constants';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
  maxWidth?: string;
  /** @deprecated all modals are now full-screen on mobile */
  fullScreenOnMobile?: boolean;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'lg', maxWidth }) => {
  // Lock body scroll when modal is open to prevent map jumping
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  const titleId = title ? 'modal-title' : undefined;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-md z-[5000] flex items-stretch sm:items-center justify-center p-0 sm:p-3 md:p-4 overflow-x-hidden overflow-y-auto"
      onClick={handleBackdropClick}
      aria-hidden="true"
    >
      <div
        className={`bg-white shadow-xl p-4 md:p-6 w-full ${sizeClass} relative overflow-y-auto h-full sm:h-auto rounded-none sm:rounded-lg max-h-full sm:max-h-[95vh] md:max-h-[90vh]`}
        onClick={handleContentClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button type="button" onClick={onClose} className="absolute top-3 right-3 sm:top-4 sm:right-4 text-neutral-500 hover:text-neutral-800 z-10 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Close modal">
          <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        {title && <h2 id={titleId} className="text-base sm:text-lg md:text-xl font-bold text-neutral-800 mb-3 text-center pr-10">{title}</h2>}
        <div className="overflow-x-hidden">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default memo(Modal);