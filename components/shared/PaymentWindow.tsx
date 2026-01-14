import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import {
  CreditCardIcon,
  CheckCircleIcon,
  ClockIcon,
  LockClosedIcon,
  ArrowTopRightOnSquareIcon,
  ExclamationTriangleIcon,
} from '../../constants';
import { useAppContext } from '../../context/AppContext';
import { API_URL } from '../../src/shared/api/config';

// Country code mapping from language to country code
const LANGUAGE_TO_COUNTRY: Record<string, string> = {
  'sq': 'AL', // Albanian -> Albania
  'sr': 'RS', // Serbian -> Serbia
  'mk': 'MK', // Macedonian -> North Macedonia
  'bs': 'BA', // Bosnian -> Bosnia and Herzegovina
  'hr': 'HR', // Croatian -> Croatia
  'me': 'ME', // Montenegrin -> Montenegro
  'bg': 'BG', // Bulgarian -> Bulgaria
  'ro': 'RO', // Romanian -> Romania
  'el': 'GR', // Greek -> Greece
  'en': 'GR', // Default to Greece for English in Balkans
};

// Helper function to detect user's country
const detectUserCountry = (userProfileCountry?: string): string => {
  // 1. Use user profile country if available
  if (userProfileCountry) {
    // Convert country name to code
    const countryNameToCode: Record<string, string> = {
      'Albania': 'AL',
      'Serbia': 'RS',
      'North Macedonia': 'MK',
      'Macedonia': 'MK',
      'Bosnia and Herzegovina': 'BA',
      'Bosnia': 'BA',
      'Croatia': 'HR',
      'Montenegro': 'ME',
      'Bulgaria': 'BG',
      'Romania': 'RO',
      'Greece': 'GR',
      'Kosovo': 'XK',
    };
    if (countryNameToCode[userProfileCountry]) {
      return countryNameToCode[userProfileCountry];
    }
    // If already a code, return it
    if (userProfileCountry.length === 2) {
      return userProfileCountry.toUpperCase();
    }
  }

  // 2. Try to detect from browser language/locale
  const browserLang = navigator.language?.split('-')[0]?.toLowerCase();
  if (browserLang && LANGUAGE_TO_COUNTRY[browserLang]) {
    return LANGUAGE_TO_COUNTRY[browserLang];
  }

  // 3. Try to get from navigator.languages
  const languages = navigator.languages || [];
  for (const lang of languages) {
    const langCode = lang.split('-')[0].toLowerCase();
    if (LANGUAGE_TO_COUNTRY[langCode]) {
      return LANGUAGE_TO_COUNTRY[langCode];
    }
    // Check if it includes a country code like 'en-MK'
    const countryPart = lang.split('-')[1]?.toUpperCase();
    if (countryPart && ['AL', 'RS', 'MK', 'BA', 'HR', 'ME', 'BG', 'RO', 'GR', 'XK'].includes(countryPart)) {
      return countryPart;
    }
  }

  // 4. Default to Greece (EU country, supports Stripe)
  return 'GR';
};

// ============================================
// COMING SOON FLAG - Set to false when ready to launch payments
// ============================================
const PAYMENTS_COMING_SOON = false;
// ============================================

interface PaymentWindowProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  planPrice: number;
  planInterval: 'month' | 'year' | 'once'; // 'once' for one-time payments like promotions
  userRole: 'buyer' | 'private_seller' | 'agent';
  userEmail?: string;
  userCountry?: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  discountPercent?: number;
  productId?: string;
  onEnterpriseSelected?: () => void; // Callback when enterprise plan needs agency creation
}

