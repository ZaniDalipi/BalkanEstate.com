import React from 'react';
import { useAppContext } from '../context/AppContext';
import { XCircleIcon, ArrowLeftIcon } from '../constants';

const PaymentCancel: React.FC = () => {
  const { dispatch } = useAppContext();

  const handleReturnToSubscriptions = () => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' });
    dispatch({ type: 'TOGGLE_SUBSCRIPTION_MODAL', payload: { isOpen: true } });
    window.history.pushState({}, '', '/account');
  };

  const handleReturnHome = () => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
    window.history.pushState({}, '', '/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center">
          {/* Cancel Icon */}
          <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircleIcon className="w-16 h-16 text-white" />
          </div>

          <h1 className="text-3xl font-bold text-neutral-800 mb-2">Payment Cancelled</h1>
          <p className="text-lg text-neutral-600 mb-6">
            Your payment was not completed. No charges were made.
          </p>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-blue-900 mb-2">Why did this happen?</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>You clicked the back or cancel button</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>The payment window was closed</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>The session timed out</span>
              </li>
            </ul>
          </div>

          {/* Reassurance */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-700">
              <strong>Good news!</strong> Your payment information was not saved and no charges were made.
              You can try again whenever you're ready.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleReturnToSubscriptions}
              className="w-full bg-gradient-to-r from-primary to-primary-dark text-white py-3 px-6 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
            >
              Try Again
            </button>
            <button
              onClick={handleReturnHome}
              className="w-full flex items-center justify-center gap-2 text-neutral-600 hover:text-neutral-800 font-medium transition-colors py-2"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              Return to Home
            </button>
          </div>

          {/* Support Link */}
          <div className="mt-6 pt-6 border-t border-neutral-200">
            <p className="text-sm text-neutral-500">
              Having trouble?{' '}
              <button
                onClick={() => {
                  dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'inbox' });
                  window.history.pushState({}, '', '/inbox');
                }}
                className="text-primary hover:underline font-medium"
              >
                Contact Support
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;
