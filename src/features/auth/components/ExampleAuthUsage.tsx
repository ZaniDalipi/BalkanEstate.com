// Example Auth Component - Demonstrates new TanStack Query hooks usage
// This is a reference implementation for migrating existing auth components

import React, { useState } from 'react';
import {
  useCurrentUser,
  useLogin,
  useSignup,
  useLogout,
  usePasswordReset,
  usePhoneAuth,
} from '../hooks';
import { useAuthModal } from '../../../app/store/uiStore';

/**
 * Example: Simple Login Form
 *
 * Demonstrates:
 * - Using useLogin hook
 * - Automatic error and loading states
 * - UI store for modal management
 */
export function SimpleLoginExample() {
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
      console.error('Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="password">Password</label>
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
          {error instanceof Error ? error.message : 'Login failed'}
        </div>
      )}

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
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
  const { user, isLoading, isAuthenticated } = useCurrentUser();
  const { logout, isLoading: isLoggingOut } = useLogout();

  if (isLoading) {
    return <div>Loading user...</div>;
  }

  if (!isAuthenticated || !user) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      <h2>Welcome, {user.name}!</h2>
      <p>Email: {user.email}</p>
      <p>Role: {user.role}</p>
      <button onClick={() => logout()} disabled={isLoggingOut}>
        {isLoggingOut ? 'Logging out...' : 'Logout'}
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
      console.error('Signup failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <div className="text-red-600">{error.message}</div>}
      {isSuccess && <div className="text-green-600">Account created!</div>}

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating account...' : 'Sign Up'}
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
  const [email, setEmail] = useState('');
  const { requestReset, isRequestingReset, requestError } = usePasswordReset();
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await requestReset({ email });
      setSent(true);
    } catch (err) {
      console.error('Reset failed');
    }
  };

  if (sent) {
    return <div>Password reset email sent! Check your inbox.</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      {requestError && <div className="text-red-600">{requestError.message}</div>}

      <button type="submit" disabled={isRequestingReset}>
        {isRequestingReset ? 'Sending...' : 'Reset Password'}
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
      console.error('Failed to send code');
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await verifyCode({ phone, code });
      // Success - user is now logged in
    } catch (err) {
      console.error('Invalid code');
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
          {isSendingCode ? 'Sending...' : 'Send Code'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerifyCode}>
      <p>Enter the code sent to {phone}</p>
      <input
        type="text"
        placeholder="123456"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <button type="submit" disabled={isVerifying}>
        {isVerifying ? 'Verifying...' : 'Verify'}
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
  const { isAuthenticated, isLoading } = useCurrentUser();
  const { open } = useAuthModal();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div>
        <p>Please log in to continue</p>
        <button onClick={() => open('login')}>Login</button>
      </div>
    );
  }

  return <>{children}</>;
}
