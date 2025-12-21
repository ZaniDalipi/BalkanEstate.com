import React from 'react';
import Modal from './Modal';
import WhackAnIconAnimation from '../SellerFlow/WhackAnIconAnimation';

interface DiscountGameModalProps {
    isOpen: boolean;
    onGameComplete: (discounts: { proYearly: number; proMonthly: number; enterprise: number; }) => void;
}

const DiscountGameModal: React.FC<DiscountGameModalProps> = ({ isOpen, onGameComplete }) => {

    const handleGameEnd = async (score: number, totalMoles: number) => {
        const ratio = totalMoles > 0 ? score / totalMoles : 0;

        // Calculate discounts based on performance
        // Pro Yearly gets up to 50%, others up to 30%
        const discounts = {
            proYearly: Math.round(ratio * 50),
            proMonthly: Math.round(ratio * 30),
            enterprise: Math.round(ratio * 30),
        };

        // Generate discount code on backend
        try {
            const token = localStorage.getItem('balkan_estate_token');
            if (token) {
                // Use the highest discount as the code value
                const maxDiscount = Math.max(discounts.proYearly, discounts.proMonthly, discounts.enterprise);

                await fetch('http://localhost:5001/api/discount-codes', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        code: `GAME${maxDiscount}-${Date.now().toString(36).toUpperCase().slice(-6)}`,
                        discountType: 'percentage',
                        discountValue: maxDiscount,
                        validUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
                        usageLimit: 1,
                        description: `Gamification reward: ${maxDiscount}% discount (Score: ${score}/${totalMoles})`,
                        source: 'gamification',
                    }),
                });

                // Reset ad view counter since they earned their reward
                localStorage.setItem('balkan_estate_ad_views', '0');
            }
        } catch (error) {
            console.error('Failed to generate discount code:', error);
        }

        // A small delay to show the final score before transitioning
        setTimeout(() => {
            onGameComplete(discounts);
        }, 2000);
    };

    // This modal cannot be closed by the user to ensure they play the game.
    const handleClose = () => {};

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="2xl">
            <WhackAnIconAnimation mode="game" onGameEnd={handleGameEnd} />
        </Modal>
    );
};

export default DiscountGameModal;
