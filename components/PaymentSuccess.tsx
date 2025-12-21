import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { CheckCircleIcon, ArrowLeftIcon } from '../constants';

interface PaymentDetails {
  paymentStatus?: string;
  amountTotal?: number;
  customerEmail?: string;
}

const PaymentSuccess: React.FC = () => {
  const { dispatch } = useAppContext();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);

  useEffect(() => {
    // Get session ID from URL
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('session_id');

    if (sid) {
      setSessionId(sid);
      verifyPayment(sid);
    } else {
      setError('No payment session found');
      setIsVerifying(false);
    }
  }, []);

  const verifyPayment = async (sessionId: string) => {
    try {
      const token = localStorage.getItem('balkan_estate_token');

      if (!token) {
        throw new Error('Please log in to verify your payment');
      }

      const response = await fetch(`http://localhost:5001/api/payments/verify-session/${sessionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to verify payment');
      }

      setPaymentDetails(data);

      const pendingPayment = sessionStorage.getItem('pending_payment');
      if (pendingPayment) {
        sessionStorage.removeItem('pending_payment');
      }

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to verify payment');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReturnHome = () => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' });
    window.history.pushState({}, '', '/account');
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-neutral-800 mb-2">Verifying Payment...</h2>
          <p className="text-neutral-600">Please wait while we confirm your transaction</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">❌</span>
          </div>
          <h2 className="text-2xl font-bold text-neutral-800 mb-2">Payment Verification Failed</h2>
          <p className="text-neutral-600 mb-6">{error}</p>
          <button
            onClick={handleReturnHome}
            className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors flex items-center gap-2 mx-auto"
            aria-label="Return to my account"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Return to Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center">
          {/* Success Icon with Animation */}
          <div className="relative mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircleIcon className="w-16 h-16 text-white" />
            </div>
            {/* Confetti Effect */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-6xl animate-ping opacity-20">🎉</div>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-neutral-800 mb-2">Payment Successful!</h1>
          <p className="text-lg text-neutral-600 mb-6">
            Thank you for your purchase. Your subscription has been activated.
          </p>

          {/* Payment Details */}
          {paymentDetails && (
            <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-xl p-6 mb-6 text-left border border-neutral-200">
              <h3 className="font-semibold text-neutral-800 mb-3">Payment Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Status:</span>
                  <span className="font-semibold text-green-600 capitalize">
                    {paymentDetails.paymentStatus || 'Paid'}
                  </span>
                </div>
                {paymentDetails.amountTotal && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Amount:</span>
                    <span className="font-semibold text-neutral-800">
                      €{paymentDetails.amountTotal.toFixed(2)}
                    </span>
                  </div>
                )}
                {paymentDetails.customerEmail && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Email:</span>
                    <span className="font-medium text-neutral-800 truncate ml-2">
                      {paymentDetails.customerEmail}
                    </span>
                  </div>
                )}
                {sessionId && (
                  <div className="flex justify-between mt-4 pt-4 border-t border-neutral-300">
                    <span className="text-neutral-500 text-xs">Session ID:</span>
                    <span className="font-mono text-xs text-neutral-400 truncate ml-2 max-w-[200px]">
                      {sessionId}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* What's Next */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-blue-900 mb-2">What's Next?</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">✓</span>
                <span>Your subscription is now active</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">✓</span>
                <span>You have access to all premium features</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">✓</span>
                <span>A confirmation email has been sent</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleReturnHome}
              className="w-full bg-gradient-to-r from-primary to-primary-dark text-white py-3 px-6 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
            >
              Go to My Account
            </button>
            <button
              onClick={() => {
                dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
                window.history.pushState({}, '', '/');
              }}
              className="w-full text-neutral-600 hover:text-neutral-800 font-medium transition-colors py-2"
            >
              Browse Properties
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