const PaymentWindow: React.FC<PaymentWindowProps> = ({
  isOpen,
  onClose,
  planName,
  planPrice,
  planInterval,
  userRole,
  userEmail,
  userCountry: propUserCountry,
  onSuccess,
  onError,
  discountPercent = 0,
  productId,
  onEnterpriseSelected,
}) => {
  const { t } = useTranslation(['payment', 'common']);
  const { state } = useAppContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [discountCode, setDiscountCode] = useState('');
  const [validatingCode, setValidatingCode] = useState(false);
  const [codeValidation, setCodeValidation] = useState<{
    valid: boolean;
    message?: string;
    discountAmount?: number;
    finalPrice?: number;
  } | null>(null);

  const [appliedDiscountCode, setAppliedDiscountCode] = useState<string | null>(null);

  // Dynamically detect user country
  const userCountry = propUserCountry || detectUserCountry(state.currentUser?.country);

  // Calculate price with discounts
  let finalPrice = planPrice;
  let totalDiscountPercent = discountPercent;
  let savings = 0;

  // Apply percentage discount first
  if (discountPercent > 0) {
    finalPrice = planPrice * (1 - discountPercent / 100);
    savings = planPrice - finalPrice;
  }

  // Apply discount code if validated
  if (codeValidation?.valid && codeValidation.discountAmount !== undefined) {
    finalPrice = codeValidation.finalPrice ?? finalPrice;
    savings = planPrice - finalPrice;
  }

  useEffect(() => {
    if (isOpen) {
      // Validate user is authenticated when opening payment modal
      const token = localStorage.getItem('balkan_estate_token');
      if (!state.isAuthenticated || !token) {
        onError(t('payment:errors.loginRequired', 'Please log in to complete your purchase'));
        onClose();
        return;
      }
    } else {
      // Reset state when modal closes
      setShowSuccess(false);
      setShowError(false);
      setErrorMessage('');
      setDiscountCode('');
      setCodeValidation(null);
      setAppliedDiscountCode(null);
    }
  }, [isOpen, state.isAuthenticated, onError, onClose, t]);

  const handleValidateDiscountCode = async () => {
    if (!discountCode.trim()) {
      setCodeValidation({ valid: false, message: 'Please enter a discount code' });
      return;
    }

    setValidatingCode(true);
    setCodeValidation(null);

    try {
      const response = await fetch(`${API_URL}/discount-codes/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: discountCode.trim(),
          planId: productId,
          purchaseAmount: planPrice,
        }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setCodeValidation({
          valid: true,
          message: `Discount applied: Save €${data.discount.discountAmount.toFixed(2)}!`,
          discountAmount: data.discount.discountAmount,
          finalPrice: data.discount.finalPrice,
        });
        setAppliedDiscountCode(discountCode.trim());
      } else {
        setCodeValidation({
          valid: false,
          message: data.message || 'Invalid discount code',
        });
      }
    } catch (error) {
      setCodeValidation({
        valid: false,
        message: 'Failed to validate discount code',
      });
    } finally {
      setValidatingCode(false);
    }
  };

  const handleRemoveDiscountCode = () => {
    setDiscountCode('');
    setCodeValidation(null);
    setAppliedDiscountCode(null);
  };

  const handlePayment = async () => {
    console.log('💳 Payment button clicked');
    console.log('Final price:', finalPrice);
    console.log('Applied discount code:', appliedDiscountCode);

    setIsProcessing(true);

    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('balkan_estate_token');

      if (!token) {
        throw new Error('Please log in to complete your purchase');
      }

      console.log('✅ Token found, proceeding with payment');

      // Check if this is a 100% off coupon (free subscription)
      if (finalPrice === 0 || finalPrice < 0.01) {
        console.log('🎁 Processing free subscription with discount code:', appliedDiscountCode);

        // Handle free subscription with 100% off coupon
        const response = await fetch(`${API_URL}/payments/apply-free-subscription`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            planName,
            planInterval,
            productId: productId,
            discountCode: appliedDiscountCode,
          }),
        });

        const data = await response.json();
        console.log('Free subscription API response:', data);

        if (!response.ok) {
          console.error('❌ Free subscription error:', data);
          throw new Error(data.message || 'Failed to apply free subscription');
        }

        console.log('✅ Free subscription activated successfully!');

        // Success! Call the success handler with a special ID for free subscriptions
        setShowSuccess(true);
        setTimeout(() => {
          onSuccess(data.subscriptionId || 'free_subscription_' + Date.now());
        }, 1000);
        return;
      }

      // Determine product ID if not provided
      let finalProductId = productId;
      if (!finalProductId) {
        if (planName.toLowerCase().includes('buyer') && planInterval === 'month') {
          finalProductId = 'buyer_pro_monthly';
        } else if (planName.toLowerCase().includes('buyer') && planInterval === 'year') {
          finalProductId = 'buyer_pro_yearly';
        } else if (planName.toLowerCase().includes('seller') && planInterval === 'month') {
          finalProductId = 'seller_premium_monthly';
        } else if (planName.toLowerCase().includes('seller') && planInterval === 'year') {
          finalProductId = 'seller_premium_yearly';
        } else if (planName.toLowerCase().includes('agent') && planInterval === 'month') {
          finalProductId = 'agent_pro_monthly';
        } else if (planName.toLowerCase().includes('agent') && planInterval === 'year') {
          finalProductId = 'agent_pro_yearly';
        } else if (planName.toLowerCase().includes('enterprise')) {
          finalProductId = 'enterprise_tier_' + Date.now();
        } else {
          finalProductId = 'buyer_pro_monthly';
        }
      }

      console.log('💰 Processing paid subscription');
      console.log('Product ID:', finalProductId);
      console.log('Amount:', finalPrice);
      console.log('Country:', userCountry);

      // Create unified payment session with backend (routes to Stripe or Paddle based on country)
      const response = await fetch(`${API_URL}/payments/create-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          planName,
          planInterval,
          amount: finalPrice,
          productId: finalProductId,
          countryCode: userCountry,
          language: navigator.language?.split('-')[0] || 'en',
        }),
      });

      const data = await response.json();
      console.log('Payment API response:', data);

      if (!response.ok) {
        console.error('❌ Payment session error:', data);
        throw new Error(data.message || 'Failed to create payment session');
      }

      // Redirect to payment checkout page (Stripe or Paddle based on country)
      if (data.paymentUrl) {
        console.log(`✅ Redirecting to ${data.provider}:`, data.paymentUrl);

        // Store payment info for callback
        sessionStorage.setItem('pending_payment', JSON.stringify({
          sessionId: data.sessionId,
          orderId: data.orderId,
          provider: data.provider,
          planName,
          planInterval,
          productId: finalProductId,
        }));

        // Redirect to external payment page (Stripe or Paddle)
        window.location.href = data.paymentUrl;
      } else {
        throw new Error('No payment URL received');
      }

    } catch (error) {
      console.error('❌ Payment error:', error);
      const message = error instanceof Error ? error.message : t('payment:errors.paymentFailed', 'Failed to initialize payment');
      setErrorMessage(message);
      setShowError(true);
      onError(message);
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  // Coming Soon overlay
  if (PAYMENTS_COMING_SOON) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="">
        <div className="max-w-md mx-auto">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center pb-4 border-b border-neutral-200">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <ClockIcon className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-800 mb-2">Coming Soon</h2>
              <p className="text-sm text-neutral-500">Premium subscriptions launching soon!</p>
            </div>

            {/* Plan Summary */}
            <div className="rounded-xl p-6 border bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-neutral-800">{planName}</h3>
                  <p className="text-sm text-neutral-500 capitalize">Billed {planInterval}ly</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-neutral-400">€{planPrice.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Coming Soon Message */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <CreditCardIcon className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900 mb-1">Payment System Under Development</p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    We're working hard to bring you secure payment options. Premium subscriptions will be available soon with support for major credit cards and local payment methods.
                  </p>
                </div>
              </div>
            </div>

            {/* Features Preview */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-neutral-800 mb-3">What you'll get:</p>
              <ul className="text-sm text-neutral-600 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  Secure payment processing
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  Multiple payment methods
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  Instant subscription activation
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  Easy cancellation anytime
                </li>
              </ul>
            </div>

            {/* Notify Me Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-4 px-6 rounded-xl font-bold text-lg shadow-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
            >
              Got it, notify me when available!
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="w-full py-3 text-neutral-600 hover:text-neutral-800 font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // Original payment UI (will be shown when PAYMENTS_COMING_SOON = false)
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="max-w-md mx-auto">
        {showError ? (
          <div className="text-center py-6 sm:py-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExclamationTriangleIcon className="w-8 h-8 sm:w-10 sm:h-10 text-red-500" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-800 mb-2">
              {t('payment:errors.title', 'Payment Error')}
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 mb-4 px-4">
              {errorMessage}
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 mb-4 mx-4 text-left">
              <p className="text-xs sm:text-sm text-amber-800">
                <strong>{t('payment:errors.whatToDo', 'What you can do:')}</strong>
              </p>
              <ul className="text-xs sm:text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
                <li>{t('payment:errors.checkConnection', 'Check your internet connection')}</li>
                <li>{t('payment:errors.tryAgain', 'Try again in a few moments')}</li>
                <li>{t('payment:errors.contactSupport', 'Contact support if the issue persists')}</li>
              </ul>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowError(false)}
                className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary-dark transition-colors"
              >
                {t('common:tryAgain', 'Try Again')}
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2.5 border border-neutral-300 text-neutral-700 rounded-lg font-medium text-sm hover:bg-neutral-50 transition-colors"
              >
                {t('common:close', 'Close')}
              </button>
            </div>
          </div>
        ) : showSuccess ? (
          <div className="text-center py-6 sm:py-8">
            <CheckCircleIcon className="w-12 h-12 sm:w-16 sm:h-16 text-green-500 mx-auto mb-3 sm:mb-4" />
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-800 mb-1.5 sm:mb-2">
              {t('payment:success.title', 'Payment Successful!')}
            </h2>
            <p className="text-sm sm:text-base text-neutral-600">
              {t('payment:success.message', 'Your subscription has been activated.')}
            </p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="text-center pb-3 sm:pb-4 border-b border-neutral-200">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-primary to-primary-dark rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
                <CreditCardIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h2 className="text-lg sm:text-2xl font-bold text-neutral-800 mb-1 sm:mb-2">Secure Checkout</h2>
              <p className="text-xs sm:text-sm text-neutral-500">Complete your purchase on our secure payment partner</p>
            </div>

            {/* Plan Summary */}
            <div className={`rounded-lg sm:rounded-xl p-4 sm:p-6 border ${
              finalPrice === 0 || finalPrice < 0.01
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                : 'bg-gradient-to-br from-neutral-50 to-neutral-100 border-neutral-200'
            }`}>
              <div className="flex justify-between items-start mb-3 sm:mb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-neutral-800">{planName}</h3>
                  <p className="text-xs sm:text-sm text-neutral-500 capitalize">Billed {planInterval}ly</p>
                </div>
                <div className="text-right">
                  {(discountPercent > 0 || codeValidation?.valid) && (
                    <>
                      <p className="text-xs sm:text-sm text-neutral-400 line-through">€{planPrice.toFixed(2)}</p>
                      <p className={`text-xl sm:text-2xl font-bold ${
                        finalPrice === 0 || finalPrice < 0.01 ? 'text-green-600' : 'text-primary'
                      }`}>
                        {finalPrice === 0 || finalPrice < 0.01 ? 'FREE' : `€${finalPrice.toFixed(2)}`}
                      </p>
                      <p className="text-[10px] sm:text-xs text-green-600 font-semibold">
                        {finalPrice === 0 || finalPrice < 0.01 ? '100% OFF!' : `Save €${savings.toFixed(2)}`}
                      </p>
                    </>
                  )}
                  {discountPercent === 0 && !codeValidation?.valid && (
                    <p className="text-xl sm:text-2xl font-bold text-primary">€{finalPrice.toFixed(2)}</p>
                  )}
                </div>
              </div>

              {/* Discount Code Input */}
              {!appliedDiscountCode && (
                <div className="mb-3 sm:mb-4">
                  <label className="block text-xs sm:text-sm font-medium text-neutral-700 mb-1.5 sm:mb-2">
                    Have a discount code?
                  </label>
                  <div className="flex gap-1.5 sm:gap-2">
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      className="flex-1 px-2.5 sm:px-3 py-1.5 sm:py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-xs sm:text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && handleValidateDiscountCode()}
                      disabled={validatingCode}
                    />
                    <button
                      onClick={handleValidateDiscountCode}
                      disabled={validatingCode || !discountCode.trim()}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 bg-primary text-white rounded-lg font-medium text-xs sm:text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {validatingCode ? 'Checking...' : 'Apply'}
                    </button>
                  </div>
                  {codeValidation && !codeValidation.valid && (
                    <p className="text-[10px] sm:text-xs text-red-600 mt-1">{codeValidation.message}</p>
                  )}
                </div>
              )}

              {/* Applied Discount Code */}
              {appliedDiscountCode && codeValidation?.valid && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2 sm:p-3 flex items-center justify-between gap-2 mb-2 sm:mb-3">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs sm:text-sm text-green-700 font-medium">
                        Code "{appliedDiscountCode}" applied!
                      </p>
                      <p className="text-[10px] sm:text-xs text-green-600">{codeValidation.message}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveDiscountCode}
                    className="text-green-700 hover:text-green-900 text-[10px] sm:text-xs font-medium"
                  >
                    Remove
                  </button>
                </div>
              )}

              {discountPercent > 0 && !appliedDiscountCode && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2 sm:p-3 flex items-center gap-1.5 sm:gap-2">
                  <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-green-700 font-medium">
                    {discountPercent}% discount applied!
                  </p>
                </div>
              )}
            </div>

            {/* Security Notice */}
            {finalPrice === 0 || finalPrice < 0.01 ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 flex gap-2 sm:gap-3">
                <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-semibold text-green-900 mb-0.5 sm:mb-1">Free Subscription Activated</p>
                  <p className="text-[10px] sm:text-xs text-green-700 leading-relaxed">
                    Your discount code provides 100% off! Click the button below to activate your free subscription immediately. No payment required.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 flex gap-2 sm:gap-3">
                <LockClosedIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-semibold text-blue-900 mb-0.5 sm:mb-1">Secure External Payment</p>
                  <p className="text-[10px] sm:text-xs text-blue-700 leading-relaxed">
                    You'll be redirected to our secure payment partner (Paddle) to complete your purchase.
                    We never store your card details - they're handled entirely by our certified payment processor.
                  </p>
                </div>
              </div>
            )}

            {/* Payment Button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Button clicked event triggered');
                handlePayment();
              }}
              disabled={isProcessing}
              className={`w-full py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl font-bold text-sm sm:text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-1.5 sm:gap-2 ${
                finalPrice === 0 || finalPrice < 0.01
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                  : 'bg-gradient-to-r from-primary to-primary-dark text-white'
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent"></div>
                  <span className="text-xs sm:text-base">{finalPrice === 0 || finalPrice < 0.01 ? 'Activating...' : 'Redirecting...'}</span>
                </>
              ) : (
                <>
                  <span>{finalPrice === 0 || finalPrice < 0.01 ? 'Activate Free Subscription' : 'Continue to Payment'}</span>
                  {finalPrice === 0 || finalPrice < 0.01 ? (
                    <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <ArrowTopRightOnSquareIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </>
              )}
            </button>

            {/* Cancel */}
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="w-full py-2 sm:py-3 text-neutral-600 hover:text-neutral-800 font-medium text-sm sm:text-base transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            {/* Trust Badges */}
            <div className="pt-3 sm:pt-4 border-t border-neutral-200">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-neutral-400">
                <div className="flex items-center gap-1">
                  <LockClosedIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span>SSL Secured</span>
                </div>
                <span className="hidden sm:inline">•</span>
                <div className="flex items-center gap-1">
                  <CheckCircleIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span>PCI Compliant</span>
                </div>
                <span className="hidden sm:inline">•</span>
                <span>Secure Payment</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PaymentWindow;
