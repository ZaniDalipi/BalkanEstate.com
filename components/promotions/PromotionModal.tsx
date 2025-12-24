import React from 'react';
import Modal from '../shared/Modal';
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
    >
      <PromotionSelector
        propertyId={propertyId}
        onSuccess={handleSuccess}
        onSkip={handleSkip}
        inModal={true}
        isExtension={isExtension}
        promotionId={promotionId}
        currentTier={currentTier}
        currentEndDate={currentEndDate}
      />
    </Modal>
  );
};

export default PromotionModal;
