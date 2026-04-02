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

interface UseSubscriptionExpiryReturn {
  expiryInfo: ExpiryCheckResult | null;
  /** true while the first fetch is in flight */
  loading: boolean;
  /** call to re-fetch immediately (e.g. after user dismisses modal) */
  refetch: () => void;
}

const STORAGE_KEY_WARNING_DISMISSED = 'sub_expiry_warning_dismissed_for';
const POLL_INTERVAL_MS = 10 * 60 * 1000; // re-check every 10 minutes

/**
 * Polls /api/subscriptions/expiry-check to drive the expiry modals.
 * Only active when the user is authenticated (token present).
 */
export function useSubscriptionExpiry(isAuthenticated: boolean): UseSubscriptionExpiryReturn {
  const [expiryInfo, setExpiryInfo] = useState<ExpiryCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
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
      }
    } catch {
      // network errors are silently ignored — non-critical
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

  return { expiryInfo, loading, refetch: fetchExpiryCheck };
}

/** Store/retrieve per-expiry-date dismissal so the warning only shows once per expiry cycle. */
export function hasUserDismissedWarning(expirationDate: string): boolean {
  return localStorage.getItem(STORAGE_KEY_WARNING_DISMISSED) === expirationDate;
}

export function markWarningDismissed(expirationDate: string): void {
  localStorage.setItem(STORAGE_KEY_WARNING_DISMISSED, expirationDate);
}
