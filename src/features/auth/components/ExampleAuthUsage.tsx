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
  const { t } = useTranslation(['auth', 'common']);
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
        <label htmlFor="email">{t('auth:labels.email')}</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="password">{t('auth:labels.password')}</label>
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
          {error instanceof Error ? error.message : t('auth:errors.loginFailed')}
        </div>
      )}

      <button type="submit" disabled={isLoading}>
        {isLoading ? t('auth:status.loggingIn') : t('auth:buttons.login')}
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
  const { t } = useTranslation(['auth', 'common']);
  const { user, isLoading, isAuthenticated } = useCurrentUser();
  const { logout, isLoading: isLoggingOut } = useLogout();

  if (isLoading) {
    return <div>{t('auth:status.loadingUser')}</div>;
  }

  if (!isAuthenticated || !user) {
    return <div>{t('auth:messages.pleaseLogin')}</div>;
  }

  return (
    <div>
      <h2>{t('auth:messages.welcomeUser', { name: user.name })}</h2>
      <p>{t('auth:labels.email')}: {user.email}</p>
      <p>{t('auth:labels.role')}: {user.role}</p>
      <button onClick={() => logout()} disabled={isLoggingOut}>
        {isLoggingOut ? t('auth:status.loggingOut') : t('auth:buttons.logout')}
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
  const { t } = useTranslation(['auth', 'common']);
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
        placeholder={t('auth:labels.fullName')}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="email"
        placeholder={t('auth:labels.email')}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder={t('auth:labels.password')}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <div className="text-red-600">{error.message}</div>}
      {isSuccess && <div className="text-green-600">{t('auth:messages.accountCreated')}</div>}

      <button type="submit" disabled={isLoading}>
        {isLoading ? t('auth:status.creatingAccount') : t('auth:buttons.signup')}
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
  const { t } = useTranslation(['auth', 'common']);
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
    return <div>{t('auth:messages.resetLinkSent')}</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder={t('auth:placeholders.email')}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      {requestError && <div className="text-red-600">{requestError.message}</div>}

      <button type="submit" disabled={isRequestingReset}>
        {isRequestingReset ? t('auth:status.sending') : t('auth:buttons.resetPassword')}
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
  const { t } = useTranslation(['auth', 'common']);
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
          {isSendingCode ? t('auth:status.sending') : t('auth:phoneSignup.sendCode')}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerifyCode}>
      <p>{t('auth:phoneCode.sentTo', { phone })}</p>
      <input
        type="text"
        placeholder="123456"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <button type="submit" disabled={isVerifying}>
        {isVerifying ? t('auth:status.verifying') : t('auth:buttons.verify')}
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
  const { t } = useTranslation(['auth', 'common']);
  const { isAuthenticated, isLoading } = useCurrentUser();
  const { open } = useAuthModal();

  if (isLoading) {
    return <div>{t('common:loading')}</div>;
  }

  if (!isAuthenticated) {
    return (
      <div>
        <p>{t('auth:messages.pleaseLogin')}</p>
        <button onClick={() => open('login')}>{t('auth:buttons.login')}</button>
      </div>
    );
  }

  return <>{children}</>;
}
