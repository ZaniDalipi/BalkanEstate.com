/**
 * Braintree Drop-in UI Component
 *
 * Renders an inline card payment form using Braintree's Drop-in UI.
 * Supports card payments, Apple Pay, Google Pay, and 3D Secure.
 *
 * Used for PayPal countries (AL/BA/MK/ME/XK) when user selects "Pay with Card".
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dropin, { Dropin } from 'braintree-web-drop-in';
import {
  getBraintreeClientToken,
  processBraintreePayment,
  type BraintreeProcessResponse,
} from '../api/braintreeApi';

export interface BraintreeDropInProps {
  amount: number;
  productId: string;
  planName: string;
  planInterval: 'month' | 'year' | 'one_time';
  countryCode: string;
  userEmail?: string;
  onSuccess: (result: BraintreeProcessResponse) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
}

type DropInState = 'loading' | 'ready' | 'processing' | 'error';

const BraintreeDropIn: React.FC<BraintreeDropInProps> = ({
  amount,
  productId,
  planName,
  planInterval,
  countryCode,
  userEmail,
  onSuccess,
  onError,
  onCancel,
}) => {
  const [state, setState] = useState<DropInState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const dropinInstance = useRef<Dropin | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function initDropIn() {
      try {
        setState('loading');
        setErrorMessage('');

        const { clientToken } = await getBraintreeClientToken();

        if (cancelled || !containerRef.current) return;

        const instance = await dropin.create({
          authorization: clientToken,
          container: containerRef.current,
          card: {
            cardholderName: {
              required: true,
            },
          },
          threeDSecure: true,
          ...(typeof window !== 'undefined' && (window as any).ApplePaySession && {
            applePay: {
              displayName: 'BalkanEstate',
              paymentRequest: {
                total: {
                  label: 'BalkanEstate',
                  amount: amount.toFixed(2),
                },
              },
            },
          }),
          googlePay: {
            googlePayVersion: 2,
            merchantId: 'BalkanEstate',
            transactionInfo: {
              totalPriceStatus: 'FINAL',
              totalPrice: amount.toFixed(2),
              currencyCode: 'EUR',
            },
          },
        });

        if (cancelled) {
          instance.teardown();
          return;
        }

        dropinInstance.current = instance;
        setState('ready');
      } catch (err: any) {
        if (!cancelled) {
          const msg = err?.message || 'Failed to initialize payment form';
          setErrorMessage(msg);
          setState('error');
        }
      }
    }

    initDropIn();

    return () => {
      cancelled = true;
      if (dropinInstance.current) {
        dropinInstance.current.teardown().catch(() => {});
        dropinInstance.current = null;
      }
    };
  }, [amount]);

  const handleSubmit = useCallback(async () => {
    if (!dropinInstance.current || state !== 'ready') return;

    try {
      setState('processing');
      setErrorMessage('');

      const { nonce, deviceData } = await dropinInstance.current.requestPaymentMethod({
        threeDSecure: {
          amount: amount.toFixed(2),
          email: userEmail,
        },
      });

      const result = await processBraintreePayment({
        paymentMethodNonce: nonce,
        amount,
        productId,
        planName,
        planInterval,
        countryCode,
        deviceData,
      });

      if (result.success) {
        onSuccess(result);
      } else {
        const msg = result.message || result.error || 'Payment failed. Please try again.';
        setErrorMessage(msg);
        setState('ready');
        onError(msg);
      }
    } catch (err: any) {
      const msg = err?.message || 'An error occurred during payment.';
      setErrorMessage(msg);
      setState('ready');
      onError(msg);
    }
  }, [state, amount, productId, planName, planInterval, countryCode, userEmail, onSuccess, onError]);

  return (
    <div className="braintree-dropin-wrapper">
      {state === 'loading' && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <span className="ml-3 text-gray-600">Loading payment form...</span>
        </div>
      )}

      <div
        ref={containerRef}
        className={state === 'loading' ? 'hidden' : ''}
      />

      {errorMessage && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {(state === 'ready' || state === 'processing') && (
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={state === 'processing'}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
          >
            {state === 'processing' ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              `Pay €${amount.toFixed(2)}`
            )}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={state === 'processing'}
              className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {state === 'error' && (
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Retry
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BraintreeDropIn;
