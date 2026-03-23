import React from 'react';
import Modal from '@/src/shared/components/ui/Modal';
import PromotionSelector from './PromotionSelector';

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyTitle?: string;
  onSuccess?: () => void;
  // Extension mode props
  isExtension?: boolean;
  promotionId?: string;
  currentTier?: 'featured' | 'highlight' | 'premium';
  currentEndDate?: Date;
  // Urgent badge mode props
  focusUrgent?: boolean;
  hasUrgentBadge?: boolean;
  // Full-screen elevated style (used from My Promotions page)
  elevated?: boolean;
}

const PromotionModal: React.FC<PromotionModalProps> = ({
  isOpen,
  onClose,
  propertyId,
  propertyTitle,
  onSuccess,
  isExtension = false,
  promotionId,
  currentTier,
  currentEndDate,
  focusUrgent = false,
  hasUrgentBadge = false,
  elevated = false,
}) => {
  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess();
    }
    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen) return null;

  // Apple-style elevated full-screen layout
  if (elevated) {
    return (
      <div className="fixed inset-0 z-[5000] bg-[#f5f5f7] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="fixed top-4 right-4 z-[5001] min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white/80 backdrop-blur-md hover:bg-white text-neutral-500 hover:text-neutral-800 transition-all shadow-lg shadow-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Close modal"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Elevated content card */}
        <div className="min-h-full flex items-start justify-center px-4 py-8 sm:px-6 md:px-8 lg:py-12">
          <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl shadow-black/[0.08] ring-1 ring-black/[0.04] overflow-hidden">
            <PromotionSelector
              propertyId={propertyId}
              onSuccess={handleSuccess}
              onSkip={handleSkip}
              inModal={false}
              isExtension={isExtension}
              promotionId={promotionId}
              currentTier={currentTier}
              currentEndDate={currentEndDate}
              focusUrgent={focusUrgent}
              hasUrgentBadge={hasUrgentBadge}
            />
          </div>
        </div>
      </div>
    );
  }

  // Default: standard full-screen modal
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      fullScreenBreakpoint="always"
    >
      <PromotionSelector
        propertyId={propertyId}
        onSuccess={handleSuccess}
        onSkip={handleSkip}
        inModal={false}
        isExtension={isExtension}
        promotionId={promotionId}
        currentTier={currentTier}
        currentEndDate={currentEndDate}
        focusUrgent={focusUrgent}
        hasUrgentBadge={hasUrgentBadge}
      />
    </Modal>
  );
};

export default PromotionModal;
