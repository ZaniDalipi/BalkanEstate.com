import React from 'react';
import { useTranslation } from 'react-i18next';
import { CurrencyDollarIcon, SparklesIcon, ExclamationTriangleIcon } from '@/constants';
import PropertyCalculator from './PropertyCalculator';
import GeminiDescriptionGenerator from './GeminiDescriptionGenerator';
import { useAppContext } from '@/context/AppContext';
import Footer from '@/components/shared/Footer';
import { resendVerificationEmail } from '@/services/apiService';

const CreateListingPage: React.FC = () => {
  const { t } = useTranslation(['seller', 'auth']);
  const { state } = useAppContext();
  const [isResending, setIsResending] = React.useState(false);
  const [resendSuccess, setResendSuccess] = React.useState(false);

  // Check if user needs email verification
  const needsVerification = state.isAuthenticated &&
    state.currentUser &&
    !state.currentUser.isEmailVerified &&
    state.currentUser.provider !== 'google' &&
    state.currentUser.provider !== 'facebook' &&
    state.currentUser.provider !== 'apple';

  const handleResendVerification = async () => {
    if (!state.currentUser?.email) return;
    setIsResending(true);
    try {
      await resendVerificationEmail(state.currentUser.email);
      setResendSuccess(true);
    } catch (error) {
      console.error('Failed to resend verification email:', error);
    } finally {
      setIsResending(false);
    }
  };

  // Show verification required message if user hasn't verified email
  if (needsVerification) {
    return (
      <div className="min-h-full bg-neutral-50">
        <main className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg border border-amber-200 p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-amber-100 mb-6">
              <ExclamationTriangleIcon className="h-8 w-8 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {t('auth:verificationRequired.title', 'Email Verification Required')}
            </h2>
            <p className="text-gray-600 mb-6">
              {t('auth:verificationRequired.message', 'Please verify your email address before creating a listing. We sent a verification link to your email.')}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {state.currentUser?.email}
            </p>
            {resendSuccess ? (
              <p className="text-green-600 font-medium">
                {t('auth:verificationRequired.sent', 'Verification email sent! Please check your inbox.')}
              </p>
            ) : (
              <button
                onClick={handleResendVerification}
                disabled={isResending}
                className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {isResending
                  ? t('auth:verificationRequired.sending', 'Sending...')
                  : t('auth:verificationRequired.resend', 'Resend Verification Email')}
              </button>
            )}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-neutral-50">
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-neutral-800 mb-8">
          {state.propertyToEdit ? t('seller:createListing.editTitle') : t('seller:createListing.title')}
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                 <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-xl shadow-lg border border-neutral-200">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="bg-primary-light p-3 rounded-full">
                            <SparklesIcon className="w-6 h-6 text-primary"/>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold text-neutral-800">{t('seller:createListing.aiPowered')}</h3>
                    </div>
                    <p className="text-neutral-600 mb-6">
                        {t('seller:createListing.aiDescription')}
                    </p>
                    <GeminiDescriptionGenerator propertyToEdit={state.propertyToEdit} />
                </div>
            </div>
            <div className="lg:col-span-1">
                 <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-xl shadow-lg border border-neutral-200 h-full">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="bg-secondary/20 p-3 rounded-full">
                            <CurrencyDollarIcon className="w-6 h-6 text-secondary"/>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold text-neutral-800">{t('seller:createListing.valueCalculator')}</h3>
                    </div>
                    <p className="text-neutral-600 mb-6">
                        {t('seller:createListing.valueDescription')}
                    </p>
                    <PropertyCalculator />
                </div>
            </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default CreateListingPage;
