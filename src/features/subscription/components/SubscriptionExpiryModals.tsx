import React, { useState, useCallback, useEffect, useRef } from 'react';
import PaymentWindow from '../../../../components/shared/PaymentWindow';
import { useAppContext } from '../../../../context/AppContext';
import { API_URL } from '../../../shared/api/config';
import { tokenService } from '../../../shared/api/tokenService';
import {
  ExpiryCheckResult,
  hasUserDismissedWarning,
  markWarningDismissed,
} from '../hooks/useSubscriptionExpiry';

// ─── Persistent phase storage ─────────────────────────────────────────────────
//
// Key: be_sub_exp_v1_{userId}_{expirationDateMs}
//   – Scoped to the user AND the specific expiry date so if they resubscribe
//     and the subscription expires again later, the phase counter resets.
//
// Value: { phasesDismissed: 0 | 1 | 2 | 3 }
//   0 = modal never shown yet this expiry cycle
//   1 = phase 1 (Day 0)  dismissed → next show Day 3+
//   2 = phase 2 (Day 3)  dismissed → next show Day 7+
//   3 = all done          → never show again

const STORAGE_PREFIX = 'be_sub_exp_v1_';
const MS_PER_DAY = 86_400_000;

function storageKey(userId: string, expirationDate: string): string {
  // Normalise the date to a UTC day-boundary so slight timestamp jitter
  // doesn't produce a different key on each auth re-check.
  const dayTs = Math.floor(new Date(expirationDate).getTime() / MS_PER_DAY);
  return `${STORAGE_PREFIX}${userId}_${dayTs}`;
}

function loadPhases(userId: string, expirationDate: string): 0 | 1 | 2 | 3 {
  try {
    const raw = localStorage.getItem(storageKey(userId, expirationDate));
    if (!raw) return 0;
    const n = JSON.parse(raw)?.phasesDismissed;
    if (n === 0 || n === 1 || n === 2 || n === 3) return n;
    return 0;
  } catch { return 0; }
}

function savePhases(userId: string, expirationDate: string, n: 0 | 1 | 2 | 3): void {
  try {
    localStorage.setItem(storageKey(userId, expirationDate), JSON.stringify({ phasesDismissed: n }));
  } catch { /* quota exceeded / private mode — silently ignore */ }
}

function clearPhases(userId: string, expirationDate: string): void {
  try { localStorage.removeItem(storageKey(userId, expirationDate)); } catch { /* ignore */ }
}

/** Days elapsed since the expiration date. */
function daysSinceExpiry(expirationDate: string): number {
  const ms = Date.now() - new Date(expirationDate).getTime();
  return ms < 0 ? 0 : Math.floor(ms / MS_PER_DAY);
}

/**
 * Resolves which phase to show, or null if nothing should be shown.
 * Phase 1 — Day 0+  (first time)
 * Phase 2 — Day 3+  (after phase 1 dismissed)
 * Phase 3 — Day 7+  (after phase 2 dismissed, final "No" button)
 */
function resolvePhase(phases: 0 | 1 | 2 | 3, days: number): 1 | 2 | 3 | null {
  if (phases === 3) return null;
  if (phases === 0) return 1;
  if (phases === 1) return days >= 3 ? 2 : null;
  if (phases === 2) return days >= 7 ? 3 : null;
  return null;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  expiryInfo: ExpiryCheckResult | null;
  onDismissWarning: () => void;
}

interface ProductInfo {
  name: string;
  price: number;
  interval: 'month' | 'year';
  productId: string;
}

