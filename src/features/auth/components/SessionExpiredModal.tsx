import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';

/**
 * Modal displayed when the user's session has expired.
 * Prompts user to log in again.
 */
const SessionExpiredModal: React.FC = () => {
  const { t } = useTranslation(['auth']);
  const { state, dispatch } = useAppContext();

  if (!state.isSessionExpiredModalOpen) {
    return null;
  }

  const handleLogin = () => {
    dispatch({ type: 'HIDE_SESSION_EXPIRED_MODAL' });
    dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
  };

  const handleClose = () => {
    dispatch({ type: 'HIDE_SESSION_EXPIRED_MODAL' });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-fade-in">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <h2 className="text-2xl font-bold text-center text-neutral-900 mb-2">
          {t('auth:sessionExpired.title', 'Session Expired')}
        </h2>
        <p className="text-neutral-600 text-center mb-8">
          {t('auth:sessionExpired.message', 'Your session has expired for security reasons. Please log in again to continue.')}
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleLogin}
            className="w-full py-3 px-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors"
          >
            {t('auth:sessionExpired.loginAgain', 'Log In Again')}
          </button>
          <button
            onClick={handleClose}
            className="w-full py-3 px-4 bg-neutral-100 text-neutral-700 font-medium rounded-xl hover:bg-neutral-200 transition-colors"
          >
            {t('auth:sessionExpired.continueBrowsing', 'Continue Browsing')}
          </button>
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default SessionExpiredModal;
