import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import { SparklesIcon } from '../../constants';

interface ListingLimitWarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const ListingLimitWarningModal: React.FC<ListingLimitWarningModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const { t } = useTranslation(['modals']);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('listingLimit.title')}>
            <div className="text-center p-4">
                <SparklesIcon className="w-16 h-16 text-primary mx-auto mb-4" />
                <p className="text-lg text-neutral-600 mb-4">
                    {t('listingLimit.message')}
                </p>
                <p className="font-semibold text-neutral-700 mb-6">
                    {t('listingLimit.discountOffer')}
                </p>
                <button
                    onClick={onConfirm}
                    className="w-full sm:w-auto px-8 py-3 bg-secondary text-white font-bold rounded-lg shadow-md hover:bg-opacity-90 transition-transform hover:scale-105"
                >
                    {t('listingLimit.playForDiscount')}
                </button>
            </div>
        </Modal>
    );
};

export default ListingLimitWarningModal;