const SubscriptionExpiryModals: React.FC<Props> = ({ expiryInfo, onDismissWarning }) => {
  const { state } = useAppContext();
  const [showPaymentWindow, setShowPaymentWindow] = useState(false);
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(false);

  const user = state.currentUser;
  const userId = user?.id || user?._id || user?.email || '';
  const userRole: 'buyer' | 'private_seller' | 'agent' =
    user?.role === 'agent' ? 'agent' : user?.role === 'buyer' ? 'buyer' : 'private_seller';

  // ── Expired modal phase state ─────────────────────────────────────────────
  // We derive visibility from localStorage rather than React state so that
  // re-mounts (caused by auth re-checks creating new state references) never
  // re-show the modal after the user has dismissed it.

  const [expiredPhase, setExpiredPhase] = useState<1 | 2 | 3 | null>(null);

  // Re-evaluate the phase whenever expiryInfo or userId changes.
  // We use a ref to avoid running on every render while still picking up
  // genuine prop changes.
  const lastKeyRef = useRef('');
  useEffect(() => {
    if (!expiryInfo?.isExpired || !userId || !expiryInfo.expirationDate) {
      setExpiredPhase(null);
      return;
    }
    const key = `${userId}|${expiryInfo.expirationDate}`;
    if (key === lastKeyRef.current) return; // nothing changed
    lastKeyRef.current = key;

    const phases = loadPhases(userId, expiryInfo.expirationDate);
    const days = daysSinceExpiry(expiryInfo.expirationDate);
    setExpiredPhase(resolvePhase(phases, days));
  }, [expiryInfo, userId]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const advancePhase = useCallback(() => {
    if (!userId || !expiryInfo?.expirationDate) return;
    const current = loadPhases(userId, expiryInfo.expirationDate);
    const next = Math.min(current + 1, 2) as 0 | 1 | 2 | 3;
    savePhases(userId, expiryInfo.expirationDate, next);
    setExpiredPhase(null); // hide immediately; next show at next phase threshold
  }, [userId, expiryInfo?.expirationDate]);

  const permanentlyDismiss = useCallback(() => {
    if (!userId || !expiryInfo?.expirationDate) return;
    savePhases(userId, expiryInfo.expirationDate, 3);
    setExpiredPhase(null);
  }, [userId, expiryInfo?.expirationDate]);

  const fetchProductAndOpenPayment = useCallback(async () => {
    if (!expiryInfo?.productId) return;
    // Dismiss the current phase so the modal doesn't reappear on every login
    // while the user is deciding whether to reactivate.
    advancePhase();
    setLoadingProduct(true);
    try {
      const token = tokenService.getAccessToken();
      const roles = ['seller', 'buyer', 'agent'];
      let found: ProductInfo | null = null;
      for (const role of roles) {
        const res = await fetch(`${API_URL}/products?role=${role}`, {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) continue;
        const data = await res.json();
        const products: any[] = data.products || [];
        const match = products.find((p: any) => p.productId === expiryInfo.productId);
        if (match) {
          found = {
            name: match.name,
            price: match.price,
            interval: match.billingPeriod === 'yearly' ? 'year' : 'month',
            productId: match.productId,
          };
          break;
        }
      }
      if (!found) {
        const isYearly = expiryInfo.productId.includes('yearly') || expiryInfo.productId.includes('annual');
        found = {
          name: expiryInfo.productId.replace(/_/g, ' '),
          price: 0,
          interval: isYearly ? 'year' : 'month',
          productId: expiryInfo.productId,
        };
      }
      setProductInfo(found);
      setShowPaymentWindow(true);
    } catch {
      window.location.href = '/account';
    } finally {
      setLoadingProduct(false);
    }
  }, [expiryInfo?.productId, advancePhase]);

  const handlePaymentSuccess = useCallback(() => {
    setShowPaymentWindow(false);
    // Payment succeeded — subscription is now active, clear all phase state
    if (userId && expiryInfo?.expirationDate) {
      clearPhases(userId, expiryInfo.expirationDate);
    }
    setExpiredPhase(null);
    window.dispatchEvent(new Event('subscriptionUpdated'));
  }, [userId, expiryInfo?.expirationDate]);

  // ── Derived display values ────────────────────────────────────────────────

  if (!expiryInfo?.hasSubscription) return null;

  const showExpiringSoon =
    expiryInfo.isExpiringSoon &&
    !expiryInfo.isExpired &&
    !hasUserDismissedWarning(expiryInfo.expirationDate);

  const showExpired = expiryInfo.isExpired && expiredPhase !== null;
  const isFinalPhase = expiredPhase === 3;

  const handleDismissWarning = () => {
    markWarningDismissed(expiryInfo.expirationDate);
    onDismissWarning();
  };

  const expiryDate = new Date(expiryInfo.expirationDate);
  const expiryStr = expiryDate.toLocaleString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const hoursLeft = Math.max(0, Math.ceil(expiryInfo.hoursUntilExpiry));

  return (
    <>
      {/* ── Expiring Soon Warning Modal ── */}
      {showExpiringSoon && !showExpired && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleDismissWarning}
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/20 text-3xl mb-3">⏰</div>
              <h2 className="text-xl font-bold text-white">Subscription Expiring Soon</h2>
              <p className="text-amber-100 text-sm mt-1">
                Less than {hoursLeft} hour{hoursLeft !== 1 ? 's' : ''} remaining
              </p>
            </div>
            <div className="px-6 py-5">
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4">
                Your <span className="font-semibold">{expiryInfo.productId.replace(/_/g, ' ')}</span>{' '}
                subscription expires on <span className="font-semibold">{expiryStr}</span>. After
                that, your account will be downgraded to the free plan.
              </p>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-5 text-sm text-amber-800 dark:text-amber-300">
                <p className="font-semibold mb-2">You'll lose access to:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Increased property listing limits</li>
                  <li>Monthly promotion coupons</li>
                  <li>AI messages &amp; market insights</li>
                  <li>Priority notifications</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleDismissWarning}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Remind me later
                </button>
                <button
                  onClick={fetchProductAndOpenPayment}
                  disabled={loadingProduct}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-md disabled:opacity-70"
                >
                  {loadingProduct ? 'Loading…' : 'Renew Now →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Subscription Expired Modal ── */}
      {showExpired && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Non-dismissable backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-5 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/20 text-3xl mb-3">⚡</div>
              <h2 className="text-xl font-bold text-white">Your Subscription Has Expired</h2>
              <p className="text-red-100 text-sm mt-1">Your account has been downgraded to the free plan</p>
            </div>
            <div className="px-6 py-5">
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4">
                Your{' '}
                <span className="font-semibold">{expiryInfo.productId.replace(/_/g, ' ')}</span>{' '}
                subscription expired on <span className="font-semibold">{expiryStr}</span>. Reactivate
                now to instantly restore all your premium features.
              </p>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 mb-5 text-sm text-red-700 dark:text-red-300">
                <p className="font-semibold mb-2">You no longer have access to:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Increased property listing limits</li>
                  <li>Monthly promotion coupons</li>
                  <li>AI messages &amp; market insights</li>
                  <li>Priority notifications</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={isFinalPhase ? permanentlyDismiss : advancePhase}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {isFinalPhase ? 'No, thanks' : 'Maybe later'}
                </button>
                <button
                  onClick={fetchProductAndOpenPayment}
                  disabled={loadingProduct}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white text-sm font-semibold hover:from-red-600 hover:to-rose-700 transition-all shadow-md disabled:opacity-70"
                >
                  {loadingProduct ? 'Loading…' : 'Reactivate Plan →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment Window ── */}
      {productInfo && (
        <PaymentWindow
          isOpen={showPaymentWindow}
          onClose={() => setShowPaymentWindow(false)}
          planName={productInfo.name}
          planPrice={productInfo.price}
          planInterval={productInfo.interval}
          userRole={userRole}
          userEmail={user?.email}
          productId={productInfo.productId}
          onSuccess={handlePaymentSuccess}
          onError={() => setShowPaymentWindow(false)}
        />
      )}
    </>
  );
};

export default SubscriptionExpiryModals;
