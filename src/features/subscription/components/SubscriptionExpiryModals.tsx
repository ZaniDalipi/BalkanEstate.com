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
// Key: be_sub_exp_v2_{userId}   (scoped to user only — no date dependency so
//   slight timestamp jitter between API polls can't produce a different key)
//
// Value: { totalShows: 0 | 1 | 2 | 3 }
//   0 = never shown
//   1 = shown once  (phase 1 done, next show Day 3+)
//   2 = shown twice (phase 2 done, next show Day 7+)
//   3 = shown 3×    → never show again

const STORAGE_PREFIX = 'be_sub_exp_v2_';
const MS_PER_DAY = 86_400_000;

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function loadShows(userId: string): 0 | 1 | 2 | 3 {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return 0;
    const n = JSON.parse(raw)?.totalShows;
    if (n === 0 || n === 1 || n === 2 || n === 3) return n;
    return 0;
  } catch { return 0; }
}

function saveShows(userId: string, n: 0 | 1 | 2 | 3): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify({ totalShows: n }));
  } catch { /* quota exceeded / private mode */ }
}

function clearShows(userId: string): void {
  try { localStorage.removeItem(storageKey(userId)); } catch {}
}

/** Days elapsed since the expiration date (0 if not yet expired). */
function daysSinceExpiry(expirationDate: string): number {
  const ms = Date.now() - new Date(expirationDate).getTime();
  return ms < 0 ? 0 : Math.floor(ms / MS_PER_DAY);
}

/**
 * Which phase to show based on how many times it's been shown already + days elapsed.
 * Phase 1 — Day 0+  (first show)
 * Phase 2 — Day 3+  (second show)
 * Phase 3 — Day 7+  (third and final show, "No thanks")
 * null     — nothing to show
 */
function resolvePhase(totalShows: 0 | 1 | 2 | 3, days: number): 1 | 2 | 3 | null {
  if (totalShows >= 3) return null;
  if (totalShows === 0) return 1;
  if (totalShows === 1) return days >= 3 ? 2 : null;
  if (totalShows === 2) return days >= 7 ? 3 : null;
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
  //
  // Two-layer protection against re-appearing:
  //
  // 1. dismissedThisSessionRef — set synchronously on any button click.
  //    Prevents any subsequent re-render (from auth polls, context updates,
  //    expiryInfo reference changes) from calling setExpiredPhase(non-null)
  //    within the same page load.
  //
  // 2. localStorage (totalShows counter) — survives page reloads and remounts.
  //    On each mount the effect reads the counter and resolves the right phase
  //    (or null) based on days elapsed since expiry.

  const dismissedThisSessionRef = useRef(false);
  const [expiredPhase, setExpiredPhase] = useState<1 | 2 | 3 | null>(null);

  useEffect(() => {
    // Session guard: once dismissed don't re-show even if expiryInfo changes reference
    if (dismissedThisSessionRef.current) return;

    if (!expiryInfo?.isExpired || !userId || !expiryInfo.expirationDate) {
      setExpiredPhase(null);
      return;
    }

    const shows = loadShows(userId);
    const days = daysSinceExpiry(expiryInfo.expirationDate);
    setExpiredPhase(resolvePhase(shows, days));
  }, [expiryInfo, userId]);

  // ── Dismiss helpers ───────────────────────────────────────────────────────

  /** Increment show counter (max 2 — the "No thanks" path uses recordFinalShow). */
  const recordShow = useCallback(() => {
    if (!userId) return;
    dismissedThisSessionRef.current = true;
    const current = loadShows(userId);
    // Advance by 1, capped at 2 (phase 3 / "No thanks" sets it to 3 via recordFinalShow)
    const next = Math.min(current + 1, 2) as 0 | 1 | 2 | 3;
    saveShows(userId, next);
    setExpiredPhase(null);
  }, [userId]);

  /** Called by "No thanks" — records the 3rd show as done, never shows again. */
  const recordFinalShow = useCallback(() => {
    if (!userId) return;
    dismissedThisSessionRef.current = true;
    saveShows(userId, 3);
    setExpiredPhase(null);
  }, [userId]);

  // ── Fetch product & open PaymentWindow ────────────────────────────────────

  const fetchProductAndOpenPayment = useCallback(async () => {
    if (!expiryInfo?.productId) return;
    // Count this as a dismissed show so the modal doesn't reappear on every login
    // while the user is considering whether to reactivate.
    recordShow();
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
  }, [expiryInfo?.productId, recordShow]);

  const handlePaymentSuccess = useCallback(() => {
    setShowPaymentWindow(false);
    // Subscription active — clear the show counter so it never triggers again
    // (isExpired will also be false on the next poll, making this doubly safe)
    if (userId) clearShows(userId);
    setExpiredPhase(null);
    window.dispatchEvent(new Event('subscriptionUpdated'));
  }, [userId]);

  // ── Render ────────────────────────────────────────────────────────────────

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
                  onClick={isFinalPhase ? recordFinalShow : recordShow}
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
