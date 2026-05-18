import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { resendVerificationEmail } from '@/services/apiService';
import { LogoIcon } from '@/constants';
import { useAppContext } from '@/context/AppContext';

interface EmailVerificationRequiredProps {
  email: string;
}

const EmailVerificationRequired: React.FC<EmailVerificationRequiredProps> = ({ email }) => {
  const { t } = useTranslation(['auth']);
  const { logout } = useAppContext();
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const handleResendEmail = async () => {
    if (cooldown > 0) return;

    setIsResending(true);
    setError(null);
    setResendSuccess(false);

    try {
      await resendVerificationEmail(email);
      setResendSuccess(true);
      // Start 60 second cooldown
      setCooldown(60);
      const interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('auth:verifyEmail.resendFailed', 'Failed to resend verification email. Please try again.')
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
    } catch {
      // Redirect even if logout fails
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="flex justify-center mb-6">
          <LogoIcon className="w-12 h-12" />
        </div>

        <div className="text-center mb-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-amber-100 mb-4">
            <svg className="h-8 w-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('auth:verifyEmail.requiredTitle', 'Verify Your Email')}
          </h2>

          <p className="text-gray-600 mb-2">
            {t(
              'auth:verifyEmail.requiredMessage',
              'Please verify your email address to access your account.'
            )}
          </p>

          <p className="text-sm text-gray-500">
            {t('auth:verifyEmail.sentTo', "We've sent a verification email to:")}
          </p>

          <p className="text-primary font-semibold mt-1 mb-4">{email}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm text-center">{error}</p>
          </div>
        )}

        {resendSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-600 text-sm text-center">
              {t(
                'auth:verifyEmail.resendSuccess',
                'Verification email sent! Please check your inbox and spam folder.'
              )}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleResendEmail}
            disabled={isResending || cooldown > 0}
            className="w-full py-3 px-4 rounded-lg shadow-sm text-lg font-bold text-white bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isResending
              ? t('auth:verifyEmail.sending', 'Sending...')
              : cooldown > 0
              ? t('auth:verifyEmail.resendCooldown', `Resend in ${cooldown}s`)
              : t('auth:verifyEmail.resendButton', 'Resend Verification Email')}
          </button>

          <button
            onClick={handleLogout}
            className="w-full py-3 px-4 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
          >
            {t('auth:verifyEmail.logout', 'Sign Out')}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            {t(
              'auth:verifyEmail.checkSpam',
              "Didn't receive the email? Check your spam folder or click the button above to resend."
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationRequired;
