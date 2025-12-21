import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import {
  CreditCardIcon,
  CheckCircleIcon,
  XCircleIcon,
  LockClosedIcon,
  ArrowTopRightOnSquareIcon,
} from '../../constants';
import { useAppContext } from '../../context/AppContext';

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
  userCountry = 'RS',
  onSuccess,
  onError,
  discountPercent = 0,
  productId,
  onEnterpriseSelected,
}) => {
  const { state } = useAppContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [validatingCode, setValidatingCode] = useState(false);
  const [codeValidation, setCodeValidation] = useState<{
    valid: boolean;
    message?: string;
    discountAmount?: number;
    finalPrice?: number;
  } | null>(null);

  const [appliedDiscountCode, setAppliedDiscountCode] = useState<string | null>(null);

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
        onError('Please log in to complete your purchase');
        onClose();
        return;
      }
    } else {
      // Reset state when modal closes
      setShowSuccess(false);
      setDiscountCode('');
      setCodeValidation(null);
      setAppliedDiscountCode(null);
    }
  }, [isOpen, state.isAuthenticated, onError, onClose]);

  const handleValidateDiscountCode = async () => {
    if (!discountCode.trim()) {
      setCodeValidation({ valid: false, message: 'Please enter a discount code' });
      return;
    }

    setValidatingCode(true);
    setCodeValidation(null);

    try {
      const response = await fetch('http://localhost:5001/api/discount-codes/validate', {
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
        const response = await fetch('http://localhost:5001/api/payments/apply-free-subscription', {
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

      // Create checkout session with backend
      const response = await fetch('http://localhost:5001/api/payments/create-checkout-session', {
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
          discountCode: appliedDiscountCode || undefined,
        }),
      });

      const data = await response.json();
      console.log('Checkout session API response:', data);

      if (!response.ok) {
        console.error('❌ Checkout session error:', data);
        throw new Error(data.message || 'Failed to create payment session');
      }

      // Redirect to Stripe Checkout page
      if (data.url) {
        console.log('✅ Redirecting to Stripe:', data.url);

        // Store payment intent info for callback
        sessionStorage.setItem('pending_payment', JSON.stringify({
          sessionId: data.sessionId,
          planName,
          planInterval,
          productId,
        }));

        // Redirect to external payment page (Stripe)
        window.location.href = data.url;
      } else {
        throw new Error('No payment URL received');
      }

    } catch (error) {
      console.error('❌ Payment error:', error);
      onError(error instanceof Error ? error.message : 'Failed to initialize payment');
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="max-w-md mx-auto">
        {showSuccess ? (
          <div className="text-center py-8">
            <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-neutral-800 mb-2">Payment Successful!</h2>
            <p className="text-neutral-600">Your subscription has been activated.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center pb-4 border-b border-neutral-200">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <CreditCardIcon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-800 mb-2">Secure Checkout</h2>
              <p className="text-sm text-neutral-500">Complete your purchase on our secure payment partner</p>
            </div>

            {/* Plan Summary */}
            <div className={`rounded-xl p-6 border ${
              finalPrice === 0 || finalPrice < 0.01
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                : 'bg-gradient-to-br from-neutral-50 to-neutral-100 border-neutral-200'
            }`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-neutral-800">{planName}</h3>
                  <p className="text-sm text-neutral-500 capitalize">Billed {planInterval}ly</p>
                </div>
                <div className="text-right">
                  {(discountPercent > 0 || codeValidation?.valid) && (
                    <>
                      <p className="text-sm text-neutral-400 line-through">€{planPrice.toFixed(2)}</p>
                      <p className={`text-2xl font-bold ${
                        finalPrice === 0 || finalPrice < 0.01 ? 'text-green-600' : 'text-primary'
                      }`}>
                        {finalPrice === 0 || finalPrice < 0.01 ? 'FREE' : `€${finalPrice.toFixed(2)}`}
                      </p>
                      <p className="text-xs text-green-600 font-semibold">
                        {finalPrice === 0 || finalPrice < 0.01 ? '100% OFF!' : `Save €${savings.toFixed(2)}`}
                      </p>
                    </>
                  )}
                  {discountPercent === 0 && !codeValidation?.valid && (
                    <p className="text-2xl font-bold text-primary">€{finalPrice.toFixed(2)}</p>
                  )}
                </div>
              </div>

              {/* Discount Code Input */}
              {!appliedDiscountCode && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Have a discount code?
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && handleValidateDiscountCode()}
                      disabled={validatingCode}
                    />
                    <button
                      onClick={handleValidateDiscountCode}
                      disabled={validatingCode || !discountCode.trim()}
                      className="px-4 py-2 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {validatingCode ? 'Checking...' : 'Apply'}
                    </button>
                  </div>
                  {codeValidation && !codeValidation.valid && (
                    <p className="text-xs text-red-600 mt-1">{codeValidation.message}</p>
                  )}
                </div>
              )}

              {/* Applied Discount Code */}
              {appliedDiscountCode && codeValidation?.valid && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-green-700 font-medium">
                        Code "{appliedDiscountCode}" applied!
                      </p>
                      <p className="text-xs text-green-600">{codeValidation.message}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveDiscountCode}
                    className="text-green-700 hover:text-green-900 text-xs font-medium"
                  >
                    Remove
                  </button>
                </div>
              )}

              {discountPercent > 0 && !appliedDiscountCode && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <p className="text-sm text-green-700 font-medium">
                    {discountPercent}% discount applied!
                  </p>
                </div>
              )}
            </div>

            {/* Security Notice */}
            {finalPrice === 0 || finalPrice < 0.01 ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
                <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-900 mb-1">Free Subscription Activated</p>
                  <p className="text-xs text-green-700 leading-relaxed">
                    Your discount code provides 100% off! Click the button below to activate your free subscription immediately. No payment required.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <LockClosedIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900 mb-1">Secure External Payment</p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    You'll be redirected to our secure payment partner (Stripe) to complete your purchase.
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
              className={`w-full py-4 px-6 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 ${
                finalPrice === 0 || finalPrice < 0.01
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                  : 'bg-gradient-to-r from-primary to-primary-dark text-white'
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>{finalPrice === 0 || finalPrice < 0.01 ? 'Activating free subscription...' : 'Redirecting to payment...'}</span>
                </>
              ) : (
                <>
                  <span>{finalPrice === 0 || finalPrice < 0.01 ? 'Activate Free Subscription' : 'Continue to Payment'}</span>
                  {finalPrice === 0 || finalPrice < 0.01 ? (
                    <CheckCircleIcon className="w-5 h-5" />
                  ) : (
                    <ArrowTopRightOnSquareIcon className="w-5 h-5" />
                  )}
                </>
              )}
            </button>

            {/* Cancel */}
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="w-full py-3 text-neutral-600 hover:text-neutral-800 font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            {/* Trust Badges */}
            <div className="pt-4 border-t border-neutral-200">
              <div className="flex items-center justify-center gap-4 text-xs text-neutral-400">
                <div className="flex items-center gap-1">
                  <LockClosedIcon className="w-3 h-3" />
                  <span>SSL Secured</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <CheckCircleIcon className="w-3 h-3" />
                  <span>PCI Compliant</span>
                </div>
                <span>•</span>
                <span>Powered by Stripe</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PaymentWindow;
