// Example Auth Component - Demonstrates new TanStack Query hooks usage
// This is a reference implementation for migrating existing auth components

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useCurrentUser,
  useLogin,
  useSignup,
  useLogout,
  usePasswordReset,
  usePhoneAuth,
} from '../hooks';
import { useAuthModal } from '@/app/store/uiStore';

/**
 * Example: Simple Login Form
 *
 * Demonstrates:
 * - Using useLogin hook
 * - Automatic error and loading states
 * - UI store for modal management
 */
export function SimpleLoginExample() {
  const { t } = useTranslation(['common']);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useLogin();
  const { close } = useAuthModal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await login({ emailOrPhone: email, password });
      close(); // Close modal on success
    } catch (err) {
      // Error is automatically captured in the hook
      // Error is captured in hook
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email">{t('common:auth.email')}</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="password">{t('common:auth.password')}</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
        />
      </div>

      {error && (
        <div className="text-red-600">
          {error instanceof Error ? error.message : t('common:auth.loginFailed')}
        </div>
      )}

      <button type="submit" disabled={isLoading}>
        {isLoading ? t('common:auth.loggingIn') : t('common:auth.login')}
      </button>
    </form>
  );
}

/**
 * Example: User Profile Display
 *
 * Demonstrates:
 * - Using useCurrentUser hook
 * - Automatic loading states
 * - Authentication check
 */
export function UserProfileExample() {
  const { t } = useTranslation(['common']);
  const { user, isLoading, isAuthenticated } = useCurrentUser();
  const { logout, isLoading: isLoggingOut } = useLogout();

  if (isLoading) {
    return <div>{t('common:auth.loadingUser')}</div>;
  }

  if (!isAuthenticated || !user) {
    return <div>{t('common:auth.pleaseLogIn')}</div>;
  }

  return (
    <div>
      <h2>{t('common:auth.welcome', { name: user.name })}</h2>
      <p>{t('common:auth.email')}: {user.email}</p>
      <p>{t('common:auth.role')}: {user.role}</p>
      <button onClick={() => logout()} disabled={isLoggingOut}>
        {isLoggingOut ? t('common:auth.loggingOut') : t('common:auth.logout')}
      </button>
    </div>
  );
}

/**
 * Example: Signup Form
 *
 * Demonstrates:
 * - Using useSignup hook
 * - Form validation
 * - Success handling
 */
export function SignupExample() {
  const { t } = useTranslation(['common']);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const { signup, isLoading, error, isSuccess } = useSignup();
  const { close } = useAuthModal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await signup({ email, password, name });
      close();
    } catch (err) {
      // Error is captured in hook
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        placeholder={t('common:auth.name')}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="email"
        placeholder={t('common:auth.email')}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder={t('common:auth.password')}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <div className="text-red-600">{error.message}</div>}
      {isSuccess && <div className="text-green-600">{t('common:auth.accountCreated')}</div>}

      <button type="submit" disabled={isLoading}>
        {isLoading ? t('common:auth.creatingAccount') : t('common:auth.signUp')}
      </button>
    </form>
  );
}

/**
 * Example: Password Reset
 *
 * Demonstrates:
 * - Using usePasswordReset hook
 * - Multi-step flow
 */
export function PasswordResetExample() {
  const { t } = useTranslation(['common']);
  const [email, setEmail] = useState('');
  const { requestReset, isRequestingReset, requestError } = usePasswordReset();
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await requestReset({ email });
      setSent(true);
    } catch (err) {
      // Error is captured in hook
    }
  };

  if (sent) {
    return <div>{t('common:auth.passwordResetSent')}</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder={t('common:auth.enterYourEmail')}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      {requestError && <div className="text-red-600">{requestError.message}</div>}

      <button type="submit" disabled={isRequestingReset}>
        {isRequestingReset ? t('common:auth.sending') : t('common:auth.resetPassword')}
      </button>
    </form>
  );
}

/**
 * Example: Phone Authentication
 *
 * Demonstrates:
 * - Two-step phone verification
 * - Managing multi-step state
 */
export function PhoneAuthExample() {
  const { t } = useTranslation(['common']);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const { sendCode, verifyCode, isSendingCode, isVerifying } = usePhoneAuth();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await sendCode({ phone });
      setStep('code');
    } catch (err) {
      // Error is captured in hook
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await verifyCode({ phone, code });
      // Success - user is now logged in
    } catch (err) {
      // Error is captured in hook
    }
  };

  if (step === 'phone') {
    return (
      <form onSubmit={handleSendCode}>
        <input
          type="tel"
          placeholder="+1234567890"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button type="submit" disabled={isSendingCode}>
          {isSendingCode ? t('common:auth.sending') : t('common:auth.sendCode')}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerifyCode}>
      <p>{t('common:auth.enterCodeSentTo', { phone })}</p>
      <input
        type="text"
        placeholder="123456"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <button type="submit" disabled={isVerifying}>
        {isVerifying ? t('common:auth.verifying') : t('common:auth.verify')}
      </button>
    </form>
  );
}

/**
 * Example: Protected Route/Component
 *
 * Demonstrates:
 * - Protecting components that require auth
 * - Showing login prompt
 */
export function ProtectedComponentExample({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation(['common']);
  const { isAuthenticated, isLoading } = useCurrentUser();
  const { open } = useAuthModal();

  if (isLoading) {
    return <div>{t('common:auth.loading')}</div>;
  }

  if (!isAuthenticated) {
    return (
      <div>
        <p>{t('common:auth.pleaseLogInToContinue')}</p>
        <button onClick={() => open('login')}>{t('common:auth.login')}</button>
      </div>
    );
  }

  return <>{children}</>;
}
