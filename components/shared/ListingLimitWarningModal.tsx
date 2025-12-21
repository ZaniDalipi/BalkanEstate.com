import React from 'react';
import Modal from './Modal';
import { SparklesIcon } from '../../constants';

interface ListingLimitWarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const ListingLimitWarningModal: React.FC<ListingLimitWarningModalProps> = ({ isOpen, onClose, onConfirm }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Free Listing Limit Reached">
            <div className="text-center p-4">
                <SparklesIcon className="w-16 h-16 text-primary mx-auto mb-4" />
                <p className="text-lg text-neutral-600 mb-4">
                    You've used all your free listings! To publish more, you'll need to subscribe.
                </p>
                <p className="font-semibold text-neutral-700 mb-6">
                    But first, play a quick game for a chance to win a big discount on your first subscription!
                </p>
                <button
                    onClick={onConfirm}
                    className="w-full sm:w-auto px-8 py-3 bg-secondary text-white font-bold rounded-lg shadow-md hover:bg-opacity-90 transition-transform hover:scale-105"
                >
                    Play for a Discount!
                </button>
            </div>
        </Modal>
    );
};

export default ListingLimitWarningModal;
