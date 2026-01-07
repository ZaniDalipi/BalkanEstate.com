import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { verifyEmail as verifyEmailApi, resendVerificationEmail } from '@/services/apiService';
import { LogoIcon } from '@/constants';

interface VerifyEmailPageProps {
  onVerificationComplete?: () => void;
}

const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({ onVerificationComplete }) => {
  const { t } = useTranslation(['auth']);
  const [token, setToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    // Get token from URL query params
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');

    if (tokenParam) {
      setToken(tokenParam);
      // Auto-verify when token is present
      handleVerify(tokenParam);
    } else {
      setIsVerifying(false);
      setError(t('auth:verifyEmail.noToken', 'No verification token provided. Please check your email for the verification link.'));
    }
  }, []);

  const handleVerify = async (verifyToken: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await verifyEmailApi(verifyToken);

      if (result.success) {
        setSuccess(true);
        // Redirect to home after 3 seconds
        setTimeout(() => {
          if (onVerificationComplete) {
            onVerificationComplete();
          } else {
            window.location.href = '/';
          }
        }, 3000);
      } else {
        setError(result.message || t('auth:verifyEmail.failed', 'Email verification failed. Please try again.'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth:verifyEmail.failed', 'Email verification failed. Please try again.'));
    } finally {
      setIsLoading(false);
      setIsVerifying(false);
    }
  };

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resendEmail) {
      setError(t('auth:verifyEmail.enterEmail', 'Please enter your email address'));
      return;
    }

    setResendLoading(true);
    setError(null);

    try {
      const result = await resendVerificationEmail(resendEmail);
      setResendSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth:verifyEmail.resendFailed', 'Failed to resend verification email. Please try again.'));
    } finally {
      setResendLoading(false);
    }
  };

  // Loading state while verifying
  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-center mb-6">
            <LogoIcon className="w-12 h-12" />
          </div>
          <div className="text-center">
            <div className="animate-spin mx-auto h-12 w-12 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {t('auth:verifyEmail.verifying', 'Verifying your email...')}
            </h3>
            <p className="text-gray-600">
              {t('auth:verifyEmail.pleaseWait', 'Please wait while we verify your email address.')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-center mb-6">
            <LogoIcon className="w-12 h-12" />
          </div>
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {t('auth:verifyEmail.successTitle', 'Email Verified!')}
            </h3>
            <p className="text-gray-600 mb-4">
              {t('auth:verifyEmail.successMessage', 'Your email has been successfully verified. You now have full access to all features.')}
            </p>
            <p className="text-sm text-gray-500">
              {t('auth:verifyEmail.redirecting', 'Redirecting you to the app...')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Resend success state
  if (resendSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-center mb-6">
            <LogoIcon className="w-12 h-12" />
          </div>
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
              <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {t('auth:verifyEmail.checkEmail', 'Check Your Email')}
            </h3>
            <p className="text-gray-600 mb-4">
              {t('auth:verifyEmail.emailSent', `We've sent a new verification email to ${resendEmail}. Please check your inbox and spam folder.`)}
            </p>
            <button
              onClick={() => { setResendSuccess(false); setResendEmail(''); }}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {t('auth:verifyEmail.tryAgain', 'Try a different email')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error/Resend form state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="flex justify-center mb-6">
          <LogoIcon className="w-12 h-12" />
        </div>

        <div className="text-center mb-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {t('auth:verifyEmail.errorTitle', 'Verification Failed')}
          </h3>
          {error && (
            <p className="text-red-600 text-sm mb-4">{error}</p>
          )}
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            {t('auth:verifyEmail.resendTitle', 'Resend Verification Email')}
          </h4>
          <form onSubmit={handleResendVerification} className="space-y-4">
            <div className="relative">
              <input
                type="email"
                id="resendEmail"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                className="peer w-full px-4 pt-6 pb-2 text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder=" "
                required
              />
              <label
                htmlFor="resendEmail"
                className="absolute left-4 top-2 text-xs text-neutral-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs"
              >
                {t('auth:verifyEmail.emailLabel', 'Email Address')}
              </label>
            </div>

            <button
              type="submit"
              disabled={resendLoading}
              className="w-full py-3 px-4 rounded-lg shadow-sm text-lg font-bold text-white bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {resendLoading
                ? t('auth:verifyEmail.sending', 'Sending...')
                : t('auth:verifyEmail.resendButton', 'Resend Verification Email')}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-sm font-semibold text-primary hover:underline"
          >
            {t('auth:verifyEmail.backToHome', 'Back to Home')}
          </a>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
