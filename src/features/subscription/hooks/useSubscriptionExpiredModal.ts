import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';
import { SUBSCRIPTION_PRICING } from '@/shared/utils/subscriptionHelpers';

// ─── Storage ────────────────────────────────────────────────────────────────

const STORAGE_KEY_PREFIX = 'be_sub_expired_v2_';

interface SubExpiredStorageState {
  /**
   * How many show-phases the user has actively dismissed.
   * 0 = never shown | 1 = phase 1 dismissed | 2 = phase 2 dismissed
   * 3 = all phases done — never show again
   */
  phasesDismissed: 0 | 1 | 2 | 3;
}

function loadStorageState(userId: string): SubExpiredStorageState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + userId);
    if (!raw) return { phasesDismissed: 0 };
    const parsed = JSON.parse(raw) as Partial<SubExpiredStorageState>;
    const n = parsed.phasesDismissed;
    if (n === 0 || n === 1 || n === 2 || n === 3) return { phasesDismissed: n };
    return { phasesDismissed: 0 };
  } catch {
    return { phasesDismissed: 0 };
  }
}

function saveStorageState(userId: string, state: SubExpiredStorageState): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify(state));
  } catch {
    // localStorage unavailable (private mode, quota exceeded) — silently ignore
  }
}

function clearStorageState(userId: string): void {
  try {
    localStorage.removeItem(STORAGE_KEY_PREFIX + userId);
  } catch {}
}

// ─── Pure helpers ────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;

/** Returns days elapsed since expiresAt. Returns 0 for missing / invalid dates. */
function computeDaysSinceExpiry(expiresAt?: Date | string): number {
  if (!expiresAt) return 0;
  const d = new Date(expiresAt);
  if (isNaN(d.getTime())) return 0;
  const diffMs = Date.now() - d.getTime();
  return diffMs < 0 ? 0 : Math.floor(diffMs / MS_PER_DAY);
}

/**
 * Returns the phase to show (1, 2, or 3) or null (nothing to show).
 * Show schedule:
 *   Phase 1 — Day  0+  (immediately after expiry)
 *   Phase 2 — Day  3+  (after phase 1 dismissed)
 *   Phase 3 — Day  7+  (after phase 2 dismissed, final "No" prompt)
 */
function computePhase(stored: SubExpiredStorageState, daysSinceExpiry: number): 1 | 2 | 3 | null {
  if (stored.phasesDismissed === 3) return null;
  if (stored.phasesDismissed === 0) return 1;
  if (stored.phasesDismissed === 1) return daysSinceExpiry >= 3 ? 2 : null;
  if (stored.phasesDismissed === 2) return daysSinceExpiry >= 7 ? 3 : null;
  return null;
}

/** e.g. 'pro_monthly' → 'pro monthly' */
function formatPlanName(plan?: string): string {
  if (!plan) return 'subscription';
  return plan.replace(/_/g, ' ');
}

