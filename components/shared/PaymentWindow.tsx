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
): { hasConflict: boolean; messageKey: string; isUpgrade: boolean; isDowngrade: boolean; isSamePlan: boolean } => {
  if (!currentUser?.subscriptionPlan || currentUser.subscriptionStatus !== 'active') {
    return { hasConflict: false, messageKey: '', isUpgrade: false, isDowngrade: false, isSamePlan: false };
  }

  const currentPlan = currentUser.subscriptionPlan.toLowerCase();
  const targetPlan = (productId || '').toLowerCase();

  // Check if it's the exact same plan
  if (currentPlan === targetPlan) {
    return {
      hasConflict: true,
      messageKey: 'payment:subscription.alreadyActive',
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
      messageKey: 'payment:subscription.cancelYearlyFirst',
      isUpgrade: false,
      isDowngrade: true,
      isSamePlan: false
    };
  }

  return { hasConflict: false, messageKey: '', isUpgrade: false, isDowngrade: false, isSamePlan: false };
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
        onError(t('payment:errors.loginRequired'));
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
      setPollingMessage(t('payment:polling.devMode'));
      // Just do a few quick checks then stop
      setTimeout(() => {
        setIsPolling(false);
        setPollingMessage('');
      }, 10000); // Stop after 10 seconds in dev
      return;
    }

    let attempts = 0;
    setIsPolling(true);
    setPollingMessage(t('payment:polling.waitingForPayment'));

    pollingIntervalRef.current = setInterval(async () => {
      attempts++;

      // Check if payment window was closed
      if (paymentWindow && paymentWindow.closed) {
        setPollingMessage(t('payment:polling.windowClosed'));
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
          setPollingMessage(t('payment:polling.processing'));
        } else if (attempts > 10 && paymentWindow?.closed) {
          setPollingMessage(t('payment:polling.verifying'));
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
          setErrorMessage(t('payment:errors.verificationTimeout'));
          setShowError(true);
        }
      }
    }, 6000); // Poll every 6 seconds to avoid rate limiting
  };

  // Handle payment window close
  const handlePaymentWindowClosed = () => {
    if (!showSuccess && isPolling) {
      setPollingMessage(t('payment:polling.verifyingAfterClose'));
    }
  };

  const handleValidateDiscountCode = async () => {
    const trimmedCode = discountCode.trim();
    if (!trimmedCode) {
      setCodeValidation({ valid: false, message: t('payment:checkout.enterDiscountCode') });
      return;
    }

    // Client-side format validation: alphanumeric, hyphens, underscores only (3-50 chars)
    if (!/^[A-Za-z0-9_-]{3,50}$/.test(trimmedCode)) {
      setCodeValidation({ valid: false, message: t('payment:errors.invalidCodeFormat') });
      return;
    }

    if (planPrice == null || planPrice < 0) {
      setCodeValidation({ valid: false, message: t('payment:errors.invalidPlanPrice') });
      return;
    }

    // Resolve effective plan ID - same fallback logic as payment creation
    let effectivePlanId = productId;
    if (!effectivePlanId) {
      if (planName.toLowerCase().includes('buyer') && planInterval === 'month') {
        effectivePlanId = 'buyer_monthly';
      } else if (planName.toLowerCase().includes('buyer') && planInterval === 'year') {
        effectivePlanId = 'buyer_yearly';
      } else if (planName.toLowerCase().includes('seller') && planInterval === 'month') {
        effectivePlanId = 'seller_pro_monthly';
      } else if (planName.toLowerCase().includes('seller') && planInterval === 'year') {
        effectivePlanId = 'seller_pro_yearly';
      } else if (planName.toLowerCase().includes('agent') && planInterval === 'month') {
        effectivePlanId = 'agent_pro_monthly';
      } else if (planName.toLowerCase().includes('agent') && planInterval === 'year') {
        effectivePlanId = 'agent_pro_yearly';
      } else if (planName.toLowerCase().includes('enterprise')) {
        effectivePlanId = 'seller_enterprise_yearly';
      }
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
          planId: effectivePlanId,
          purchaseAmount: planPrice,
        }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setCodeValidation({
          valid: true,
          message: t('payment:checkout.discountAppliedSave', { amount: data.discount.discountAmount.toFixed(2) }),
          discountAmount: data.discount.discountAmount,
          finalPrice: data.discount.finalPrice,
        });
        setAppliedDiscountCode(discountCode.trim());
      } else {
        setCodeValidation({
          valid: false,
          message: data.message || t('payment:errors.invalidDiscountCode'),
        });
      }
    } catch (error) {
      setCodeValidation({
        valid: false,
        message: t('payment:checkout.validationFailed'),
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
        throw new Error(t('payment:errors.loginRequired'));
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
          throw new Error(data.message || t('payment:errors.freeSubscriptionFailed'));
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

      // Determine product ID if not provided (must match DB product IDs)
      let finalProductId = productId;
      if (!finalProductId) {
        if (planName.toLowerCase().includes('buyer') && planInterval === 'month') {
          finalProductId = 'buyer_monthly';
        } else if (planName.toLowerCase().includes('buyer') && planInterval === 'year') {
          finalProductId = 'buyer_yearly';
        } else if (planName.toLowerCase().includes('seller') && planInterval === 'month') {
          finalProductId = 'seller_pro_monthly';
        } else if (planName.toLowerCase().includes('seller') && planInterval === 'year') {
          finalProductId = 'seller_pro_yearly';
        } else if (planName.toLowerCase().includes('agent') && planInterval === 'month') {
          finalProductId = 'agent_pro_monthly';
        } else if (planName.toLowerCase().includes('agent') && planInterval === 'year') {
          finalProductId = 'agent_pro_yearly';
        } else if (planName.toLowerCase().includes('enterprise')) {
          finalProductId = 'enterprise_tier_' + Date.now();
        } else {
          finalProductId = 'buyer_monthly';
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
        throw new Error(data.message || t('payment:errors.sessionCreationFailed'));
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
        throw new Error(t('payment:errors.noPaymentUrl'));
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : t('payment:errors.paymentFailed');
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
      <Modal isOpen={isOpen} onClose={onClose} title="" fullScreenOnMobile>
        <div className="max-w-md mx-auto">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center pb-4 border-b border-neutral-200">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <CheckCircleIcon className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-800 mb-2">
                {subscriptionCheck.isSamePlan ? t('payment:subscription.alreadySubscribed') : t('payment:subscription.subscriptionActive')}
              </h2>
              <p className="text-sm text-neutral-500">
                {t(subscriptionCheck.messageKey)}
              </p>
            </div>

            {/* Current Subscription Info */}
            <div className="rounded-xl p-6 border bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-neutral-500 mb-1">{t('payment:subscription.currentPlan')}</p>
                  <h3 className="text-lg font-bold text-neutral-800">
                    {state.currentUser?.subscriptionProductName || state.currentUser?.subscriptionPlan || 'Pro'}
                  </h3>
                  <p className="text-sm text-green-600 font-medium mt-1">
                    {state.currentUser?.subscriptionStatus === 'active' ? t('payment:subscription.active') : state.currentUser?.subscriptionStatus}
                  </p>
                </div>
                {state.currentUser?.subscriptionExpiresAt && (
                  <div className="text-right">
                    <p className="text-xs text-neutral-500">{t('payment:subscription.renewsOn')}</p>
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
                    {subscriptionCheck.isDowngrade ? t('payment:subscription.wantToSwitch') : t('payment:subscription.manageYourSubscription')}
                  </p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    {subscriptionCheck.isDowngrade
                      ? t('payment:subscription.switchToMonthlyInfo')
                      : t('payment:subscription.manageInfo')}
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
              {t('payment:subscription.manageSubscription')}
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 text-neutral-600 hover:text-neutral-800 font-medium transition-colors"
            >
              {t('common:close')}
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

    // Show error dialog inside modal when activation fails
    if (showError) {
      return (
        <Modal isOpen={isOpen} onClose={onClose} title="" fullScreenOnMobile>
          <div className="max-w-md mx-auto text-center py-4 sm:py-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <ExclamationTriangleIcon className="w-7 h-7 sm:w-8 sm:h-8 text-red-500" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-neutral-800 mb-2">Activation Failed</h2>
            <p className="text-sm text-neutral-600 mb-2 px-2">{errorMessage}</p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 mb-5 text-left">
              <p className="text-xs sm:text-sm text-amber-800 font-semibold mb-1">What you can do:</p>
              <ul className="text-xs sm:text-sm text-amber-700 space-y-1 list-disc list-inside">
                <li>Check your internet connection</li>
                <li>Make sure the coupon code is valid</li>
                <li>Try again in a few moments</li>
                <li>Contact support if the issue persists</li>
              </ul>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowError(false)}
                className="px-5 sm:px-6 py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary-dark transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="px-5 sm:px-6 py-2.5 border border-neutral-300 text-neutral-700 rounded-lg font-medium text-sm hover:bg-neutral-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      );
    }

    // Show success dialog inside modal when activation succeeds
    if (showSuccess) {
      return (
        <Modal isOpen={isOpen} onClose={onClose} title="" fullScreenOnMobile>
          <div className="text-center py-4 sm:py-8">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg animate-bounce">
              <CheckCircleIcon className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-800 mb-2 sm:mb-3">
              Subscription Activated!
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 mb-4 sm:mb-6">
              Your free subscription has been successfully activated.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 sm:mb-6 text-left">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-800 text-sm sm:text-base">{planName}</p>
                  <p className="text-xs sm:text-sm text-green-600">Now active on your account</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => { onClose(); window.location.reload(); }}
              className="w-full py-3 sm:py-4 px-6 rounded-xl font-bold text-sm sm:text-lg shadow-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
            >
              Continue to Dashboard
            </button>
          </div>
        </Modal>
      );
    }

    return (
      <Modal isOpen={isOpen} onClose={onClose} title="" fullScreenOnMobile>
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
                {canActivateFree ? t('payment:checkout.activateFreeSubscription') : t('payment:checkout.subscribeTo', { plan: planName })}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500">
                {canActivateFree
                  ? t('payment:checkout.coupon100Off')
                  : t('payment:checkout.priceDescription', { price: planPrice.toFixed(2), interval: planInterval })}
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
                      <p className="text-xs sm:text-sm text-neutral-500 capitalize">{planInterval === 'year' ? t('payment:checkout.billedYearly') : planInterval === 'month' ? t('payment:checkout.billedMonthly') : t('payment:checkout.billedOnce')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs sm:text-sm text-neutral-400 line-through">€{planPrice.toFixed(2)}</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-600">{t('payment:checkout.free')}</p>
                      <p className="text-[10px] sm:text-xs text-green-600 font-semibold">{t('payment:checkout.fullDiscount')}</p>
                    </div>
                  </div>

                  {/* Applied Discount Code */}
                  {appliedDiscountCode && codeValidation?.valid && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2 sm:p-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                        <div>
                          <p className="text-xs sm:text-sm text-green-700 font-medium">
                            {t('payment:checkout.codeApplied', { code: appliedDiscountCode })}
                          </p>
                          <p className="text-[10px] sm:text-xs text-green-600">{codeValidation.message}</p>
                        </div>
                      </div>
                      <button
                        onClick={handleRemoveDiscountCode}
                        className="text-green-700 hover:text-green-900 text-[10px] sm:text-xs font-medium"
                      >
                        {t('payment:checkout.remove')}
                      </button>
                    </div>
                  )}
                </div>

                {/* Free activation info */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                  <div className="flex gap-2 sm:gap-3">
                    <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs sm:text-sm font-semibold text-green-900 mb-0.5 sm:mb-1">{t('payment:checkout.freeSubscriptionReady')}</p>
                      <p className="text-[10px] sm:text-xs text-green-700 leading-relaxed">
                        {t('payment:checkout.freeSubscriptionReadyDescription')}
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
                      <span>{t('payment:checkout.activating')}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>{t('payment:checkout.activateFreeSubscription')}</span>
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
                        <p className="text-sm sm:text-base font-semibold text-neutral-800">{t('payment:checkout.haveCoupon')}</p>
                        <p className="text-[10px] sm:text-xs text-neutral-500">{t('payment:checkout.enterCodeToActivate')}</p>
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
                            <p className="text-xs text-neutral-500 capitalize">{planInterval === 'year' ? t('payment:checkout.billedYearly') : planInterval === 'month' ? t('payment:checkout.billedMonthly') : t('payment:checkout.billedOnce')}</p>
                          </div>
                          <div className="text-right">
                            {codeValidation?.valid ? (
                              <>
                                <p className="text-xs text-neutral-400 line-through">€{planPrice.toFixed(2)}</p>
                                <p className="text-lg sm:text-xl font-bold text-primary">€{finalPrice.toFixed(2)}</p>
                                <p className="text-[10px] text-green-600 font-semibold">{t('payment:checkout.save', { amount: savings.toFixed(2) })}</p>
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
                                placeholder={t('payment:checkout.enterCouponCode')}
                                className="flex-1 min-w-0 px-2.5 sm:px-3 py-2 sm:py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                onKeyPress={(e) => e.key === 'Enter' && handleValidateDiscountCode()}
                                disabled={validatingCode}
                              />
                              <button
                                onClick={handleValidateDiscountCode}
                                disabled={validatingCode || !discountCode.trim()}
                                className="flex-shrink-0 px-4 sm:px-5 py-2 sm:py-2.5 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                              >
                                {validatingCode ? t('payment:checkout.checking') : t('payment:checkout.apply')}
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
                                <p className="text-xs sm:text-sm text-green-700 font-medium">{t('payment:checkout.codeApplied', { code: appliedDiscountCode })}</p>
                                <p className="text-[10px] sm:text-xs text-green-600">{codeValidation.message}</p>
                              </div>
                            </div>
                            <button
                              onClick={handleRemoveDiscountCode}
                              className="text-green-700 hover:text-green-900 text-[10px] sm:text-xs font-medium"
                            >
                              {t('payment:checkout.remove')}
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
                      <p className="text-sm sm:text-base font-semibold text-neutral-800">{t('payment:comingSoon.selfServicePayment')}</p>
                      <p className="text-[10px] sm:text-xs text-neutral-500">{t('payment:comingSoon.launchingSoon')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse flex-shrink-0"></span>
                    <p className="text-[10px] sm:text-xs text-amber-700 font-medium">{t('payment:comingSoon.integrationInProgress')}</p>
                  </div>
                </div>

                {/* Contact sales */}
                <div className="rounded-lg sm:rounded-xl border border-neutral-200 bg-white p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-neutral-600 mb-2.5">
                    {t('payment:comingSoon.contactSalesDescription')}
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
                  <p className="text-[10px] sm:text-xs text-neutral-400 mt-2">{t('payment:comingSoon.responseTime')}</p>
                </div>
              </>
            )}

            {/* Close */}
            <button
              onClick={onClose}
              className="w-full py-2 sm:py-3 text-neutral-600 hover:text-neutral-800 font-medium text-sm sm:text-base transition-colors"
            >
              {t('common:close')}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // Payment in Progress state (polling for confirmation)
  if (isPolling) {
    return (
      <Modal isOpen={isOpen} onClose={() => {}} title="" fullScreenOnMobile>
        <div className="max-w-md mx-auto">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center pb-4 border-b border-neutral-200">
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent"></div>
              </div>
              <h2 className="text-2xl font-bold text-neutral-800 mb-2">
                {t('payment:inProgress.title')}
              </h2>
              <p className="text-sm text-neutral-500">
                {pollingMessage || t('payment:inProgress.description')}
              </p>
            </div>

            {/* Plan Summary */}
            <div className="rounded-xl p-6 border bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-neutral-800">{planName}</h3>
                  <p className="text-sm text-neutral-500 capitalize">
                    {planInterval === 'year' ? t('payment:checkout.billedYearly') : t('payment:checkout.billedMonthly')}
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
                    {t('payment:inProgress.waitingTitle')}
                  </p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    {t('payment:inProgress.waitingMessage')}
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
                    {t('payment:inProgress.subscriptionInfo')}
                  </p>
                  <ul className="text-xs text-blue-700 leading-relaxed space-y-1">
                    <li>• {t('payment:inProgress.autoRenewal')}</li>
                    <li>• {t('payment:inProgress.renewalReminder')}</li>
                    <li>• {t('payment:inProgress.cancelAnytime')}</li>
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
              {t('payment:inProgress.cancel')}
            </button>

            {/* Help text */}
            <p className="text-xs text-center text-neutral-400">
              {t('payment:inProgress.helpText')}
            </p>
          </div>
        </div>
      </Modal>
    );
  }

  // Original payment UI (will be shown when PAYMENTS_COMING_SOON = false)
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" fullScreenOnMobile>
      <div className="max-w-md mx-auto">
        {showError ? (
          <div className="text-center py-6 sm:py-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExclamationTriangleIcon className="w-8 h-8 sm:w-10 sm:h-10 text-red-500" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-800 mb-2">
              {t('payment:errors.title')}
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 mb-4 px-4">
              {errorMessage}
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 mb-4 mx-4 text-left">
              <p className="text-xs sm:text-sm text-amber-800">
                <strong>{t('payment:errors.whatToDo')}</strong>
              </p>
              <ul className="text-xs sm:text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
                <li>{t('payment:errors.checkConnection')}</li>
                <li>{t('payment:errors.tryAgain')}</li>
                <li>{t('payment:errors.contactSupport')}</li>
              </ul>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowError(false)}
                className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary-dark transition-colors"
              >
                {t('common:tryAgain')}
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2.5 border border-neutral-300 text-neutral-700 rounded-lg font-medium text-sm hover:bg-neutral-50 transition-colors"
              >
                {t('common:close')}
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
              {t('payment:success.title')}
            </h2>

            <p className="text-base text-neutral-600 mb-6">
              {t('payment:success.message')}
            </p>

            {/* Plan activated info */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-800">{planName}</p>
                  <p className="text-sm text-green-600">{t('payment:success.nowActive')}</p>
                </div>
              </div>
            </div>

            {/* What's next */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-left">
              <p className="font-semibold text-blue-900 mb-2">{t('payment:success.whatsNext')}</p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• {t('payment:success.premiumAccess')}</li>
                <li>• {t('payment:success.confirmationSent')}</li>
                <li>• {t('payment:success.subscriptionActive')}</li>
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
              {t('payment:success.continue')}
            </button>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="text-center pb-3 sm:pb-4 border-b border-neutral-200">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-primary to-primary-dark rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
                <CreditCardIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h2 className="text-lg sm:text-2xl font-bold text-neutral-800 mb-1 sm:mb-2">{t('payment:checkout.secureCheckout')}</h2>
              <p className="text-xs sm:text-sm text-neutral-500">{t('payment:checkout.secureCheckoutDescription')}</p>
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
                  <p className="text-xs sm:text-sm text-neutral-500 capitalize">{planInterval === 'year' ? t('payment:checkout.billedYearly') : planInterval === 'month' ? t('payment:checkout.billedMonthly') : t('payment:checkout.billedOnce')}</p>
                </div>
                <div className="text-right">
                  {(discountPercent > 0 || codeValidation?.valid) && (
                    <>
                      <p className="text-xs sm:text-sm text-neutral-400 line-through">€{planPrice.toFixed(2)}</p>
                      <p className={`text-xl sm:text-2xl font-bold ${
                        finalPrice === 0 || finalPrice < 0.01 ? 'text-green-600' : 'text-primary'
                      }`}>
                        {finalPrice === 0 || finalPrice < 0.01 ? t('payment:checkout.free') : `€${finalPrice.toFixed(2)}`}
                      </p>
                      <p className="text-[10px] sm:text-xs text-green-600 font-semibold">
                        {finalPrice === 0 || finalPrice < 0.01 ? t('payment:checkout.fullDiscount') : t('payment:checkout.save', { amount: savings.toFixed(2) })}
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
                    {t('payment:checkout.haveDiscountCode')}
                  </label>
                  <div className="flex gap-1.5 sm:gap-2">
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                      placeholder={t('payment:checkout.enterCode')}
                      className="flex-1 min-w-0 px-2.5 sm:px-3 py-1.5 sm:py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-xs sm:text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && handleValidateDiscountCode()}
                      disabled={validatingCode}
                    />
                    <button
                      onClick={handleValidateDiscountCode}
                      disabled={validatingCode || !discountCode.trim()}
                      className="flex-shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 bg-primary text-white rounded-lg font-medium text-xs sm:text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {validatingCode ? t('payment:checkout.checking') : t('payment:checkout.apply')}
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
                        {t('payment:checkout.codeApplied', { code: appliedDiscountCode })}
                      </p>
                      <p className="text-[10px] sm:text-xs text-green-600">{codeValidation.message}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveDiscountCode}
                    className="text-green-700 hover:text-green-900 text-[10px] sm:text-xs font-medium"
                  >
                    {t('payment:checkout.remove')}
                  </button>
                </div>
              )}

              {discountPercent > 0 && !appliedDiscountCode && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2 sm:p-3 flex items-center gap-1.5 sm:gap-2">
                  <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-green-700 font-medium">
                    {t('payment:checkout.discountApplied', { percent: discountPercent })}
                  </p>
                </div>
              )}
            </div>

            {/* Security Notice */}
            {finalPrice === 0 || finalPrice < 0.01 ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 flex gap-2 sm:gap-3">
                <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-semibold text-green-900 mb-0.5 sm:mb-1">{t('payment:checkout.freeSubscriptionActivated')}</p>
                  <p className="text-[10px] sm:text-xs text-green-700 leading-relaxed">
                    {t('payment:checkout.freeSubscriptionDescription')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 flex gap-2 sm:gap-3">
                <LockClosedIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-semibold text-blue-900 mb-0.5 sm:mb-1">{t('payment:checkout.secureExternalPayment')}</p>
                  <p className="text-[10px] sm:text-xs text-blue-700 leading-relaxed">
                    {t('payment:checkout.secureExternalPaymentDescription')}
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
                    {t('payment:taxNotice.title')}
                  </p>
                  <p className="text-[10px] sm:text-xs text-amber-700 leading-relaxed">
                    {t('payment:taxNotice.description')}
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
                  {t('payment:termsAcceptance.text')}{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                    {t('payment:termsAcceptance.terms')}
                  </a>
                  {', '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                    {t('payment:termsAcceptance.privacy')}
                  </a>
                  {', '}
                  {t('payment:termsAcceptance.and')}{' '}
                  <a href="/refund" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                    {t('payment:termsAcceptance.refund')}
                  </a>
                  {'. '}
                  {t('payment:termsAcceptance.lemonsqueezy')}
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
                  <span className="text-xs sm:text-base">{finalPrice === 0 || finalPrice < 0.01 ? t('payment:checkout.activating') : t('payment:checkout.redirecting')}</span>
                </>
              ) : (
                <>
                  <span>{finalPrice === 0 || finalPrice < 0.01 ? t('payment:checkout.activateFreeSubscription') : t('payment:checkout.continueToPayment')}</span>
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
              {t('common:cancel')}
            </button>

            {/* Trust Badges */}
            <div className="pt-3 sm:pt-4 border-t border-neutral-200">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-neutral-400">
                <div className="flex items-center gap-1">
                  <LockClosedIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span>{t('payment:checkout.sslSecured')}</span>
                </div>
                <span className="hidden sm:inline">•</span>
                <div className="flex items-center gap-1">
                  <CheckCircleIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span>{t('payment:checkout.pciCompliant')}</span>
                </div>
                <span className="hidden sm:inline">•</span>
                <span>{t('payment:checkout.securePayment')}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PaymentWindow;
