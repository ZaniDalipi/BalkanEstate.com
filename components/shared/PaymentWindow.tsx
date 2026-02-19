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
import { trackEcommerce, trackEvent } from '../../src/components/marketing/Analytics';

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
const PAYMENTS_COMING_SOON = true;
// ============================================

// Check if we're in development mode - disable aggressive polling
const IS_DEVELOPMENT = import.meta.env.DEV || window.location.hostname === 'localhost';

// Helper to check if user already has an active subscription for this plan
const checkExistingSubscription = (
  currentUser: { subscriptionPlan?: string; subscriptionStatus?: string; subscriptionExpiresAt?: string | Date } | null,
  productId: string | undefined,
  planInterval: 'month' | 'year' | 'once'
): { hasConflict: boolean; message: string; isUpgrade: boolean; isDowngrade: boolean; isSamePlan: boolean } => {
  if (!currentUser?.subscriptionPlan || currentUser.subscriptionStatus !== 'active') {
    return { hasConflict: false, message: '', isUpgrade: false, isDowngrade: false, isSamePlan: false };
  }

  const currentPlan = currentUser.subscriptionPlan.toLowerCase();
  const targetPlan = (productId || '').toLowerCase();

  // Check if it's the exact same plan
  if (currentPlan === targetPlan) {
    return {
      hasConflict: true,
      message: 'You already have this subscription active.',
      isUpgrade: false,
      isDowngrade: false,
      isSamePlan: true
    };
  }

  // Check for downgrade (yearly to monthly of same tier)
  const currentIsYearly = currentPlan.includes('yearly') || currentPlan.includes('year');
  const targetIsMonthly = planInterval === 'month' || targetPlan.includes('monthly') || targetPlan.includes('month');

  // Extract tier names (e.g., 'buyer_pro', 'seller_premium', 'agent_pro')
  const currentTier = currentPlan.replace(/_?(monthly|yearly|month|year)$/i, '');
  const targetTier = targetPlan.replace(/_?(monthly|yearly|month|year)$/i, '');

  if (currentTier === targetTier && currentIsYearly && targetIsMonthly) {
    return {
      hasConflict: true,
      message: 'You have a yearly subscription active. Cancel it first before switching to monthly.',
      isUpgrade: false,
      isDowngrade: true,
      isSamePlan: false
    };
  }

  return { hasConflict: false, message: '', isUpgrade: false, isDowngrade: false, isSamePlan: false };
};

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
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Payment window tracking state
  const [paymentWindow, setPaymentWindow] = useState<Window | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingMessage, setPollingMessage] = useState('');
  const [showCouponInput, setShowCouponInput] = useState(false);
  const pollingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

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
      setTermsAccepted(false);
      setIsPolling(false);
      setPollingMessage('');
      // Clean up polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  }, [isOpen, state.isAuthenticated, onError, onClose, t]);

  // Clean up payment window and polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Check if user has conflicting subscription
  const subscriptionCheck = checkExistingSubscription(state.currentUser, productId, planInterval);

  // Start polling for payment verification
  // In development: skip polling entirely to avoid rate limiting
  // In production: poll every 6 seconds with max 30 attempts
  const startPaymentPolling = (sessionId: string, maxAttempts = IS_DEVELOPMENT ? 3 : 30) => {
    // In development, don't poll aggressively - just show success message
    if (IS_DEVELOPMENT) {
      setIsPolling(true);
      setPollingMessage('Development mode: Payment window opened. Complete payment manually, then refresh to see subscription status.');
      // Just do a few quick checks then stop
      setTimeout(() => {
        setIsPolling(false);
        setPollingMessage('');
      }, 10000); // Stop after 10 seconds in dev
      return;
    }

    let attempts = 0;
    setIsPolling(true);
    setPollingMessage(t('payment:polling.waitingForPayment', 'Waiting for payment confirmation...'));

    pollingIntervalRef.current = setInterval(async () => {
      attempts++;

      // Check if payment window was closed
      if (paymentWindow && paymentWindow.closed) {
        setPollingMessage(t('payment:polling.windowClosed', 'Payment window closed. Verifying payment...'));
      }

      try {
        const token = localStorage.getItem('balkan_estate_token');
        const response = await fetch(`${API_URL}/payments/lemonsqueezy/verify`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (data.success && data.paymentStatus === 'paid') {
          // Payment successful!
          clearInterval(pollingIntervalRef.current!);
          pollingIntervalRef.current = null;
          setIsPolling(false);

          // Track successful payment
          trackEcommerce.subscribe(planName, finalPrice);
          trackEvent('purchase', {
            currency: 'EUR',
            value: finalPrice,
            items: [{
              item_id: productId || 'unknown',
              item_name: planName,
              price: finalPrice,
              quantity: 1,
            }],
            transaction_id: sessionId,
          });

          setShowSuccess(true);
          setTimeout(() => {
            onSuccess(data.subscription?.id || sessionId);
          }, 2000);
          return;
        }

        // Update polling message based on status
        if (data.paymentStatus === 'processing') {
          setPollingMessage(t('payment:polling.processing', 'Payment is being processed...'));
        } else if (attempts > 10 && paymentWindow?.closed) {
          setPollingMessage(t('payment:polling.verifying', 'Verifying your payment with our payment provider...'));
        }

      } catch (error) {
      }

      // Stop polling after max attempts
      if (attempts >= maxAttempts) {
        clearInterval(pollingIntervalRef.current!);
        pollingIntervalRef.current = null;
        setIsPolling(false);
        setPollingMessage('');

        // If window is closed and we haven't confirmed payment, show message
        if (paymentWindow?.closed) {
          setErrorMessage(t('payment:errors.verificationTimeout', 'Payment verification timed out. If you completed the payment, your subscription will be activated shortly. Please check your email for confirmation.'));
          setShowError(true);
        }
      }
    }, 6000); // Poll every 6 seconds to avoid rate limiting
  };

  // Handle payment window close
  const handlePaymentWindowClosed = () => {
    if (!showSuccess && isPolling) {
      setPollingMessage(t('payment:polling.verifyingAfterClose', 'Verifying payment status...'));
    }
  };

  const handleValidateDiscountCode = async () => {
    const trimmedCode = discountCode.trim();
    if (!trimmedCode) {
      setCodeValidation({ valid: false, message: 'Please enter a discount code' });
      return;
    }

    // Client-side format validation: alphanumeric, hyphens, underscores only (3-50 chars)
    if (!/^[A-Za-z0-9_-]{3,50}$/.test(trimmedCode)) {
      setCodeValidation({ valid: false, message: 'Invalid code format. Use only letters, numbers, hyphens and underscores.' });
      return;
    }

    if (planPrice == null || planPrice < 0) {
      setCodeValidation({ valid: false, message: 'Invalid plan price' });
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
          code: trimmedCode,
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
    setIsProcessing(true);

    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('balkan_estate_token');

      if (!token) {
        throw new Error('Please log in to complete your purchase');
      }

      // Check if this is a 100% off coupon (free subscription)
      if (finalPrice === 0 || finalPrice < 0.01) {

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

        if (!response.ok) {
          throw new Error(data.message || 'Failed to apply free subscription');
        }

        // Track free subscription in Google Analytics
        trackEcommerce.subscribe(planName, 0);
        trackEvent('free_subscription_applied', {
          plan_name: planName,
          plan_interval: planInterval,
          discount_code: appliedDiscountCode,
        });

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

      // Create unified payment session with backend (routes to LemonSqueezy)
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
          // Pass discount code so backend can mark it used after payment
          ...(appliedDiscountCode ? { discountCode: appliedDiscountCode } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create payment session');
      }

      // Open payment checkout page in new window
      if (data.paymentUrl) {

        // Store payment info for callback
        sessionStorage.setItem('pending_payment', JSON.stringify({
          sessionId: data.sessionId,
          orderId: data.orderId,
          provider: data.provider,
          planName,
          planInterval,
          productId: finalProductId,
        }));

        // Track payment initiation in Google Analytics
        trackEvent('begin_checkout', {
          currency: 'EUR',
          value: finalPrice,
          items: [{
            item_id: finalProductId,
            item_name: planName,
            price: finalPrice,
            quantity: 1,
          }],
          payment_provider: data.provider,
        });

        // Open LemonSqueezy checkout in a new window
        const checkoutWindow = window.open(
          data.paymentUrl,
          'PaymentWindow',
          'width=600,height=800,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no'
        );

        if (checkoutWindow) {
          setPaymentWindow(checkoutWindow);
          setIsProcessing(false);

          // Start polling for payment verification
          startPaymentPolling(data.sessionId || data.orderId);

          // Monitor if window is closed
          const checkWindowClosed = setInterval(() => {
            if (checkoutWindow.closed) {
              clearInterval(checkWindowClosed);
              handlePaymentWindowClosed();
            }
          }, 1000);
        } else {
          // Popup blocked - fall back to redirect
          window.location.href = data.paymentUrl;
        }
      } else {
        throw new Error('No payment URL received');
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : t('payment:errors.paymentFailed', 'Failed to initialize payment');
      setErrorMessage(message);
      setShowError(true);
      onError(message);
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  // Show subscription conflict message if user already has this plan or is trying to downgrade
  if (subscriptionCheck.hasConflict) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="">
        <div className="max-w-md mx-auto">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center pb-4 border-b border-neutral-200">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <CheckCircleIcon className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-800 mb-2">
                {subscriptionCheck.isSamePlan ? 'Already Subscribed' : 'Subscription Active'}
              </h2>
              <p className="text-sm text-neutral-500">
                {subscriptionCheck.message}
              </p>
            </div>

            {/* Current Subscription Info */}
            <div className="rounded-xl p-6 border bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-neutral-500 mb-1">Current Plan</p>
                  <h3 className="text-lg font-bold text-neutral-800">
                    {state.currentUser?.subscriptionProductName || state.currentUser?.subscriptionPlan || 'Pro'}
                  </h3>
                  <p className="text-sm text-green-600 font-medium mt-1">
                    {state.currentUser?.subscriptionStatus === 'active' ? '✓ Active' : state.currentUser?.subscriptionStatus}
                  </p>
                </div>
                {state.currentUser?.subscriptionExpiresAt && (
                  <div className="text-right">
                    <p className="text-xs text-neutral-500">Renews on</p>
                    <p className="text-sm font-medium text-neutral-700">
                      {new Date(state.currentUser.subscriptionExpiresAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Info Message */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    {subscriptionCheck.isDowngrade ? 'Want to switch plans?' : 'Manage your subscription'}
                  </p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    {subscriptionCheck.isDowngrade
                      ? 'To switch from yearly to monthly billing, please cancel your current subscription first. After it expires, you can subscribe to the monthly plan.'
                      : 'You can manage your subscription from your Account Settings. Cancel anytime before the renewal date.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <button
              type="button"
              onClick={() => {
                onClose();
                // Navigate to account settings
                window.location.href = '/account?tab=subscription';
              }}
              className="w-full py-4 px-6 rounded-xl font-bold text-lg shadow-lg bg-gradient-to-r from-primary to-primary-dark text-white hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
            >
              Manage Subscription
            </button>

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

  // Coming Soon overlay - with coupon support
  if (PAYMENTS_COMING_SOON) {
    // Allow 100% off coupons to work even in "coming soon" mode
    const canActivateFree = finalPrice === 0 || finalPrice < 0.01;

    return (
      <Modal isOpen={isOpen} onClose={onClose} title="">
        <div className="max-w-md mx-auto">
          <div className="space-y-4 sm:space-y-5">
            {/* Header with illustration */}
            <div className="text-center pb-3 sm:pb-4 border-b border-neutral-200">
              {/* Payment illustration */}
              <div className="relative mx-auto mb-4 w-48 h-32 sm:w-56 sm:h-36">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-indigo-100 rounded-2xl"></div>
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-36 h-22 sm:w-44 sm:h-26">
                  {/* Credit card illustration */}
                  <div className="relative">
                    <div className="w-36 sm:w-44 h-[88px] sm:h-[100px] bg-gradient-to-br from-primary to-indigo-600 rounded-xl shadow-lg transform -rotate-6 absolute top-0 left-0">
                      <div className="p-3 sm:p-4">
                        <div className="flex justify-between items-start mb-3 sm:mb-4">
                          <div className="w-8 h-5 sm:w-10 sm:h-6 bg-amber-400 rounded-sm"></div>
                          <div className="flex gap-0.5">
                            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white/30 rounded-full"></div>
                            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white/20 rounded-full -ml-1.5 sm:-ml-2"></div>
                          </div>
                        </div>
                        <div className="flex gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                          <div className="h-1.5 w-6 sm:w-8 bg-white/30 rounded"></div>
                          <div className="h-1.5 w-6 sm:w-8 bg-white/30 rounded"></div>
                          <div className="h-1.5 w-6 sm:w-8 bg-white/30 rounded"></div>
                          <div className="h-1.5 w-6 sm:w-8 bg-white/30 rounded"></div>
                        </div>
                        <div className="h-1.5 w-16 sm:w-20 bg-white/20 rounded"></div>
                      </div>
                    </div>
                    <div className="w-36 sm:w-44 h-[88px] sm:h-[100px] bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg transform rotate-6 absolute top-2 left-2">
                      <div className="p-3 sm:p-4">
                        <div className="flex justify-between items-start mb-3 sm:mb-4">
                          <div className="w-8 h-5 sm:w-10 sm:h-6 bg-amber-300 rounded-sm"></div>
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>
                        </div>
                        <div className="flex gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                          <div className="h-1.5 w-6 sm:w-8 bg-white/30 rounded"></div>
                          <div className="h-1.5 w-6 sm:w-8 bg-white/30 rounded"></div>
                          <div className="h-1.5 w-6 sm:w-8 bg-white/30 rounded"></div>
                          <div className="h-1.5 w-6 sm:w-8 bg-white/30 rounded"></div>
                        </div>
                        <div className="h-1.5 w-16 sm:w-20 bg-white/20 rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-neutral-800 mb-1 sm:mb-2">
                {canActivateFree ? 'Activate Free Subscription' : `Subscribe to ${planName}`}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500">
                {canActivateFree
                  ? 'Your coupon provides 100% off!'
                  : `€${planPrice.toFixed(2)}/${planInterval} - Premium features await you`}
              </p>
            </div>

            {/* Free activation flow - show when coupon makes it free */}
            {canActivateFree && (
              <>
                {/* Plan Summary */}
                <div className="rounded-lg sm:rounded-xl p-4 sm:p-5 border bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-neutral-800">{planName}</h3>
                      <p className="text-xs sm:text-sm text-neutral-500 capitalize">Billed {planInterval}ly</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs sm:text-sm text-neutral-400 line-through">€{planPrice.toFixed(2)}</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-600">FREE</p>
                      <p className="text-[10px] sm:text-xs text-green-600 font-semibold">100% OFF!</p>
                    </div>
                  </div>

                  {/* Applied Discount Code */}
                  {appliedDiscountCode && codeValidation?.valid && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2 sm:p-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                        <div>
                          <p className="text-xs sm:text-sm text-green-700 font-medium">
                            Code &quot;{appliedDiscountCode}&quot; applied!
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
                </div>

                {/* Free activation info */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                  <div className="flex gap-2 sm:gap-3">
                    <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs sm:text-sm font-semibold text-green-900 mb-0.5 sm:mb-1">Free Subscription Ready</p>
                      <p className="text-[10px] sm:text-xs text-green-700 leading-relaxed">
                        Your discount code provides 100% off! Click below to activate your subscription immediately - no payment required.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Activate button */}
                <button
                  type="button"
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="w-full py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl font-bold text-sm sm:text-lg shadow-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent"></div>
                      <span>Activating...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>Activate Free Subscription</span>
                    </>
                  )}
                </button>
              </>
            )}

            {/* Normal flow - coupon or contact */}
            {!canActivateFree && (
              <>
                {/* Option 1: Did we provide a coupon? */}
                <div className="rounded-lg sm:rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowCouponInput(!showCouponInput)}
                    className="w-full p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-primary/10 transition-colors"
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <p className="text-sm sm:text-base font-semibold text-neutral-800">Did we provide a coupon for you?</p>
                        <p className="text-[10px] sm:text-xs text-neutral-500">Enter your code to activate your subscription</p>
                      </div>
                    </div>
                    <svg className={`w-4 h-4 sm:w-5 sm:h-5 text-neutral-400 transition-transform ${showCouponInput ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showCouponInput && (
                    <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-primary/10">
                      <div className="pt-3 sm:pt-4">
                        {/* Plan summary */}
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-sm sm:text-base font-bold text-neutral-800">{planName}</h3>
                            <p className="text-xs text-neutral-500 capitalize">Billed {planInterval}ly</p>
                          </div>
                          <div className="text-right">
                            {codeValidation?.valid ? (
                              <>
                                <p className="text-xs text-neutral-400 line-through">€{planPrice.toFixed(2)}</p>
                                <p className="text-lg sm:text-xl font-bold text-primary">€{finalPrice.toFixed(2)}</p>
                                <p className="text-[10px] text-green-600 font-semibold">Save €{savings.toFixed(2)}</p>
                              </>
                            ) : (
                              <p className="text-lg sm:text-xl font-bold text-neutral-700">€{planPrice.toFixed(2)}</p>
                            )}
                          </div>
                        </div>

                        {/* Coupon input */}
                        {!appliedDiscountCode && (
                          <div className="mb-3">
                            <div className="flex gap-1.5 sm:gap-2">
                              <input
                                type="text"
                                value={discountCode}
                                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                                placeholder="Enter coupon code"
                                className="flex-1 px-2.5 sm:px-3 py-2 sm:py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                onKeyPress={(e) => e.key === 'Enter' && handleValidateDiscountCode()}
                                disabled={validatingCode}
                              />
                              <button
                                onClick={handleValidateDiscountCode}
                                disabled={validatingCode || !discountCode.trim()}
                                className="px-4 sm:px-5 py-2 sm:py-2.5 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {validatingCode ? 'Checking...' : 'Apply'}
                              </button>
                            </div>
                            {codeValidation && !codeValidation.valid && (
                              <p className="text-xs text-red-600 mt-1.5">{codeValidation.message}</p>
                            )}
                          </div>
                        )}

                        {/* Applied code */}
                        {appliedDiscountCode && codeValidation?.valid && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                              <div>
                                <p className="text-xs sm:text-sm text-green-700 font-medium">Code &quot;{appliedDiscountCode}&quot; applied!</p>
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
                      </div>
                    </div>
                  )}
                </div>

                {/* Option 2: Self-payment (Coming soon) */}
                <div className="rounded-lg sm:rounded-xl border border-neutral-200 bg-neutral-50 p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <CreditCardIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm sm:text-base font-semibold text-neutral-800">Self-service payment</p>
                      <p className="text-[10px] sm:text-xs text-neutral-500">Online payment gateway launching soon</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse flex-shrink-0"></span>
                    <p className="text-[10px] sm:text-xs text-amber-700 font-medium">Payment integration in progress</p>
                  </div>
                </div>

                {/* Contact sales */}
                <div className="rounded-lg sm:rounded-xl border border-neutral-200 bg-white p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-neutral-600 mb-2.5">
                    Need help or want to subscribe manually? Contact our sales team:
                  </p>
                  <a
                    href="mailto:sales@balkanestateai.com?subject=Subscription%20Request%20-%20BalkanEstate"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-indigo-600 text-white font-semibold rounded-lg hover:from-primary-dark hover:to-indigo-700 transition-all shadow-md hover:shadow-lg text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    sales@balkanestateai.com
                  </a>
                  <p className="text-[10px] sm:text-xs text-neutral-400 mt-2">We typically respond within 24 hours</p>
                </div>
              </>
            )}

            {/* Close */}
            <button
              onClick={onClose}
              className="w-full py-2 sm:py-3 text-neutral-600 hover:text-neutral-800 font-medium text-sm sm:text-base transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // Payment in Progress state (polling for confirmation)
  if (isPolling) {
    return (
      <Modal isOpen={isOpen} onClose={() => {}} title="">
        <div className="max-w-md mx-auto">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center pb-4 border-b border-neutral-200">
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent"></div>
              </div>
              <h2 className="text-2xl font-bold text-neutral-800 mb-2">
                {t('payment:inProgress.title', 'Payment in Progress')}
              </h2>
              <p className="text-sm text-neutral-500">
                {pollingMessage || t('payment:inProgress.description', 'Please complete your payment in the new window')}
              </p>
            </div>

            {/* Plan Summary */}
            <div className="rounded-xl p-6 border bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-neutral-800">{planName}</h3>
                  <p className="text-sm text-neutral-500 capitalize">
                    {t('payment:inProgress.billed', 'Billed')} {planInterval === 'year' ? t('payment:inProgress.yearly', 'yearly') : t('payment:inProgress.monthly', 'monthly')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">€{finalPrice.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex gap-3">
                <ClockIcon className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-900 mb-1">
                    {t('payment:inProgress.waitingTitle', 'Waiting for Payment')}
                  </p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    {t('payment:inProgress.waitingMessage', 'Complete your payment in the popup window. This page will update automatically once your payment is confirmed.')}
                  </p>
                </div>
              </div>
            </div>

            {/* Auto-renewal notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <CreditCardIcon className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    {t('payment:inProgress.subscriptionInfo', 'Subscription Information')}
                  </p>
                  <ul className="text-xs text-blue-700 leading-relaxed space-y-1">
                    <li>• {t('payment:inProgress.autoRenewal', 'Your subscription will automatically renew at the end of each billing period')}</li>
                    <li>• {t('payment:inProgress.renewalReminder', 'You will receive a reminder email 7 days before renewal')}</li>
                    <li>• {t('payment:inProgress.cancelAnytime', 'You can cancel anytime from your account settings')}</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Cancel Button */}
            <button
              onClick={() => {
                if (pollingIntervalRef.current) {
                  clearInterval(pollingIntervalRef.current);
                  pollingIntervalRef.current = null;
                }
                setIsPolling(false);
                setPollingMessage('');
                if (paymentWindow && !paymentWindow.closed) {
                  paymentWindow.close();
                }
                onClose();
              }}
              className="w-full py-3 text-neutral-600 hover:text-neutral-800 font-medium transition-colors border border-neutral-300 rounded-xl hover:bg-neutral-50"
            >
              {t('payment:inProgress.cancel', 'Cancel and Close')}
            </button>

            {/* Help text */}
            <p className="text-xs text-center text-neutral-400">
              {t('payment:inProgress.helpText', 'If the payment window didn\'t open, please check your popup blocker')}
            </p>
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
          <div className="text-center py-8">
            {/* Success Animation */}
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-bounce">
              <CheckCircleIcon className="w-14 h-14 text-white" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-800 mb-3">
              {t('payment:success.title', 'Payment Successful!')}
            </h2>

            <p className="text-base text-neutral-600 mb-6">
              {t('payment:success.message', 'Your subscription has been activated.')}
            </p>

            {/* Plan activated info */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-800">{planName}</p>
                  <p className="text-sm text-green-600">Now active on your account</p>
                </div>
              </div>
            </div>

            {/* What's next */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-left">
              <p className="font-semibold text-blue-900 mb-2">What happens next?</p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• You now have access to all premium features</li>
                <li>• A confirmation email has been sent to you</li>
                <li>• Manage your subscription in Account Settings</li>
              </ul>
            </div>

            {/* Close button */}
            <button
              onClick={() => {
                onClose();
                // Refresh to update user subscription state
                window.location.reload();
              }}
              className="w-full py-4 px-6 rounded-xl font-bold text-lg shadow-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
            >
              {t('payment:success.continue', 'Continue to Dashboard')}
            </button>
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
                    You'll be redirected to our secure payment partner (LemonSqueezy) to complete your purchase.
                    We never store your card details - they're handled entirely by our certified payment processor.
                  </p>
                </div>
              </div>
            )}

            {/* Tax/VAT Notice */}
            {finalPrice > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 flex gap-2 sm:gap-3">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-semibold text-amber-900 mb-0.5 sm:mb-1">
                    {t('payment:taxNotice.title', 'Taxes May Apply')}
                  </p>
                  <p className="text-[10px] sm:text-xs text-amber-700 leading-relaxed">
                    {t('payment:taxNotice.description', 'The final price at checkout may include applicable VAT/taxes based on your location. LemonSqueezy, as Merchant of Record, handles all tax compliance automatically.')}
                  </p>
                </div>
              </div>
            )}

            {/* Terms Acceptance Checkbox - Required by LemonSqueezy */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex-shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded border-gray-300 text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                  />
                </div>
                <span className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                  {t('payment:termsAcceptance.text', 'I agree to the')}{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                    {t('payment:termsAcceptance.terms', 'Terms of Service')}
                  </a>
                  {', '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                    {t('payment:termsAcceptance.privacy', 'Privacy Policy')}
                  </a>
                  {', '}
                  {t('payment:termsAcceptance.and', 'and')}{' '}
                  <a href="/refund" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                    {t('payment:termsAcceptance.refund', 'Refund Policy')}
                  </a>
                  {'. '}
                  {t('payment:termsAcceptance.lemonsqueezy', 'Payments are processed by LemonSqueezy as Merchant of Record.')}
                </span>
              </label>
            </div>

            {/* Payment Button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePayment();
              }}
              disabled={isProcessing || !termsAccepted}
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
