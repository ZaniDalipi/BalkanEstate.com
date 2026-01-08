import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/shared/Modal';
import PaymentWindow from '@/components/shared/PaymentWindow';
import { BuildingOfficeIcon, ChartBarIcon, CurrencyDollarIcon, BoltIcon } from '@/constants';
import { useAppContext } from '@/context/AppContext';
import { fetchSellerProducts, Product } from '@/utils/api';

interface PricingPlansProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribe?: () => void;
  isOffer?: boolean;
  isAgencyMode?: boolean; // When true, only show Enterprise plan for agency creation
}

const TickIcon: React.FC = () => (
    <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
);

const PricingPlans: React.FC<PricingPlansProps> = ({ isOpen, onClose, onSubscribe, isOffer, isAgencyMode = false }) => {
  const { t } = useTranslation(['pricing']);
  const { state, dispatch } = useAppContext();
  const { activeDiscount } = state;
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showPaymentWindow, setShowPaymentWindow] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{
    name: string;
    price: number;
    interval: 'month' | 'year';
    discount: number;
    productId: string;
  } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch products from backend
  useEffect(() => {
    if (isOpen && products.length === 0) {
      const loadProducts = async () => {
        setLoading(true);
        const fetchedProducts = await fetchSellerProducts();
        setProducts(fetchedProducts);
        setLoading(false);
      };
      loadProducts();
    }
  }, [isOpen]);

  // Update URL when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Get current language from URL
      const currentLang = window.location.pathname.split('/')[1] || 'en';
      const validLangs = ['en', 'sq', 'sr', 'de', 'mk'];
      const lang = validLangs.includes(currentLang) ? currentLang : 'en';
      const pricingPath = `/${lang}/pricing`;

      // Only update if not already on pricing route
      if (!window.location.pathname.includes('/pricing')) {
        window.history.pushState({ modal: 'pricing' }, '', pricingPath);
      }
    }
  }, [isOpen]);

  // Handle browser back button when modal is open
  useEffect(() => {
    const handlePopState = () => {
      if (isOpen && !window.location.pathname.includes('/pricing')) {
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setShowConfirmation(false); // Reset confirmation on open
      if (isOffer) {
        setTimeLeft(30 * 60); // Reset timer every time the offer modal opens
        const timer = setInterval(() => {
          setTimeLeft((prevTime) => {
            if (prevTime <= 1) {
              clearInterval(timer);
              onClose(); // Automatically close when time runs out
              return 0;
            }
            return prevTime - 1;
          });
        }, 1000);

        return () => clearInterval(timer); // Cleanup interval on unmount
      }
    }
  }, [isOpen, isOffer, onClose]);

  // Remove auto-show payment - now user must click "Continue" button first
  // useEffect removed - we'll show the enterprise plan first, then payment on button click

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedPlan(null);
      setShowPaymentWindow(false);
      setShowConfirmation(false);
    }
  }, [isOpen]);

  const handleCloseAttempt = () => {
    // Show confirmation for offers OR when there's pending agency data
    if (isOffer || state.pendingAgencyData) {
      setShowConfirmation(true);
    } else {
      onClose();
    }
  };

  const handleConfirmExit = () => {
    // Clear pending agency data if user exits
    if (state.pendingAgencyData) {
      dispatch({ type: 'SET_PENDING_AGENCY_DATA', payload: null });
    }
    setShowConfirmation(false);
    onClose();
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  const applyDiscount = (price: number, discount: number) => {
    if (discount > 0) {
        return Math.round(price * (1 - discount / 100));
    }
    return price;
  };

  // Get products by productId with fallback prices
  const proYearlyProduct = products.find(p => p.productId === 'seller_pro_yearly');
  const proMonthlyProduct = products.find(p => p.productId === 'seller_pro_monthly');
  const enterpriseProduct = products.find(p => p.productId === 'seller_enterprise_yearly');

  const proYearlyPrice = proYearlyProduct?.price || 200;
  const proMonthlyPrice = proMonthlyProduct?.price || 25;
  const enterprisePrice = enterpriseProduct?.price || 1000;

  const proYearlyDiscount = isOffer && activeDiscount ? activeDiscount.proYearly : 0;
  const proMonthlyDiscount = isOffer && activeDiscount ? activeDiscount.proMonthly : 0;
  const enterpriseDiscount = isOffer && activeDiscount ? activeDiscount.enterprise : 0;

  const discountedProYearly = applyDiscount(proYearlyPrice, proYearlyDiscount);
  const discountedProMonthly = applyDiscount(proMonthlyPrice, proMonthlyDiscount);
  const discountedEnterprise = applyDiscount(enterprisePrice, enterpriseDiscount);

  const handlePlanSelection = (planName: string, price: number, interval: 'month' | 'year', discount: number, productId: string) => {
  // Check if user is authenticated (check either flag or user object)
  if (!state.isAuthenticated || !state.currentUser) {
    // Save pending subscription
    dispatch({
      type: 'SET_PENDING_SUBSCRIPTION',
      payload: {
        planName,
        planPrice: price,
        planInterval: interval,
        discountPercent: discount,
        modalType: 'seller',
      },
    });

    // Close this modal
    onClose();

    // Open auth modal
    dispatch({
      type: 'TOGGLE_AUTH_MODAL',
      payload: { isOpen: true, view: 'login' },
    });
    return;
  }

  setSelectedPlan({ name: planName, price, interval, discount, productId });

  // If Enterprise plan and no pending agency data, show agency creation first
  if (planName.toLowerCase().includes('enterprise') && !state.pendingAgencyData) {
    // Close pricing modal and open agency creation modal
    onClose();
    dispatch({ type: 'TOGGLE_ENTERPRISE_MODAL', payload: true });
  } else {
    // For other plans, or Enterprise with pending data, show payment window
    setShowPaymentWindow(true);
  }
};

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    console.log('Payment successful:', paymentIntentId);
    setShowPaymentWindow(false);

    // If Enterprise plan and there's pending agency data, create the agency
    if (selectedPlan && selectedPlan.name.toLowerCase().includes('enterprise') && state.pendingAgencyData) {
      try {
        const token = localStorage.getItem('balkan_estate_token');
        if (!token) {
          throw new Error('Please log in to create an agency');
        }

        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_URL}/agencies`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(state.pendingAgencyData),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to create agency');
        }

        // Clear pending agency data
        dispatch({ type: 'SET_PENDING_AGENCY_DATA', payload: null });

        // Refresh user data to get updated role and agency info
        try {
          const userResponse = await fetch(`${API_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (userResponse.ok) {
            const userData = await userResponse.json();
            dispatch({ type: 'SET_AUTH_STATE', payload: { isAuthenticated: true, user: userData.user } });
          }
        } catch (error) {
          console.error('Failed to refresh user data:', error);
        }

        // Close modal and show success
        onClose();
        if (onSubscribe) {
          onSubscribe();
        }
        dispatch({
          type: 'SHOW_ALERT',
          payload: {
            type: 'success',
            title: t('pricing:success.title', 'Success!'),
            message: t('pricing:success.agencyMessage'),
          },
        });

        // Redirect to agencies view
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencies' });
      } catch (err) {
        console.error('Failed to create agency:', err);
        dispatch({
          type: 'SHOW_ALERT',
          payload: {
            type: 'error',
            title: t('common:error', 'Error'),
            message: 'Payment successful, but failed to create agency: ' + (err instanceof Error ? err.message : 'Unknown error'),
          },
        });
        onClose();
      }
    } else {
      // For other plans, close and show success
      onClose();
      if (onSubscribe) {
        onSubscribe();
      }
      dispatch({
        type: 'SHOW_ALERT',
        payload: {
          type: 'success',
          title: t('pricing:success.title', 'Success!'),
          message: t('pricing:success.subscriptionActivated'),
        },
      });
    }
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    // Error is already shown in the PaymentWindow component
  };

  // Determine user role for payment methods
  const getUserRole = (): 'buyer' | 'private_seller' | 'agent' => {
    if (!state.currentUser) return 'private_seller';
    return state.currentUser.role === 'agent' ? 'agent' : 'private_seller';
  };


  return (
    <>
      <Modal isOpen={isOpen} onClose={handleCloseAttempt} size="5xl">
        <div className="relative p-4 sm:p-8">
            {loading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex items-center justify-center rounded-2xl">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-neutral-600 font-medium">{t('pricing:loading')}</p>
                </div>
              </div>
            )}
            {showConfirmation && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex flex-col justify-center items-center p-8 text-center rounded-2xl">
                    <h3 className="text-2xl font-bold text-red-600">{t('pricing:exitModal.title')}</h3>
                    <p className="mt-2 text-neutral-700 max-w-sm text-sm sm:text-base">
                      {state.pendingAgencyData
                        ? t('pricing:exitModal.agencyMessage')
                        : t('pricing:exitModal.offerMessage')
                      }
                    </p>
                    <div className="mt-6 flex gap-4">
                        <button onClick={handleConfirmExit} className="px-8 py-2.5 border border-red-600 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition-colors">
                          {t('pricing:exitModal.leave')}
                        </button>
                        <button onClick={() => setShowConfirmation(false)} className="px-8 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors">
                          {state.pendingAgencyData ? t('pricing:exitModal.continueSetup') : t('pricing:exitModal.stay')}
                        </button>
                    </div>
                </div>
            )}

            {isOffer && (
                 <div className="mb-6 bg-red-600 text-white rounded-lg p-4 text-center shadow-lg">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
                        <BoltIcon className="w-8 h-8 text-yellow-300" />
                        <div className="text-center sm:text-left">
                            <h3 className="font-extrabold text-base sm:text-lg">{t('pricing:limitedOffer')}</h3>
                            <p className="font-mono text-xl sm:text-2xl tracking-wider">{formatTime(timeLeft)}</p>
                        </div>
                    </div>
                </div>
            )}
            <div className="text-center mb-10">
                {isAgencyMode ? (
                    <>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-800 tracking-tight">{t('pricing:enterprise.required')}</h2>
                        <p className="mt-4 text-base sm:text-lg text-neutral-600">{t('pricing:enterprise.message')}</p>
                    </>
                ) : isOffer ? (
                    <>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">{t('pricing:offerTitle')}</h2>
                        <p className="mt-4 text-base sm:text-lg text-neutral-600">{t('pricing:offerSubtitle')}</p>
                    </>
                ) : (
                    <>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-800 tracking-tight">{t('pricing:title')}</h2>
                        <p className="mt-4 text-base sm:text-lg text-neutral-600">{t('pricing:subtitle')}</p>
                    </>
                )}
            </div>

            <div className={`grid grid-cols-1 ${isAgencyMode ? 'lg:grid-cols-1 max-w-xl mx-auto' : 'lg:grid-cols-3'} gap-8 items-start`}>
                {/* Pro Yearly Plan - Hidden in Agency Mode */}
                {!isAgencyMode && (
                <div className="relative p-6 sm:p-8 rounded-2xl border-2 border-green-400 bg-gradient-to-br from-green-50 to-cyan-50 shadow-lg lg:-translate-y-4 flex flex-col h-full">
                    <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                        <span className="inline-block bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
                            {isOffer && proYearlyDiscount > 0 ? t('pricing:discount.off', { percent: proYearlyDiscount }) : 'MOST POPULAR'}
                        </span>
                    </div>
                    <div className="text-center pt-4">
                        <h3 className="text-xl sm:text-2xl font-bold text-neutral-800">{proYearlyProduct?.name || t('pricing:plans.proYearly.name')}</h3>
                        <div className="mt-2 h-20 flex flex-col items-center justify-center">
                            {isOffer && proYearlyDiscount > 0 ? (
                                <>
                                    <div>
                                        <span className="text-xl sm:text-2xl font-semibold text-neutral-500 line-through">€{proYearlyPrice}</span>
                                        <span className="text-4xl sm:text-5xl font-extrabold text-red-600 ml-2">€{discountedProYearly}</span>
                                        <span className="text-lg sm:text-xl font-semibold text-neutral-600">{t('pricing:billing.perYear')}</span>
                                    </div>
                                    <p className="mt-1 text-sm sm:text-base font-bold text-green-600">{t('pricing:billing.youSave', { amount: proYearlyPrice - discountedProYearly })}</p>
                                </>
                            ) : (
                                <p>
                                    <span className="text-4xl sm:text-5xl font-extrabold text-neutral-900">€{proYearlyPrice}</span>
                                    <span className="text-lg sm:text-xl font-semibold text-neutral-600">{t('pricing:billing.perYear')}</span>
                                </p>
                            )}
                        </div>
                    </div>
                    <ul className="mt-8 space-y-4 text-neutral-700 font-medium flex-grow text-sm sm:text-base">
                        {proYearlyProduct?.features && proYearlyProduct.features.length > 0 ? (
                            proYearlyProduct.features.map((feature, index) => (
                                <li key={index} className="flex items-center"><TickIcon /> {feature}</li>
                            ))
                        ) : (
                            <>
                                <li className="flex items-center"><TickIcon /> {t('pricing:features.activeListings', { count: 15 })}</li>
                                <li className="flex items-center"><TickIcon /> {t('pricing:features.promotedListings', { count: 2, days: 15 })}</li>
                                <li className="flex items-center"><TickIcon /> {t('pricing:features.premiumPlacement')}</li>
                                <li className="flex items-center"><TickIcon /> {t('pricing:features.analytics')}</li>
                                <li className="flex items-center"><TickIcon /> {t('pricing:features.leadManagement')}</li>
                                <li className="flex items-center"><TickIcon /> {t('pricing:features.prioritySupport')}</li>
                            </>
                        )}
                    </ul>
                    <button
                        onClick={() => handlePlanSelection('Pro Annual', proYearlyPrice, 'year', proYearlyDiscount, proYearlyProduct?.productId || 'seller_pro_yearly')}
                        className="w-full mt-8 py-3.5 rounded-lg font-bold text-white bg-indigo-500 hover:bg-indigo-600 hover:shadow-xl hover:scale-[1.02] transition-all shadow-md text-base sm:text-lg relative"
                    >
                        <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">Coming Soon</span>
                        {t('pricing:buttons.getProAnnual')} - €{isOffer ? discountedProYearly : proYearlyPrice}{t('pricing:billing.perYear')}
                    </button>
                </div>
                )}

                {/* Pro Monthly Plan - Hidden in Agency Mode */}
                {!isAgencyMode && (
                <div className="relative p-6 sm:p-8 rounded-2xl border border-neutral-200 bg-white flex flex-col h-full">
                     {isOffer && proMonthlyDiscount > 0 && (
                        <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                             <span className="inline-block bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">{t('pricing:discount.off', { percent: proMonthlyDiscount })}</span>
                        </div>
                    )}
                     <div className="text-center pt-4">
                        <h3 className="text-xl sm:text-2xl font-bold text-neutral-800">{proMonthlyProduct?.name || t('pricing:plans.proMonthly.name')}</h3>
                        <div className="mt-2 h-20 flex flex-col items-center justify-center">
                            {isOffer && proMonthlyDiscount > 0 ? (
                                <>
                                    <div>
                                        <span className="text-xl sm:text-2xl font-semibold text-neutral-500 line-through">€{proMonthlyPrice}</span>
                                        <span className="text-4xl sm:text-5xl font-extrabold text-red-600 ml-2">€{discountedProMonthly}</span>
                                        <span className="text-lg sm:text-xl font-semibold text-neutral-600">{t('pricing:billing.perMonth')}</span>
                                    </div>
                                    <p className="mt-1 text-sm sm:text-base font-bold text-green-600">{t('pricing:billing.youSave', { amount: proMonthlyPrice - discountedProMonthly })}</p>
                                </>
                            ) : (
                                <p>
                                    <span className="text-4xl sm:text-5xl font-extrabold text-neutral-900">€{proMonthlyPrice}</span>
                                    <span className="text-lg sm:text-xl font-semibold text-neutral-600">{t('pricing:billing.perMonth')}</span>
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="mt-8 space-y-3 flex-grow flex flex-col">
                        {proMonthlyProduct?.features && proMonthlyProduct.features.length > 0 ? (
                            proMonthlyProduct.features.map((feature, index) => (
                                <div key={index} className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                                    <p className="font-semibold text-neutral-800 text-sm">{feature}</p>
                                </div>
                            ))
                        ) : (
                            <>
                                <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                                    <p className="font-semibold text-neutral-800 text-sm">{t('pricing:features.activeListings', { count: 15 })}</p>
                                    <p className="text-neutral-600 text-sm">{t('pricing:features.perfectForActive')}</p>
                                </div>
                                <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                                    <p className="font-semibold text-neutral-800 text-sm">{t('pricing:features.promotedListings', { count: 2, days: 15 })}</p>
                                    <p className="text-neutral-600 text-sm">{t('pricing:features.featuredBoost')}</p>
                                </div>
                                <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                                    <p className="font-semibold text-neutral-800 text-sm">{t('pricing:features.analytics')}</p>
                                    <p className="text-neutral-600 text-sm">{t('pricing:features.analyticsDesc')}</p>
                                </div>
                                <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                                    <p className="font-semibold text-neutral-800 text-sm">{t('pricing:features.prioritySupport')}</p>
                                    <p className="text-neutral-600 text-sm">{t('pricing:features.prioritySupportDesc')}</p>
                                </div>
                                <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                                    <p className="font-semibold text-neutral-800 text-sm">{t('pricing:features.mobileApp')}</p>
                                    <p className="text-neutral-600 text-sm">{t('pricing:features.mobileAppDesc')}</p>
                                </div>
                            </>
                        )}
                    </div>
                     <button
                        onClick={() => handlePlanSelection('Pro Monthly', proMonthlyPrice, 'month', proMonthlyDiscount, proMonthlyProduct?.productId || 'seller_pro_monthly')}
                        className="w-full mt-8 py-3.5 rounded-lg font-bold bg-white border-2 border-neutral-300 text-neutral-700 hover:bg-neutral-50 hover:border-primary hover:shadow-lg hover:scale-[1.02] transition-all shadow-sm text-base sm:text-lg relative"
                    >
                        <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">Coming Soon</span>
                        {t('pricing:buttons.getProMonthly')} - €{isOffer ? discountedProMonthly : proMonthlyPrice}{t('pricing:billing.perMonth')}
                    </button>
                </div>
                )}

                {/* Enterprise Plan */}
                <div className="relative p-6 sm:p-8 rounded-2xl bg-neutral-800 text-white flex flex-col h-full">
                    {isOffer && enterpriseDiscount > 0 && (
                        <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                            <span className="inline-block bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">{t('pricing:discount.off', { percent: enterpriseDiscount })}</span>
                        </div>
                    )}
                     <div className="text-center pt-4">
                        <div className="flex justify-center items-center gap-2">
                           <BuildingOfficeIcon className="w-8 h-8 text-amber-400" />
                           <h3 className="text-xl sm:text-2xl font-bold">{enterpriseProduct?.name || t('pricing:plans.enterprise.name')}</h3>
                        </div>
                        <div className="mt-2 h-20 flex flex-col items-center justify-center">
                            {isOffer && enterpriseDiscount > 0 ? (
                                <>
                                    <div>
                                        <span className="text-lg sm:text-xl font-semibold text-neutral-400 line-through">€{enterprisePrice}</span>
                                        <span className="text-3xl sm:text-4xl font-extrabold ml-2">€{discountedEnterprise}</span>
                                        <span className="text-base sm:text-lg font-semibold text-neutral-300">{t('pricing:billing.perYear')}</span>
                                    </div>
                                    <p className="mt-1 text-sm sm:text-base font-bold text-green-500">{t('pricing:billing.youSave', { amount: enterprisePrice - discountedEnterprise })}</p>
                                </>
                            ) : (
                                <p>
                                    <span className="text-3xl sm:text-4xl font-extrabold">€{enterprisePrice}</span>
                                    <span className="text-base sm:text-lg font-semibold text-neutral-300">{t('pricing:billing.perYear')}</span>
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="mt-8 space-y-4 flex-grow">
                        {enterpriseProduct?.features && enterpriseProduct.features.length > 0 ? (
                            enterpriseProduct.features.map((feature, index) => (
                                <div key={index} className="bg-neutral-700/50 p-4 rounded-lg">
                                    <p className="font-bold text-base sm:text-lg">{feature}</p>
                                </div>
                            ))
                        ) : (
                            <>
                                <div className="bg-neutral-700/50 p-4 rounded-lg">
                                    <p className="font-bold text-base sm:text-lg">500 listings (expandable)</p>
                                    <p className="text-neutral-300 text-sm">For your entire agency team</p>
                                </div>
                                <div className="bg-neutral-700/50 p-4 rounded-lg">
                                    <p className="font-bold text-base sm:text-lg">5 team members included</p>
                                    <p className="text-neutral-300 text-sm">Agent registration codes for your team</p>
                                </div>
                                <div className="bg-neutral-700/50 p-4 rounded-lg">
                                    <p className="font-bold text-base sm:text-lg">5 promo coupons/month</p>
                                    <p className="text-neutral-300 text-sm">2 premier + 2 highlighted + 1 featured</p>
                                </div>
                                <div className="bg-neutral-700/50 p-4 rounded-lg">
                                    <p className="font-bold text-base sm:text-lg">Unlimited everything</p>
                                    <p className="text-neutral-300 text-sm">AI, insights, searches - for all agents</p>
                                </div>
                            </>
                        )}
                    </div>
                     <button
                        onClick={() => handlePlanSelection('Enterprise', enterprisePrice, 'year', enterpriseDiscount, enterpriseProduct?.productId || 'seller_enterprise_yearly')}
                        className="w-full mt-8 py-3.5 rounded-lg font-bold bg-amber-500 text-white hover:bg-amber-600 hover:shadow-xl hover:scale-[1.02] transition-all shadow-md text-base sm:text-lg relative"
                    >
                         <span className="absolute -top-2 -right-2 bg-white text-amber-600 text-xs font-bold px-2 py-0.5 rounded-full shadow">Coming Soon</span>
                         {t('pricing:buttons.getEnterprise')} - €{isOffer ? discountedEnterprise : enterprisePrice}{t('pricing:billing.perYear')}
                    </button>
                </div>
            </div>

            <div className="mt-12 pt-6 border-t border-neutral-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-neutral-600 font-medium">
                        <CurrencyDollarIcon className="w-6 h-6 text-green-500" />
                        <span>{t('pricing:benefits.moneyBack')}</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-neutral-600 font-medium">
                        <ChartBarIcon className="w-6 h-6 text-blue-500" />
                        <span>{t('pricing:benefits.moreViews', { multiplier: 3 })}</span>
                    </div>
                     <div className="flex items-center justify-center gap-2 text-neutral-600 font-medium">
                        <BoltIcon className="w-6 h-6 text-yellow-500" />
                        <span>{t('pricing:benefits.instantActivation')}</span>
                    </div>
                </div>
            </div>
        </div>
      </Modal>

      {/* Payment Window */}
      {selectedPlan && (
        <PaymentWindow
          isOpen={showPaymentWindow}
          onClose={() => {
            setShowPaymentWindow(false);
            setSelectedPlan(null);
            // If in agency mode, also close the pricing modal when payment is cancelled
            if (isAgencyMode || state.pendingAgencyData) {
              onClose();
            }
          }}
          planName={selectedPlan.name}
          planPrice={selectedPlan.price}
          planInterval={selectedPlan.interval}
          userRole={getUserRole()}
          userEmail={state.currentUser?.email}
          userCountry={state.currentUser?.country || 'RS'}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          discountPercent={selectedPlan.discount}
          productId={selectedPlan.productId}
        />
      )}
    </>
  );
};

export default PricingPlans;
