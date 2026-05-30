import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import PaymentWindow from './PaymentWindow';
import { SparklesIcon, BoltIcon, ChartBarIcon } from '../../constants';
import { useAppContext } from '../../context/AppContext';
import { Property } from '../../types';
import { useSellerProducts, Product } from '@/src/shared/query';
import { API_URL } from '../../src/shared/api/config';
import { csrfHeaders, ensureCsrfToken } from '../../src/shared/api/httpClient';
import { tokenService } from '../../src/shared/api/tokenService';

interface PromotionOfferModalProps {
    isOpen: boolean;
    onClose: () => void;
    property: Property | null;
    onPromotionComplete?: (success: boolean) => void;
}

const TickIcon: React.FC = () => (
    <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
    </svg>
);

const PromotionOfferModal: React.FC<PromotionOfferModalProps> = ({
    isOpen,
    onClose,
    property,
    onPromotionComplete
}) => {
    const { t } = useTranslation(['common']);
    const { state, dispatch } = useAppContext();
    const { currentUser } = state;
    const [showPaymentWindow, setShowPaymentWindow] = useState(false);
    const [showPaymentError, setShowPaymentError] = useState(false);
    const [paymentErrorMessage, setPaymentErrorMessage] = useState('');
    const [selectedPlan, setSelectedPlan] = useState<{
        name: string;
        price: number;
        productId: string;
    } | null>(null);

    // Use React Query for reactive product data - automatically syncs with admin changes
    const { data: products = [], isLoading: loading } = useSellerProducts();

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setShowPaymentWindow(false);
            setShowPaymentError(false);
            setPaymentErrorMessage('');
            setSelectedPlan(null);
        }
    }, [isOpen]);

    const handlePromote = (planName: string, price: number, productId: string) => {
        // Check if user is authenticated
        if (!state.isAuthenticated || !state.currentUser) {
            // Save pending info and open auth modal
            onClose();
            dispatch({
                type: 'TOGGLE_AUTH_MODAL',
                payload: { isOpen: true, view: 'login' },
            });
            return;
        }

        setSelectedPlan({ name: planName, price, productId });
        setShowPaymentWindow(true);
    };

    const handlePaymentSuccess = async (_paymentIntentId: string) => {
        setShowPaymentWindow(false);

        // Promote the property via API
        if (property) {
            try {
                const token = tokenService.getAccessToken();

                await ensureCsrfToken();
                const response = await fetch(`${API_URL}/promotions`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        ...csrfHeaders(),
                    },
                    body: JSON.stringify({ propertyId: property.id }),
                });

                if (response.ok) {
                    onPromotionComplete?.(true);
                    onClose();
                } else {
                    const data = await response.json();
                    throw new Error(data.message || t('common:promotions.failedToActivate'));
                }
            } catch (error: any) {
                setPaymentErrorMessage(t('common:promotions.paymentSuccessActivationFailed', { error: error.message }));
                setShowPaymentError(true);
            }
        }
    };

    const handlePaymentError = (error: string) => {
        setShowPaymentWindow(false);
        setPaymentErrorMessage(error);
        setShowPaymentError(true);
    };

    const handleSkipPromotion = () => {
        onPromotionComplete?.(false);
        onClose();
    };

    // Get promotion product
    const promotionProduct = products.find(p => p.productId === 'listing_promotion_15days');
    const promotionPrice = promotionProduct?.price || 15;

    // Determine user role for payment
    const getUserRole = (): 'buyer' | 'private_seller' | 'agent' => {
        if (!currentUser) return 'private_seller';
        return currentUser.role === 'agent' ? 'agent' : 'private_seller';
    };

    // Show payment error view
    if (showPaymentError) {
        return (
            <Modal isOpen={isOpen} onClose={handleSkipPromotion} title={t('common:promotions.paymentIssueTitle')}>
                <div className="p-6 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>

                    <h3 className="text-xl font-bold text-neutral-800 mb-2">{t('common:promotions.somethingWentWrong')}</h3>
                    <p className="text-neutral-600 mb-4">
                        {paymentErrorMessage || t('common:promotions.paymentProcessingIssue')}
                    </p>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-2 text-green-800">
                            <TickIcon />
                            <span className="font-semibold">{t('common:promotions.listingPublishedGoodNews')}</span>
                        </div>
                        <p className="text-sm text-green-700 mt-2">
                            {t('common:promotions.listingLivePromoteLater')}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={() => {
                                setShowPaymentError(false);
                                setPaymentErrorMessage('');
                            }}
                            className="flex-1 px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-colors"
                        >
                            {t('common:tryAgain')}
                        </button>
                        <button
                            onClick={handleSkipPromotion}
                            className="flex-1 px-6 py-3 border border-neutral-300 text-neutral-700 font-medium rounded-lg hover:bg-neutral-50 transition-colors"
                        >
                            {t('common:promotions.continueWithoutPromotion')}
                        </button>
                    </div>

                    <p className="text-xs text-neutral-500 mt-4">
                        {t('common:promotions.promoteAnytimeFromDashboard')}
                    </p>
                </div>
            </Modal>
        );
    }

    return (
        <>
            <Modal isOpen={isOpen && !showPaymentWindow} onClose={handleSkipPromotion} size="xl">
                <div className="p-6">
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                            <p className="mt-4 text-neutral-600">{t('common:promotions.loadingOptions')}</p>
                        </div>
                    ) : (
                        <>
                            {/* Success Message */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-green-800">{t('common:promotions.listingPublished')}</h3>
                                        <p className="text-sm text-green-700">{t('common:promotions.listingNowLive')}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Promotion Offer */}
                            <div className="text-center mb-6">
                                <BoltIcon className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                                <h2 className="text-2xl font-bold text-neutral-800 mb-2">{t('common:promotions.boostYourListing')}</h2>
                                <p className="text-neutral-600">
                                    {t('common:promotions.moreViewsDescription')}
                                </p>
                            </div>

                            {/* Promotion Card */}
                            <div className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 mb-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-neutral-800">{t('common:promotions.fifteenDayPromotion')}</h3>
                                        <p className="text-neutral-600">{t('common:promotions.standOutFromCompetition')}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-3xl font-extrabold text-amber-600">{t('common:currency')}{ promotionPrice}</span>
                                        <span className="text-neutral-600 ml-1 block text-sm">{t('common:promotions.oneTime')}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                    <div className="flex items-center">
                                        <TickIcon />
                                        <span className="text-sm text-neutral-700">{t('common:promotions.features.featuredBadge')}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <TickIcon />
                                        <span className="text-sm text-neutral-700">{t('common:promotions.features.topPlacement')}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <TickIcon />
                                        <span className="text-sm text-neutral-700">{t('common:promotions.features.homepageCarousel')}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <TickIcon />
                                        <span className="text-sm text-neutral-700">{t('common:promotions.features.priorityAlerts')}</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-100 border border-amber-300 rounded-lg">
                                        <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse flex-shrink-0"></span>
                                        <p className="text-xs text-amber-800 font-medium">Direct payments are not yet available. Use a coupon to activate for free.</p>
                                    </div>
                                    <button
                                        onClick={() => handlePromote('Listing Promotion 15 Days', promotionPrice, promotionProduct?.productId || 'listing_promotion_15days')}
                                        className="w-full py-3 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <SparklesIcon className="w-5 h-5" />
                                        Activate with Coupon
                                    </button>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="text-center p-3 bg-neutral-50 rounded-lg">
                                    <ChartBarIcon className="w-6 h-6 text-primary mx-auto mb-1" />
                                    <span className="block text-lg font-bold text-neutral-800">{t('common:promotions.benefitStats.viewsMultiplier')}</span>
                                    <span className="text-xs text-neutral-600">{t('common:promotions.benefitStats.moreViews')}</span>
                                </div>
                                <div className="text-center p-3 bg-neutral-50 rounded-lg">
                                    <svg className="w-6 h-6 text-green-500 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    </svg>
                                    <span className="block text-lg font-bold text-neutral-800">{t('common:promotions.benefitStats.inquiriesMultiplier')}</span>
                                    <span className="text-xs text-neutral-600">{t('common:promotions.benefitStats.moreInquiries')}</span>
                                </div>
                                <div className="text-center p-3 bg-neutral-50 rounded-lg">
                                    <svg className="w-6 h-6 text-amber-500 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="block text-lg font-bold text-neutral-800">{t('common:promotions.benefitStats.fasterSalePercent')}</span>
                                    <span className="text-xs text-neutral-600">{t('common:promotions.benefitStats.fasterSale')}</span>
                                </div>
                            </div>

                            {/* Skip Option */}
                            <div className="text-center">
                                <button
                                    onClick={handleSkipPromotion}
                                    className="text-neutral-500 hover:text-neutral-700 underline text-sm"
                                >
                                    {t('common:promotions.noThanks')}
                                </button>
                                <p className="text-xs text-neutral-400 mt-2">
                                    {t('common:promotions.promoteAnytimeFromDashboard')}
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </Modal>

            {/* Payment Window */}
            {selectedPlan && (
                <PaymentWindow
                    isOpen={showPaymentWindow}
                    onClose={() => {
                        setShowPaymentWindow(false);
                        setSelectedPlan(null);
                    }}
                    planName={selectedPlan.name}
                    planPrice={selectedPlan.price}
                    planInterval="once"
                    userRole={getUserRole()}
                    userEmail={currentUser?.email}
                    userCountry={currentUser?.country || 'RS'}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    productId={selectedPlan.productId}
                />
            )}
        </>
    );
};

export default PromotionOfferModal;
