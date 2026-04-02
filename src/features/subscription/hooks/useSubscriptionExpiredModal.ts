import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useLocalizedNavigation } from '@/src/hooks/useLocalizedNavigation';

// ─── Storage ────────────────────────────────────────────────────────────────

const STORAGE_KEY_PREFIX = 'be_sub_expired_v2_';

interface SubExpiredStorageState {
  /**
   * How many show-phases the user has actively dismissed.
   * 0 = never shown | 1 = phase 1 (Day 0) dismissed | 2 = phase 2 (Day 3) dismissed
   * 3 = phase 3 (Day 7) dismissed with "No" — permanent stop
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

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface UseSubscriptionExpiredModalReturn {
  isVisible: boolean;
  /** Which phase is currently shown (controls button labels) */
  phase: 1 | 2 | 3;
  planName: string;
  expiredAt: string;
  isBuyer: boolean;
  /** "Reactivate Plan" → close for session, navigate to pricing (no phase dismissed) */
  handleReactivate: () => void;
  /** "Maybe later" → dismiss current phase (phases 1 & 2) */
  handleMaybeLater: () => void;
  /** "No" → permanent dismissal (phase 3 only) */
  handleNo: () => void;
}

export function useSubscriptionExpiredModal(): UseSubscriptionExpiredModalReturn {
  const { state, dispatch } = useAppContext();
  const { getLocalizedPath } = useLocalizedNavigation();

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

  const handleReactivate = useCallback(() => {
    // Set session guard BEFORE dispatch to prevent the re-render from re-showing the modal
    sessionDismissedRef.current = true;
    setIsVisible(false);
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'pricing' });
    window.history.pushState({ view: 'pricing' }, '', getLocalizedPath('/pricing'));
  }, [dispatch, getLocalizedPath]);

  const handleMaybeLater = useCallback(() => {
    const stored = loadStorageState(userId);
    const next = Math.min(stored.phasesDismissed + 1, 2) as 0 | 1 | 2 | 3;
    saveStorageState(userId, { phasesDismissed: next });
    sessionDismissedRef.current = true;
    setIsVisible(false);
  }, [userId]);

  const handleNo = useCallback(() => {
    saveStorageState(userId, { phasesDismissed: 3 });
    sessionDismissedRef.current = true;
    setIsVisible(false);
  }, [userId]);

  return {
    isVisible,
    phase,
    planName: formatPlanName(subscription?.plan),
    expiredAt: formatExpiredAt(subscription?.expiresAt),
    isBuyer: subscription?.tier === 'buyer',
    handleReactivate,
    handleMaybeLater,
    handleNo,
  };
}