/** e.g. "April 1, 2026 at 01:59 AM" */
function formatExpiredAt(expiresAt?: Date | string): string {
  if (!expiresAt) return '';
  const d = new Date(expiresAt);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Map subscription plan to PaymentWindow planInterval */
function getPlanInterval(plan?: string): 'month' | 'year' {
  return plan?.includes('yearly') ? 'year' : 'month';
}

/** Map subscription plan to price (EUR) */
function getPlanPrice(plan?: string): number {
  if (plan === 'pro_yearly') return SUBSCRIPTION_PRICING.pro_yearly;
  if (plan === 'pro_monthly') return SUBSCRIPTION_PRICING.pro_monthly;
  return SUBSCRIPTION_PRICING.pro_monthly; // safe fallback
}

/** Map user role to PaymentWindow userRole */
function getPaymentUserRole(role?: string): 'buyer' | 'private_seller' | 'agent' {
  if (role === 'buyer') return 'buyer';
  if (role === 'agent') return 'agent';
  return 'private_seller'; // default for sellers and admins who shouldn't see this
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PaymentProps {
  planName: string;
  planPrice: number;
  planInterval: 'month' | 'year';
  productId: string | undefined;
  userRole: 'buyer' | 'private_seller' | 'agent';
  userEmail: string;
  userCountry: string;
}

export interface UseSubscriptionExpiredModalReturn {
  isVisible: boolean;
  /** Which phase is currently shown (controls button labels) */
  phase: 1 | 2 | 3;
  planName: string;
  expiredAt: string;
  isBuyer: boolean;
  /** Whether to show the PaymentWindow */
  showPaymentWindow: boolean;
  /** Props to spread onto <PaymentWindow> */
  paymentProps: PaymentProps;
  /** User clicked "Reactivate Plan" — dismisses current phase + opens payment */
  handleReactivate: () => void;
  /** "Maybe later" — dismisses current phase, next show at day 3+ or day 7+ */
  handleMaybeLater: () => void;
  /** "No" — permanent dismissal (phase 3 only) */
  handleNo: () => void;
  /** Payment completed successfully — clear all phase state */
  handlePaymentSuccess: (paymentIntentId: string) => void;
  /** Payment window closed without completing payment */
  handlePaymentWindowClose: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSubscriptionExpiredModal(): UseSubscriptionExpiredModalReturn {
  const { state } = useAppContext();

  const user = state.currentUser;
  const subscription = user?.subscription;
  const userId = user?.id || user?._id || user?.email || '';

  /**
   * Session-level guard: set to true the moment any button is clicked.
   * Prevents the modal from re-appearing if `user` or `subscription` reference
   * changes mid-session (e.g. after auth re-check following navigation).
   */
  const sessionDismissedRef = useRef(false);

  const [isVisible, setIsVisible] = useState(false);
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [showPaymentWindow, setShowPaymentWindow] = useState(false);

  useEffect(() => {
    // ① Session guard — must be first
    if (sessionDismissedRef.current) return;

    // ② Basic auth / subscription guards
    if (!user || !subscription || !userId) {
      setIsVisible(false);
      return;
    }
    if (subscription.status !== 'expired') {
      setIsVisible(false);
      return;
    }

    // ③ Compute which phase to show
    const stored = loadStorageState(userId);
    const days = computeDaysSinceExpiry(subscription.expiresAt);
    const resolvedPhase = computePhase(stored, days);

    if (resolvedPhase === null) {
      setIsVisible(false);
    } else {
      setPhase(resolvedPhase);
      setIsVisible(true);
    }
  }, [user, subscription, userId]);

  /** Advance the dismissal counter without exceeding 2 (phase 3 uses handleNo) */
  const advancePhase = useCallback(() => {
    if (!userId) return;
    const stored = loadStorageState(userId);
    const next = Math.min(stored.phasesDismissed + 1, 2) as 0 | 1 | 2 | 3;
    saveStorageState(userId, { phasesDismissed: next });
  }, [userId]);

  const handleReactivate = useCallback(() => {
    // Dismiss the current phase so the modal doesn't show on every login while
    // payment is pending. If they complete payment the subscription status changes
    // to 'active' and the modal never triggers again regardless.
    advancePhase();
    sessionDismissedRef.current = true;
    setIsVisible(false);
    setShowPaymentWindow(true);
  }, [advancePhase]);

  const handleMaybeLater = useCallback(() => {
    advancePhase();
    sessionDismissedRef.current = true;
    setIsVisible(false);
  }, [advancePhase]);

  const handleNo = useCallback(() => {
    if (userId) saveStorageState(userId, { phasesDismissed: 3 });
    sessionDismissedRef.current = true;
    setIsVisible(false);
  }, [userId]);

  const handlePaymentSuccess = useCallback((_paymentIntentId: string) => {
    // Subscription is now active — clear all phase state so there's nothing to show
    if (userId) clearStorageState(userId);
    setShowPaymentWindow(false);
  }, [userId]);

  const handlePaymentWindowClose = useCallback(() => {
    // Phase was already dismissed when "Reactivate" was clicked; just close the window
    setShowPaymentWindow(false);
  }, []);

  const paymentProps: PaymentProps = {
    planName: formatPlanName(subscription?.plan),
    planPrice: getPlanPrice(subscription?.plan),
    planInterval: getPlanInterval(subscription?.plan),
    productId: subscription?.productId || subscription?.plan || undefined,
    userRole: getPaymentUserRole(user?.role),
    userEmail: user?.email ?? '',
    userCountry: user?.country ?? 'RS',
  };

  return {
    isVisible,
    phase,
    planName: formatPlanName(subscription?.plan),
    expiredAt: formatExpiredAt(subscription?.expiresAt),
    isBuyer: subscription?.tier === 'buyer',
    showPaymentWindow,
    paymentProps,
    handleReactivate,
    handleMaybeLater,
    handleNo,
    handlePaymentSuccess,
    handlePaymentWindowClose,
  };
}
