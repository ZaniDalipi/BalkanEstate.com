import React, { useEffect, useCallback, memo } from 'react';
import { XMarkIcon } from '../../constants';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
  maxWidth?: string;
  fullScreenOnMobile?: boolean;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'lg', maxWidth, fullScreenOnMobile = false }) => {
  // Lock body scroll when modal is open to prevent map jumping
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

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

  // Full screen mobile classes
  const mobileFullScreenClasses = fullScreenOnMobile
    ? 'fixed inset-0 sm:relative sm:inset-auto rounded-none sm:rounded-lg max-h-full sm:max-h-[95vh] md:max-h-[90vh]'
    : 'rounded-lg max-h-screen sm:max-h-[95vh] md:max-h-[90vh]';

  // For fullScreenOnMobile: no backdrop on mobile (modal fills screen), blurry backdrop on desktop
  // For regular modals: blurry backdrop on all screen sizes
  const backdropClasses = fullScreenOnMobile
    ? 'fixed inset-0 bg-transparent sm:bg-black/30 sm:backdrop-blur-md z-[5000] flex justify-center items-center p-0 sm:p-3 md:p-4 overflow-x-hidden overflow-y-auto'
    : 'fixed inset-0 bg-black/30 backdrop-blur-md z-[5000] flex justify-center items-center p-2 sm:p-3 md:p-4 overflow-x-hidden overflow-y-auto';

  return (
    <div className={backdropClasses} onClick={handleBackdropClick}>
      <div
        className={`bg-white shadow-xl p-4 sm:p-4 md:p-6 w-full ${sizeClass} relative overflow-y-auto ${mobileFullScreenClasses}`}
        onClick={handleContentClick}
      >
        <button onClick={onClose} className="absolute top-3 right-3 sm:top-4 sm:right-4 text-neutral-500 hover:text-neutral-800 z-10 p-1" aria-label="Close modal">
          <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        {title && <h2 className="text-base sm:text-lg md:text-xl font-bold text-neutral-800 mb-3 text-center pr-10">{title}</h2>}
        <div className="overflow-x-hidden">{children}</div>
      </div>
    </div>
  );
};

export default memo(Modal);