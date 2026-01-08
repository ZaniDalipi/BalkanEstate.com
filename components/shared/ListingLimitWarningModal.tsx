import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';

// Game controller icon for play
const GameIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
);

// Gift/discount icon
const GiftIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
);

interface ListingLimitWarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    tierName?: string; // e.g., "Free", "Pro Monthly", "Pro Yearly"
    listingLimit?: number; // The actual limit for this tier
}

const ListingLimitWarningModal: React.FC<ListingLimitWarningModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    tierName = 'Free',
    listingLimit = 3,
}) => {
    const { t } = useTranslation(['modals']);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="">
            <div className="text-center p-4 sm:p-6">
                {/* Animated icon container */}
                <div className="relative w-24 h-24 mx-auto mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full opacity-20 animate-pulse"></div>
                    <div className="absolute inset-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                        <GiftIcon className="w-10 h-10 text-white" />
                    </div>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-neutral-800 mb-3">
                    {t('listingLimit.title', 'Listing Limit Reached')}
                </h3>

                {/* Message - Dynamic based on tier */}
                <p className="text-neutral-600 mb-4">
                    {t('listingLimit.messageDynamic', `You've reached your ${tierName} tier limit of ${listingLimit} active listings.`, { tierName, limit: listingLimit })}
                </p>

                {/* Draft saved notice */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
                    <p className="text-sm text-green-700 flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {t('listingLimit.draftSaved', "Don't worry! Your listing has been saved as a draft.")}
                    </p>
                </div>

                {/* Discount offer */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-4 mb-6">
                    <p className="font-bold text-amber-800 text-lg mb-1">
                        {t('listingLimit.discountOffer', 'Win up to 50% OFF!')}
                    </p>
                    <p className="text-sm text-amber-700">
                        {t('listingLimit.gameDescription', 'Play a quick game to win a discount on your Pro subscription. Get up to 250 listings + promotions!')}
                    </p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={onConfirm}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg shadow-lg hover:from-amber-600 hover:to-orange-600 transition-all transform hover:scale-105"
                    >
                        <GameIcon className="w-5 h-5" />
                        {t('listingLimit.playForDiscount', 'Play for Discount')}
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3 bg-neutral-100 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-200 transition-colors"
                    >
                        {t('listingLimit.maybeLater', 'Maybe Later')}
                    </button>
                </div>

                {/* Small note */}
                <p className="text-xs text-neutral-500 mt-4">
                    {t('listingLimit.draftNote', 'Your draft will be waiting for you when you come back.')}
                </p>
            </div>
        </Modal>
    );
};

export default ListingLimitWarningModal;
