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
}

// ─── Expired-modal show counter ───────────────────────────────────────────────
//
// Tracks how many times the "Subscription Expired" modal has been shown.
// Stored in localStorage keyed by userId so it survives page reloads.
//
//   0 → never shown        → show on first login after expiry
//   1 → shown once         → show again at Day 3+
//   2 → shown twice        → show again at Day 7+
//   3 → shown three times  → never show again

const EXPIRED_MODAL_KEY = 'be_sub_exp_v3_';
const MS_PER_DAY = 86_400_000;

function readCount(userId: string): number {
  try {
    const raw = localStorage.getItem(EXPIRED_MODAL_KEY + userId);
    if (!raw) return 0;
    const n = JSON.parse(raw)?.c;
    return typeof n === 'number' && n >= 0 ? n : 0;
  } catch { return 0; }
}

function writeCount(userId: string, n: number): void {
  try {
    localStorage.setItem(EXPIRED_MODAL_KEY + userId, JSON.stringify({ c: n }));
  } catch {}
}

function clearCount(userId: string): void {
  try { localStorage.removeItem(EXPIRED_MODAL_KEY + userId); } catch {}
}

function daysSince(dateStr: string): number {
  const ms = Date.now() - new Date(dateStr).getTime();
  return ms < 0 ? 0 : Math.floor(ms / MS_PER_DAY);
}

/**
 * Returns which phase (1/2/3) to show, or null.
 *   count=0, any days  → phase 1 (first show)
 *   count=1, days≥3   → phase 2
 *   count=2, days≥7   → phase 3 (final)
 *   count≥3           → null  (done forever)
 */
function computePhase(count: number, days: number): 1 | 2 | 3 | null {
  if (count >= 3) return null;
  if (count === 0) return 1;
  if (count === 1) return days >= 3 ? 2 : null;
  if (count === 2) return days >= 7 ? 3 : null;
  return null;
}

// ─── Warning-dismissed helper (expiring-soon modal) ──────────────────────────

const STORAGE_KEY_WARNING_DISMISSED = 'sub_expiry_warning_dismissed_for';
const POLL_INTERVAL_MS = 10 * 60 * 1000;

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
   * Computed ONCE when the hook first detects an expired subscription and
   * stored in React state at the App level — survives any child remounts.
   */
  expiredPhase: 1 | 2 | 3 | null;
  /** Call when user dismisses the modal (Maybe later / Reactivate Plan). */
  dismissExpiredModal: () => void;
  /** Call when user clicks "No thanks" on phase 3 — permanently suppresses. */
  dismissExpiredModalFinal: () => void;
  /** Call when payment succeeds — clears the counter entirely. */
  clearExpiredModal: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSubscriptionExpiry(
  isAuthenticated: boolean,
  userId: string,
): UseSubscriptionExpiryReturn {
  const [expiryInfo, setExpiryInfo] = useState<ExpiryCheckResult | null>(null);
  const [loading, setLoading] = useState(false);

  // The expired-modal phase lives HERE (App level) so it is set exactly once
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

        // Compute phase once — only when subscription is expired and we haven't
        // set it yet this session. Never recalculate after the user dismisses.
        if (data.isExpired && data.expirationDate && userId && !phaseInitialized.current) {
          phaseInitialized.current = true;
          const count = readCount(userId);
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
  }, [userId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    fetchExpiryCheck();
    const interval = setInterval(fetchExpiryCheck, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchExpiryCheck]);

  // ── Dismiss actions (called from the modal, update state + localStorage) ───

  const dismissExpiredModal = useCallback(() => {
    if (!userId) return;
    const n = readCount(userId);
    writeCount(userId, n + 1);
    setExpiredPhase(null);
  }, [userId]);

  const dismissExpiredModalFinal = useCallback(() => {
    if (!userId) return;
    writeCount(userId, 3);
    setExpiredPhase(null);
  }, [userId]);

  const clearExpiredModal = useCallback(() => {
    if (!userId) return;
    clearCount(userId);
    setExpiredPhase(null);
  }, [userId]);

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
