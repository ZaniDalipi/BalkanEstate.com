import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { resendVerificationEmail } from '@/services/apiService';

interface EmailVerificationBannerProps {
  email: string;
  onDismiss?: () => void;
}

const EmailVerificationBanner: React.FC<EmailVerificationBannerProps> = ({ email, onDismiss }) => {
  const { t } = useTranslation(['auth']);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    setIsResending(true);
    setError(null);

    try {
      await resendVerificationEmail(email);
      setResendSuccess(true);
      // Reset success message after 5 seconds
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  if (resendSuccess) {
    return (
      <div className="bg-green-50 border-b border-green-200">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm text-green-700">
                {t('auth:verificationBanner.emailSent', `Verification email sent to ${email}. Please check your inbox.`)}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-amber-800">
              <span className="font-medium">{t('auth:verificationBanner.title', 'Verify your email')}</span>
              <span className="hidden sm:inline"> - </span>
              <span className="block sm:inline text-amber-700">
                {t('auth:verificationBanner.subtitle', 'Please verify your email to access all features.')}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {error && (
              <p className="text-xs text-red-600">{error}</p>
            )}
            <button
              onClick={handleResend}
              disabled={isResending}
              className="text-sm font-semibold text-amber-800 hover:text-amber-900 underline disabled:opacity-50 disabled:no-underline"
            >
              {isResending
                ? t('auth:verificationBanner.sending', 'Sending...')
                : t('auth:verificationBanner.resend', 'Resend email')}
            </button>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-amber-600 hover:text-amber-800"
                aria-label="Dismiss"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationBanner;
