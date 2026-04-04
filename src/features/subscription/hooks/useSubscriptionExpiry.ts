import { useState, useEffect, useCallback, useRef } from 'react';
import { API_URL } from '../../../shared/api/config';
import { tokenService } from '../../../shared/api/tokenService';

export interface ExpiryCheckResult {
  hasSubscription: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  hoursUntilExpiry: number;
  expirationDate: string;
  productId: string;
  status: string;
  /** Server-side dismiss count (0–3). Included only when isExpired. */
  expiredModalDismissCount: number;
}

// ─── Show schedule ────────────────────────────────────────────────────────────
//   count=0, any days  → phase 1  (first show after expiry)
//   count=1, days≥3   → phase 2
//   count=2, days≥7   → phase 3  (final)
//   count≥3           → null     (permanently suppressed)

const MS_PER_DAY = 86_400_000;
const POLL_INTERVAL_MS = 10 * 60 * 1000;

function daysSince(dateStr: string): number {
  const ms = Date.now() - new Date(dateStr).getTime();
  return ms < 0 ? 0 : Math.floor(ms / MS_PER_DAY);
}

function computePhase(count: number, days: number): 1 | 2 | 3 | null {
  if (count >= 3) return null;
  if (count === 0) return 1;
  if (count === 1) return days >= 3 ? 2 : null;
  if (count === 2) return days >= 7 ? 3 : null;
  return null;
}

// ─── Warning-dismissed helper (expiring-soon modal) ──────────────────────────

const STORAGE_KEY_WARNING_DISMISSED = 'sub_expiry_warning_dismissed_for';

export function hasUserDismissedWarning(expirationDate: string): boolean {
  return localStorage.getItem(STORAGE_KEY_WARNING_DISMISSED) === expirationDate;
}

export function markWarningDismissed(expirationDate: string): void {
  localStorage.setItem(STORAGE_KEY_WARNING_DISMISSED, expirationDate);
}

// ─── Hook return type ─────────────────────────────────────────────────────────

interface UseSubscriptionExpiryReturn {
  expiryInfo: ExpiryCheckResult | null;
  loading: boolean;
  refetch: () => void;
  /**
   * Which phase of the "expired" modal to show (1 / 2 / 3), or null.
   * Computed once when the hook first detects an expired subscription and
   * stored in React state — survives any child remounts.
   */
  expiredPhase: 1 | 2 | 3 | null;
  /** Call when user dismisses the modal (Maybe later / Reactivate Plan). */
  dismissExpiredModal: () => void;
  /** Call when user clicks "No thanks" on phase 3 — permanently suppresses. */
  dismissExpiredModalFinal: () => void;
  /** Call when payment succeeds — backend already reset the count. */
  clearExpiredModal: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSubscriptionExpiry(
  isAuthenticated: boolean,
): UseSubscriptionExpiryReturn {
  const [expiryInfo, setExpiryInfo] = useState<ExpiryCheckResult | null>(null);
  const [loading, setLoading] = useState(false);

  // The expired-modal phase lives here (App level) so it is set exactly once
  // per session and is immune to child component remounts.
  const [expiredPhase, setExpiredPhase] = useState<1 | 2 | 3 | null>(null);
  const phaseInitialized = useRef(false);

  const fetchingRef = useRef(false);

  const fetchExpiryCheck = useCallback(async () => {
    if (fetchingRef.current) return;
    const token = tokenService.getAccessToken();
    if (!token) return;

    fetchingRef.current = true;
    try {
      const res = await fetch(`${API_URL}/subscriptions/expiry-check`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: ExpiryCheckResult = await res.json();
        setExpiryInfo(data);

        // Compute phase once — only when subscription is expired and not yet set.
        if (data.isExpired && data.expirationDate && !phaseInitialized.current) {
          phaseInitialized.current = true;
          const count = data.expiredModalDismissCount ?? 0;
          const days = daysSince(data.expirationDate);
          setExpiredPhase(computePhase(count, days));
        }
      }
    } catch {
      // non-critical — silently ignore
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    fetchExpiryCheck();
    const interval = setInterval(fetchExpiryCheck, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchExpiryCheck]);

  // ── Dismiss actions ───────────────────────────────────────────────────────

  const callDismissApi = useCallback(async () => {
    const token = tokenService.getAccessToken();
    if (!token) return;
    try {
      await fetch(`${API_URL}/subscriptions/dismiss-expired-modal`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // non-critical
    }
  }, []);

  const dismissExpiredModal = useCallback(() => {
    setExpiredPhase(null);
    callDismissApi();
  }, [callDismissApi]);

  const dismissExpiredModalFinal = useCallback(() => {
    setExpiredPhase(null);
    callDismissApi();
  }, [callDismissApi]);

  const clearExpiredModal = useCallback(() => {
    setExpiredPhase(null);
    // Backend resets count=0 on subscription activation — no extra call needed
  }, []);

  return {
    expiryInfo,
    loading,
    refetch: fetchExpiryCheck,
    expiredPhase,
    dismissExpiredModal,
    dismissExpiredModalFinal,
    clearExpiredModal,
  };
}
